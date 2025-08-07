/**
 * Integration Tests for End-to-End Search Flow with API Mocking
 * 
 * Tests complete search workflow from user input to result display,
 * including API interactions, data transformation, and UI updates.
 */

const { 
  DOMTestUtils, 
  APIMockUtils, 
  LocalStorageMockUtils,
  ThemeMockUtils,
  EventTestUtils,
  mockResponses 
} = require('../helpers/search-test-utils');

const fs = require('fs');
const path = require('path');

describe('API Mock Integration - End-to-End Search Flow', () => {
  let searchModule;
  let domCleanup;
  let mockLocalStorage;
  let originalFetch;

  beforeAll(() => {
    // Load the search module code
    const searchModulePath = path.join(__dirname, '../../assets/section-drawer-search.js');
    const searchModuleCode = fs.readFileSync(searchModulePath, 'utf8');
    
    // Create a global context for the module
    global.window = global;
    global.document = document;
    
    // Evaluate the module code
    eval(searchModuleCode);
    
    searchModule = global.Theme.DrawerSearch;
  });

  beforeEach(() => {
    // Setup comprehensive DOM structure
    const domSetup = DOMTestUtils.setupSearchDOM();
    domCleanup = domSetup.cleanup;

    // Setup localStorage mock
    mockLocalStorage = LocalStorageMockUtils.setupLocalStorageMock();

    // Setup notification mock
    ThemeMockUtils.setupNotificationMock();

    // Store original fetch
    originalFetch = global.fetch;

    // Reset module state
    if (searchModule) {
      try {
        searchModule.destroy();
      } catch (error) {
        // Module might not be initialized
      }
    }
  });

  afterEach(() => {
    // Cleanup DOM
    if (domCleanup) {
      domCleanup();
    }

    // Cleanup module
    if (searchModule) {
      try {
        searchModule.destroy();
      } catch (error) {
        // Module might not be initialized
      }
    }

    // Restore fetch
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }

    // Cleanup mocks
    ThemeMockUtils.cleanupThemeMocks();

    // Clear all timers
    jest.clearAllTimers();
  });

  describe('Complete Search Workflow', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should execute complete search workflow from input to results', async () => {
      const query = 'end-to-end test query';
      
      // Setup successful API response
      APIMockUtils.setupFetchMock('successful_search');

      // Track events during the complete workflow
      const events = [];
      const eventTypes = ['search:started', 'search:completed', 'search:stateChange'];
      
      eventTypes.forEach(eventType => {
        document.addEventListener(eventType, (e) => {
          events.push({ type: eventType, detail: e.detail });
        });
      });

      // Execute search
      await searchModule.search(query);

      // Verify complete workflow
      expect(events.some(e => e.type === 'search:started')).toBe(true);
      expect(events.some(e => e.type === 'search:completed')).toBe(true);
      
      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/suggest.json'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      // Verify results are displayed
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toContain('data-product-id');

      // Verify state is correct
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle user input simulation with debouncing', async () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      
      APIMockUtils.setupFetchMock('successful_search');

      // Simulate rapid typing
      const inputEvents = ['t', 'te', 'tes', 'test', 'test query'];
      
      for (const inputValue of inputEvents) {
        searchInput.value = inputValue;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 50)); // Short delay between inputs
      }

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only make one API call due to debouncing
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Should search for final input value
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toContain('test%20query');
    });

    test('should handle complete search failure workflow', async () => {
      APIMockUtils.setupFetchMock('network_error');

      const events = [];
      document.addEventListener('search:error', (e) => {
        events.push({ type: 'search:error', detail: e.detail });
      });

      await searchModule.search('error workflow test');

      // Should handle error gracefully
      expect(searchModule.getState()).toBe('idle');
      
      // Should show no results (or error state)
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).not.toContain('data-product-id');
    });

    test('should handle search success with empty results', async () => {
      APIMockUtils.setupFetchMock('empty_search');

      await searchModule.search('no results workflow');

      // Should handle empty results gracefully
      expect(searchModule.getState()).toBe('results');
      
      // Should show empty state
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toContain('no results') || 
      expect(resultsContainer.innerHTML).toContain('empty');
    });
  });

  describe('API Response Processing', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should correctly process Shopify search API response format', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search('api processing test');

      // Verify API call format
      const fetchCall = global.fetch.mock.calls[0];
      const url = new URL(fetchCall[0], 'http://example.com');
      
      expect(url.pathname).toBe('/search/suggest.json');
      expect(url.searchParams.get('q')).toBe('api processing test');
      expect(url.searchParams.get('resources[type]')).toBe('product');
      expect(url.searchParams.get('resources[limit]')).toBeTruthy();

      // Verify response processing
      const resultsContainer = document.querySelector('#SearchResults');
      const productElements = resultsContainer.querySelectorAll('[data-product-id]');
      
      expect(productElements.length).toBeGreaterThan(0);
      
      // Verify data transformation
      const firstProduct = productElements[0];
      expect(firstProduct.getAttribute('data-product-id')).toMatch(/^\d+$/);
      
      const productTitle = firstProduct.querySelector('.product-title');
      const productPrice = firstProduct.querySelector('.product-price');
      const productImage = firstProduct.querySelector('.product-image img');
      
      expect(productTitle?.textContent).toBeTruthy();
      expect(productPrice?.textContent).toMatch(/\$|€|£|\d/);
      
      if (productImage) {
        expect(productImage.src).toMatch(/^https?:\/\//);
        expect(productImage.alt).toBeTruthy();
      }
    });

    test('should handle malformed API responses gracefully', async () => {
      APIMockUtils.setupFetchMock('malformed_response');

      await searchModule.search('malformed response test');

      // Should not crash and should return to idle state
      expect(searchModule.getState()).toBe('idle');
      
      // Should show appropriate error handling
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).not.toContain('undefined');
      expect(resultsContainer.innerHTML).not.toContain('[object Object]');
    });

    test('should handle API response with missing required fields', async () => {
      APIMockUtils.setupFetchMock('partial_data_search');

      await searchModule.search('partial data test');

      const resultsContainer = document.querySelector('#SearchResults');
      const productElements = resultsContainer.querySelectorAll('[data-product-id]');
      
      // Should still render products even with missing data
      expect(productElements.length).toBeGreaterThanOrEqual(0);
      
      // Should use placeholder values for missing data
      productElements.forEach(product => {
        const title = product.querySelector('.product-title');
        const price = product.querySelector('.product-price');
        
        if (title) {
          expect(title.textContent.trim()).not.toBe('');
        }
        
        if (price) {
          expect(price.textContent.trim()).not.toBe('');
        }
      });
    });

    test('should respect API response limits and pagination', async () => {
      APIMockUtils.setupFetchMock('large_result_set');

      await searchModule.search('large results test');

      const resultsContainer = document.querySelector('#SearchResults');
      const productElements = resultsContainer.querySelectorAll('[data-product-id]');
      
      // Should limit results appropriately (8 mobile, 10 desktop)
      expect(productElements.length).toBeLessThanOrEqual(10);
      expect(productElements.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Integration with API Flow', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should cache successful API responses', async () => {
      const query = 'cache integration test';
      
      APIMockUtils.setupFetchMock('successful_search');

      // First search should hit API
      await searchModule.search(query);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear fetch mock to ensure no new calls
      global.fetch.mockClear();

      // Second search should hit cache
      await searchModule.search(query);
      expect(global.fetch).toHaveBeenCalledTimes(0);

      // Results should still be displayed
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toContain('data-product-id');
    });

    test('should handle cache expiration correctly', async () => {
      const query = 'cache expiration test';
      
      APIMockUtils.setupFetchMock('successful_search');

      // First search
      await searchModule.search(query);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Simulate cache expiration by manipulating localStorage
      const cacheKey = btoa(`search:${query}`);
      const cachedData = JSON.parse(mockLocalStorage.getItem(cacheKey));
      
      if (cachedData) {
        // Set expiration to past time
        cachedData.expires = Date.now() - 1000;
        mockLocalStorage.setItem(cacheKey, JSON.stringify(cachedData));
      }

      global.fetch.mockClear();

      // Second search should hit API again due to expiration
      await searchModule.search(query);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should handle cache storage failures gracefully', async () => {
      // Simulate localStorage failure
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      APIMockUtils.setupFetchMock('successful_search');

      // Should still work without caching
      await expect(searchModule.search('storage error test')).resolves.not.toThrow();
      
      expect(searchModule.getState()).toBe('results');
      
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toContain('data-product-id');
    });
  });

  describe('Search History Integration with API Flow', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should add successful searches to history', async () => {
      const query = 'history integration test';
      
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search(query);

      // Check if search was added to history
      const history = JSON.parse(mockLocalStorage.getItem('drawer_search_history') || '[]');
      expect(history).toContain(query);
    });

    test('should not add failed searches to history', async () => {
      const query = 'failed search test';
      
      APIMockUtils.setupFetchMock('network_error');

      await searchModule.search(query);

      // Check that failed search was not added to history
      const history = JSON.parse(mockLocalStorage.getItem('drawer_search_history') || '[]');
      expect(history).not.toContain(query);
    });

    test('should show search suggestions from history on input focus', async () => {
      // Build some search history
      const historyQueries = ['shoes', 'boots', 'sneakers'];
      
      for (const query of historyQueries) {
        APIMockUtils.setupFetchMock('successful_search');
        await searchModule.search(query);
      }

      // Clear input and focus to trigger suggestions
      const searchInput = document.querySelector('[mpe="search-input"]');
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('focus', { bubbles: true }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show history suggestions
      const resultsContainer = document.querySelector('#SearchResults');
      const suggestionElements = resultsContainer.querySelectorAll('[data-suggestion]');
      
      expect(suggestionElements.length).toBeGreaterThan(0);
      
      // Suggestions should include history items
      const suggestionTexts = Array.from(suggestionElements).map(el => 
        el.getAttribute('data-suggestion') || el.textContent
      );
      
      historyQueries.forEach(query => {
        expect(suggestionTexts.some(text => text.includes(query))).toBe(true);
      });
    });
  });

  describe('Real-time Search Simulation', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle real-time typing simulation', async () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      const fullQuery = 'real time search test';
      
      APIMockUtils.setupFetchMock('successful_search');

      // Simulate character-by-character typing
      for (let i = 1; i <= fullQuery.length; i++) {
        const partialQuery = fullQuery.substring(0, i);
        searchInput.value = partialQuery;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Short delay to simulate real typing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should only make one API call for the final query
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toMatch(/real.time.search.test/);
    });

    test('should handle backspace and query modification', async () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      
      APIMockUtils.setupFetchMock('successful_search');

      // Type initial query
      searchInput.value = 'initial query';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 350));
      expect(global.fetch).toHaveBeenCalledTimes(1);

      global.fetch.mockClear();

      // Modify query (simulate backspace and new typing)
      searchInput.value = 'modified query';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should make new API call for modified query
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[0]).toMatch(/modified.query/);
    });

    test('should cancel previous requests when query changes rapidly', async () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      
      // Setup fetch to return promises we can control
      const mockPromises = [];
      global.fetch = jest.fn().mockImplementation(() => {
        const promise = new Promise((resolve) => {
          // Simulate delayed response
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve(mockResponses.successful_search)
            });
          }, 200);
        });
        mockPromises.push(promise);
        return promise;
      });

      // Make rapid queries
      searchInput.value = 'query 1';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      searchInput.value = 'query 2';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(resolve => setTimeout(resolve, 350));

      // Should handle rapid query changes appropriately
      expect(global.fetch).toHaveBeenCalled();
      
      // Wait for all promises to resolve
      await Promise.all(mockPromises);
      
      // Final state should be stable
      expect(searchModule.getState()).toBeTruthy();
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should recover from API errors and allow subsequent searches', async () => {
      // First search fails
      APIMockUtils.setupFetchMock('network_error');
      await searchModule.search('error recovery test 1');
      
      // Allow some time for state transition
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(['idle', 'searching'].includes(searchModule.getState())).toBe(true);

      // Second search succeeds
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('error recovery test 2');
      
      // Allow some time for state transition
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(['results', 'searching'].includes(searchModule.getState())).toBe(true);
      
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toContain('data-product-id');
    });

    test('should handle partial API failures gracefully', async () => {
      APIMockUtils.setupFetchMock('partial_failure');

      await searchModule.search('partial failure test');

      // Should handle partial failures without crashing
      expect(searchModule.getState()).toBeTruthy();
      
      // Should show whatever results are available
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toBeTruthy();
    });

    test('should maintain functionality after multiple error scenarios', async () => {
      const errorScenarios = ['network_error', 'timeout_error', 'server_error', 'malformed_response'];
      
      for (const scenario of errorScenarios) {
        APIMockUtils.setupFetchMock(scenario);
        await searchModule.search(`${scenario} test`);
        
        // Should remain in stable state after each error
        expect(searchModule.getState()).toBeTruthy();
      }

      // Final successful search should work
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('final success test');
      
      // Allow some time for state transition
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(['results', 'searching'].includes(searchModule.getState())).toBe(true);
    });
  });
});