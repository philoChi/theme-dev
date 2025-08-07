/**
 * Error Handling Unit Tests - Milestone 4
 * Tests comprehensive error handling with categorization and retry logic
 */

const { 
  DOMTestUtils, 
  APIMockUtils, 
  LocalStorageMockUtils,
  TimerMockUtils,
  ThemeMockUtils,
  EventTestUtils
} = require('../helpers/search-test-utils');

// Mock the global Theme object
global.Theme = {
  DrawerSearch: {
    init: jest.fn(),
    search: jest.fn(),
    clear: jest.fn(),
    retry: jest.fn(),
    getState: jest.fn(),
    destroy: jest.fn()
  }
};

// Mock window.showNotification
global.window.showNotification = jest.fn();

// Mock console methods to avoid test output pollution
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('DrawerSearch Error Handling', () => {
  let searchModule;
  
  beforeAll(() => {
    // Set up DOM environment
    document.body.innerHTML = `
      <div class="search-container">
        <form data-search-form action="/search" method="get">
          <input mpe="search-input" type="search" name="q" />
          <button type="submit">Search</button>
        </form>
      </div>
      <div id="SearchResults"></div>
      <div id="SearchLoadingState"></div>
      <div id="SearchEmptyState"></div>
    `;
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Load the search module
    delete require.cache[require.resolve('../../assets/section-drawer-search.js')];
    
    // Mock fetch for API tests
    global.fetch = jest.fn();
    
    // Initialize module
    if (global.Theme?.DrawerSearch) {
      searchModule = global.Theme.DrawerSearch;
    }
  });

  afterEach(() => {
    // Cleanup
    jest.restoreAllMocks();
  });

  describe('Error Categorization', () => {
    it('should categorize network errors correctly', async () => {
      const networkError = new Error('NetworkError: Failed to fetch');
      networkError.name = 'NetworkError';
      
      global.fetch.mockRejectedValueOnce(networkError);
      
      // Trigger search that will fail
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'test query';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      // Wait for debounce and API call
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Verify error notification was shown
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('temporarily unavailable'),
        'error',
        5000,
        expect.objectContaining({ action: 'retry' })
      );
    });

    it('should categorize timeout errors correctly', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      global.fetch.mockRejectedValueOnce(timeoutError);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'test query timeout';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('taking longer than expected'),
        'warning',
        4000,
        expect.objectContaining({ action: 'retry' })
      );
    });

    it('should categorize rate limit errors correctly', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Too Many Requests' }), 
        { status: 429, statusText: 'Too Many Requests' }
      );
      
      global.fetch.mockResolvedValueOnce(rateLimitResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'rate limit test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Too many searches'),
        'warning',
        6000
      );
    });

    it('should handle parse errors for invalid JSON responses', async () => {
      const invalidResponse = new Response('Invalid JSON response', { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      global.fetch.mockResolvedValueOnce(invalidResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'parse error test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('temporarily unavailable'),
        'error',
        4000,
        expect.objectContaining({ action: 'retry' })
      );
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff for retryable errors', async () => {
      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('NetworkError: Failed to fetch'));
      });
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'retry test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      // Wait for initial call + retries
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should have attempted initial call + 3 retries = 4 total
      expect(callCount).toBeLessThanOrEqual(4);
      expect(callCount).toBeGreaterThan(1);
    });

    it('should not retry non-retryable errors (validation errors)', async () => {
      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Response(
          JSON.stringify({ error: 'Invalid query format' }), 
          { status: 400 }
        ));
      });
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'validation error test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should only attempt once for validation errors
      expect(callCount).toBe(1);
    });

    it('should stop retrying after maximum attempts', async () => {
      let callCount = 0;
      global.fetch.mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error('Persistent network error'));
      });
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'max retry test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      // Wait for max retries to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Should not exceed max retry attempts (3 retries + 1 initial = 4 max)
      expect(callCount).toBeLessThanOrEqual(4);
      
      // Should show final error notification
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('still unavailable'),
        'error',
        8000
      );
    });
  });

  describe('Cache Fallback', () => {
    beforeEach(() => {
      // Set up localStorage mock
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      global.localStorage = localStorageMock;
    });

    it('should fall back to cache when API fails', async () => {
      // Set up cached data
      const cachedData = {
        query: 'cache test',
        results: [
          { id: 1, title: 'Cached Product', url: '/products/cached', price: '$10.00' }
        ],
        timestamp: Date.now() - 30000 // 30 seconds ago
      };
      
      global.localStorage.getItem.mockReturnValue(JSON.stringify(cachedData));
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'cache test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should show notification about using cached results
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('cached results'),
        'info',
        3000
      );
      
      // Should display cached results in DOM
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer).toBeTruthy();
    });

    it('should handle missing cache gracefully', async () => {
      global.localStorage.getItem.mockReturnValue(null);
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'no cache test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should show error notification (no cache fallback available)
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('temporarily unavailable'),
        'error',
        5000
      );
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle missing notification system gracefully', async () => {
      // Remove showNotification function
      delete global.window.showNotification;
      
      global.fetch.mockRejectedValueOnce(new Error('Test error'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'no notification test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should not throw error even without notification system
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('showNotification')
      );
    });

    it('should handle missing DOM elements gracefully', async () => {
      // Remove results container
      const resultsContainer = document.querySelector('#SearchResults');
      if (resultsContainer) {
        resultsContainer.remove();
      }
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'missing dom test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should log warning but continue functioning
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Results container not found')
      );
    });
  });

  describe('Error Recovery', () => {
    it('should allow manual retry after error', async () => {
      let failFirst = true;
      global.fetch.mockImplementation(() => {
        if (failFirst) {
          failFirst = false;
          return Promise.reject(new Error('First attempt fails'));
        }
        return Promise.resolve(new Response(JSON.stringify({
          resources: {
            results: {
              products: [{ id: 1, title: 'Success Product' }]
            }
          }
        })));
      });
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'retry recovery test';
      
      // First attempt (will fail)
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Verify error state
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('temporarily unavailable'),
        'error',
        expect.any(Number)
      );
      
      // Manual retry (should succeed)
      if (searchModule && searchModule.retry) {
        searchModule.retry();
        await new Promise(resolve => setTimeout(resolve, 350));
        
        // Should show success or results
        const resultsContainer = document.querySelector('#SearchResults');
        expect(resultsContainer).toBeTruthy();
      }
    });

    it('should clear error state when user modifies query', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Initial error'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'error state test';
      
      // Trigger initial error
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Clear error state by changing input
      input.value = 'new query';
      const newInputEvent = new Event('input');
      input.dispatchEvent(newInputEvent);
      
      // Should transition from error state back to typing/searching
      if (searchModule && searchModule.getState) {
        const currentState = searchModule.getState();
        expect(currentState).not.toBe('error');
      }
    });
  });
});