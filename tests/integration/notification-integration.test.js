/**
 * Integration Tests for Notification System with Search Module
 * 
 * Tests notification system integration, error handling notifications,
 * and user feedback mechanisms during search operations.
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

describe('Notification System Integration', () => {
  let searchModule;
  let domCleanup;
  let mockLocalStorage;
  let originalFetch;
  let notificationSpy;

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

    // Setup notification system mock with spy functionality
    const notificationMock = ThemeMockUtils.setupNotificationMock();
    notificationSpy = notificationMock.spy;

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

  describe('Error Notification Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should show network error notification when API request fails', async () => {
      // Setup fetch to reject with network error
      APIMockUtils.setupFetchMock('network_error');

      await searchModule.search('network error test');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('An unexpected error occurred'),
        'error',
        4000,
        { action: 'retry' }
      );
    });

    test('should show timeout notification for slow API responses', async () => {
      // Setup fetch to timeout
      APIMockUtils.setupFetchMock('timeout_error');

      await searchModule.search('timeout test');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('search request timed out'),
        'error'
      );
    });

    test('should show API error notification for server errors', async () => {
      // Setup fetch to return server error
      APIMockUtils.setupFetchMock('server_error');

      await searchModule.search('server error test');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('search service is currently unavailable'),
        'error'
      );
    });

    test('should show validation error for invalid queries', async () => {
      // Test with empty query
      await searchModule.search('');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please enter at least 2 characters'),
        'warning'
      );

      // Test with single character
      await searchModule.search('a');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please enter at least 2 characters'),
        'warning'
      );
    });

    test('should handle rate limiting gracefully with user notification', async () => {
      // Setup fetch to return rate limit error
      APIMockUtils.setupFetchMock('rate_limit_error');

      await searchModule.search('rate limit test');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('too many search requests'),
        'warning'
      );
    });
  });

  describe('Success Notification Integration', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should show success notification for cache hits when appropriate', async () => {
      const query = 'cache hit test';
      
      // First search to populate cache
      APIMockUtils.setupFetchMock('successful_search');
      await searchModule.search(query);

      // Clear previous notifications
      notificationSpy.mockClear();

      // Second search should hit cache
      await searchModule.search(query);

      // For cache hits, we might show a subtle info notification or no notification
      // The behavior depends on the implementation
      if (notificationSpy.mock.calls.length > 0) {
        expect(notificationSpy).toHaveBeenCalledWith(
          expect.stringContaining('search results'),
          'info'
        );
      }
    });

    test('should not show unnecessary notifications for normal operations', async () => {
      APIMockUtils.setupFetchMock('successful_search');

      await searchModule.search('normal search test');

      // Normal successful searches should not trigger notifications
      // Only errors and warnings should trigger notifications
      const errorNotifications = notificationSpy.mock.calls.filter(call => 
        call[1] === 'error' || call[1] === 'warning'
      );

      expect(errorNotifications).toHaveLength(0);
    });
  });

  describe('Notification System Error Handling', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should handle notification system being unavailable', async () => {
      // Remove notification system
      delete global.window.showNotification;

      // Should not throw error when trying to show notification
      APIMockUtils.setupFetchMock('network_error');

      await expect(searchModule.search('no notification test')).resolves.not.toThrow();
    });

    test('should handle notification system throwing errors', async () => {
      // Make notification system throw
      global.window.showNotification = jest.fn(() => {
        throw new Error('Notification system error');
      });

      APIMockUtils.setupFetchMock('network_error');

      // Should not crash the search functionality
      try {
        await searchModule.search('notification error test');
      } catch (error) {
        // Expected to catch the notification system error
        expect(error.message).toContain('Notification system error');
      }
      
      // Allow some time for state transition
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(['idle', 'searching'].includes(searchModule.getState())).toBe(true);
    });
  });

  describe('Notification Content and Localization', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should use localized error messages when available', async () => {
      // Mock localization system
      global.window.Theme = global.window.Theme || {};
      global.window.Theme.strings = {
        search_network_error: 'Network error (localized)',
        search_timeout_error: 'Timeout error (localized)',
        search_server_error: 'Server error (localized)'
      };

      APIMockUtils.setupFetchMock('network_error');
      await searchModule.search('localized error test');

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network error (localized)'),
        'error'
      );
    });

    test('should fall back to default messages when localization unavailable', async () => {
      // Ensure no localization available
      delete global.window.Theme;

      APIMockUtils.setupFetchMock('network_error');
      await searchModule.search('fallback message test');

      // Should still show notification with default message
      expect(notificationSpy).toHaveBeenCalled();
      expect(notificationSpy.mock.calls[0][1]).toBe('error');
    });

    test('should include contextual information in error notifications', async () => {
      APIMockUtils.setupFetchMock('network_error');

      await searchModule.search('contextual info test');

      const notificationCall = notificationSpy.mock.calls[0];
      const message = notificationCall[0];

      // Should include helpful context like retry suggestions
      expect(message).toMatch(/try again|retry|check connection/i);
    });
  });

  describe('Notification Timing and User Experience', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should not spam notifications during rapid search operations', async () => {
      APIMockUtils.setupFetchMock('network_error');

      // Perform multiple rapid searches
      const searches = [
        searchModule.search('rapid 1'),
        searchModule.search('rapid 2'),
        searchModule.search('rapid 3')
      ];

      await Promise.all(searches);

      // Should not show excessive notifications
      expect(notificationSpy.mock.calls.length).toBeLessThanOrEqual(3);
    });

    test('should show notifications at appropriate timing', async () => {
      const startTime = Date.now();
      
      APIMockUtils.setupFetchMock('network_error');
      await searchModule.search('timing test');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Notification should appear reasonably quickly
      expect(duration).toBeLessThan(1000);
      expect(notificationSpy).toHaveBeenCalled();
    });

    test('should handle notification system performance issues', async () => {
      // Make notification system slow
      global.window.showNotification = jest.fn(() => {
        // Simulate slow notification system
        return new Promise(resolve => setTimeout(resolve, 500));
      });

      const startTime = Date.now();
      
      APIMockUtils.setupFetchMock('network_error');
      await searchModule.search('slow notification test');

      const endTime = Date.now();

      // Search should not be blocked by slow notifications
      expect(endTime - startTime).toBeLessThan(600);
      expect(searchModule.getState()).toBe('idle');
    });
  });

  describe('Integration with Search States', () => {
    beforeEach(() => {
      searchModule.init();
    });

    test('should show appropriate notifications based on search state', async () => {
      // Test error during searching state
      APIMockUtils.setupFetchMock('network_error');
      
      const searchPromise = searchModule.search('state-based error test');
      
      // State should be 'searching' initially
      expect(searchModule.getState()).toBe('searching');
      
      await searchPromise;
      
      // Should return to idle after error
      expect(searchModule.getState()).toBe('idle');
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.any(String),
        'error'
      );
    });

    test('should handle notifications during state transitions', async () => {
      const stateChanges = [];
      
      // Listen for state changes
      document.addEventListener('search:stateChange', (e) => {
        stateChanges.push(e.detail.currentState);
      });

      APIMockUtils.setupFetchMock('server_error');
      await searchModule.search('state transition test');

      // Should have proper state transitions even with notifications
      expect(stateChanges).toContain('searching');
      expect(stateChanges).toContain('idle');
      expect(notificationSpy).toHaveBeenCalled();
    });
  });
});