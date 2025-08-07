/**
 * Unit Tests for Theme.DrawerSearch Module
 * 
 * Tests core search logic, state management, input handling, and integration
 * with existing drawer system components.
 */

const { 
  DOMTestUtils, 
  APIMockUtils, 
  LocalStorageMockUtils,
  TimerMockUtils,
  ThemeMockUtils,
  EventTestUtils,
  SearchStateUtils,
  mockResponses 
} = require('../helpers/search-test-utils');

// Mock the search module by requiring it as a string and evaluating
const fs = require('fs');
const path = require('path');

describe('Theme.DrawerSearch Module', () => {
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
    // Setup DOM structure
    const domSetup = DOMTestUtils.setupSearchDOM();
    domCleanup = domSetup.cleanup;

    // Setup localStorage mock
    mockLocalStorage = LocalStorageMockUtils.setupLocalStorageMock();

    // Setup notification mock
    ThemeMockUtils.setupNotificationMock();

    // Store original fetch
    originalFetch = global.fetch;

    // Reset module state by destroying and recreating
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

  describe('Module Initialization', () => {
    test('should initialize successfully with required DOM elements', () => {
      const result = searchModule.init();
      expect(result).toBe(true);
    });

    test('should fail initialization when search input is missing', () => {
      // Remove search input
      const searchInput = document.querySelector('[mpe="search-input"]');
      if (searchInput) {
        searchInput.parentNode.removeChild(searchInput);
      }

      const result = searchModule.init();
      expect(result).toBe(false);
    });

    test('should fail initialization when results container is missing', () => {
      // Remove results container
      const resultsContainer = document.querySelector('#SearchResults');
      if (resultsContainer) {
        resultsContainer.parentNode.removeChild(resultsContainer);
      }

      const result = searchModule.init();
      expect(result).toBe(false);
    });

    test('should not initialize twice', () => {
      const result1 = searchModule.init();
      const result2 = searchModule.init();
      
      expect(result1).toBe(true);
      expect(result2).toBe(true); // Should return true but not re-initialize
    });

    test('should dispatch initialization event on successful init', async () => {
      const eventPromise = EventTestUtils.waitForEvent('search:initialized');
      
      searchModule.init();
      
      const event = await eventPromise;
      expect(event.type).toBe('search:initialized');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should start in idle state', () => {
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.IDLE);
    });

    test('should transition to typing state when input has content', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      const event = EventTestUtils.createMockInputEvent('a'); // Less than min length
      
      searchInput.dispatchEvent(event);
      
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.TYPING);
    });

    test('should dispatch state change events', async () => {
      const stateChangePromise = EventTestUtils.waitForEvent('search:stateChange');
      
      const searchInput = document.querySelector('[mpe="search-input"]');
      const event = EventTestUtils.createMockInputEvent('test');
      
      searchInput.dispatchEvent(event);
      
      const stateEvent = await stateChangePromise;
      expect(stateEvent.detail).toHaveProperty('currentState');
      expect(stateEvent.detail).toHaveProperty('previousState');
    });
  });

  describe('Input Handling and Debouncing', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should not trigger search for queries less than 2 characters', () => {
      APIMockUtils.setupFetchMock('successful_search');
      const timers = TimerMockUtils.setupFakeTimers();

      const searchInput = document.querySelector('[mpe="search-input"]');
      const event = EventTestUtils.createMockInputEvent('a');
      
      searchInput.dispatchEvent(event);
      timers.advanceTimersByTime(350); // More than debounce delay

      expect(global.fetch).not.toHaveBeenCalled();
      timers.cleanup();
    });

    test('should debounce input with 300ms delay', () => {
      APIMockUtils.setupFetchMock('successful_search');
      const timers = TimerMockUtils.setupFakeTimers();

      const searchInput = document.querySelector('[mpe="search-input"]');
      
      // Type multiple characters rapidly
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent('te'));
      timers.advanceTimersByTime(100);
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent('tes'));
      timers.advanceTimersByTime(100);
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent('test'));
      
      // API should not be called yet
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Advance past debounce delay
      timers.advanceTimersByTime(350);
      
      // API should be called only once
      expect(global.fetch).toHaveBeenCalledTimes(1);
      timers.cleanup();
    });

    test('should reset debounce timer on new input', () => {
      APIMockUtils.setupFetchMock('successful_search');
      const timers = TimerMockUtils.setupFakeTimers();

      const searchInput = document.querySelector('[mpe="search-input"]');
      
      // Start typing
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent('test'));
      timers.advanceTimersByTime(250); // Almost at debounce limit
      
      // Type more before debounce completes
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent('testing'));
      timers.advanceTimersByTime(250); // Still within new debounce period
      
      // API should not be called yet
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Complete the debounce
      timers.advanceTimersByTime(100);
      
      // API should be called once with final query
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('testing')
      );
      timers.cleanup();
    });

    test('should clear results when input is empty', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      const resultsContainer = document.querySelector('#SearchResults');
      
      // Add some content to results
      resultsContainer.innerHTML = '<li>Test result</li>';
      
      // Clear input
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent(''));
      
      expect(resultsContainer.innerHTML).toBe('');
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.IDLE);
    });

    test('should handle escape key to clear search', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      const resultsContainer = document.querySelector('#SearchResults');
      
      // Set some input and results
      searchInput.value = 'test';
      resultsContainer.innerHTML = '<li>Test result</li>';
      
      // Press escape
      const escapeEvent = EventTestUtils.createMockKeyboardEvent('Escape');
      searchInput.dispatchEvent(escapeEvent);
      
      expect(searchInput.value).toBe('');
      expect(resultsContainer.innerHTML).toBe('');
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.IDLE);
    });
  });

  describe('API Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should build correct search URL with parameters', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('running shoes');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/suggest.json'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      );
      
      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toContain('q=running+shoes');
      expect(callUrl).toContain('limit=10');
    });

    test('should handle successful API response', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.RESULTS);
    });

    test('should handle empty search results', async () => {
      APIMockUtils.setupFetchMock('empty_search');
      
      await searchModule.search('nonexistent');
      
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.EMPTY);
    });

    test('should handle network errors with retry logic', async () => {
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      await searchModule.search('test');
      
      // Should attempt retry
      expect(networkErrorFetch).toHaveBeenCalledTimes(1);
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.ERROR);
    });

    test('should respect maximum retry attempts', async () => {
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      const timers = TimerMockUtils.setupFakeTimers();
      
      // Start search that will fail
      const searchPromise = searchModule.search('test');
      
      // Advance timers to trigger retries
      for (let i = 0; i < 4; i++) {
        timers.advanceTimersByTime(Math.pow(2, i) * 1000);
        await Promise.resolve(); // Allow promises to resolve
      }
      
      await searchPromise;
      
      // Should have tried 4 times total (initial + 3 retries)
      expect(networkErrorFetch).toHaveBeenCalledTimes(4);
      timers.cleanup();
    });

    test('should handle API timeout', async () => {
      const timeoutFetch = APIMockUtils.createTimeoutFetch(1000);
      global.fetch = timeoutFetch;
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.ERROR);
    });
  });

  describe('Manual Search Operations', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should perform manual search with valid query', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('manual test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('manual+test')
      );
    });

    test('should ignore manual search with invalid query', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('a'); // Too short
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should clear search results', () => {
      const resultsContainer = document.querySelector('#SearchResults');
      resultsContainer.innerHTML = '<li>Test result</li>';
      
      searchModule.clear();
      
      expect(resultsContainer.innerHTML).toBe('');
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.IDLE);
    });

    test('should retry last search', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      // Perform initial search
      await searchModule.search('retry test');
      
      // Reset mock to track retry call
      global.fetch.mockClear();
      
      // Retry
      await searchModule.retry();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('retry+test')
      );
    });
  });

  describe('Error Handling and Notifications', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should show error notification on network failure', async () => {
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      await searchModule.search('test');
      
      expect(window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        'error',
        5000
      );
    });

    test('should show timeout notification on request timeout', async () => {
      const timeoutFetch = APIMockUtils.createTimeoutFetch(100);
      global.fetch = timeoutFetch;
      
      await searchModule.search('test');
      
      expect(window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('timed out'),
        'error',
        5000
      );
    });

    test('should handle missing notification system gracefully', async () => {
      delete window.showNotification;
      const networkErrorFetch = APIMockUtils.createNetworkErrorFetch();
      global.fetch = networkErrorFetch;
      
      // Should not throw error
      await expect(searchModule.search('test')).resolves.toBeUndefined();
    });
  });

  describe('Module Destruction and Cleanup', () => {
    test('should clean up event listeners on destroy', () => {
      searchModule.init();
      
      const searchInput = document.querySelector('[mpe="search-input"]');
      const originalListenerCount = searchInput._listeners?.length || 0;
      
      searchModule.destroy();
      
      // Module should be marked as not initialized
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.IDLE);
    });

    test('should handle destroy when not initialized', () => {
      // Should not throw error
      expect(() => searchModule.destroy()).not.toThrow();
    });

    test('should clear pending timers on destroy', () => {
      const timers = TimerMockUtils.setupFakeTimers();
      searchModule.init();
      
      const searchInput = document.querySelector('[mpe="search-input"]');
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent('test'));
      
      // Should have pending timer
      expect(jest.getTimerCount()).toBeGreaterThan(0);
      
      searchModule.destroy();
      
      // Timers should be cleared
      expect(jest.getTimerCount()).toBe(0);
      timers.cleanup();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle rapid initialization attempts', () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(searchModule.init());
      }
      
      // All should succeed, but only first should actually initialize
      expect(results.every(r => r === true)).toBe(true);
    });

    test('should handle malformed API responses', async () => {
      APIMockUtils.setupFetchMock('invalid_json_response');
      
      await searchModule.search('test');
      
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.ERROR);
    });

    test('should handle API responses with missing fields', async () => {
      APIMockUtils.setupFetchMock('missing_fields_response');
      
      await searchModule.search('test');
      
      // Should not crash and should handle gracefully
      expect(searchModule.getState()).toBe(SearchStateUtils.STATES.RESULTS);
    });

    test('should handle extreme input values', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      
      // Very long input
      const longInput = 'x'.repeat(1000);
      searchInput.dispatchEvent(EventTestUtils.createMockInputEvent(longInput));
      
      // Should not crash
      expect(searchModule.getState()).toBeDefined();
    });

    test('should handle special characters in search query', async () => {
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('test & special "chars" <script>');
      
      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toContain('test');
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});