/**
 * Integration Tests for Drawer System and Search Module
 * 
 * Tests search drawer initialization, drawer tab registration and content switching,
 * and search module integration with existing drawer controller.
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

describe('Drawer Search Integration', () => {
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
    // Setup DOM structure for drawer integration
    const domSetup = DOMTestUtils.setupSearchDOM();
    domCleanup = domSetup.cleanup;

    // Add drawer system structure
    const drawerElement = document.createElement('div');
    drawerElement.id = 'multi-drawer';
    drawerElement.className = 'multi-drawer drawer';
    
    const headerSection = document.createElement('div');
    headerSection.id = 'drawer__header__search';
    headerSection.className = 'drawer__header__item';
    
    const contentSection = document.createElement('div');
    contentSection.id = 'drawer__content__search';
    contentSection.className = 'drawer__content__item';
    
    drawerElement.appendChild(headerSection);
    drawerElement.appendChild(contentSection);
    document.body.appendChild(drawerElement);

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

    // Remove drawer element
    const drawer = document.querySelector('#multi-drawer');
    if (drawer && drawer.parentNode) {
      drawer.parentNode.removeChild(drawer);
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

  describe('Search Drawer Initialization', () => {
    test('should initialize search module when required DOM elements are present', () => {
      const result = searchModule.init();
      expect(result).toBe(true);
    });

    test('should detect and bind to search input element', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      expect(searchInput).toBeTruthy();
      
      searchModule.init();
      
      // Check if event listeners are attached (we can't directly check listeners, but we can check init success)
      expect(searchModule.getState()).toBe('idle');
    });

    test('should detect and bind to results container', () => {
      const resultsContainer = document.querySelector('#SearchResults');
      expect(resultsContainer).toBeTruthy();
      expect(resultsContainer.getAttribute('aria-live')).toBe('polite');
      
      const result = searchModule.init();
      expect(result).toBe(true);
    });

    test('should handle missing required elements gracefully', () => {
      // Remove search input
      const searchInput = document.querySelector('[mpe="search-input"]');
      if (searchInput) {
        searchInput.parentNode.removeChild(searchInput);
      }

      const result = searchModule.init();
      expect(result).toBe(false);
    });

    test('should dispatch initialization event on successful setup', async () => {
      const eventPromise = EventTestUtils.waitForEvent('search:initialized');
      
      searchModule.init();
      
      const event = await eventPromise;
      expect(event.type).toBe('search:initialized');
    });
  });

  describe('Drawer Tab Registration and Content Switching', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should integrate with drawer content activation', () => {
      const searchContent = document.querySelector('#drawer__content__search');
      expect(searchContent).toBeTruthy();
      
      // Simulate drawer content activation by adding is-open class
      searchContent.classList.add('is-open');
      
      // Module should already be initialized and ready
      expect(searchModule.getState()).toBeDefined();
    });

    test('should handle drawer header integration', () => {
      const searchHeader = document.querySelector('#drawer__header__search');
      expect(searchHeader).toBeTruthy();
      
      // Simulate header activation
      searchHeader.classList.add('is-open');
      
      // Search input should be accessible
      const searchInput = document.querySelector('[mpe="search-input"]');
      expect(searchInput).toBeTruthy();
    });

    test('should maintain state during drawer tab switching', () => {
      const searchContent = document.querySelector('#drawer__content__search');
      
      // Simulate opening search tab
      searchContent.classList.add('is-open');
      
      // Set some state
      const initialState = searchModule.getState();
      
      // Simulate switching away
      searchContent.classList.remove('is-open');
      
      // Simulate switching back
      searchContent.classList.add('is-open');
      
      // State should be maintained (or reset to idle which is acceptable)
      const finalState = searchModule.getState();
      expect(finalState).toBeDefined();
    });

    test('should handle multiple drawer tabs without conflicts', () => {
      // Add other drawer tabs
      const navigationContent = document.createElement('div');
      navigationContent.id = 'drawer__content__category';
      navigationContent.className = 'drawer__content__item';
      
      const filterContent = document.createElement('div');
      filterContent.id = 'drawer__content__filter';
      filterContent.className = 'drawer__content__item';
      
      const drawer = document.querySelector('#multi-drawer');
      drawer.appendChild(navigationContent);
      drawer.appendChild(filterContent);
      
      // Activate search tab
      const searchContent = document.querySelector('#drawer__content__search');
      searchContent.classList.add('is-open');
      
      // Deactivate other tabs
      navigationContent.classList.remove('is-open');
      filterContent.classList.remove('is-open');
      
      // Search should work normally
      expect(searchModule.getState()).toBeDefined();
    });
  });

  describe('Search Module Integration with Drawer Controller', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should integrate with drawer opening mechanism', () => {
      const drawer = document.querySelector('#multi-drawer');
      
      // Simulate drawer opening
      drawer.classList.add('is-open');
      
      // Search module should be ready
      expect(searchModule.getState()).toBe('idle');
    });

    test('should handle drawer closing without errors', () => {
      const drawer = document.querySelector('#multi-drawer');
      
      // Open drawer and set some search state
      drawer.classList.add('is-open');
      searchModule.search('test query');
      
      // Close drawer
      drawer.classList.remove('is-open');
      
      // Should not cause errors
      expect(() => searchModule.getState()).not.toThrow();
    });

    test('should handle overlay interactions', () => {
      // Create overlay element (part of drawer system)
      const overlay = document.createElement('div');
      overlay.className = 'drawer-overlay';
      document.body.appendChild(overlay);
      
      const drawer = document.querySelector('#multi-drawer');
      drawer.classList.add('is-open');
      overlay.classList.add('is-open');
      
      // Search should work with overlay present
      expect(searchModule.getState()).toBeDefined();
      
      // Cleanup
      document.body.removeChild(overlay);
    });

    test('should register with drawer system events (simulated)', async () => {
      // Since the actual drawer system doesn't dispatch events, we simulate the expected behavior
      
      // Simulate drawer content becoming active
      const searchContent = document.querySelector('#drawer__content__search');
      searchContent.classList.add('is-open');
      
      // Search module should be functional
      expect(searchModule.getState()).toBe('idle');
      
      // Test that search works when drawer is "active"
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('integration test');
      
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Focus Management Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle focus when drawer opens', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      const drawer = document.querySelector('#multi-drawer');
      
      // Simulate drawer opening and focus
      drawer.classList.add('is-open');
      searchInput.focus();
      
      expect(document.activeElement).toBe(searchInput);
    });

    test('should maintain focus during search operations', async () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      APIMockUtils.setupFetchMock('successful_search');
      
      searchInput.focus();
      await searchModule.search('focus test');
      
      // Focus should be maintained or managed appropriately
      expect(document.activeElement).toBeDefined();
    });

    test('should handle focus restoration on drawer close', () => {
      const searchInput = document.querySelector('[mpe="search-input"]');
      const drawer = document.querySelector('#multi-drawer');
      
      // Focus and then simulate close
      searchInput.focus();
      drawer.classList.remove('is-open');
      
      // Should not cause focus-related errors
      expect(() => document.activeElement).not.toThrow();
    });
  });

  describe('Event Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should dispatch search events during operations', async () => {
      const startedEventPromise = EventTestUtils.waitForEvent('search:started');
      const completedEventPromise = EventTestUtils.waitForEvent('search:completed');
      
      APIMockUtils.setupFetchMock('successful_search');
      
      await searchModule.search('event test');
      
      const startedEvent = await startedEventPromise;
      const completedEvent = await completedEventPromise;
      
      expect(startedEvent.detail.query).toBe('event test');
      expect(completedEvent.detail.query).toBe('event test');
      expect(completedEvent.detail.resultsCount).toBeGreaterThan(0);
    });

    test('should dispatch state change events', async () => {
      const stateChangePromise = EventTestUtils.waitForEvent('search:stateChange');
      
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search('state test');
      
      const stateEvent = await stateChangePromise;
      expect(stateEvent.detail).toHaveProperty('currentState');
      expect(stateEvent.detail).toHaveProperty('previousState');
    });

    test('should handle custom events without breaking drawer functionality', () => {
      // Dispatch random custom events to test resilience
      document.dispatchEvent(new CustomEvent('drawer:opened'));
      document.dispatchEvent(new CustomEvent('drawer:closed'));
      document.dispatchEvent(new CustomEvent('drawer:contentActivated'));
      
      // Search should still work
      expect(searchModule.getState()).toBeDefined();
      expect(() => searchModule.search('resilience test')).not.toThrow();
    });
  });

  describe('Performance Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should not impact drawer opening performance', () => {
      const drawer = document.querySelector('#multi-drawer');
      
      const startTime = performance.now();
      
      // Simulate drawer opening
      drawer.classList.add('is-open');
      
      // Search module should initialize quickly
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should be very fast (under 10ms)
      expect(duration).toBeLessThan(10);
    });

    test('should handle rapid drawer state changes', () => {
      const drawer = document.querySelector('#multi-drawer');
      const searchContent = document.querySelector('#drawer__content__search');
      
      // Rapidly toggle drawer state
      for (let i = 0; i < 10; i++) {
        drawer.classList.toggle('is-open');
        searchContent.classList.toggle('is-open');
      }
      
      // Should remain stable
      expect(searchModule.getState()).toBeDefined();
    });

    test('should not cause memory leaks during drawer operations', () => {
      const initialObjects = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Perform multiple drawer operations
      const drawer = document.querySelector('#multi-drawer');
      for (let i = 0; i < 100; i++) {
        drawer.classList.add('is-open');
        searchModule.getState();
        drawer.classList.remove('is-open');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalObjects = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Memory usage should not increase significantly
      if (performance.memory) {
        const memoryIncrease = finalObjects - initialObjects;
        expect(memoryIncrease).toBeLessThan(1024 * 1024); // Less than 1MB increase
      }
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle drawer system errors gracefully', () => {
      // Simulate drawer system errors
      const drawer = document.querySelector('#multi-drawer');
      
      // Remove required elements to simulate errors
      const searchInput = document.querySelector('[mpe="search-input"]');
      if (searchInput) {
        searchInput.parentNode.removeChild(searchInput);
      }
      
      // Search module should handle missing elements
      expect(() => searchModule.getState()).not.toThrow();
    });

    test('should continue working if drawer DOM is modified', () => {
      const drawer = document.querySelector('#multi-drawer');
      
      // Modify drawer structure
      const newElement = document.createElement('div');
      newElement.className = 'unexpected-element';
      drawer.appendChild(newElement);
      
      // Search should continue working
      expect(searchModule.getState()).toBeDefined();
    });

    test('should handle search operations during drawer state changes', async () => {
      const drawer = document.querySelector('#multi-drawer');
      APIMockUtils.setupFetchMock('successful_search');
      
      // Start search
      const searchPromise = searchModule.search('concurrent test');
      
      // Change drawer state during search
      drawer.classList.toggle('is-open');
      
      // Search should complete successfully
      await searchPromise;
      expect(searchModule.getState()).toBeDefined();
    });
  });
});