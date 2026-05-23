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

// In-memory cache for MVP - configurable via env override or saved app settings
let cache = createCache(cacheTtlSeconds);

module.exports.configureCache = function (settings = {}) {
  const nextTtlSeconds = resolveCacheTtlSeconds(settings);

  if (nextTtlSeconds !== cacheTtlSeconds) {
    cacheTtlSeconds = nextTtlSeconds;
    cache.flushAll();
    cache.close();
    cache = createCache(cacheTtlSeconds);
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
 * Clear all cache
 */
module.exports.clearCache = function () {
  cache.flushAll();
}

module.exports.getDefaultTtlSeconds = function () {
  return cacheTtlSeconds;
}

// All functions exported via module.exports above
