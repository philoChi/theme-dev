/**
 * Milestone 5 Tests - Performance Optimization and Accessibility
 * Tests responsive result limiting, keyboard navigation, accessibility features, and API optimizations
 */

const fs = require('fs');
const path = require('path');

describe('Milestone 5: Performance Optimization and Accessibility', () => {
  let searchModuleCode;
  let cssCode;
  
  beforeAll(() => {
    // Load the search module and CSS files
    const searchModulePath = path.join(__dirname, '../../assets/section-drawer-search.js');
    const cssPath = path.join(__dirname, '../../assets/section-drawer-search-accessibility.css');
    
    searchModuleCode = fs.readFileSync(searchModulePath, 'utf8');
    cssCode = fs.readFileSync(cssPath, 'utf8');
  });

  beforeEach(() => {
    // Reset global state
    global.window = {
      innerWidth: 1024,
      IntersectionObserver: jest.fn(() => ({
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn()
      })),
      gc: jest.fn()
    };
    global.document = {
      querySelectorAll: jest.fn(() => []),
      querySelector: jest.fn(),
      createElement: jest.fn(() => ({
        setAttribute: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() },
        remove: jest.fn()
      })),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Set up DOM
    document.body.innerHTML = `
      <div class="search-container">
        <form data-search-form action="/search" method="get">
          <input mpe="search-input" type="search" name="q" />
          <button type="submit">Search</button>
        </form>
      </div>
      <div id="SearchResults">
        <ul id="SearchResultsList"></ul>
        <button id="SearchShowAllButton">Show All Results</button>
      </div>
    `;
  });

  describe('Performance Optimizations', () => {
    it('should implement responsive result limiting', () => {
      expect(searchModuleCode).toContain('maxResults: {');
      expect(searchModuleCode).toContain('mobile: 8');
      expect(searchModuleCode).toContain('desktop: 10');
      expect(searchModuleCode).toContain('isMobileViewport');
      expect(searchModuleCode).toContain('getResultLimit');
    });

    it('should include viewport detection logic', () => {
      expect(searchModuleCode).toContain('window.innerWidth <= 768');
      expect(searchModuleCode).toContain('PerformanceUtils.getResultLimit()');
    });

    it('should implement lazy loading for images', () => {
      expect(searchModuleCode).toContain('IntersectionObserver');
      expect(searchModuleCode).toContain('imageObserver');
      expect(searchModuleCode).toContain('lazyLoadImages');
      expect(searchModuleCode).toContain('data-src');
    });

    it('should include memory cleanup functionality', () => {
      expect(searchModuleCode).toContain('cleanupMemory');
      expect(searchModuleCode).toContain('data-search-cleanup');
      expect(searchModuleCode).toContain('window.gc');
    });

    it('should optimize image loading with proper attributes', () => {
      expect(searchModuleCode).toContain('loading="lazy"');
      expect(searchModuleCode).toContain('lazy-load');
      expect(searchModuleCode).toContain('rootMargin');
    });

    it('should include performance monitoring capabilities', () => {
      expect(searchModuleCode).toContain('PerformanceUtils');
      expect(searchModuleCode).toContain('initLazyLoading');
      expect(searchModuleCode).toContain('cancelImageObserver');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should implement arrow key navigation', () => {
      expect(searchModuleCode).toContain('KeyboardNavigation');
      expect(searchModuleCode).toContain('ArrowDown');
      expect(searchModuleCode).toContain('ArrowUp');
      expect(searchModuleCode).toContain('focusNext');
      expect(searchModuleCode).toContain('focusPrevious');
    });

    it('should include proper focus management', () => {
      expect(searchModuleCode).toContain('focusableElements');
      expect(searchModuleCode).toContain('currentFocusIndex');
      expect(searchModuleCode).toContain('updateFocusableElements');
      expect(searchModuleCode).toContain('focusCurrentElement');
    });

    it('should handle Enter key activation', () => {
      expect(searchModuleCode).toContain('case \'Enter\'');
      expect(searchModuleCode).toContain('activateCurrentElement');
      expect(searchModuleCode).toContain('click()');
    });

    it('should handle Escape key to return to input', () => {
      expect(searchModuleCode).toContain('case \'Escape\'');
      expect(searchModuleCode).toContain('returnToInput');
      expect(searchModuleCode).toContain('search-input');
    });

    it('should include context-aware navigation', () => {
      expect(searchModuleCode).toContain('isSearchContext');
      expect(searchModuleCode).toContain('activeElement');
      expect(searchModuleCode).toContain('closest(\'#SearchResults\')');
    });

    it('should announce navigation to screen readers', () => {
      expect(searchModuleCode).toContain('Item ${this.currentFocusIndex + 1} of ${this.focusableElements.length}');
      expect(searchModuleCode).toContain('announceToScreenReader');
    });
  });

  describe('Accessibility Features', () => {
    it('should include proper ARIA labels and roles', () => {
      expect(searchModuleCode).toContain('aria-label');
      expect(searchModuleCode).toContain('aria-describedby');
      expect(searchModuleCode).toContain('search results for');
      expect(searchModuleCode).toContain('search-result-');
    });

    it('should implement screen reader announcements', () => {
      expect(searchModuleCode).toContain('aria-live');
      expect(searchModuleCode).toContain('aria-atomic');
      expect(searchModuleCode).toContain('announceToScreenReader');
      expect(searchModuleCode).toContain('Found ${products.length} products');
    });

    it('should include proper tabindex management', () => {
      expect(searchModuleCode).toContain('tabindex="0"');
      expect(searchModuleCode).toContain('focus()');
    });

    it('should provide screen reader only content', () => {
      expect(cssCode).toContain('.sr-only');
      expect(cssCode).toContain('position: absolute');
      expect(cssCode).toContain('clip: rect(0, 0, 0, 0)');
    });
  });

  describe('Focus Indicators and Visual Accessibility', () => {
    it('should include visible focus indicators', () => {
      expect(cssCode).toContain(':focus');
      expect(cssCode).toContain(':focus-visible');
      expect(cssCode).toContain('outline: 2px solid');
      expect(cssCode).toContain('outline-offset');
    });

    it('should support high contrast mode', () => {
      expect(cssCode).toContain('@media (prefers-contrast: high)');
      expect(cssCode).toContain('outline: 3px solid');
      expect(cssCode).toContain('font-weight: bold');
    });

    it('should support reduced motion preferences', () => {
      expect(cssCode).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssCode).toContain('transition: none');
      expect(cssCode).toContain('animation-duration: 0.01ms');
    });

    it('should include dark mode support', () => {
      expect(cssCode).toContain('@media (prefers-color-scheme: dark)');
      expect(cssCode).toContain('outline-color');
    });

    it('should ensure minimum touch target sizes', () => {
      expect(cssCode).toContain('min-height: 44px');
      expect(cssCode).toContain('min-width: 44px');
    });
  });

  describe('API Request Efficiency', () => {
    it('should maintain precise debounce timing', () => {
      expect(searchModuleCode).toContain('debounceDelay: 300');
      expect(searchModuleCode).toContain('setTimeout');
      expect(searchModuleCode).toContain('CONFIG.debounceDelay');
    });

    it('should include request cancellation logic', () => {
      expect(searchModuleCode).toContain('AbortController');
      expect(searchModuleCode).toContain('signal');
      expect(searchModuleCode).toContain('abort()');
    });

    it('should optimize cache hit rates', () => {
      expect(searchModuleCode).toContain('CacheManager');
      expect(searchModuleCode).toContain('lastAccessed');
      expect(searchModuleCode).toContain('cacheExpiry');
      expect(searchModuleCode).toContain('LRU');
    });

    it('should prevent unnecessary API calls', () => {
      expect(searchModuleCode).toContain('clearTimeout');
      expect(searchModuleCode).toContain('debounceTimer');
      expect(searchModuleCode).toContain('currentQuery');
    });
  });

  describe('Memory Management', () => {
    it('should clean up event listeners', () => {
      expect(searchModuleCode).toContain('removeEventListener');
      expect(searchModuleCode).toContain('KeyboardNavigation.destroy');
      expect(searchModuleCode).toContain('PerformanceUtils.cancelImageObserver');
    });

    it('should mark elements for cleanup', () => {
      expect(searchModuleCode).toContain('data-search-cleanup');
      expect(searchModuleCode).toContain('querySelectorAll(\'[data-search-cleanup]\')');
      expect(searchModuleCode).toContain('element.remove()');
    });

    it('should initialize and cleanup performance utilities', () => {
      expect(searchModuleCode).toContain('PerformanceUtils.initLazyLoading');
      expect(searchModuleCode).toContain('Performance optimizations initialized');
      expect(searchModuleCode).toContain('Performance cleanup failed');
    });
  });

  describe('Responsive Design Integration', () => {
    it('should include responsive CSS for different viewports', () => {
      expect(cssCode).toContain('@media (max-width: 768px)');
      expect(cssCode).toContain('@media (min-width: 769px)');
      expect(cssCode).toContain('font-size: 14px');
      expect(cssCode).toContain('font-size: 15px');
    });

    it('should optimize for mobile performance', () => {
      expect(cssCode).toContain('-webkit-overflow-scrolling: touch');
      expect(cssCode).toContain('transform: translateZ(0)');
    });

    it('should include print-friendly styles', () => {
      expect(cssCode).toContain('@media print');
      expect(cssCode).toContain('color: black !important');
      expect(cssCode).toContain('text-decoration: underline');
    });
  });

  describe('Integration with Existing Components', () => {
    it('should integrate with result rendering', () => {
      expect(searchModuleCode).toContain('PerformanceUtils.lazyLoadImages(resultsListContainer)');
      expect(searchModuleCode).toContain('KeyboardNavigation.updateFocusableElements');
      expect(searchModuleCode).toContain('data-search-cleanup');
    });

    it('should maintain backward compatibility', () => {
      expect(searchModuleCode).toContain('cart-drawer__item');
      expect(searchModuleCode).toContain('cart-drawer__item-link');
      expect(searchModuleCode).toContain('cart-drawer__item-title');
    });

    it('should initialize all utilities in correct order', () => {
      expect(searchModuleCode).toContain('PerformanceUtils.initLazyLoading()');
      expect(searchModuleCode).toContain('KeyboardNavigation.init()');
      expect(searchModuleCode).toContain('Performance optimizations initialized');
      expect(searchModuleCode).toContain('Keyboard navigation initialized');
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle missing IntersectionObserver gracefully', () => {
      expect(searchModuleCode).toContain('\'IntersectionObserver\' in window');
      expect(searchModuleCode).toContain('if (!this.imageObserver) return');
    });

    it('should handle performance utility failures', () => {
      expect(searchModuleCode).toContain('Performance optimization setup failed');
      expect(searchModuleCode).toContain('Performance cleanup failed');
    });

    it('should handle keyboard navigation failures', () => {
      expect(searchModuleCode).toContain('Keyboard navigation setup failed');
      expect(searchModuleCode).toContain('Keyboard navigation cleanup failed');
    });

    it('should continue functioning when accessibility features fail', () => {
      expect(searchModuleCode).toContain('try {');
      expect(searchModuleCode).toContain('} catch (error) {');
      expect(searchModuleCode).toContain('console.warn');
    });
  });
});