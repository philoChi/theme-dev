/**
 * Unit Tests for Cache Manager Functionality
 * 
 * Tests localStorage operations, TTL validation, LRU eviction,
 * storage quota handling, and graceful degradation scenarios.
 */

const { 
  LocalStorageMockUtils,
  TimerMockUtils,
  PerformanceTestUtils,
  mockResponses
} = require('../helpers/search-test-utils');

const fs = require('fs');
const path = require('path');

describe('Cache Manager Functionality', () => {
  let searchModule;
  let mockLocalStorage;
  let originalLocalStorage;

  beforeAll(() => {
    // Load the search module code
    const searchModulePath = path.join(__dirname, '../../assets/section-drawer-search.js');
    const searchModuleCode = fs.readFileSync(searchModulePath, 'utf8');
    
    // Create a global context for the module
    global.window = global;
    global.document = document;
    
    // Create minimal DOM for testing
    document.body.innerHTML = `
      <input mpe="search-input" type="search" id="test-search" />
      <ul id="SearchResults" aria-live="polite"></ul>
    `;
    
    // Evaluate the module code
    eval(searchModuleCode);
    
    searchModule = global.Theme.DrawerSearch;
  });

  beforeEach(() => {
    // Store original localStorage
    originalLocalStorage = global.localStorage;
    
    // Setup localStorage mock
    mockLocalStorage = LocalStorageMockUtils.setupLocalStorageMock();
    
    // Initialize search module
    if (searchModule) {
      try {
        searchModule.destroy();
      } catch (error) {
        // Module might not be initialized
      }
      searchModule.init();
    }
  });

  afterEach(() => {
    // Restore localStorage
    if (originalLocalStorage) {
      global.localStorage = originalLocalStorage;
    }
    
    // Clear all timers
    jest.clearAllTimers();
    
    // Reset module state
    if (searchModule) {
      try {
        searchModule.destroy();
      } catch (error) {
        // Module might not be initialized
      }
    }
  });

  describe('Basic Cache Operations', () => {
    test('should store and retrieve search results', () => {
      const testQuery = 'running shoes';
      const testResults = mockResponses.successful_search.resources.results.products;
      
      // Mock successful search to populate cache
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      return searchModule.search(testQuery).then(() => {
        // Cache should contain the results
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'drawer_search_cache',
          expect.stringContaining(testQuery)
        );
      });
    });

    test('should return cached results for repeated queries', async () => {
      const testQuery = 'cached query';
      const testResults = mockResponses.successful_search.resources.results.products;
      
      // Setup cache with test data
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: Date.now(),
          lastAccessed: Date.now()
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      // Mock fetch to verify it's not called
      global.fetch = jest.fn();
      
      await searchModule.search(testQuery);
      
      // Fetch should not be called - should use cache
      expect(global.fetch).not.toHaveBeenCalled();
      expect(searchModule.getState()).toBe('results');
    });

    test('should update last accessed time on cache hit', async () => {
      const testQuery = 'access time test';
      const testResults = mockResponses.successful_search.resources.results.products;
      const originalTime = Date.now() - 1000;
      
      // Setup cache with older timestamp
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: originalTime,
          lastAccessed: originalTime
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn();
      
      await searchModule.search(testQuery);
      
      // Should have updated the cache with new lastAccessed time
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'drawer_search_cache',
        expect.stringContaining(testQuery)
      );
    });

    test('should handle cache miss gracefully', async () => {
      const testQuery = 'not cached';
      
      // Empty cache
      mockLocalStorage.getItem.mockReturnValue('{}');
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      await searchModule.search(testQuery);
      
      // Should make API call
      expect(global.fetch).toHaveBeenCalled();
      expect(searchModule.getState()).toBe('results');
    });
  });

  describe('TTL (Time To Live) Management', () => {
    test('should expire cache entries after TTL', async () => {
      const testQuery = 'expired query';
      const testResults = mockResponses.successful_search.resources.results.products;
      const expiredTime = Date.now() - (3600000 + 1000); // 1 hour + 1 second ago
      
      // Setup cache with expired entry
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: expiredTime,
          lastAccessed: expiredTime
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      await searchModule.search(testQuery);
      
      // Should make API call because cache is expired
      expect(global.fetch).toHaveBeenCalled();
      
      // Should remove expired entry from cache
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'drawer_search_cache',
        expect.not.stringContaining('expired query')
      );
    });

    test('should use cache when within TTL', async () => {
      const testQuery = 'fresh query';
      const testResults = mockResponses.successful_search.resources.results.products;
      const recentTime = Date.now() - 1000; // 1 second ago
      
      // Setup cache with fresh entry
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: recentTime,
          lastAccessed: recentTime
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn();
      
      await searchModule.search(testQuery);
      
      // Should not make API call because cache is fresh
      expect(global.fetch).not.toHaveBeenCalled();
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle TTL boundary conditions', async () => {
      const testQuery = 'boundary test';
      const testResults = mockResponses.successful_search.resources.results.products;
      const boundaryTime = Date.now() - 3600000; // Exactly 1 hour ago
      
      // Setup cache with entry at TTL boundary
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: boundaryTime,
          lastAccessed: boundaryTime
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      await searchModule.search(testQuery);
      
      // Should make API call as entry is at boundary (expired)
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('LRU (Least Recently Used) Eviction', () => {
    test('should evict oldest entry when cache limit exceeded', async () => {
      const timers = TimerMockUtils.setupFakeTimers();
      
      // Create cache with 50 entries (at limit)
      const cacheData = {};
      for (let i = 0; i < 50; i++) {
        cacheData[`query${i}`] = {
          data: [],
          timestamp: Date.now(),
          lastAccessed: Date.now() - (i * 1000) // Older entries have earlier lastAccessed
        };
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Add new entry that should trigger eviction
      await searchModule.search('new query');
      
      // Should have evicted the oldest entry (query49)
      const savedCache = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'drawer_search_cache'
      );
      
      if (savedCache) {
        const cacheContent = savedCache[1];
        expect(cacheContent).not.toContain('query49'); // Oldest should be evicted
        expect(cacheContent).toContain('new query'); // New entry should be present
      }
      
      timers.cleanup();
    });

    test('should update lastAccessed time for LRU tracking', async () => {
      const testQuery = 'lru test';
      const testResults = mockResponses.successful_search.resources.results.products;
      const oldTime = Date.now() - 10000;
      
      // Setup cache with entry that has old lastAccessed time
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: Date.now() - 1000,
          lastAccessed: oldTime
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn();
      
      await searchModule.search(testQuery);
      
      // Should update lastAccessed time
      const savedCache = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'drawer_search_cache'
      );
      
      if (savedCache) {
        const cacheContent = JSON.parse(savedCache[1]);
        expect(cacheContent[testQuery].lastAccessed).toBeGreaterThan(oldTime);
      }
    });

    test('should handle cache eviction with mixed access patterns', async () => {
      // Create cache with entries having different access patterns
      const now = Date.now();
      const cacheData = {
        'recent_query': {
          data: [],
          timestamp: now - 1000,
          lastAccessed: now - 100 // Recently accessed
        },
        'old_query': {
          data: [],
          timestamp: now - 5000,
          lastAccessed: now - 5000 // Old access
        },
        'medium_query': {
          data: [],
          timestamp: now - 3000,
          lastAccessed: now - 1000 // Medium access
        }
      };
      
      // Fill up remaining slots to force eviction
      for (let i = 0; i < 47; i++) {
        cacheData[`filler${i}`] = {
          data: [],
          timestamp: now - 2000,
          lastAccessed: now - 2000
        };
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Add new entry that should evict the oldest accessed
      await searchModule.search('trigger_eviction');
      
      // Recent query should still be in cache
      const savedCache = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0] === 'drawer_search_cache'
      );
      
      if (savedCache) {
        const cacheContent = savedCache[1];
        expect(cacheContent).toContain('recent_query');
        expect(cacheContent).toContain('trigger_eviction');
      }
    });
  });

  describe('Storage Quota and Error Handling', () => {
    test('should handle localStorage quota exceeded gracefully', async () => {
      const quotaExceededStorage = LocalStorageMockUtils.createQuotaExceededLocalStorage();
      global.localStorage = quotaExceededStorage;
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should not crash when storage quota is exceeded
      await expect(searchModule.search('quota test')).resolves.not.toThrow();
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle localStorage being unavailable', async () => {
      // Remove localStorage entirely
      delete global.localStorage;
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should work without localStorage
      await searchModule.search('no storage test');
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle corrupted cache data', async () => {
      // Return invalid JSON
      mockLocalStorage.getItem.mockReturnValue('{ invalid json }');
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should handle corrupted cache gracefully
      await searchModule.search('corrupted cache test');
      expect(global.fetch).toHaveBeenCalled(); // Should make API call
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle cache with missing properties', async () => {
      // Cache entry missing required properties
      const malformedCache = {
        'incomplete_entry': {
          data: mockResponses.successful_search.resources.results.products
          // Missing timestamp and lastAccessed
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(malformedCache));
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should handle malformed cache entries
      await searchModule.search('incomplete_entry');
      expect(global.fetch).toHaveBeenCalled(); // Should make API call due to invalid cache
    });

    test('should handle localStorage exceptions during write', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage write failed');
      });
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should not crash on localStorage write failures
      await expect(searchModule.search('write error test')).resolves.not.toThrow();
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle localStorage exceptions during read', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage read failed');
      });
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should handle read failures gracefully and make API call
      await searchModule.search('read error test');
      expect(global.fetch).toHaveBeenCalled();
      expect(searchModule.getState()).toBe('results');
    });
  });

  describe('Cache Performance', () => {
    test('should provide fast cache hits', async () => {
      const testQuery = 'performance test';
      const testResults = mockResponses.successful_search.resources.results.products;
      
      // Setup cache with test data
      const cacheData = {
        [testQuery]: {
          data: testResults,
          timestamp: Date.now(),
          lastAccessed: Date.now()
        }
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(cacheData));
      
      global.fetch = jest.fn();
      
      const executionTime = await PerformanceTestUtils.measureExecutionTime(async () => {
        await searchModule.search(testQuery);
      });
      
      // Cache hits should be very fast (under 50ms)
      expect(executionTime).toBeLessThan(50);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should handle large cache efficiently', async () => {
      // Create cache with many entries
      const largeCacheData = {};
      for (let i = 0; i < 49; i++) {
        largeCacheData[`query${i}`] = {
          data: mockResponses.successful_search.resources.results.products,
          timestamp: Date.now(),
          lastAccessed: Date.now() - (i * 1000)
        };
      }
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(largeCacheData));
      
      global.fetch = jest.fn();
      
      const executionTime = await PerformanceTestUtils.measureExecutionTime(async () => {
        await searchModule.search('query25'); // Query in middle of cache
      });
      
      // Should handle large cache efficiently
      expect(executionTime).toBeLessThan(100);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Cache Key Management', () => {
    test('should use consistent cache keys for same queries', async () => {
      const testQuery = 'consistent key test';
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      await searchModule.search(testQuery);
      
      // Perform same search again
      await searchModule.search(testQuery);
      
      // Should use same cache key
      const setCalls = mockLocalStorage.setItem.mock.calls.filter(call => 
        call[0] === 'drawer_search_cache'
      );
      
      expect(setCalls.length).toBeGreaterThan(0);
      setCalls.forEach(call => {
        expect(call[1]).toContain(testQuery);
      });
    });

    test('should handle case sensitivity in cache keys', async () => {
      const lowerQuery = 'case test';
      const upperQuery = 'CASE TEST';
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      await searchModule.search(lowerQuery);
      await searchModule.search(upperQuery);
      
      // Should treat as different queries
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should handle special characters in cache keys', async () => {
      const specialQuery = 'test & special "chars" <script>';
      
      global.fetch = jest.fn(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockResponses.successful_search)
        })
      );
      
      // Should not crash with special characters
      await expect(searchModule.search(specialQuery)).resolves.not.toThrow();
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Cache Statistics and Monitoring', () => {
    test('should maintain cache size within limits', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 55; i++) {
        global.fetch = jest.fn(() => 
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponses.successful_search)
          })
        );
        
        await searchModule.search(`query${i}`);
      }
      
      // Check that cache doesn't exceed 50 entries
      const finalCache = mockLocalStorage.setItem.mock.calls
        .filter(call => call[0] === 'drawer_search_cache')
        .pop();
      
      if (finalCache) {
        const cacheContent = JSON.parse(finalCache[1]);
        expect(Object.keys(cacheContent)).toHaveLength(50);
      }
    });
  });
});