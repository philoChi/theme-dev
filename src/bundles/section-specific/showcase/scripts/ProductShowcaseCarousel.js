// Import logger from features bundle
const { loggers } = window.SharedFeaturesBundle?.utils || { loggers: {
  StartUpLogger: { init: () => {}, warn: () => {}, error: () => {} },
  CarouselLogger: { init: () => {}, warn: () => {}, error: () => {} }
}};
const { CarouselLogger, StartUpLogger } = loggers;

/**
 * @class CarouselController
 * @description Controls carousel functionality for product showcase grid
 */
class CarouselController {
  constructor(container) {
    this.logger = CarouselLogger;
    this.logger.init(`Initializing CarouselController (${container.dataset.carouselId})`);
    
    this.container = container;
    this.handleClick = this.handleClick.bind(this);
    this.handleResize = this.debounce(this.updateLayout.bind(this), 250);
    
    // Initialize with forced layout calculation
    requestAnimationFrame(() => {
      this.init();
      this.logger.init('CarouselController constructor completed');
    });
  }

  /**
   * Initialize carousel elements
   * @private
   */
  initializeElements() {
    this.logger.init('Initializing carousel elements');
    
    // Core elements setup
    this.track = this.container.querySelector('[data-carousel-container]');
    this.logger.init('Carousel track selected', { track: this.track });

    this.trackInner = this.track?.querySelector('.product-showcase__track-inner');
    this.logger.init('Carousel track inner selected', { trackInner: this.trackInner });

    // Remove any existing transition before initialization
    if (this.trackInner) {
      this.trackInner.style.transition = 'none';
    }

    this.slides = this.trackInner
      ? Array.from(this.trackInner.querySelectorAll('.product-showcase__slide'))
      : [];
    this.logger.init('Slides initialized', { slidesCount: this.slides.length });

    const navigationContainer = this.container.querySelector('.product-showcase__navigation');
    this.logger.init('Navigation container selected', { navigationContainer });

    this.prevButton = navigationContainer?.querySelector('[data-direction="prev"]');
    this.nextButton = navigationContainer?.querySelector('[data-direction="next"]');
    this.logger.init('Navigation buttons selected', { prevButton: this.prevButton, nextButton: this.nextButton });

    // State initialization
    this.productsPerRow = parseInt(this.container.dataset.productsPerRow) || 4;
    this.logger.init('Products per row set', { productsPerRow: this.productsPerRow });

    this.totalProducts = this.slides.length;
    this.visibleSlides = this.getVisibleSlides();
    this.totalSlides = Math.max(1, Math.ceil((this.totalProducts - this.visibleSlides) / this.visibleSlides) + 1);
    this.currentSlide = 1;

    // Calculate initial slide width
    this.slideWidthPercentage = 100 / this.visibleSlides;

    this.logger.init('Carousel state initialized', {
      totalProducts: this.totalProducts,
      totalSlides: this.totalSlides,
      currentSlide: this.currentSlide,
      slideWidthPercentage: this.slideWidthPercentage
    });

    // Force a reflow before applying initial transform
    if (this.trackInner) {
      this.trackInner.style.transform = 'translateX(0%)';
      this.trackInner.offsetHeight; // Force reflow
    }
  }

  /**
   * Bind Navigation events
   * @private
   */
  bindNavigationEvents() {
    this.logger.init('Binding navigation events');
    
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.handleClick);
      this.logger.init('Previous button event listener added');
    }
    
    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.handleClick);
      this.logger.init('Next button event listener added');
    }
  }

  /**
   * Initialize carousel
   * @private
   */
  init() {
    this.logger.init('Initializing carousel');
    
    this.initializeElements();
    
    if (!this.trackInner || this.slides.length === 0) {
      this.logger.warn('Cannot initialize carousel: trackInner is missing or no slides available');
      return;
    }

    window.addEventListener('resize', this.handleResize);
    this.logger.init('Resize event listener added');

    this.bindNavigationEvents();
    
    // Initialize layout with immediate position update
    this.updateLayout(true);
    this.logger.init('Layout updated');

    // Re-enable transitions after initial positioning
    requestAnimationFrame(() => {
      if (this.trackInner) {
        this.trackInner.style.transition = 'transform 1000ms ease-in-out';
      }
    });

    this.updateNavigationState();
    this.logger.init('Navigation state updated during init');
  }

  /**
   * Update slide positions
   * @param {boolean} immediate - Whether to skip transition
   * @private
   */
  updateSlidePosition(immediate = false) {
    if (!this.trackInner || !this.slides.length) return;

    // Calculate how many slides to move
    const slidesToMove = this.visibleSlides;
    const offset = -((this.currentSlide - 1) * slidesToMove * this.slideWidthPercentage);

    // Apply transform
    if (immediate) {
      this.trackInner.style.transition = 'none';
      requestAnimationFrame(() => {
        this.trackInner.style.transition = '';
        this.trackInner.style.transform = `translateX(${offset}%)`;
        this.trackInner.offsetHeight; // Force reflow
      });
    } else {
      this.trackInner.style.transition = 'transform 1000ms ease-in-out';
      requestAnimationFrame(() => {
        this.trackInner.style.transform = `translateX(${offset}%)`;
      });
    }

    // Always update navigation state after position update
    this.updateNavigationState();
  }

  /**
   * Handle navigation button clicks
   * @param {Event} event - Click event
   * @private
   */
  handleClick(event) {
    const button = event.target.closest('[data-direction]');
    if (!button || button.disabled) return;

    const direction = button.dataset.direction;
    const increment = direction === 'next' ? 1 : -1;
    const targetSlide = this.currentSlide + increment;

    if (targetSlide >= 1 && targetSlide <= this.totalSlides) {
      this.currentSlide = targetSlide;
      this.updateSlidePosition();
      this.updateNavigationState();
    }
  }

  /**
   * Update navigation button states
   * @private
   */
  updateNavigationState() {
    if (!this.prevButton || !this.nextButton) return;

    this.prevButton.disabled = this.currentSlide === 1;
    this.nextButton.disabled = this.currentSlide === this.totalSlides;

    // Update ARIA labels
    this.prevButton.setAttribute('aria-disabled', this.currentSlide === 1);
    this.nextButton.setAttribute('aria-disabled', this.currentSlide === this.totalSlides);
  }

  /**
   * Update carousel layout
   * @param {boolean} [immediate=false] - Whether to skip transition
   * @private
   */
  updateLayout(immediate = false) {
    // Check if layout changed
    let oldvisibleSlides = this.visibleSlides;
    this.visibleSlides = this.getVisibleSlides();
    
    // Calculate widths before any transform
    this.slideWidthPercentage = 100 / this.visibleSlides;

    if (oldvisibleSlides === this.visibleSlides) {
      return;
    }

    // Calculate total slides based on visible slides and total products
    const totalGroups = Math.ceil(this.totalProducts / this.visibleSlides);
    this.totalSlides = Math.max(1, totalGroups);

    if (this.currentSlide > this.totalSlides) {
      this.currentSlide = this.totalSlides;
    }

    this.updateSlidePosition(immediate || true);
    this.updateNavigationState();
  }

  /**
   * Get number of visible slides based on viewport.
   * @returns {number} Number of visible slides
   * @private
   * @important This has to match with the css breakpoint settings
   */
  getVisibleSlides() {
    const width = window.innerWidth;
    if (width < 501) return 1;
    if (width < 991) return 2;
    if (width < 1024) return Math.min(3, this.productsPerRow);
    if (width < 1400) return Math.min(3, this.productsPerRow);
    return this.productsPerRow;
  }

  /**
   * Debounce helper function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   * @private
   */
  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Clean up event listeners
   * @public
   */
  destroy() {
    if (this.prevButton) {
      this.prevButton.removeEventListener('click', this.handleClick);
    }
    if (this.nextButton) {
      this.nextButton.removeEventListener('click', this.handleClick);
    }
    window.removeEventListener('resize', this.handleResize);
  }
}

// Initialize carousels on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Get all carousel grids
  const carousels = document.querySelectorAll('.product-showcase__grid[data-carousel-id]');
  
  // Initialize each carousel
  carousels.forEach(carousel => {
    StartUpLogger.init(`Carousel loaded: ${carousel.dataset.carouselId}`);
    const controller = new CarouselController(carousel);
    carousel._carouselController = controller;
  });
});

// Handle Shopify section lifecycle
document.addEventListener('shopify:section:unload', (event) => {
  const carousels = event.target.querySelectorAll('.product-showcase__grid[data-carousel-id]');
  carousels.forEach(carousel => {
    if (carousel._carouselController) {
      carousel._carouselController.destroy();
    }
  });
});

// Initialize carousel functionality for showcase-simple sections
document.addEventListener('shopify:section:load', (event) => {
  if (event.target.getAttribute('data-section-type') === 'showcase-simple') {
    const carousels = event.target.querySelectorAll('.product-showcase__grid[data-carousel-id]');
    carousels.forEach(carousel => {
      StartUpLogger.init(`Simple showcase carousel loaded: ${carousel.dataset.carouselId}`);
      const controller = new CarouselController(carousel);
      carousel._carouselController = controller;
    });
  }
});

/**
 * @class ProductShowcaseCarousel
 * @extends HTMLElement
 * @description Custom element for product showcase carousel functionality
 */
class ProductShowcaseCarousel extends HTMLElement {
  constructor() {
    super();
    this.controller = null;
  }

  connectedCallback() {
    // Initialize the carousel controller when element is connected
    this.controller = new CarouselController(this);
  }

  disconnectedCallback() {
    // Clean up when element is disconnected
    if (this.controller && typeof this.controller.destroy === 'function') {
      this.controller.destroy();
    }
  }
}

// Register the custom element (defensive registration)
if (typeof ProductShowcaseCarousel === 'function' && !customElements.get('product-showcase-carousel')) {
  try {
    customElements.define('product-showcase-carousel', ProductShowcaseCarousel);
    console.log('[ProductShowcaseCarousel] Custom element registered successfully');
  } catch (error) {
    console.error('[ProductShowcaseCarousel] Failed to register custom element:', error);
  }
} else {
  console.warn('[ProductShowcaseCarousel] Class not defined or custom element already registered');
}

// Export the class for custom element registration
export default ProductShowcaseCarousel;