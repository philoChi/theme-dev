/**
 * Cache Manager
 * 
 * Manages localStorage-based caching with TTL and LRU eviction strategy.
 * Provides robust cache operations with error handling and storage limitations.
 */

import SearchConfig from './search-config.js';

class CacheManager {
  constructor() {
    this.config = SearchConfig.cache;
    this.isStorageAvailable = this._checkStorageAvailability();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };

    if (!this.config.enabled) {
      console.log('[CacheManager] Caching disabled in configuration');
      return;
    }

    if (!this.isStorageAvailable) {
      console.warn('[CacheManager] localStorage not available, caching disabled');
      return;
    }

    this._initialize();
  }

  /**
   * Initialize cache system
   * @private
   */
  _initialize() {
    console.log('[CacheManager] Initializing cache system');
    this._cleanExpiredEntries();
  }

  /**
   * Get cached value by key
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found/expired
   */
  get(key) {
    if (!this._isEnabled()) return null;

    try {
      const cache = this._loadCache();
      const entry = cache.data[key];

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check if entry has expired
      if (this._isExpired(entry)) {
        console.log(`[CacheManager] Cache entry expired for key: ${key}`);
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access time for LRU
      entry.lastAccessed = Date.now();
      this._saveCache(cache);

      this.stats.hits++;
      console.log(`[CacheManager] Cache hit for key: ${key}`);
      return entry.value;

    } catch (error) {
      console.error('[CacheManager] Error getting cache entry:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @returns {boolean} Success status
   */
  set(key, value) {
    if (!this._isEnabled()) return false;

    try {
      let cache = this._loadCache();

      // Check if we need to evict entries
      if (!cache.data[key] && Object.keys(cache.data).length >= this.config.maxEntries) {
        this._evictLRU(cache);
      }

      // Create new entry
      const entry = {
        value: value,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        ttl: this.config.ttl
      };

      cache.data[key] = entry;
      cache.metadata.lastModified = Date.now();

      this._saveCache(cache);
      this.stats.sets++;

      console.log(`[CacheManager] Cached entry for key: ${key}`);
      return true;

    } catch (error) {
      console.error('[CacheManager] Error setting cache entry:', error);
      return false;
    }
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    if (!this._isEnabled()) return false;

    try {
      const cache = this._loadCache();
      const existed = key in cache.data;

      delete cache.data[key];
      cache.metadata.lastModified = Date.now();

      this._saveCache(cache);

      if (existed) {
        console.log(`[CacheManager] Deleted cache entry for key: ${key}`);
      }

      return existed;

    } catch (error) {
      console.error('[CacheManager] Error deleting cache entry:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   * @returns {boolean} Success status
   */
  clear() {
    if (!this._isEnabled()) return false;

    try {
      localStorage.removeItem(this.config.storageKey);
      console.log('[CacheManager] Cache cleared');
      return true;

    } catch (error) {
      console.error('[CacheManager] Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const cache = this._loadCache();
    const entryCount = Object.keys(cache.data).length;

    return {
      ...this.stats,
      entries: entryCount,
      maxEntries: this.config.maxEntries,
      storageUsed: this._getStorageUsed()
    };
  }

  /**
   * Check if caching is enabled and available
   * @private
   * @returns {boolean}
   */
  _isEnabled() {
    return this.config.enabled && this.isStorageAvailable;
  }

  /**
   * Check localStorage availability
   * @private
   * @returns {boolean}
   */
  _checkStorageAvailability() {
    try {
      const testKey = '__cache_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load cache from localStorage
   * @private
   * @returns {Object} Cache object
   */
  _loadCache() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return this._createEmptyCache();
      }

      const cache = JSON.parse(stored);

      // Validate cache structure
      if (!cache.data || !cache.metadata) {
        console.warn('[CacheManager] Invalid cache structure, recreating');
        return this._createEmptyCache();
      }

      return cache;

    } catch (error) {
      console.error('[CacheManager] Error loading cache, recreating:', error);
      return this._createEmptyCache();
    }
  }

  /**
   * Save cache to localStorage
   * @private
   * @param {Object} cache - Cache object to save
   */
  _saveCache(cache) {
    try {
      const serialized = JSON.stringify(cache);
      localStorage.setItem(this.config.storageKey, serialized);

    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[CacheManager] Storage quota exceeded, clearing cache');
        this.clear();
        // Try again with empty cache
        this._saveCache(this._createEmptyCache());
      } else {
        throw error;
      }
    }
  }

  /**
   * Create empty cache structure
   * @private
   * @returns {Object} Empty cache object
   */
  _createEmptyCache() {
    return {
      data: {},
      metadata: {
        version: '1.0',
        created: Date.now(),
        lastModified: Date.now()
      }
    };
  }

  /**
   * Check if entry has expired
   * @private
   * @param {Object} entry - Cache entry
   * @returns {boolean}
   */
  _isExpired(entry) {
    const age = Date.now() - entry.timestamp;
    return age > entry.ttl;
  }

  /**
   * Evict least recently used entry
   * @private
   * @param {Object} cache - Cache object
   */
  _evictLRU(cache) {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of Object.entries(cache.data)) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      delete cache.data[oldestKey];
      this.stats.evictions++;
      console.log(`[CacheManager] Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Clean expired entries
   * @private
   */
  _cleanExpiredEntries() {
    try {
      const cache = this._loadCache();
      const keys = Object.keys(cache.data);
      let cleanedCount = 0;

      for (const key of keys) {
        if (this._isExpired(cache.data[key])) {
          delete cache.data[key];
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        cache.metadata.lastModified = Date.now();
        this._saveCache(cache);
        console.log(`[CacheManager] Cleaned ${cleanedCount} expired entries`);
      }

    } catch (error) {
      console.error('[CacheManager] Error cleaning expired entries:', error);
    }
  }

  /**
   * Get storage usage estimate
   * @private
   * @returns {number} Storage usage in bytes (estimate)
   */
  _getStorageUsed() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      return stored ? stored.length * 2 : 0; // Rough estimate (UTF-16)
    } catch (error) {
      return 0;
    }
  }
}

export default CacheManager;