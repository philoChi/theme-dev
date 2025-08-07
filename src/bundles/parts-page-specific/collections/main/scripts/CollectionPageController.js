/**
 * Simplified Collection Page Controller
 * Coordinates basic collection page functionality for server-side rendering
 */

import { ErrorHandler } from './ErrorHandler.js';
import { FilterManager } from './FilterManager.js';
import { SortManager } from './SortManager.js';
import { AccessibilityManager } from './AccessibilityManager.js';
import { DOMUtils } from './CollectionUtils.js';

export class CollectionPageController {
  constructor() {
    this.section = document.querySelector('.section-collection-page');
    if (!this.section) return;

    // Initialize managers
    this.errorHandler = new ErrorHandler();
    this.accessibilityManager = new AccessibilityManager();
    this.filterManager = new FilterManager(this.errorHandler);
    this.sortManager = new SortManager(this.accessibilityManager);

    // Elements cache
    this.elements = {};

    // Initialize
    this.init();
  }

  /**
   * Initialize the collection page controller
   */
  init() {
    try {
      this.cacheElements();
      this.initializeManagers();
      this.attachEventListeners();
      this.initializeFromURL();
      this.initializeProductCardVariants();

      if (window.logger) {
        window.logger.log('CollectionPageController initialized successfully');
      }
    } catch (error) {
      this.errorHandler.handleError('Initialization failed', error);
    }
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    const selectors = {
      grid: '[data-product-grid]',
      sortSelect: '[data-sort-dropdown]',
      filterDrawerContent: '[data-filter-drawer-content]'
    };

    this.elements = DOMUtils.cacheElements(this.section, selectors);

    // Also cache filter drawer content from document if not found in section
    if (!this.elements.filterDrawerContent) {
      this.elements.filterDrawerContent = document.querySelector('[data-filter-drawer-content]');
    }
  }

  /**
   * Initialize managers with current page context
   */
  initializeManagers() {
    // Initialize filter manager (handles Shopify native filters)
    this.filterManager.initialize(this.section, this.elements);

    // Initialize sort manager
    this.sortManager.initialize(this.section, this.elements);

    // Setup filter drawer if available
    if (this.elements.filterDrawerContent) {
      if (window.logger) {
        window.logger.log('Filter drawer setup completed');
      }
    }

    if (window.logger) {
      window.logger.log('Collection page bundle initialized successfully');
      window.logger.log('Server-side pagination initialized');
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Handle page unload cleanup
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });

    // Handle errors
    window.addEventListener('error', (event) => {
      this.errorHandler.handleError('JavaScript error', event.error);
    });

    // Handle clear all filters functionality
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-filter-clear-all]')) {
        e.preventDefault();
        this.filterManager.clearAllFilters();
      }
    });

    // Handle individual filter removal
    document.addEventListener('click', (e) => {
      const removeFilter = e.target.closest('[data-remove-filter]');
      if (removeFilter) {
        e.preventDefault();
        const filterParam = removeFilter.dataset.removeFilter;
        if (filterParam) {
          this.filterManager.removeFilter(filterParam);
        }
      }
    });
  }

  /**
   * Initialize from current URL parameters
   */
  initializeFromURL() {
    // Let FilterManager handle URL initialization
    const urlState = this.filterManager.initializeFromURL();

    // Duplicate log for compatibility (some code might expect this)
    if (window.logger) {
      window.logger.log('Initialized from URL:', urlState);
    }
  }

  /**
   * Initialize product card variants for new products
   */
  initializeProductCardVariants() {
    if (typeof window.Shopify === 'undefined' || !window.Shopify.ProductCardVariants) {
      if (window.logger && window.logger.warn) {
        window.logger.warn('ProductCardVariants system not available');
      }
      return;
    }

    const productCards = this.section.querySelectorAll('.product-card[data-product-id]');

    productCards.forEach(card => {
      if (!card.hasAttribute('data-variants-initialized')) {
        try {
          window.Shopify.ProductCardVariants.register(card);
          card.setAttribute('data-variants-initialized', 'true');

          if (window.logger) {
            window.logger.log('Initialized variants for product:', card.dataset.productId);
          }
        } catch (error) {
          if (window.logger) {
            window.logger.error('Failed to initialize variants:', error);
          }
        }
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.filterManager?.destroy();
    this.sortManager?.destroy();

    if (window.logger) {
      window.logger.log('CollectionPageController destroyed');
    }
  }
}