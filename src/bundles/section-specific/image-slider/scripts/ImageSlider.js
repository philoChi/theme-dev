import ImageSliderConfig from './ImageSliderConfig.js';
import SlidePositionManager from './SlidePositionManager.js';
import SlideNavigationController from './SlideNavigationController.js';
import SlideUIUpdater from './SlideUIUpdater.js';

/**
 * Image Slider Component
 * Main orchestrator for image slider functionality
 */
class ImageSlider {
  /**
   * Initialize the image slider component
   * @param {HTMLElement} sliderElement - The container element for the slider
   */
  constructor(sliderElement) {
    this.slider = sliderElement;
    this.sliderId = this.generateSliderId(sliderElement);
    
    // Initialize and cache all DOM elements
    this.initializeElements();
    
    // Initialize the slider
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
   * Initialize and validate DOM elements - cache everything once
   */
  initializeElements() {
    // Main container
    this.container = this.slider.querySelector('.image-slider__container');
    if (!this.container) {
      throw new Error('Slider container not found');
    }
    
    // Cache slides and count
    this.slides = this.container.querySelectorAll('.image-slider__slide');
    this.slideCount = this.slides.length;
    if (this.slideCount === 0) {
      throw new Error('No slides found in container');
    }
    
    // Cache navigation elements
    this.prevButton = this.slider.querySelector('[data-arrow="prev"]');
    this.nextButton = this.slider.querySelector('[data-arrow="next"]');
    this.dots = Array.from(this.slider.querySelectorAll('.image-slider__dot'));
    this.liveRegion = this.slider.querySelector('[aria-live]');
  }

  /**
   * Initialize state and find current slide from DOM
   */
  initializeState() {
    // Find current slide based on aria-current attribute (0-based indexing)
    const currentSlideElement = this.container.querySelector('.image-slider__slide[aria-current="true"]');
    let currentIndex = 0;
    
    if (currentSlideElement) {
      currentIndex = Array.from(this.slides).indexOf(currentSlideElement);
    }
    
    // Ensure valid index
    if (currentIndex < 0 || currentIndex >= this.slideCount) {
      currentIndex = 0;
    }

    // Initialize helper classes
    this.positionManager = new SlidePositionManager(this.container, this.slides);
    this.navigationController = new SlideNavigationController(this.slideCount, this.positionManager);
    this.uiUpdater = new SlideUIUpdater(this.slides, this.dots, this.liveRegion);
    
    // Set current index in navigation controller and initialize UI
    this.navigationController.setCurrentIndex(currentIndex);
    this.uiUpdater.initializeStates(currentIndex);
    
    // Position slides correctly for current index
    this.positionManager.updateContainerPosition(currentIndex);
    this.positionManager.updateAdjacentSlidePositions(currentIndex);
  }

  /**
   * Bind all event listeners for navigation
   */
  bindEvents() {
    // Store bound methods for proper cleanup
    this.boundGoToPrevious = this.goToPreviousSlide.bind(this);
    this.boundGoToNext = this.goToNextSlide.bind(this);
    this.boundHandleTransitionEnd = this.handleTransitionEnd.bind(this);
    this.boundDotHandlers = [];
    
    // Arrow button clicks
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.boundGoToPrevious);
    }
    
    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.boundGoToNext);
    }
    
    // Dot indicator clicks
    this.dots.forEach((dot, index) => {
      const boundHandler = () => {
        const slideIndex = parseInt(dot.dataset.slideIndex, 10);
        this.goToSlide(slideIndex);
      };
      this.boundDotHandlers[index] = boundHandler;
      dot.addEventListener('click', boundHandler);
    });
    
    // Transition end event for infinite sliding
    this.container.addEventListener('transitionend', this.boundHandleTransitionEnd);
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
      
      // Initialize state and events if we have multiple slides
      if (this.slideCount > 1) {
        this.initializeState();
        this.bindEvents();
      }
      
      // Mark slider as initialized
      this.slider.classList.add('image-slider--initialized');
    } catch (error) {
      this.handleError('Failed to initialize slider', error);
    }
  }

  /**
   * Navigate to previous slide
   */
  goToPreviousSlide() {
    const result = this.navigationController.goToPreviousSlide();
    this.handleNavigationResult(result);
  }

  /**
   * Navigate to next slide
   */
  goToNextSlide() {
    const result = this.navigationController.goToNextSlide();
    this.handleNavigationResult(result);
  }

  /**
   * Navigate to specific slide
   * @param {number} slideIndex - Target slide index (0-based)
   */
  goToSlide(slideIndex) {
    const result = this.navigationController.goToSlide(slideIndex);
    this.handleNavigationResult(result);
  }

  /**
   * Handle navigation result from controller
   * @param {Object} result - Navigation result object
   */
  handleNavigationResult(result) {
    if (!result.success) {
      return;
    }

    const { previousIndex, currentIndex, useInfiniteTransition, isForward } = result;
    
    // Execute appropriate transition
    if (useInfiniteTransition) {
      this.navigationController.executeInfiniteTransition(previousIndex, currentIndex, isForward);
    } else {
      this.navigationController.executeStandardTransition(currentIndex);
    }
    
    // Update UI states
    this.uiUpdater.updateAllStates(currentIndex, previousIndex);
  }


  /**
   * Handle transition end event for infinite sliding cleanup
   * @param {TransitionEvent} event - Transition event
   */
  handleTransitionEnd(event) {
    // Only handle container transform transitions
    if (event.target !== this.container || event.propertyName !== 'transform') {
      return;
    }
    
    this.navigationController.handleTransitionEnd(this.handleError.bind(this));
  }

  /**
   * Get current slide index
   * @returns {number} Current slide index (0-based)
   */
  getCurrentIndex() {
    return this.navigationController ? this.navigationController.getCurrentIndex() : 0;
  }

  /**
   * Get total number of slides
   * @returns {number} Total slide count
   */
  getSlideCount() {
    return this.navigationController ? this.navigationController.getSlideCount() : this.slideCount;
  }

  /**
   * Check if we're on the first slide
   * @returns {boolean} True if on first slide
   */
  isFirstSlide() {
    return this.navigationController ? this.navigationController.isFirstSlide() : false;
  }

  /**
   * Check if we're on the last slide
   * @returns {boolean} True if on last slide
   */
  isLastSlide() {
    return this.navigationController ? this.navigationController.isLastSlide() : false;
  }

  /**
   * Cleanup slider instance
   */
  cleanup() {
    try {
      // Remove event listeners (bound methods are stored during bindEvents)
      if (this.prevButton && this.boundGoToPrevious) {
        this.prevButton.removeEventListener('click', this.boundGoToPrevious);
      }
      
      if (this.nextButton && this.boundGoToNext) {
        this.nextButton.removeEventListener('click', this.boundGoToNext);
      }
      
      if (this.boundDotHandlers) {
        this.dots.forEach((dot, index) => {
          if (this.boundDotHandlers[index]) {
            dot.removeEventListener('click', this.boundDotHandlers[index]);
          }
        });
      }
      
      // Remove infinite sliding event listener
      if (this.container && this.boundHandleTransitionEnd) {
        this.container.removeEventListener('transitionend', this.boundHandleTransitionEnd);
      }
      
      this.slider.classList.remove('image-slider--initialized');
    } catch (error) {
      this.handleError('Failed to cleanup slider', error);
    }
  }
}

// Export the class for use in other modules
export default ImageSlider;