const crypto = require('crypto');
const NodeCache = require('node-cache');

const DEFAULT_CACHE_TTL_SECONDS = 300;
const DEFAULT_CACHE_CHECK_PERIOD_SECONDS = 60;
const CACHE_TTL_ENV_VAR = 'AI_OPTIMIZER_CACHE_TTL_SECONDS';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const cacheCheckPeriodSeconds = parsePositiveInt(process.env.AI_OPTIMIZER_CACHE_CHECK_PERIOD_SECONDS, DEFAULT_CACHE_CHECK_PERIOD_SECONDS);

function resolveCacheTtlSeconds(settings = {}) {
  const envTtlSeconds = parsePositiveInt(process.env[CACHE_TTL_ENV_VAR], null);
  return envTtlSeconds || parsePositiveInt(settings.cacheTtlSeconds, DEFAULT_CACHE_TTL_SECONDS);
}

function getCacheTtlSource(settings = {}) {
  if (parsePositiveInt(process.env[CACHE_TTL_ENV_VAR], null)) return 'env';
  if (parsePositiveInt(settings.cacheTtlSeconds, null)) return 'settings';
  return 'default';
}

let cacheTtlSeconds = resolveCacheTtlSeconds();

function createCache(ttlSeconds) {
  return new NodeCache({
    stdTTL: ttlSeconds,
    checkperiod: cacheCheckPeriodSeconds,
    useClones: false // for performance
  });
}

// Exact response cache — full request fingerprint → full response
let cache = createCache(cacheTtlSeconds);

// Prompt prefix cache — tracks repeated stable prefixes for partial reuse detection
let promptCache = createCache(cacheTtlSeconds);

module.exports.configureCache = function (settings = {}) {
  const nextTtlSeconds = resolveCacheTtlSeconds(settings);

  if (nextTtlSeconds !== cacheTtlSeconds) {
    cacheTtlSeconds = nextTtlSeconds;
    cache.flushAll();
    cache.close();
    cache = createCache(cacheTtlSeconds);
    promptCache.flushAll();
    promptCache.close();
    promptCache = createCache(cacheTtlSeconds);
  }

  return {
    ttlSeconds: cacheTtlSeconds,
    checkPeriodSeconds: cacheCheckPeriodSeconds,
    source: getCacheTtlSource(settings)
  };
}

/**
 * Generate cache key from request
 * @param {Object} requestBody - API request body
 * @param {string} provider - 'openai', 'anthropic', etc.
 * @returns {string} Cache key
 */
module.exports.generateCacheKey = function (requestBody, provider) {
  const keyData = JSON.stringify({
    provider,
    model: requestBody.model,
    messages: requestBody.messages,
    temperature: requestBody.temperature,
    max_tokens: requestBody.max_tokens
  });

  return crypto.createHash('sha256').update(keyData).digest('hex');
}

/**
 * Get cached response
 * @param {string} key - Cache key
 * @returns {Object|null} Cached response or null
 */
module.exports.getCached = function (key) {
  return cache.get(key);
}

/**
 * Cache a response
 * @param {string} key - Cache key
 * @param {Object} response - Response to cache
 * @param {number} ttl - Time to live in seconds (optional)
 */
module.exports.setCached = function (key, response, ttl) {
  if (ttl) {
    cache.set(key, response, ttl);
  } else {
    cache.set(key, response);
  }
}

/**
 * Delete cache entry
 * @param {string} key - Cache key
 */
module.exports.deleteCached = function (key) {
  cache.del(key);
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
module.exports.getStats = function () {
  const keys = cache.keys();
  return {
    totalKeys: keys.length,
    ttlSeconds: cacheTtlSeconds,
    checkPeriodSeconds: cacheCheckPeriodSeconds,
    stats: cache.getStats()
  };
}

/**
 * Clear exact response cache
 */
module.exports.clearCache = function () {
  cache.flushAll();
}

module.exports.getDefaultTtlSeconds = function () {
  return cacheTtlSeconds;
}

/**
 * Generate a prompt prefix key.
 * The prefix is everything except the final user message — stable context like
 * system prompts, documents, and prior turns that repeats across automation runs.
 *
 * Returns null if there is no stable prefix to track (single-turn requests).
 *
 * @param {Object} requestBody
 * @param {string} provider
 * @returns {string|null}
 */
module.exports.generatePromptPrefixKey = function (requestBody, provider) {
  // Bypass prefix tracking for dynamic/structured request shapes — tools, function calling,
  // and response_format make the prefix signal unreliable (the structured shape itself
  // affects caching eligibility but is not included in the prefix hash).
  if (requestBody.tools || requestBody.functions || requestBody.tool_choice || requestBody.response_format) {
    return null;
  }

  const messages = requestBody.messages || [];

  // Bypass for multimodal requests — array-valued message content (images, audio, documents,
  // mixed text+media) makes prefix hashing unreliable because content encoding and ordering
  // affect cache eligibility in ways that are not captured by a plain text prefix.
  // Prefer bypassing borderline shapes over claiming prefix reuse too aggressively.
  if (messages.some(msg => Array.isArray(msg.content))) {
    return null;
  }

  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }

  // Need at least one message before the last user message to have a meaningful prefix
  if (lastUserIdx <= 0) return null;

  const prefixMessages = messages.slice(0, lastUserIdx);

  const keyData = JSON.stringify({
    provider,
    model: requestBody.model,
    prefixMessages
  });

  return 'pfx:' + crypto.createHash('sha256').update(keyData).digest('hex');
};

/**
 * Get an existing prompt prefix cache entry.
 * @param {string} key
 * @returns {{ firstSeenAt: number, lastSeenAt: number, hitCount: number, promptTokens: number }|null}
 */
module.exports.getPromptCacheEntry = function (key) {
  return promptCache.get(key) || null;
};

/**
 * Record a prompt prefix observation.
 * Creates a new entry on first sighting; increments hitCount on subsequent ones.
 *
 * @param {string} key
 * @param {number} promptTokens - Total prompt tokens from the latest response (for context)
 */
module.exports.recordPromptCacheHit = function (key, promptTokens) {
  const existing = promptCache.get(key);
  if (existing) {
    existing.hitCount++;
    existing.lastSeenAt = Date.now();
    if (promptTokens) existing.promptTokens = promptTokens;
    promptCache.set(key, existing);
  } else {
    promptCache.set(key, {
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      hitCount: 1,
      promptTokens: promptTokens || 0
    });
  }
};

/**
 * Get prompt prefix cache stats.
 * @returns {{ totalPrefixes: number, ttlSeconds: number }}
 */
module.exports.getPromptCacheStats = function () {
  return {
    totalPrefixes: promptCache.keys().length,
    ttlSeconds: cacheTtlSeconds
  };
};

/**
 * Clear prompt prefix cache.
 */
module.exports.clearPromptCache = function () {
  promptCache.flushAll();
};

// All functions exported via module.exports above
