/**
 * ✅ FIX #13: Cache Abstraction Layer
 * In-memory cache implementation (can be replaced with Redis later)
 * Provides consistent interface for caching operations
 */

// Simple in-memory cache with TTL
const cache = new Map();

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if not found/expired
 */
function get(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() >= cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return cached.value;
}

/**
 * Set cached value with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlMs - Time to live in milliseconds
 */
function set(key, value, ttlMs = 5 * 60 * 1000) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  
  // Cleanup old entries to prevent memory leak
  if (cache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now >= v.expiresAt) {
        cache.delete(k);
      }
    }
  }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
function del(key) {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
function clear() {
  cache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
function stats() {
  const now = Date.now();
  let expired = 0;
  let active = 0;
  
  for (const [_, v] of cache.entries()) {
    if (now >= v.expiresAt) {
      expired++;
    } else {
      active++;
    }
  }
  
  return {
    total: cache.size,
    active,
    expired
  };
}

module.exports = {
  get,
  set,
  del,
  clear,
  stats
};

