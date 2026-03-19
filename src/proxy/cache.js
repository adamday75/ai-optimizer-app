const NodeCache = require('node-cache');

// In-memory cache for MVP - 5 min default TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // check for expired keys every 60 seconds
  useClones: false // for performance
});

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
  return Buffer.from(keyData).toString('base64').substring(0, 64);
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
    stats: cache.getStats()
  };
}

/**
 * Clear all cache
 */
module.exports.clearCache = function () {
  cache.flushAll();
}

// All functions exported via module.exports above
