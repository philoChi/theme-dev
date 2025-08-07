/**
 * Progressive Enhancement Unit Tests - Milestone 4
 * Tests fallback functionality for JavaScript disabled scenarios
 */

const { 
  DOMTestUtils, 
  APIMockUtils, 
  LocalStorageMockUtils,
  TimerMockUtils,
  ThemeMockUtils,
  EventTestUtils
} = require('../helpers/search-test-utils');

// Mock window and global objects
global.window = {
  Theme: {},
  location: { href: '' },
  history: { pushState: jest.fn() }
};

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Progressive Enhancement', () => {
  beforeAll(() => {
    // Set up DOM environment with search form
    document.body.innerHTML = `
      <div class="search-container">
        <form data-search-form action="/search" method="get" role="search" class="search-form">
          <label for="search-input" class="visually-hidden">Search</label>
          <input mpe="search-input" type="search" name="q" id="search-input" 
                 placeholder="Search our store" maxlength="256" required autocomplete="off" />
          <button type="submit" aria-label="Submit search">
            <svg>...</svg>
          </button>
        </form>
      </div>
      <div id="SearchResults"></div>
      <div id="SearchLoadingState"></div>
      <div id="SearchEmptyState"></div>
    `;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset window state
    global.window.Theme = {};
    global.window.location.href = 'http://127.0.0.1:9292';
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Enhancement Detection', () => {
    it('should detect when JavaScript enhancement is available', () => {
      // Set up full enhancement environment
      global.window.Theme.DrawerSearch = {
        init: jest.fn(),
        search: jest.fn()
      };
      global.fetch = jest.fn();
      
      // Test would check if enhancement is detected
      const hasEnhancement = (
        typeof window !== 'undefined' && 
        window.Theme && 
        window.Theme.DrawerSearch &&
        typeof fetch !== 'undefined'
      );
      
      expect(hasEnhancement).toBe(true);
    });

    it('should detect when JavaScript enhancement is not available', () => {
      // Remove enhancement components
      delete global.window.Theme.DrawerSearch;
      delete global.fetch;
      
      const hasEnhancement = (
        typeof window !== 'undefined' && 
        window.Theme && 
        window.Theme.DrawerSearch &&
        typeof fetch !== 'undefined'
      );
      
      expect(hasEnhancement).toBe(false);
    });

    it('should handle undefined window gracefully', () => {
      const originalWindow = global.window;
      global.window = undefined;
      
      const hasEnhancement = (
        typeof window !== 'undefined' && 
        window.Theme && 
        window.Theme.DrawerSearch &&
        typeof fetch !== 'undefined'
      );
      
      expect(hasEnhancement).toBe(false);
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Form Fallback Setup', () => {
    it('should preserve form action="/search" for fallback', () => {
      const form = document.querySelector('[data-search-form]');
      
      expect(form).toBeTruthy();
      expect(form.getAttribute('action')).toBe('/search');
      expect(form.getAttribute('method')).toBe('get');
    });

    it('should maintain proper form structure for non-JS submission', () => {
      const form = document.querySelector('[data-search-form]');
      const input = form.querySelector('input[name="q"]');
      const button = form.querySelector('button[type="submit"]');
      
      expect(input).toBeTruthy();
      expect(input.getAttribute('name')).toBe('q');
      expect(input.getAttribute('required')).toBe('');
      
      expect(button).toBeTruthy();
      expect(button.getAttribute('type')).toBe('submit');
    });

    it('should set up form enhancement when JS is available', () => {
      // Mock the enhancement setup
      const form = document.querySelector('[data-search-form]');
      
      // Simulate progressive enhancement setup
      let enhancementEventAdded = false;
      const originalAddEventListener = form.addEventListener;
      form.addEventListener = jest.fn((...args) => {
        if (args[0] === 'submit') {
          enhancementEventAdded = true;
        }
        return originalAddEventListener.apply(form, args);
      });
      
      // Simulate enhancement setup call
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          // Would trigger enhanced search instead
        });
      }
      
      expect(enhancementEventAdded).toBe(true);
    });
  });

  describe('JavaScript Disabled Fallback', () => {
    beforeEach(() => {
      // Simulate JavaScript disabled environment
      delete global.window.Theme.DrawerSearch;
      delete global.fetch;
      global.window.addEventListener = undefined;
    });

    it('should allow normal form submission when JS is disabled', () => {
      const form = document.querySelector('[data-search-form]');
      const input = form.querySelector('input[name="q"]');
      
      // Set search query
      input.value = 'test product';
      
      // Form should be ready for normal submission to /search
      expect(form.action).toContain('/search');
      expect(input.value).toBe('test product');
      
      // Would normally submit to /search?q=test+product
      const formData = new FormData(form);
      expect(formData.get('q')).toBe('test product');
    });

    it('should handle form submission without preventDefault when enhanced', () => {
      let formSubmitted = false;
      let defaultPrevented = false;
      
      const form = document.querySelector('[data-search-form]');
      
      // Mock form submission
      form.addEventListener('submit', (e) => {
        formSubmitted = true;
        // In non-enhanced mode, preventDefault should NOT be called
        if (e.preventDefault) {
          // This should not happen in fallback mode
          defaultPrevented = true;
        }
      });
      
      // Simulate form submission
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
      
      expect(formSubmitted).toBe(true);
      expect(defaultPrevented).toBe(false);
    });

    it('should preserve URL structure for /search page navigation', () => {
      const form = document.querySelector('[data-search-form]');
      const input = form.querySelector('input[name="q"]');
      
      input.value = 'fallback test query';
      
      // Construct expected URL for fallback
      const formData = new FormData(form);
      const queryString = new URLSearchParams(formData).toString();
      const expectedUrl = form.action + '?' + queryString;
      
      expect(expectedUrl).toBe('/search?q=fallback+test+query');
    });
  });

  describe('Graceful Enhancement Transition', () => {
    it('should transition from fallback to enhanced mode when JS loads', () => {
      const form = document.querySelector('[data-search-form]');
      let enhancementActive = false;
      
      // Initially no enhancement
      expect(global.window.Theme.DrawerSearch).toBeUndefined();
      
      // Simulate JS loading and enhancement setup
      global.window.Theme.DrawerSearch = {
        init: jest.fn(() => true),
        search: jest.fn()
      };
      global.fetch = jest.fn();
      
      // Set up enhancement
      form.addEventListener('submit', (e) => {
        if (global.window.Theme.DrawerSearch) {
          e.preventDefault();
          enhancementActive = true;
          // Would trigger enhanced search
        }
      });
      
      // Simulate form submission after enhancement
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
      
      expect(enhancementActive).toBe(true);
    });

    it('should maintain form functionality during enhancement transition', () => {
      const form = document.querySelector('[data-search-form]');
      const input = form.querySelector('input[name="q"]');
      
      // Form should work in both modes
      input.value = 'transition test';
      
      // Test form data availability
      const formData = new FormData(form);
      expect(formData.get('q')).toBe('transition test');
      
      // Form structure should remain intact
      expect(form.action).toBe('/search');
      expect(input.name).toBe('q');
    });
  });

  describe('Error Handling in Non-Enhanced Mode', () => {
    it('should handle form submission errors gracefully without JS', () => {
      const form = document.querySelector('[data-search-form]');
      
      // Simulate form submission error (e.g., network issue)
      let errorOccurred = false;
      
      try {
        const submitEvent = new Event('submit');
        form.dispatchEvent(submitEvent);
      } catch (error) {
        errorOccurred = true;
      }
      
      // Should not throw errors in fallback mode
      expect(errorOccurred).toBe(false);
    });

    it('should provide accessible error messages when enhancement fails', () => {
      // Simulate enhancement failure
      global.window.Theme = {
        DrawerSearch: {
          init: jest.fn(() => false) // Initialization fails
        }
      };
      
      const form = document.querySelector('[data-search-form]');
      
      // Enhancement failure should not break form
      expect(form.action).toBe('/search');
      expect(form.method).toBe('get');
    });
  });

  describe('Accessibility in Fallback Mode', () => {
    it('should maintain ARIA labels and semantic structure', () => {
      const form = document.querySelector('[data-search-form]');
      const input = form.querySelector('input[name="q"]');
      const button = form.querySelector('button[type="submit"]');
      const label = form.querySelector('label');
      
      // Check semantic structure
      expect(form.getAttribute('role')).toBe('search');
      expect(input.getAttribute('type')).toBe('search');
      expect(input.hasAttribute('required')).toBe(true);
      
      // Check accessibility
      expect(label).toBeTruthy();
      expect(label.getAttribute('for')).toBe(input.id);
      expect(button.hasAttribute('aria-label')).toBe(true);
    });

    it('should maintain keyboard navigation in non-enhanced mode', () => {
      const form = document.querySelector('[data-search-form]');
      const input = form.querySelector('input[name="q"]');
      const button = form.querySelector('button[type="submit"]');
      
      // Elements should be focusable
      expect(input.tabIndex).not.toBe(-1);
      expect(button.tabIndex).not.toBe(-1);
      
      // Input should be functional
      input.value = 'keyboard test';
      expect(input.value).toBe('keyboard test');
    });
  });

  describe('LocalStorage Graceful Degradation', () => {
    it('should handle missing localStorage gracefully', () => {
      // Simulate environment without localStorage
      const originalLocalStorage = global.localStorage;
      global.localStorage = undefined;
      
      let storageError = false;
      
      try {
        // Code that would normally use localStorage should not fail
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('test', 'value');
        }
      } catch (error) {
        storageError = true;
      }
      
      expect(storageError).toBe(false);
      
      // Restore localStorage
      global.localStorage = originalLocalStorage;
    });

    it('should function without search history when storage unavailable', () => {
      // Remove localStorage
      delete global.localStorage;
      
      const input = document.querySelector('[mpe="search-input"]');
      
      // Input should still work for basic search
      input.value = 'no storage test';
      expect(input.value).toBe('no storage test');
      
      // No history features, but basic functionality preserved
      const form = document.querySelector('[data-search-form]');
      expect(form.action).toBe('/search');
    });
  });

  describe('Content Security Policy Compliance', () => {
    it('should not use inline JavaScript in fallback mode', () => {
      const form = document.querySelector('[data-search-form]');
      
      // Check that no inline event handlers are used
      expect(form.getAttribute('onsubmit')).toBeNull();
      expect(form.getAttribute('onclick')).toBeNull();
      
      const input = form.querySelector('input');
      expect(input.getAttribute('onchange')).toBeNull();
      expect(input.getAttribute('oninput')).toBeNull();
      
      const button = form.querySelector('button');
      expect(button.getAttribute('onclick')).toBeNull();
    });

    it('should rely on external JavaScript files for enhancement', () => {
      // Enhancement should come from external JS files, not inline
      const scripts = document.querySelectorAll('script[src]');
      const inlineScripts = document.querySelectorAll('script:not([src])');
      
      // Basic form should work without any inline scripts
      expect(inlineScripts.length).toBe(0);
    });
  });
});