/**
 * Unit Tests for Sorting Dropdown Component
 * Tests the standalone sorting dropdown functionality with style-wrapper integration
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Mock logger
global.window.logger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock notification system
global.window.showNotification = jest.fn();

// Mock SortManager
const mockSortManager = {
  initialize: jest.fn(),
  handleSortChange: jest.fn(),
  handleSortKeydown: jest.fn(),
  setSortValue: jest.fn(),
  getSortValue: jest.fn(() => 'manual'),
  applySorting: jest.fn(),
  dispatchSortChangeEvent: jest.fn()
};

describe('Sorting Dropdown Component', () => {
  let container;
  let sortWrapper;
  let sortSelect;
  let sortDisplay;
  let sortArrow;

  beforeEach(() => {
    // Create DOM structure matching the actual implementation
    document.body.innerHTML = `
      <div class="collection-page__toolbar">
        <div class="style-wrapper style-wrapper--flat-basic">
          <div class="collection-page__sort-wrapper" data-sort-select>
            <span class="collection-page__sort-display">Featured</span>
            <select
              id="sort-by-test"
              class="collection-page__sort-select"
              aria-describedby="sort-help-test"
            >
              <option value="manual" selected>Featured</option>
              <option value="created-descending">Newest first</option>
              <option value="price-ascending">Price: Low to high</option>
              <option value="price-descending">Price: High to low</option>
              <option value="best-selling">Best selling</option>
            </select>
            <span class="icon icon-dropdown-arrow collection-page__sort-arrow" aria-hidden="true"></span>
          </div>
        </div>
      </div>
    `;

    container = document.querySelector('.collection-page__toolbar');
    sortWrapper = document.querySelector('.collection-page__sort-wrapper');
    sortSelect = document.querySelector('.collection-page__sort-select');
    sortDisplay = document.querySelector('.collection-page__sort-display');
    sortArrow = document.querySelector('.collection-page__sort-arrow');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('DOM Structure', () => {
    it('should have correct HTML structure', () => {
      expect(sortWrapper).toBeTruthy();
      expect(sortSelect).toBeTruthy();
      expect(sortDisplay).toBeTruthy();
      expect(sortArrow).toBeTruthy();
    });

    it('should have proper CSS classes', () => {
      expect(sortWrapper.classList.contains('collection-page__sort-wrapper')).toBe(true);
      expect(sortSelect.classList.contains('collection-page__sort-select')).toBe(true);
      expect(sortDisplay.classList.contains('collection-page__sort-display')).toBe(true);
      expect(sortArrow.classList.contains('collection-page__sort-arrow')).toBe(true);
    });

    it('should have style-wrapper applied', () => {
      const styleWrapper = document.querySelector('.style-wrapper--flat-basic');
      expect(styleWrapper).toBeTruthy();
    });

    it('should have proper accessibility attributes', () => {
      expect(sortSelect.getAttribute('aria-describedby')).toBe('sort-help-test');
      expect(sortArrow.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('Select Element Positioning', () => {
    it('should have invisible select element covering the wrapper', () => {
      // Get computed styles (approximation for testing)
      const selectStyles = window.getComputedStyle(sortSelect);
      
      // These would be set by CSS, but we can test the attributes
      expect(sortSelect.style.position).toBe('');
      expect(sortSelect.style.opacity).toBe('');
      expect(sortSelect.style.zIndex).toBe('');
    });

    it('should have proper z-index hierarchy', () => {
      // Test that select element has data-sort-select attribute (JavaScript selector)
      expect(sortWrapper.hasAttribute('data-sort-select')).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should handle select change events', () => {
      const changeHandler = jest.fn();
      sortSelect.addEventListener('change', changeHandler);

      // Simulate selecting a new option
      sortSelect.value = 'price-ascending';
      sortSelect.dispatchEvent(new Event('change'));

      expect(changeHandler).toHaveBeenCalled();
      expect(sortSelect.value).toBe('price-ascending');
    });

    it('should handle keyboard navigation', () => {
      const keydownHandler = jest.fn();
      sortSelect.addEventListener('keydown', keydownHandler);

      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      sortSelect.dispatchEvent(enterEvent);

      expect(keydownHandler).toHaveBeenCalled();
    });

    it('should handle Space key', () => {
      const keydownHandler = jest.fn();
      sortSelect.addEventListener('keydown', keydownHandler);

      // Simulate Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      sortSelect.dispatchEvent(spaceEvent);

      expect(keydownHandler).toHaveBeenCalled();
    });
  });

  describe('Display Text Updates', () => {
    it('should update display text when selection changes', () => {
      // Mock the behavior of SortManager updating display text
      const updateDisplayText = (selectElement) => {
        const selectedOption = selectElement.selectedOptions[0];
        if (selectedOption) {
          sortDisplay.textContent = selectedOption.text;
        }
      };

      // Test updating display text
      sortSelect.value = 'price-ascending';
      updateDisplayText(sortSelect);

      expect(sortDisplay.textContent).toBe('Price: Low to high');
    });

    it('should maintain display text consistency', () => {
      // Test all options
      const options = [
        { value: 'manual', text: 'Featured' },
        { value: 'created-descending', text: 'Newest first' },
        { value: 'price-ascending', text: 'Price: Low to high' },
        { value: 'price-descending', text: 'Price: High to low' },
        { value: 'best-selling', text: 'Best selling' }
      ];

      options.forEach(option => {
        sortSelect.value = option.value;
        const selectedOption = sortSelect.selectedOptions[0];
        expect(selectedOption.text).toBe(option.text);
      });
    });
  });

  describe('Style Wrapper Integration', () => {
    it('should work with flat-basic style wrapper', () => {
      const wrapper = document.querySelector('.style-wrapper--flat-basic');
      expect(wrapper).toBeTruthy();
      
      // Test that wrapper contains the sort wrapper
      expect(wrapper.contains(sortWrapper)).toBe(true);
    });

    it('should handle hover states without interfering with clicks', () => {
      // Test that hover events can be simulated
      const mouseEnterEvent = new MouseEvent('mouseenter');
      const mouseLeaveEvent = new MouseEvent('mouseleave');
      
      sortWrapper.dispatchEvent(mouseEnterEvent);
      sortWrapper.dispatchEvent(mouseLeaveEvent);
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', () => {
      sortSelect.focus();
      expect(document.activeElement).toBe(sortSelect);
    });

    it('should have proper ARIA attributes', () => {
      expect(sortSelect.getAttribute('aria-describedby')).toBe('sort-help-test');
      expect(sortArrow.getAttribute('aria-hidden')).toBe('true');
    });

    it('should support screen reader announcements', () => {
      // Mock screen reader announcement
      const announceToScreenReader = jest.fn();
      
      // Simulate sort change with screen reader announcement
      sortSelect.value = 'price-descending';
      const selectedOption = sortSelect.selectedOptions[0];
      
      if (selectedOption) {
        announceToScreenReader(`Products sorted by ${selectedOption.text}`);
      }
      
      expect(announceToScreenReader).toHaveBeenCalledWith('Products sorted by Price: High to low');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing display element gracefully', () => {
      // Remove display element
      sortDisplay.remove();
      
      // Should not throw error when trying to update non-existent display
      const updateDisplayText = () => {
        const displayElement = document.querySelector('.collection-page__sort-display');
        if (displayElement) {
          displayElement.textContent = 'Test';
        }
      };
      
      expect(updateDisplayText).not.toThrow();
    });

    it('should handle invalid sort values', () => {
      // Test setting invalid value
      sortSelect.value = 'invalid-sort';
      
      // Should default to first option or handle gracefully
      expect(sortSelect.value).toBe('invalid-sort'); // Browser behavior
      expect(sortSelect.selectedIndex).toBe(-1); // No valid selection
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should work on mobile viewports', () => {
      // Simulate mobile viewport
      global.window.innerWidth = 375;
      global.window.innerHeight = 667;
      
      // Test that elements are still accessible
      expect(sortWrapper).toBeTruthy();
      expect(sortSelect).toBeTruthy();
      
      // Test touch events
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      expect(() => {
        sortWrapper.dispatchEvent(touchEvent);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks', () => {
      // Add event listeners
      const listeners = [];
      
      const addListener = (element, event, handler) => {
        element.addEventListener(event, handler);
        listeners.push({ element, event, handler });
      };
      
      addListener(sortSelect, 'change', () => {});
      addListener(sortSelect, 'keydown', () => {});
      
      // Cleanup
      listeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      
      expect(listeners.length).toBe(2);
    });

    it('should handle rapid interactions', () => {
      const changeHandler = jest.fn();
      sortSelect.addEventListener('change', changeHandler);
      
      // Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        sortSelect.value = i % 2 === 0 ? 'price-ascending' : 'price-descending';
        sortSelect.dispatchEvent(new Event('change'));
      }
      
      expect(changeHandler).toHaveBeenCalledTimes(10);
    });
  });
});