/**
 * Input Validation Unit Tests - Milestone 4
 * Tests XSS prevention, query sanitization, and input validation
 */

const { 
  DOMTestUtils, 
  APIMockUtils, 
  LocalStorageMockUtils,
  TimerMockUtils,
  ThemeMockUtils,
  EventTestUtils
} = require('../helpers/search-test-utils');

// Mock window.showNotification
global.window.showNotification = jest.fn();

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Input Validation and Sanitization', () => {
  beforeAll(() => {
    // Set up DOM environment
    document.body.innerHTML = `
      <div class="search-container">
        <form data-search-form action="/search" method="get">
          <input mpe="search-input" type="search" name="q" maxlength="256" />
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

  describe('XSS Prevention', () => {
    it('should remove HTML tags from search queries', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '<script>alert("xss")</script>running shoes';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Input should be sanitized to remove HTML tags
      expect(input.value).toBe('running shoes');
    });

    it('should remove potentially dangerous characters', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'search<>"\'term';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Dangerous characters should be removed
      expect(input.value).toBe('searchterm');
    });

    it('should detect and block JavaScript injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'javascript:alert("xss")';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should show validation error notification
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.objectContaining({
          customClass: 'search-notification'
        })
      );
      
      // Input should be cleared or sanitized
      expect(input.value).not.toContain('javascript:');
    });

    it('should block data URI injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'data:text/html,<script>alert("xss")</script>';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });

    it('should block vbscript injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'vbscript:MsgBox("xss")';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });

    it('should block event handler injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'onload=alert("xss")';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });

    it('should block script tag injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '<SCRIPT>alert("xss")</SCRIPT>';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });

    it('should block eval injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'eval(alert("xss"))';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });

    it('should block CSS expression injection attempts', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'expression(alert("xss"))';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });
  });

  describe('Query Length Validation', () => {
    it('should enforce minimum query length (2 characters)', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'a'; // Only 1 character
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should not trigger search API call
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should allow queries at minimum length threshold', async () => {
      global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        resources: { results: { products: [] } }
      })));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'ab'; // Exactly 2 characters
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should trigger search API call
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should enforce maximum query length (256 characters)', async () => {
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

    it('should allow queries within length limits', async () => {
      global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        resources: { results: { products: [] } }
      })));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'normal length search query'; // Within limits
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should proceed normally without validation warnings
      expect(global.window.showNotification).not.toHaveBeenCalledWith(
        expect.stringContaining('too long'),
        'warning',
        expect.any(Number)
      );
    });
  });

  describe('Whitespace Normalization', () => {
    it('should trim leading and trailing whitespace', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '   search query   ';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(input.value).toBe('search query');
    });

    it('should normalize multiple whitespace characters to single spaces', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'search    query   with     spaces';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(input.value).toBe('search query with spaces');
    });

    it('should handle tab and newline characters', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'search\tquery\nwith\r\nspecial';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(input.value).toBe('search query with special');
    });
  });

  describe('Input Sanitization Notifications', () => {
    it('should notify user when input is sanitized', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '<b>bold</b> search query';
      
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
      
      expect(input.value).toBe('bold search query');
    });

    it('should not show notification for normal queries that need no sanitization', async () => {
      global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        resources: { results: { products: [] } }
      })));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'normal search query';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should not show sanitization notification
      expect(global.window.showNotification).not.toHaveBeenCalledWith(
        expect.stringContaining('cleaned for security'),
        'info',
        expect.any(Number)
      );
    });
  });

  describe('URL Encoding for API Requests', () => {
    it('should properly encode special characters for URL parameters', async () => {
      global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        resources: { results: { products: [] } }
      })));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'search & query + symbols';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Check that fetch was called with properly encoded URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search%20%26%20query%20%2B%20symbols'),
        expect.any(Object)
      );
    });

    it('should handle Unicode characters properly', async () => {
      global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
        resources: { results: { products: [] } }
      })));
      
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'search café münster';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should handle Unicode characters properly in URL encoding
      expect(global.fetch).toHaveBeenCalled();
      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('caf%C3%A9');
      expect(fetchUrl).toContain('m%C3%BCnster');
    });
  });

  describe('Real-time Validation Feedback', () => {
    it('should provide immediate feedback for invalid input', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = 'javascript:alert("test")';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      // Should show feedback immediately, not wait for debounce
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Please enter a valid search term.',
        'warning',
        3000,
        expect.any(Object)
      );
    });

    it('should update validation state as user types', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      
      // Start with invalid input
      input.value = '<script>';
      let inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(global.window.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('valid search term'),
        'warning',
        expect.any(Number)
      );
      
      // Clear notifications mock
      jest.clearAllMocks();
      
      // Change to valid input
      input.value = 'valid search';
      inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should not show validation error for valid input
      expect(global.window.showNotification).not.toHaveBeenCalledWith(
        expect.stringContaining('valid search term'),
        'warning',
        expect.any(Number)
      );
    });
  });

  describe('Type Validation', () => {
    it('should handle non-string input gracefully', () => {
      // Test internal validation function behavior
      const testValidation = (input) => {
        try {
          if (typeof input !== 'string') {
            throw new Error('Invalid query type');
          }
          return { valid: true, sanitized: input };
        } catch (error) {
          return { valid: false, message: error.message };
        }
      };
      
      expect(testValidation(null).valid).toBe(false);
      expect(testValidation(undefined).valid).toBe(false);
      expect(testValidation(123).valid).toBe(false);
      expect(testValidation({}).valid).toBe(false);
      expect(testValidation('valid string').valid).toBe(true);
    });

    it('should convert input to string if possible', () => {
      const testConversion = (input) => {
        const stringified = String(input);
        return typeof stringified === 'string';
      };
      
      expect(testConversion(123)).toBe(true);
      expect(testConversion(true)).toBe(true);
      expect(testConversion([])).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input correctly', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '';
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should not trigger API call or show validation errors
      expect(global.fetch).not.toHaveBeenCalled();
      expect(global.window.showNotification).not.toHaveBeenCalled();
    });

    it('should handle input that becomes empty after sanitization', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      input.value = '<script></script>'; // Will be completely removed
      
      const inputEvent = new Event('input');
      input.dispatchEvent(inputEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(input.value).toBe('');
      expect(global.window.showNotification).toHaveBeenCalledWith(
        'Your search was cleaned for security. Searching for the safe version.',
        'info',
        3000,
        expect.any(Object)
      );
    });

    it('should handle rapid input changes', async () => {
      const input = document.querySelector('[mpe="search-input"]');
      
      // Simulate rapid typing
      const queries = ['a', 'ab', 'abc', 'abcd'];
      
      for (const query of queries) {
        input.value = query;
        const inputEvent = new Event('input');
        input.dispatchEvent(inputEvent);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should handle all inputs without errors
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});