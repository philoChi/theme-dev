import ImageSliderConfig from './ImageSliderConfig.js';

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
    
    if (currentSlideElement) {
      this.currentIndex = Array.from(this.slides).indexOf(currentSlideElement);
    } else {
      this.currentIndex = 0; // Default to first slide
    }
    
    // Ensure valid index
    if (this.currentIndex < 0 || this.currentIndex >= this.slideCount) {
      this.currentIndex = 0;
    }
  }

  /**
   * Bind all event listeners for navigation
   */
  bindEvents() {
    // Arrow button clicks
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.goToPreviousSlide.bind(this));
    }
    
    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.goToNextSlide.bind(this));
    }
    
    // Dot indicator clicks
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const slideIndex = parseInt(dot.dataset.slideIndex, 10);
        this.goToSlide(slideIndex);
      });
    });
    
    // Keyboard navigation
    this.slider.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeydown(event) {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.goToPreviousSlide();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.goToNextSlide();
        break;
      case 'Home':
        event.preventDefault();
        this.goToSlide(0);
        break;
      case 'End':
        event.preventDefault();
        this.goToSlide(this.slideCount - 1);
        break;
    }
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
    const newIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.slideCount - 1;
    this.goToSlide(newIndex);
  }

  /**
   * Navigate to next slide
   */
  goToNextSlide() {
    const newIndex = this.currentIndex < this.slideCount - 1 ? this.currentIndex + 1 : 0;
    this.goToSlide(newIndex);
  }

  /**
   * Navigate to specific slide
   * @param {number} slideIndex - Target slide index (0-based)
   */
  goToSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= this.slideCount || slideIndex === this.currentIndex) {
      return;
    }

    const previousIndex = this.currentIndex;
    this.currentIndex = slideIndex;

    // Update slider position
    this.updateSliderPosition();
    
    // Update slide states
    this.updateSlideStates(previousIndex);
    
    // Update dot indicators
    this.updateDotStates(previousIndex);
    
    // Announce change to screen readers
    this.announceSlideChange();
  }

  /**
   * Update slider container position to show current slide
   */
  updateSliderPosition() {
    // Calculate new transform position - matches Liquid template exactly
    // The Liquid template uses: calc(50vw - var(--slider-slide-total-max-width) * (index + 0.5))
    this.container.style.transform = `translateX(calc(50vw - var(--slider-slide-total-max-width) * (${this.currentIndex} + 0.5)))`;
  }

  /**
   * Update slide ARIA attributes for accessibility
   * @param {number} previousIndex - Previous slide index
   */
  updateSlideStates(previousIndex) {
    // Update previous slide
    if (this.slides[previousIndex]) {
      this.slides[previousIndex].setAttribute('aria-current', 'false');
      this.slides[previousIndex].setAttribute('aria-hidden', 'true');
    }
    
    // Update current slide
    if (this.slides[this.currentIndex]) {
      this.slides[this.currentIndex].setAttribute('aria-current', 'true');
      this.slides[this.currentIndex].setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Update dot indicator states
   * @param {number} previousIndex - Previous slide index
   */
  updateDotStates(previousIndex) {
    if (this.dots.length === 0) return;
    
    // Update previous dot
    if (this.dots[previousIndex]) {
      this.dots[previousIndex].classList.remove('image-slider__dot--active');
      this.dots[previousIndex].setAttribute('aria-selected', 'false');
    }
    
    // Update current dot
    if (this.dots[this.currentIndex]) {
      this.dots[this.currentIndex].classList.add('image-slider__dot--active');
      this.dots[this.currentIndex].setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Announce slide change to screen readers
   */
  announceSlideChange() {
    const currentSlideElement = this.slides[this.currentIndex];
    const slideTitle = currentSlideElement?.getAttribute('aria-label') || `Slide ${this.currentIndex + 1}`;
    
    // Update the slider's aria-live region
    if (this.liveRegion) {
      // Temporarily clear and then set the content to trigger screen reader announcement
      this.liveRegion.textContent = '';
      setTimeout(() => {
        this.liveRegion.textContent = `Now showing ${slideTitle}`;
      }, 100);
    }
  }

  /**
   * Get current slide index
   * @returns {number} Current slide index (0-based)
   */
  getCurrentIndex() {
    return this.currentIndex || 0;
  }

  /**
   * Get total number of slides
   * @returns {number} Total slide count
   */
  getSlideCount() {
    return this.slideCount;
  }

  /**
   * Check if we're on the first slide
   * @returns {boolean} True if on first slide
   */
  isFirstSlide() {
    return this.currentIndex === 0;
  }

  /**
   * Check if we're on the last slide
   * @returns {boolean} True if on last slide
   */
  isLastSlide() {
    return this.currentIndex === this.slideCount - 1;
  }

  /**
   * Cleanup slider instance
   */
  cleanup() {
    try {
      // Remove event listeners
      if (this.prevButton) {
        this.prevButton.removeEventListener('click', this.goToPreviousSlide);
      }
      
      if (this.nextButton) {
        this.nextButton.removeEventListener('click', this.goToNextSlide);
      }
      
      this.dots.forEach(dot => {
        dot.removeEventListener('click', this.goToSlide);
      });
      
      this.slider.removeEventListener('keydown', this.handleKeydown);
      
      this.slider.classList.remove('image-slider--initialized');
    } catch (error) {
      this.handleError('Failed to cleanup slider', error);
    }
  }
}

// Export the class for use in other modules
export default ImageSlider;