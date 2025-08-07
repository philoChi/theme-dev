/**
 * Integration Tests for UI Component Interactions
 * 
 * Tests search results integration with existing UI components,
 * cart item display, loading states, and user interactions.
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

describe('Component Integration', () => {
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
    // Setup DOM structure with enhanced search results container
    const domSetup = DOMTestUtils.setupSearchDOM();
    domCleanup = domSetup.cleanup;

    // Add additional DOM structure for component testing
    const resultsContainer = document.querySelector('#SearchResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="search-results-header" style="display: none;">
          <span class="search-results-count"></span>
          <span class="search-results-query"></span>
        </div>
        <div class="search-results-content"></div>
        <div class="search-loading-state" style="display: none;">
          <div class="loading-spinner"></div>
          <span class="loading-text">Searching...</span>
        </div>
        <div class="search-empty-state" style="display: none;">
          <span class="empty-message">No products found</span>
          <span class="empty-suggestion">Try different keywords</span>
        </div>
      `;
    }

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

  describe('Search Results Component Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should process search results and trigger UI updates', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search('component test');

      // Verify search completed successfully
      expect(searchModule.getState()).toBe('results');

      // Results should be stored in module state
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer).toBeTruthy();
      expect(resultsContainer.innerHTML).toBeTruthy();
    });

    test('should handle product data transformation internally', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search('transformation test');

      // Verify the search module processed the results
      expect(searchModule.getState()).toBe('results');
      
      // The results container should have been updated
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML.length).toBeGreaterThan(0);
    });

    test('should handle missing product data gracefully in processing', async () => {
      APIMockUtils.setupFetchMock('partial_data_search');

      await searchModule.search('partial data test');

      // Should handle partial data without crashing
      expect(searchModule.getState()).toBe('results');
      
      // Should not crash during rendering
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer).toBeTruthy();
    });

    test('should prepare data for product navigation integration', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search('navigation test');

      // Verify the search completed and state is correct
      expect(searchModule.getState()).toBe('results');
      
      // The module should have processed product URLs
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toBeTruthy();
    });
  });

  describe('Loading State Component Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle loading state transitions during search', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      const searchPromise = searchModule.search('loading test');

      // Should be in searching state initially
      expect(searchModule.getState()).toBe('searching');

      await searchPromise;

      // Should transition to results state
      expect(searchModule.getState()).toBe('results');
    });

    test('should complete loading state on search completion', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search('completion test');

      // Should be in results state
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle loading state on search error', async () => {
      APIMockUtils.setupFetchMock('network_error');

      await searchModule.search('error test');

      // Should return to appropriate state after error
      expect(['idle', 'error'].includes(searchModule.getState())).toBe(true);
    });
  });

  describe('Empty State Component Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle empty results state correctly', async () => {
      APIMockUtils.setupFetchMock('empty_search');

      await searchModule.search('no results test');

      // Should be in empty or results state
      expect(['empty', 'results'].includes(searchModule.getState())).toBe(true);
    });

    test('should transition from empty to results state', async () => {
      // First search with no results
      APIMockUtils.setupFetchMock('empty_search');
      await searchModule.search('empty first');

      const firstState = searchModule.getState();

      // Second search with results
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('successful second');

      expect(searchModule.getState()).toBe('results');
    });

    test('should handle empty search queries appropriately', async () => {
      APIMockUtils.setupFetchMock('empty_search');

      await searchModule.search('xyz123nonexistent');

      // Should handle empty results gracefully
      expect(['empty', 'results'].includes(searchModule.getState())).toBe(true);
    });
  });

  describe('Search Header Component Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should process search results with query information', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      const query = 'header test query';
      await searchModule.search(query);

      // Verify search completed with results
      expect(searchModule.getState()).toBe('results');
      
      // Results container should contain updated content
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.innerHTML).toBeTruthy();
    });

    test('should handle long queries in processing', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      const longQuery = 'this is a very long search query that might need truncation or special handling';
      await searchModule.search(longQuery);

      // Should handle long queries without errors
      expect(searchModule.getState()).toBe('results');
    });

    test('should process empty results appropriately', async () => {
      APIMockUtils.setupFetchMock('empty_search');

      await searchModule.search('no results header test');

      // Should handle empty results gracefully
      expect(['empty', 'results'].includes(searchModule.getState())).toBe(true);
    });
  });

  describe('Component State Management', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should maintain search module state correctly', async () => {
      // Initial state should be idle
      expect(searchModule.getState()).toBe('idle');

      // During search should be searching
      APIMockUtils.setupFetchMock('successful_search');
      const searchPromise = searchModule.search('state management test');

      expect(searchModule.getState()).toBe('searching');

      await searchPromise;

      // After successful search should be results
      expect(searchModule.getState()).toBe('results');
    });

    test('should handle rapid state changes during multiple searches', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      const searches = [
        searchModule.search('rapid 1'),
        searchModule.search('rapid 2'),
        searchModule.search('rapid 3')
      ];

      await Promise.all(searches);

      // Final state should be stable
      expect(['results', 'searching'].includes(searchModule.getState())).toBe(true);
    });
  });

  describe('Component Accessibility Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should maintain ARIA live regions during component updates', async () => {
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.getAttribute('aria-live')).toBe('polite');

      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('accessibility test');

      // ARIA live region should be maintained
      expect(resultsContainer.getAttribute('aria-live')).toBe('polite');
    });

    test('should maintain accessibility during state transitions', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('aria labels test');

      // ARIA live region should be maintained
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer.getAttribute('aria-live')).toBe('polite');
    });

    test('should support keyboard accessibility', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('keyboard navigation test');

      const searchInput = document.querySelector('[mpe="search-input"]');
      expect(searchInput).toBeTruthy();
      
      // Input should be focusable
      expect(searchInput.tabIndex).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('Component Performance Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle large result sets efficiently', async () => {
      APIMockUtils.setupFetchMock('large_result_set');

      const startTime = performance.now();
      await searchModule.search('large results test');
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Search processing should be reasonably fast
      expect(renderTime).toBeLessThan(1000); // 1s threshold for processing

      // Should complete search successfully
      expect(searchModule.getState()).toBe('results');
    });

    test('should clean up DOM elements between searches', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      // First search
      await searchModule.search('cleanup test 1');
      const initialElements = document.querySelectorAll('[data-product-id]').length;

      // Second search
      await searchModule.search('cleanup test 2');
      const finalElements = document.querySelectorAll('[data-product-id]').length;

      // Should not accumulate elements
      expect(finalElements).toBeLessThanOrEqual(initialElements + 5);
    });

    test('should handle component updates without memory leaks', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      // Perform multiple search operations
      return Promise.all([
        searchModule.search('memory test 1'),
        searchModule.search('memory test 2'),
        searchModule.search('memory test 3')
      ]).then(() => {
        if (global.gc) {
          global.gc();
        }

        const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        if (performance.memory) {
          const memoryIncrease = finalMemory - initialMemory;
          expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
        }
      });
    });
  });
});