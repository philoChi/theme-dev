import ImageSliderConfig from './ImageSliderConfig.js';
import ImageSliderNavigation from './ImageSliderNavigation.js';

/**
 * Image Slider Component
 * Complete image slider with navigation functionality
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
    
    this._logger(`[Slider: ${this.sliderId}] Initializing slider with ${this.slideCount} slides`);

    // Initialize slider components
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
   * Initialize and validate DOM elements
   */
  initializeElements() {
    this.container = this.slider.querySelector('.image-slider__container');
    if (!this.container) {
      throw new Error('Slider container not found');
    }
    
    // Just count slides, don't store the array
    this.slideCount = this.container.querySelectorAll('.image-slider__slide').length;
    if (this.slideCount === 0) {
      throw new Error('No slides found in container');
    }
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
   * Initialize the slider component with full functionality
   */
  init() {
    try {
      // Initialize configuration
      this.config = new ImageSliderConfig(this.slider);
      
      // Initialize navigation if we have multiple slides
      if (this.slideCount > 1) {
        this.navigation = new ImageSliderNavigation(this.slider, this.config);
        this._logger(`[Slider: ${this.sliderId}] Navigation initialized`);
      }
      
      // Mark slider as initialized
      this.slider.classList.add('image-slider--initialized');
      
      this._logger(`[Slider: ${this.sliderId}] Initialization complete`);
    } catch (error) {
      this.handleError('Failed to initialize slider', error);
    }
  }

  /**
   * Get current slide index from navigation
   * @returns {number} Current slide index
   */
  getCurrentIndex() {
    return this.navigation ? this.navigation.getCurrentIndex() : 0;
  }

  /**
   * Navigate to specific slide
   * @param {number} index - Target slide index
   */
  goToSlide(index) {
    if (this.navigation) {
      this.navigation.goToSlide(index);
    }
  }

  /**
   * Navigate to previous slide
   */
  goToPreviousSlide() {
    if (this.navigation) {
      this.navigation.goToPreviousSlide();
    }
  }

  /**
   * Navigate to next slide
   */
  goToNextSlide() {
    if (this.navigation) {
      this.navigation.goToNextSlide();
    }
  }

  /**
   * Cleanup slider instance
   */
  cleanup() {
    try {
      if (this.navigation) {
        this.navigation.cleanup();
        this.navigation = null;
      }
      
      this.slider.classList.remove('image-slider--initialized');
      
      this._logger(`[Slider: ${this.sliderId}] Cleanup completed`);
    } catch (error) {
      this.handleError('Failed to cleanup slider', error);
    }
  }
}

// Export the class for use in other modules
export default ImageSlider;