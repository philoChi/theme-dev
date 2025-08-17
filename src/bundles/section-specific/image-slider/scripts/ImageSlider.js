// Import required classes
import ImageSliderConfig from './ImageSliderConfig.js';
import SlideManager from './SlideManager.js';
import NavigationController from './NavigationController.js';
import AutoplayManager from './AutoplayManager.js';
import SwipeHandler from './SwipeHandler.js';

/**
 * Image Slider Component
 * High-performance image slider with infinite scrolling and accessibility features
 * Enhanced class-based implementation following CLAUDE.md guidelines
 */
class ImageSlider {
  /**
   * Initialize the image slider component
   * @param {HTMLElement} sliderElement - The container element for the slider
   */
  constructor(sliderElement) {
    this.slider = sliderElement;
    this.sliderId = this.generateSliderId(sliderElement);
    
    // Validate and cache DOM elements
    this.initializeElements();
    this.initializeLogger();
    
    this._logger(`[Slider: ${this.sliderId}] Initializing with ${this.slides.length} slides`);

    // Initialize all components
    this.initializeComponents();
    this.init();
  }

  /**
   * Generate unique slider ID
   * @param {HTMLElement} element - Slider element
   * @returns {string} Unique slider ID
   */
  generateSliderId(element) {
    return element.id || 'slider-' + Math.floor(Math.random() * 1000);
  }

  /**
   * Initialize and validate DOM elements with performance caching
   */
  initializeElements() {
    this.container = this.slider.querySelector('.image-slider__container');
    if (!this.container) {
      throw new Error('Slider container not found');
    }
    
    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
    if (this.slides.length === 0) {
      throw new Error('No slides found in container');
    }

    this.prevButton = this.slider.querySelector('[data-arrow="prev"]');
    this.nextButton = this.slider.querySelector('[data-arrow="next"]');
    if (!this.prevButton || !this.nextButton) {
      throw new Error('Navigation buttons not found');
    }

    // Cache slide references for performance
    this.slideCache = new WeakMap();
    this.slides.forEach((slide, index) => {
      this.slideCache.set(slide, { index, element: slide });
    });
  }

  /**
   * Initialize logger for debugging
   */
  initializeLogger() {
    this._logger = (typeof ImageSliderLogger !== 'undefined' && ImageSliderLogger.state)
      ? ImageSliderLogger.state.bind(ImageSliderLogger)
      : () => {};
  }

  /**
   * Initialize all component managers
   */
  initializeComponents() {
    // Initialize configuration
    this.config = new ImageSliderConfig(this.slider);
    
    // Initialize slide manager with center position
    this.slideManager = new SlideManager(
      this.container, 
      this.slides, 
      ImageSliderConfig.CONSTANTS.CENTER_POSITION, 
      this._logger
    );
    
    // Initialize navigation controller
    this.navigationController = new NavigationController(
      this.slideManager, 
      this._logger, 
      this.sliderId
    );
    
    // Initialize autoplay manager
    this.autoplayManager = new AutoplayManager(
      this.slider,
      this.config.getAutoplayConfig(),
      this.navigationController,
      this._logger,
      this.sliderId
    );
    
    // Initialize swipe handler
    this.swipeHandler = new SwipeHandler(
      this.slider,
      this.navigationController,
      ImageSliderConfig.CONSTANTS.SWIPE_THRESHOLD
    );
  }

  /**
   * Setup performance optimizations with initial load handling
   */
  setupPerformanceOptimizations() {
    // Use transform3d for GPU acceleration on container only
    this.container.style.transform = 'translate3d(0, 0, 0)';
    
    // Don't set inline transforms on slides - let CSS handle positioning
    // This allows data-slide-position attributes to work properly
    this.slides.forEach(slide => {
      // Only add will-change for optimization, not transform
      slide.style.willChange = 'transform, opacity';
    });
    
    // Clean up will-change after initial positioning
    requestAnimationFrame(() => {
      this.container.style.willChange = 'auto';
      
      setTimeout(() => {
        this.slides.forEach(slide => {
          if (slide.style.willChange && !slide.dataset.animating) {
            slide.style.willChange = 'auto';
          }
        });
      }, ImageSliderConfig.CONSTANTS.ANIMATION_DELAY + 100);
    });
  }


  /**
   * Error handling with notification system integration
   * @param {string} message - Error message
   * @param {Error} error - Original error object
   */
  handleError(message, error) {
    console.error(`[ImageSlider: ${this.sliderId}] ${message}:`, error);
    
    // Show user-friendly error if notification system is available
    if (window.showNotification) {
      window.showNotification(
        'There was an issue with the image slider. Please refresh the page.', 
        'error'
      );
    }
  }

  /**
   * Cleanup method for memory management
   */
  cleanup() {
    // Cleanup autoplay manager
    if (this.autoplayManager) {
      this.autoplayManager.cleanup();
    }
    
    // Cleanup swipe handler
    if (this.swipeHandler) {
      this.swipeHandler.cleanup();
    }
    
    // Clear slide cache
    if (this.slideCache) {
      this.slideCache = null;
    }
    
    // Reset container styles
    if (this.container) {
      this.container.style.willChange = 'auto';
      this.container.style.transform = '';
    }
    
    // Clear any inline styles on slides
    if (this.slides) {
      this.slides.forEach(slide => {
        slide.style.transform = '';
        slide.style.willChange = 'auto';
      });
    }
    
    this._logger(`[Slider: ${this.sliderId}] Cleanup completed`);
  }

  /**
   * Initialize the slider component
   * Sets up slide positioning, event listeners, and reveals the slider
   */
  init() {
    try {
      // Position active slide and setup slide management
      this.slideManager.positionActiveSlide();
      this.slides = this.slideManager.getCurrentState().slides;
      
      // Setup infinite scroll first
      this.slideManager.resetCopySlides();
      
      // Update current index to account for copy slide inserted at index 0
      const { slides, currentIndex } = this.slideManager.getCurrentState();
      this.slides = slides;
      this.slideManager.updateIndex(currentIndex + 1);
      
      // Setup all slide positions in correct order
      this.slideManager.updateCentralSlidePositions();
      this.slideManager.updateOffsetSlidePositions();
      this.slideManager.updateNextSlidePositions();

      // Setup navigation, autoplay, and swipe handling
      this.setupAllComponents();
      this.setupPerformanceOptimizations();

      // Reveal slider with smooth timing
      this.revealSlider();

      this._logger(`[Slider: ${this.sliderId}] Initialization complete`);
    } catch (error) {
      this.handleError('Failed to initialize slider components', error);
    }
  }

  /**
   * Setup all component managers
   */
  setupAllComponents() {
    // Setup navigation event listeners
    this.navigationController.setupNavigationListeners(this.prevButton, this.nextButton);
    
    // Setup autoplay functionality
    this.autoplayManager.setupAutoplay();
    
    // Setup swipe gesture handling
    this.swipeHandler.setupSwipeEvents();
  }

  /**
   * Reveal the slider with smooth timing after positioning is complete
   * Uses document.fonts.ready and double RAF for Chrome optimization
   */
  revealSlider() {
    // Wait for fonts to load for consistent rendering
    const revealWithOptimization = () => {
      // Double RAF ensures all layout calculations are complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.container.style.opacity = '1';
            this._logger(`[Slider: ${this.sliderId}] Slides revealed after optimization`);
          }, ImageSliderConfig.CONSTANTS.ANIMATION_DELAY);
        });
      });
    };

    // Use fonts.ready for better initial load timing
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(revealWithOptimization);
    } else {
      // Fallback for browsers without fonts API
      revealWithOptimization();
    }
  }



  /**
   * Navigate to next/previous slide (public API)
   * @param {string} direction - Direction to navigate ('left' or 'right')
   */
  navigate(direction) {
    this.navigationController.navigate(direction, () => {
      // Restart autoplay after manual navigation
      this.autoplayManager.restartAutoplay();
    });
  }

}

// Export the class for use in other modules
export default ImageSlider;
