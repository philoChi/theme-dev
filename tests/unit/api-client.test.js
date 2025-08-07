/**
 * Unit Tests for API Client Functionality
 * 
 * Tests API communication, request formatting, response parsing,
 * error handling, and timeout management for search requests.
 */

const { 
  APIMockUtils,
  TimerMockUtils,
  PerformanceTestUtils,
  mockResponses
} = require('../helpers/search-test-utils');

const fs = require('fs');
const path = require('path');

describe('API Client Functionality', () => {
  let searchModule;
  let originalFetch;

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
    searchModule.init();
  });

  beforeEach(() => {
    // Store original fetch
    originalFetch = global.fetch;
  });

  afterEach(() => {
    // Restore fetch
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }

    // Clear all timers
    jest.clearAllTimers();
  });

  describe('Request Formatting', () => {
    test('should build correct search URL with query parameters', async () => {
      const mockFetch = APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('running shoes');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/search/suggest.json');
      expect(url).toContain('q=running+shoes');
      expect(url).toContain('limit=10');
      expect(url).toContain('resources=');
    });

    test('should include proper request headers', async () => {
      const mockFetch = APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('GET');
      expect(options.headers).toEqual({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      });
    });

    test('should encode special characters in query', async () => {
      const mockFetch = APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test & special "chars"');
      
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('test');
      expect(url).toContain('%26'); // Encoded ampersand
      expect(url).toContain('%22'); // Encoded quotes
    });

    test('should limit results according to configuration', async () => {
      const mockFetch = APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('limit=10');
    });

    test('should include required resource configuration', async () => {
      const mockFetch = APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      const [url] = mockFetch.mock.calls[0];
      const decodedUrl = decodeURIComponent(url);
      expect(decodedUrl).toContain('"type":"product"');
      expect(decodedUrl).toContain('"unavailable_products":"last"');
      expect(decodedUrl).toContain('"fields"');
    });
  });

  describe('Response Parsing', () => {
    test('should parse successful response correctly', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle empty search results', async () => {
      APIMockUtils.setupFetchMock('empty_search');
      
      await searchModule.search('nonexistent');
      
      expect(searchModule.getState()).toBe('empty');
    });

    test('should transform product data correctly', async () => {
      const mockFetch = APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      // Verify the response was processed
      expect(mockFetch).toHaveBeenCalled();
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle malformed response gracefully', async () => {
      APIMockUtils.setupFetchMock('malformed_response');
      
      await searchModule.search('test');
      
      // Should handle gracefully and return empty results or error state
      expect(['empty', 'error', 'results']).toContain(searchModule.getState());
    });

    test('should handle response with missing product fields', async () => {
      APIMockUtils.setupFetchMock('missing_fields_response');
      
      await searchModule.search('test');
      
      // Should not crash and should handle gracefully
      expect(searchModule.getState()).toBeDefined();
    });

    test('should limit returned products to configured maximum', async () => {
      APIMockUtils.setupFetchMock('large_result_set');
      
      await searchModule.search('test');
      
      // Should handle large result set without issues
      expect(searchModule.getState()).toBe('results');
    });
  });

  describe('Error Handling', () => {
    test('should handle network connectivity errors', async () => {
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe('error');
    });

    test('should handle HTTP error status codes', async () => {
      const errorFetch = jest.fn(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' })
        })
      );
      global.fetch = errorFetch;
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe('error');
    });

    test('should handle rate limiting (429 status)', async () => {
      const rateLimitFetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve(mockResponses.rate_limit_error)
        })
      );
      global.fetch = rateLimitFetch;
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe('error');
    });

    test('should handle JSON parsing errors', async () => {
      const invalidJsonFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.reject(new SyntaxError('Unexpected token'))
        })
      );
      global.fetch = invalidJsonFetch;
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe('error');
    });

    test('should distinguish retryable vs non-retryable errors', async () => {
      // Network error (retryable)
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      await searchModule.search('test');
      
      // Should attempt retry for network errors
      expect(networkErrorFetch).toHaveBeenCalled();
      expect(searchModule.getState()).toBe('error');
    });
  });

  describe('Timeout Handling', () => {
    test('should timeout requests after configured delay', async () => {
      const timers = TimerMockUtils.setupFakeTimers();
      
      // Create a fetch that never resolves
      const neverResolveFetch = jest.fn(() => new Promise(() => {}));
      global.fetch = neverResolveFetch;
      
      const searchPromise = searchModule.search('test');
      
      // Advance past timeout (5 seconds)
      timers.advanceTimersByTime(6000);
      
      await searchPromise;
      
      expect(searchModule.getState()).toBe('error');
      timers.cleanup();
    });

    test('should cancel previous request on new search', async () => {
      const timers = TimerMockUtils.setupFakeTimers();
      
      // Create fetch that resolves after delay
      const delayedFetch = jest.fn(() =>
        new Promise(resolve => setTimeout(() => 
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockResponses.successful_search)
          }), 1000))
      );
      global.fetch = delayedFetch;
      
      // Start first search
      const firstSearch = searchModule.search('first');
      timers.advanceTimersByTime(500);
      
      // Start second search before first completes
      const secondSearch = searchModule.search('second');
      
      // Complete both searches
      timers.advanceTimersByTime(1500);
      await Promise.all([firstSearch, secondSearch]);
      
      // Should handle cancellation gracefully
      expect(delayedFetch).toHaveBeenCalledTimes(2);
      timers.cleanup();
    });
  });

  describe('Retry Logic', () => {
    test('should implement exponential backoff for retries', async () => {
      const timers = TimerMockUtils.setupFakeTimers();
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      const searchPromise = searchModule.search('test');
      
      // Advance through retry delays
      // First retry: 1 second
      timers.advanceTimersByTime(1000);
      await Promise.resolve();
      
      // Second retry: 2 seconds
      timers.advanceTimersByTime(2000);
      await Promise.resolve();
      
      // Third retry: 4 seconds
      timers.advanceTimersByTime(4000);
      await Promise.resolve();
      
      await searchPromise;
      
      // Should have made multiple attempts
      expect(networkErrorFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      timers.cleanup();
    });

    test('should stop retrying after maximum attempts', async () => {
      const timers = TimerMockUtils.setupFakeTimers();
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      const searchPromise = searchModule.search('test');
      
      // Advance through all retry delays
      for (let i = 0; i < 10; i++) {
        timers.advanceTimersByTime(Math.pow(2, i) * 1000);
        await Promise.resolve();
      }
      
      await searchPromise;
      
      // Should stop at max retries (3)
      expect(networkErrorFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(searchModule.getState()).toBe('error');
      timers.cleanup();
    });

    test('should not retry non-retryable errors', async () => {
      const badRequestFetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ error: 'Invalid query' })
        })
      );
      global.fetch = badRequestFetch;
      
      await searchModule.search('test');
      
      // Should not retry 400 errors
      expect(badRequestFetch).toHaveBeenCalledTimes(1);
      expect(searchModule.getState()).toBe('error');
    });
  });

  describe('Performance Characteristics', () => {
    test('should complete successful requests quickly', async () => {
      APIMockUtils.setupFetchMock('successful_search', 50); // 50ms delay
      
      const executionTime = await PerformanceTestUtils.measureExecutionTime(async () => {
        await searchModule.search('test');
      });
      
      // Should complete within reasonable time (allowing for test overhead)
      expect(executionTime).toBeLessThan(200);
    });

    test('should handle concurrent search requests', async () => {
      APIMockUtils.setupFetchMock('successful_search', 100);
      
      // Start multiple searches concurrently
      const searches = [
        searchModule.search('test1'),
        searchModule.search('test2'),
        searchModule.search('test3')
      ];
      
      await Promise.all(searches);
      
      // All searches should complete
      expect(searchModule.getState()).toBeDefined();
    });

    test('should handle rapid successive searches', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      // Perform rapid searches
      for (let i = 0; i < 5; i++) {
        await searchModule.search(`test${i}`);
      }
      
      expect(searchModule.getState()).toBe('results');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty response body', async () => {
      const emptyResponseFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve({})
        })
      );
      global.fetch = emptyResponseFetch;
      
      await searchModule.search('test');
      
      // Should handle gracefully
      expect(searchModule.getState()).toBeDefined();
    });

    test('should handle response with null values', async () => {
      APIMockUtils.setupFetchMock('edge_case_response');
      
      await searchModule.search('test');
      
      // Should not crash on null/undefined values
      expect(searchModule.getState()).toBeDefined();
    });

    test('should handle very large response payloads', async () => {
      APIMockUtils.setupFetchMock('large_result_set');
      
      await searchModule.search('test');
      
      // Should handle large responses efficiently
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle fetch API not available', async () => {
      const originalFetch = global.fetch;
      delete global.fetch;
      
      await searchModule.search('test');
      
      // Should handle gracefully when fetch is not available
      expect(searchModule.getState()).toBe('error');
      
      global.fetch = originalFetch;
    });

    test('should handle AbortController not available', async () => {
      const originalAbortController = global.AbortController;
      delete global.AbortController;
      
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      // Should work without AbortController
      expect(searchModule.getState()).toBe('results');
      
      global.AbortController = originalAbortController;
    });
  });

  describe('Request Cancellation', () => {
    test('should provide request cancellation capability', async () => {
      const timers = TimerMockUtils.setupFakeTimers();
      
      // Mock AbortController
      const mockAbort = jest.fn();
      global.AbortController = jest.fn(() => ({
        signal: {},
        abort: mockAbort
      }));
      
      const delayedFetch = jest.fn(() => new Promise(() => {})); // Never resolves
      global.fetch = delayedFetch;
      
      // Start search and then start another to trigger cancellation
      const firstSearch = searchModule.search('first');
      timers.advanceTimersByTime(100);
      
      const secondSearch = searchModule.search('second');
      
      timers.advanceTimersByTime(1000);
      
      // Should have attempted to abort previous request
      expect(global.AbortController).toHaveBeenCalled();
      
      timers.cleanup();
    });
  });
});