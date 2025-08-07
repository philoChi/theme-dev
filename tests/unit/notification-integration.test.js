/**
 * Notification Integration Unit Tests - Milestone 4
 * Tests integration with existing notification system and user feedback
 */

const { 
  DOMTestUtils, 
  APIMockUtils, 
  LocalStorageMockUtils,
  TimerMockUtils,
  ThemeMockUtils,
  EventTestUtils
} = require('../helpers/search-test-utils');

// Mock the global notification system
global.window.showNotification = jest.fn();

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Notification System Integration', () => {
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
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Notification Types and Messages', () => {
    it('should show error notification for network failures', async () => {
      global.fetch.mockRejectedValueOnce(new Error('NetworkError: Failed to fetch'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'network test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Search is temporarily unavailable. Please check your connection and try again.',
        'error',
        5000,
        expect.objectContaining({ action: 'retry' })
      );
    });

    it('should show warning notification for rate limiting', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Too Many Requests' }), 
        { status: 429 }
      );
      
      global.fetch.mockResolvedValueOnce(rateLimitResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'rate limit test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Too many searches. Please wait a moment before trying again.',
        'warning',
        6000
      );
    });

    it('should show info notification for empty results', async () => {
      const emptyResponse = new Response(JSON.stringify({
        resources: {
          results: {
            products: []
          }
        }
      }));
      
      global.fetch.mockResolvedValueOnce(emptyResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'no results test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'No products found for "no results test". Try different keywords or browse our collections.',
        'info',
        4000
      );
    });

    it('should show timeout warning notification', async () => {
      global.fetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'timeout test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Search is taking longer than expected. Please try again.',
        'warning',
        4000,
        expect.objectContaining({ action: 'retry' })
      );
    });

    it('should show generic error notification for unknown errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Unknown error type'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'unknown error test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Search encountered an unexpected error. Please try again.',
        'error',
        4000,
        expect.objectContaining({ action: 'retry' })
      );
    });
  });

  describe('Notification Timing and Duration', () => {
    it('should use appropriate duration for error notifications', async () => {
      global.fetch.mockRejectedValueOnce(new Error('NetworkError'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'duration test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.any(String),
        'error',
        5000, // Error notifications should last 5 seconds
        expect.any(Object)
      );
    });

    it('should use shorter duration for info notifications', async () => {
      const emptyResponse = new Response(JSON.stringify({
        resources: { results: { products: [] } }
      }));
      
      global.fetch.mockResolvedValueOnce(emptyResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'info duration test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.any(String),
        'info',
        4000, // Info notifications should last 4 seconds
        expect.any(Object)
      );
    });

    it('should use appropriate duration for warning notifications', async () => {
      const rateLimitResponse = new Response('', { status: 429 });
      global.fetch.mockResolvedValueOnce(rateLimitResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'warning duration test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.any(String),
        'warning',
        6000, // Warning notifications should last 6 seconds
        expect.any(Object)
      );
    });
  });

  describe('Notification Actions and Options', () => {
    it('should include retry action for retryable errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('NetworkError'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'retry action test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.any(String),
        'error',
        expect.any(Number),
        expect.objectContaining({
          action: 'retry'
        })
      );
    });

    it('should include custom CSS class for search notifications', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Test error'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'css class test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          customClass: 'search-notification'
        })
      );
    });

    it('should not include actions for non-retryable errors', async () => {
      const validationResponse = new Response(
        JSON.stringify({ error: 'Invalid query format' }), 
        { status: 400 }
      );
      
      global.fetch.mockResolvedValueOnce(validationResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'validation error test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const lastCall = global.window.showNotification.mock.calls[
        global.window.showNotification.mock.calls.length - 1
      ];
      
      if (lastCall && lastCall[3]) {
        expect(lastCall[3]).not.toHaveProperty('action');
      }
    });
  });

  describe('Input Validation Notifications', () => {
    it('should show notification when input is sanitized', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '<script>alert("xss")</script>safe query';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Your search was cleaned for security. Searching for the safe version.',
        'info',
        3000,
        expect.objectContaining({
          customClass: 'search-notification'
        })
      );
    });

    it('should show notification for validation errors', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'javascript:alert("xss")';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.objectContaining({
          customClass: 'search-notification'
        })
      );
    });

    it('should show notification for query too long', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'a'.repeat(300); // Exceed 256 character limit
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Search query is too long. Please shorten your search.',
        'warning',
        3000,
        expect.objectContaining({
          customClass: 'search-notification'
        })
      );
    });
  });

  describe('Cache Notifications', () => {
    beforeEach(() => {
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      global.localStorage = localStorageMock;
    });

    it('should show notification when using cached results during API failure', async () => {
      const cachedData = {
        query: 'cached test',
        results: [{ id: 1, title: 'Cached Product' }],
        timestamp: Date.now() - 30000
      };
      
      global.localStorage.getItem.mockReturnValue(JSON.stringify(cachedData));
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'cached test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Showing cached results. Some products may not be current.',
        'info',
        3000,
        expect.objectContaining({
          customClass: 'search-notification'
        })
      );
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle missing showNotification function gracefully', async () => {
      delete global.window.showNotification;
      
      global.fetch.mockRejectedValueOnce(new Error('Test error'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'missing notification test';
      
      expect(() => {
        const inputEvent = new Event('input');
        input.dispatchEvent(inputEvent);
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should log error instead of throwing
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Notification system not available')
      );
    });

    it('should handle notification system errors gracefully', async () => {
      global.window.showNotification = jest.fn(() => {
        throw new Error('Notification system error');
      });
      
      global.fetch.mockRejectedValueOnce(new Error('Test error'));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'notification error test';
      
      expect(() => {
        const inputEvent = new Event('input');
        input.dispatchEvent(inputEvent);
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should log the notification error but continue functioning
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to show notification')
      );
    });
  });

  describe('Success Notifications', () => {
    it('should optionally show success notification for successful searches', async () => {
      const successResponse = new Response(JSON.stringify({
        resources: {
          results: {
            products: [
              { id: 1, title: 'Product 1' },
              { id: 2, title: 'Product 2' }
            ]
          }
        }
      }));
      
      global.fetch.mockResolvedValueOnce(successResponse);
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'success test';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Success notifications are optional but if shown should be brief
      if (global.window.showNotification.mock.calls.some(call => 
        call[1] === 'success'
      )) {
        expect(global.window.showNotification).toHaveBeenCalledWith(
          expect.stringContaining('Found'),
          'success',
          2000 // Success notifications should be brief
        );
      }
    });
  });
});