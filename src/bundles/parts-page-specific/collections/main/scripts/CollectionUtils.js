/**
 * Utility functions for collection page
 * Combined DOM, performance, and event utilities
 */

/**
 * DOM utility functions
 */
export class DOMUtils {
  /**
   * Cache elements using data attributes
   */
  static cacheElements(container, selectors) {
    const cached = {};
    Object.entries(selectors).forEach(([key, selector]) => {
      cached[key] = container.querySelector(selector);
    });
    return cached;
  }

  /**
   * Build a map of product IDs to grid items for efficient lookups
   */
  static buildProductMap(gridItems) {
    const productIdToGridItem = new Map();
    gridItems.forEach(item => {
      const productCard = item.querySelector('[data-product-id]');
      if (productCard) {
        productIdToGridItem.set(productCard.dataset.productId, item);
      }
    });
    return productIdToGridItem;
  }

  /**
   * Toggle visibility of multiple elements efficiently
   */
  static toggleElementsVisibility(elements, shouldShow) {
    const toHide = [];
    const toShow = [];
    
    elements.forEach(element => {
      const shouldBeVisible = shouldShow(element);
      const currentlyVisible = element.style.display !== 'none';

      if (!shouldBeVisible && currentlyVisible) {
        toHide.push(element);
      } else if (shouldBeVisible && !currentlyVisible) {
        toShow.push(element);
      }
    });

    toHide.forEach(element => element.style.display = 'none');
    toShow.forEach(element => element.style.display = '');
  }

  /**
   * Create element from HTML string
   */
  static createElementFromHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();
    return tempDiv.firstElementChild;
  }

  /**
   * Schedule DOM update using optimal timing
   */
  static scheduleUpdate(callback) {
    const scheduler = window.requestIdleCallback || requestAnimationFrame;
    scheduler(callback);
  }

  /**
   * Find focusable elements within a container
   */
  static getFocusableElements(container) {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];

    return container.querySelectorAll(focusableSelectors.join(','));
  }

  /**
   * Safely remove element if it exists
   */
  static safeRemove(element) {
    if (element && element.parentNode) {
      element.remove();
    }
  }
}

/**
 * Performance utility functions
 */
export class PerformanceUtils {
  /**
   * Performance-optimized debouncing with immediate execution option
   */
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * Measure and log performance of a function
   */
  static measurePerformance(label, fn) {
    if (!window.performance) return fn();
    
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    if (duration > 16 && window.logger) {
      window.logger.warn(`${label} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  /**
   * Throttle function execution
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Create optimized timeout with abort controller
   */
  static createOptimizedTimeout(timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    return { controller, timeoutId };
  }

  /**
   * Batch DOM operations for better performance
   */
  static batchDOMOperations(operations) {
    const fragment = document.createDocumentFragment();
    operations(fragment);
    return fragment;
  }

  /**
   * Monitor and log long tasks
   */
  static monitorLongTask(context, task) {
    const startTime = performance.now();
    const result = task();
    const duration = performance.now() - startTime;
    
    if (duration > 50 && window.logger) {
      window.logger.warn(`Long task detected in ${context}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }
}

/**
 * Event utility functions
 */
export class EventUtils {
  /**
   * Event delegation helper
   */
  static delegate(container, selector, eventType, handler) {
    container.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector);
      if (target) {
        handler.call(target, event);
      }
    });
  }

  /**
   * Create and dispatch custom event with data
   */
  static dispatchCustomEvent(eventName, detail = {}, target = document, options = {}) {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail,
      ...options
    });

    target.dispatchEvent(event);
    return event;
  }

  /**
   * Add multiple event listeners to an element
   */
  static addMultipleListeners(element, events) {
    Object.entries(events).forEach(([eventType, handler]) => {
      if (typeof handler === 'function') {
        element.addEventListener(eventType, handler);
      }
    });
  }

  /**
   * Remove multiple event listeners from an element
   */
  static removeMultipleListeners(element, events) {
    Object.entries(events).forEach(([eventType, handler]) => {
      if (typeof handler === 'function') {
        element.removeEventListener(eventType, handler);
      }
    });
  }

  /**
   * Create event listener with automatic cleanup
   */
  static createManagedListener(element, eventType, handler, options = {}) {
    element.addEventListener(eventType, handler, options);
    
    return () => {
      element.removeEventListener(eventType, handler, options);
    };
  }

  /**
   * Handle keyboard navigation events
   */
  static handleKeyboardNavigation(event, handlers) {
    const handler = handlers[event.key];
    if (handler && typeof handler === 'function') {
      handler(event);
    }
  }

  /**
   * Prevent event loops by tracking dispatch timestamps
   */
  static shouldProcessEvent(event, lastDispatchTimestamp, threshold = 100) {
    if (event.detail && event.detail.timestamp && lastDispatchTimestamp) {
      return Math.abs(event.detail.timestamp - lastDispatchTimestamp) >= threshold;
    }
    return true;
  }

  /**
   * Create event listener with passive option for better performance
   */
  static addPassiveListener(element, eventType, handler, passive = true) {
    element.addEventListener(eventType, handler, { passive });
  }
}