/**
 * Shared Test Utilities for Multi-Drawer Search Feature
 * 
 * Provides common setup functions, API mocking helpers, and DOM testing utilities
 * for search component interaction testing across unit and integration tests.
 */

const mockResponses = require('../fixtures/search-api-responses.json');

/**
 * DOM Testing Utilities
 */
const DOMTestUtils = {
  /**
   * Create a mock search input element with proper attributes
   */
  createMockSearchInput(id = 'test-search-input') {
    const input = document.createElement('input');
    input.type = 'search';
    input.id = id;
    input.setAttribute('mpe', 'search-input');
    input.className = 'search-input';
    input.placeholder = 'Search products...';
    input.maxLength = 256;
    input.autocomplete = 'off';
    return input;
  },

  /**
   * Create a mock results container element with all required sub-containers
   */
  createMockResultsContainer(id = 'SearchResults') {
    const container = document.createElement('div');
    container.id = id;
    container.className = 'drawer__items';
    container.setAttribute('aria-live', 'polite');
    
    // Create sub-containers that the implementation expects
    container.innerHTML = `
      <div id="SearchLoadingState" style="display: none;">
        <div class="loading-spinner"></div>
        <span class="loading-text">Searching...</span>
      </div>
      <ul id="SearchResultsList" style="display: none;" class="drawer__items">
      </ul>
      <div id="SearchEmptyState" style="display: none;">
        <span class="empty-message">No products found</span>
        <span class="empty-suggestion">Try different keywords</span>
      </div>
      <div id="SearchDefaultState" style="display: block;">
        <span class="default-message">Start typing to search</span>
      </div>
    `;
    
    return container;
  },

  /**
   * Create a complete mock drawer structure
   */
  createMockDrawerStructure() {
    const drawer = document.createElement('div');
    drawer.id = 'multi-drawer';
    drawer.className = 'multi-drawer drawer';

    const header = document.createElement('div');
    header.className = 'drawer__header';
    header.id = 'drawer__header__search';

    const content = document.createElement('div');
    content.className = 'drawer__content';
    content.id = 'drawer__content__search';

    const searchInput = this.createMockSearchInput();
    const resultsContainer = this.createMockResultsContainer();
    
    // Create "Show All" button that the implementation expects
    const showAllButton = document.createElement('a');
    showAllButton.id = 'SearchShowAllButton';
    showAllButton.href = '/search';
    showAllButton.className = 'btn btn--secondary';
    showAllButton.textContent = 'Show All Results';
    
    // Create a search form for progressive enhancement
    const searchForm = document.createElement('form');
    searchForm.setAttribute('data-search-form', '');
    searchForm.action = '/search';
    searchForm.method = 'get';
    searchForm.appendChild(searchInput);

    header.appendChild(searchForm);
    content.appendChild(resultsContainer);
    content.appendChild(showAllButton);
    drawer.appendChild(header);
    drawer.appendChild(content);

    return {
      drawer,
      header,
      content,
      searchInput,
      resultsContainer,
      showAllButton,
      searchForm
    };
  },

  /**
   * Setup DOM with required elements for search testing
   */
  setupSearchDOM() {
    const { drawer, searchInput, resultsContainer } = this.createMockDrawerStructure();
    document.body.appendChild(drawer);
    
    return {
      drawer,
      searchInput,
      resultsContainer,
      cleanup: () => {
        if (drawer.parentNode) {
          drawer.parentNode.removeChild(drawer);
        }
      }
    };
  },

  /**
   * Create a mock product element for testing
   */
  createMockProductElement(product) {
    const li = document.createElement('li');
    li.className = 'cart-drawer__item';
    
    const content = document.createElement('div');
    content.className = 'cart-drawer__item-content';
    
    const link = document.createElement('a');
    link.href = product.url;
    link.className = 'cart-drawer__item-link';
    
    const image = document.createElement('img');
    image.src = product.featured_image || '/assets/product-placeholder.svg';
    image.alt = product.title;
    
    const title = document.createElement('h4');
    title.className = 'cart-drawer__item-title';
    title.textContent = product.title;
    
    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = `${(product.price / 100).toFixed(2)}`;
    
    link.appendChild(image);
    link.appendChild(title);
    link.appendChild(price);
    content.appendChild(link);
    li.appendChild(content);
    
    return li;
  }
};

/**
 * API Mocking Helpers
 */
const APIMockUtils = {
  /**
   * Create a mock fetch function that returns specified response
   */
  createMockFetch(responseType = 'successful_search', delay = 0) {
    const response = mockResponses[responseType] || {};
    
    return jest.fn(() => {
      const isError = responseType.includes('error');
      const status = isError ? (response.status || 500) : 200;
      
      const mockResponse = {
        ok: status >= 200 && status < 300,
        status: status,
        statusText: isError ? (response.message || 'Error') : 'OK',
        headers: new Map(),
        url: '/search/suggest.json',
        timing: () => ({
          responseStart: Date.now() - 100,
          responseEnd: Date.now()
        }),
        json: jest.fn(() => {
          if (responseType === 'invalid_json_response') {
            return Promise.reject(new SyntaxError('Unexpected token'));
          }
          return Promise.resolve(response);
        }),
        text: jest.fn(() => Promise.resolve(JSON.stringify(response)))
      };

      if (delay > 0) {
        return new Promise(resolve => setTimeout(() => resolve(mockResponse), delay));
      }
      
      return Promise.resolve(mockResponse);
    });
  },

  /**
   * Create a mock fetch that throws network error
   */
  createNetworkErrorFetch() {
    return jest.fn(() => Promise.reject(new TypeError('Network request failed')));
  },

  /**
   * Create a mock fetch that times out
   */
  createTimeoutFetch(timeout = 5000) {
    return jest.fn(() => 
      new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      })
    );
  },

  /**
   * Setup global fetch mock with specified response
   */
  setupFetchMock(responseType = 'successful_search', delay = 0) {
    const mockFetch = this.createMockFetch(responseType, delay);
    global.fetch = mockFetch;
    return mockFetch;
  },

  /**
   * Reset fetch mock
   */
  resetFetchMock() {
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
    delete global.fetch;
  }
};

/**
 * Local Storage Mock Utilities
 */
const LocalStorageMockUtils = {
  /**
   * Create a mock localStorage implementation
   */
  createMockLocalStorage() {
    const store = {};
    
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: jest.fn((index) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }),
      // Expose store for testing
      _store: store
    };
  },

  /**
   * Setup localStorage mock
   */
  setupLocalStorageMock() {
    const mockLocalStorage = this.createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    return mockLocalStorage;
  },

  /**
   * Create localStorage that throws quota exceeded error
   */
  createQuotaExceededLocalStorage() {
    return {
      getItem: jest.fn(() => null),
      setItem: jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(() => null)
    };
  }
};

/**
 * Timer Mock Utilities
 */
const TimerMockUtils = {
  /**
   * Setup fake timers for debounce testing
   */
  setupFakeTimers() {
    jest.useFakeTimers();
    return {
      advanceTimersByTime: (ms) => jest.advanceTimersByTime(ms),
      runAllTimers: () => jest.runAllTimers(),
      runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
      cleanup: () => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
      }
    };
  },

  /**
   * Test debounce timing with fake timers
   */
  async testDebounce(fn, delay, iterations = 3) {
    const timers = this.setupFakeTimers();
    
    // Call function multiple times rapidly
    for (let i = 0; i < iterations; i++) {
      fn();
      if (i < iterations - 1) {
        timers.advanceTimersByTime(delay - 50); // Advance less than delay
      }
    }
    
    // Advance past the debounce delay
    timers.advanceTimersByTime(delay + 50);
    
    timers.cleanup();
  }
};

/**
 * Theme Mock Utilities
 */
const ThemeMockUtils = {
  /**
   * Setup Theme namespace with mocked DrawerSearch module
   */
  setupThemeMock() {
    window.Theme = window.Theme || {};
    
    // Create a minimal mock of DrawerSearch
    window.Theme.DrawerSearch = {
      init: jest.fn(() => true),
      search: jest.fn(),
      clear: jest.fn(),
      retry: jest.fn(),
      getState: jest.fn(() => 'idle'),
      destroy: jest.fn()
    };
    
    return window.Theme.DrawerSearch;
  },

  /**
   * Setup notification system mock
   */
  setupNotificationMock() {
    const mockFn = jest.fn((message, type, duration, options) => {
      return Promise.resolve({
        message,
        type,
        duration,
        options
      });
    });
    
    window.showNotification = mockFn;
    
    return {
      spy: mockFn,
      fn: mockFn
    };
  },

  /**
   * Clean up Theme mocks
   */
  cleanupThemeMocks() {
    if (window.Theme) {
      delete window.Theme.DrawerSearch;
    }
    if (window.showNotification) {
      delete window.showNotification;
    }
  }
};

/**
 * Event Testing Utilities
 */
const EventTestUtils = {
  /**
   * Create a mock event
   */
  createMockEvent(type, detail = {}) {
    return new CustomEvent(type, { detail });
  },

  /**
   * Create a mock input event
   */
  createMockInputEvent(value) {
    const event = new Event('input', { bubbles: true });
    Object.defineProperty(event, 'target', {
      value: { value },
      writable: false
    });
    return event;
  },

  /**
   * Create a mock keyboard event
   */
  createMockKeyboardEvent(key, type = 'keydown') {
    return new KeyboardEvent(type, {
      key,
      bubbles: true,
      cancelable: true
    });
  },

  /**
   * Wait for custom event to be dispatched
   */
  waitForEvent(eventType, timeout = 1000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        document.removeEventListener(eventType, handler);
        reject(new Error(`Event ${eventType} not dispatched within ${timeout}ms`));
      }, timeout);

      const handler = (event) => {
        clearTimeout(timeoutId);
        document.removeEventListener(eventType, handler);
        resolve(event);
      };

      document.addEventListener(eventType, handler);
    });
  }
};

/**
 * Search State Testing Utilities
 */
const SearchStateUtils = {
  /**
   * Valid search states
   */
  STATES: {
    IDLE: 'idle',
    TYPING: 'typing',
    DEBOUNCING: 'debouncing',
    SEARCHING: 'searching',
    RESULTS: 'results',
    EMPTY: 'empty',
    ERROR: 'error',
    RETRY: 'retry'
  },

  /**
   * Create mock state transition data
   */
  createMockStateTransition(fromState, toState, data = {}) {
    return {
      previousState: fromState,
      currentState: toState,
      data
    };
  },

  /**
   * Test state transition
   */
  expectStateTransition(mockFn, fromState, toState) {
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          previousState: fromState,
          currentState: toState
        })
      })
    );
  }
};

/**
 * Performance Testing Utilities
 */
const PerformanceTestUtils = {
  /**
   * Measure execution time of a function
   */
  async measureExecutionTime(fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  },

  /**
   * Test that a function executes within time limit
   */
  async expectExecutionTimeBelow(fn, maxTime) {
    const executionTime = await this.measureExecutionTime(fn);
    expect(executionTime).toBeLessThan(maxTime);
    return executionTime;
  },

  /**
   * Create a performance mock for timing tests
   */
  setupPerformanceMock() {
    const originalNow = performance.now;
    let mockTime = 0;
    
    performance.now = jest.fn(() => mockTime);
    
    return {
      advanceTime: (ms) => { mockTime += ms; },
      setTime: (time) => { mockTime = time; },
      reset: () => { mockTime = 0; },
      cleanup: () => { performance.now = originalNow; }
    };
  }
};

module.exports = {
  DOMTestUtils,
  APIMockUtils,
  LocalStorageMockUtils,
  TimerMockUtils,
  ThemeMockUtils,
  EventTestUtils,
  SearchStateUtils,
  PerformanceTestUtils,
  mockResponses
};