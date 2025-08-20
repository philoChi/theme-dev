import ImageSliderConfig from './ImageSliderConfig.js';

/**
 * Image Slider Component - Static Version
 * Basic image slider with no functionality - only CSS-based layout
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
    
    this._logger(`[Slider: ${this.sliderId}] Initializing static slider with ${this.slides.length} slides`);

    // Basic initialization only
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
    
    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
    if (this.slides.length === 0) {
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
   * Initialize the slider component
   * Basic initialization - just adds loaded class for CSS styling
   */
  init() {
    try {
      // Initialize basic configuration
      this.config = new ImageSliderConfig(this.slider);
      
      // Add loaded class to container for CSS styling
      this.container.classList.add('image-slider__container--loaded');
      
      this._logger(`[Slider: ${this.sliderId}] Static initialization complete`);
    } catch (error) {
      this.handleError('Failed to initialize static slider', error);
    }
  }
}

// Export the class for use in other modules
export default ImageSlider;