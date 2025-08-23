/**
 * Image Slider Navigation Controller
 * Handles arrow navigation, keyboard controls, and slide transitions
 */
class ImageSliderNavigation {
  /**
   * Initialize navigation controller
   * @param {HTMLElement} sliderElement - The slider container element
   * @param {Object} config - Slider configuration
   */
  constructor(sliderElement, config) {
    this.slider = sliderElement;
    this.config = config;
    this.currentIndex = 0;
    
    // Initialize logger first
    this.initializeLogger();
    
    // Validate and cache DOM elements
    this.initializeElements();
    
    // Initialize state
    this.initializeState();
    
    // Bind event listeners
    this.bindEvents();
    
    this._logger(`[Navigation: ${this.slider.id}] Initialized with ${this.slides.length} slides`);
  }

  /**
   * Initialize and validate DOM elements
   */
  initializeElements() {
    this.container = this.slider.querySelector('.image-slider__container');
    if (!this.container) {
      throw new Error('Navigation: Slider container not found');
    }
    
    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
    if (this.slides.length === 0) {
      throw new Error('Navigation: No slides found');
    }
    
    // Navigation controls
    this.prevButton = this.slider.querySelector('[data-arrow="prev"]');
    this.nextButton = this.slider.querySelector('[data-arrow="next"]');
    this.dots = Array.from(this.slider.querySelectorAll('.image-slider__dot'));
    
    this._logger(`[Navigation: ${this.slider.id}] Found ${this.slides.length} slides, ${this.dots.length} dots`);
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
   * Initialize navigation state based on current slide
   */
  initializeState() {
    // Find current slide based on aria-current attribute
    const currentSlide = this.slides.find(slide => slide.getAttribute('aria-current') === 'true');
    if (currentSlide) {
      this.currentIndex = this.slides.indexOf(currentSlide);
    } else {
      // If no aria-current, default to slide at index 1 (second slide) to match Liquid default
      this.currentIndex = 1;
    }
    
    // Ensure we have a valid starting position
    if (this.currentIndex < 0 || this.currentIndex >= this.slides.length) {
      this.currentIndex = Math.min(1, this.slides.length - 1); // Default to second slide or last if fewer slides
    }

    this._logger(`[Navigation: ${this.slider.id}] Starting at slide ${this.currentIndex} (0-based index)`);
  }

  /**
   * Bind event listeners for navigation
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
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.goToSlide(index));
    });
    
    // Keyboard navigation
    this.slider.addEventListener('keydown', this.handleKeydown.bind(this));
    
    this._logger(`[Navigation: ${this.slider.id}] Event listeners bound`);
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
        this.goToSlide(this.slides.length - 1);
        break;
    }
  }

  /**
   * Navigate to previous slide
   */
  goToPreviousSlide() {
    const newIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.slides.length - 1;
    this.goToSlide(newIndex);
  }

  /**
   * Navigate to next slide
   */
  goToNextSlide() {
    const newIndex = this.currentIndex < this.slides.length - 1 ? this.currentIndex + 1 : 0;
    this.goToSlide(newIndex);
  }

  /**
   * Navigate to specific slide
   * @param {number} index - Target slide index
   */
  goToSlide(index) {
    if (index < 0 || index >= this.slides.length || index === this.currentIndex) {
      return;
    }

    const previousIndex = this.currentIndex;
    this.currentIndex = index;

    // Update slider position
    this.updateSliderPosition();
    
    // Update slide states
    this.updateSlideStates(previousIndex);
    
    // Update dot indicators
    this.updateDotStates(previousIndex);
    
    // Announce change to screen readers
    this.announceSlideChange();

    this._logger(`[Navigation: ${this.slider.id}] Moved from slide ${previousIndex} to slide ${index}`);
  }

  /**
   * Update slider container position to show current slide
   */
  updateSliderPosition() {
    // Calculate new transform position
    // The formula matches the one used in the Liquid template:
    // calc(50vw - var(--slider-slide-total-max-width) * (index + 0.5))
    // Note: Liquid uses 1-based indexing, JavaScript uses 0-based
    // So we add 1 to convert from 0-based to 1-based
    const slideIndexForCSS = this.currentIndex + 1; // Convert 0-based to 1-based for CSS
    this.container.style.transform = `translateX(calc(50vw - var(--slider-slide-total-max-width) * (${slideIndexForCSS} + 0.5)))`;
    
    this._logger(`[Navigation: ${this.slider.id}] Moving to slide ${this.currentIndex} (0-based), CSS index ${slideIndexForCSS} (1-based)`);
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
    this.slides[this.currentIndex].setAttribute('aria-current', 'true');
    this.slides[this.currentIndex].setAttribute('aria-hidden', 'false');
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
    const currentSlide = this.slides[this.currentIndex];
    const slideTitle = currentSlide.getAttribute('aria-label') || `Slide ${this.currentIndex + 1}`;
    
    // Update the slider's aria-live region
    const liveRegion = this.slider.querySelector('[aria-live]');
    if (liveRegion) {
      // Temporarily clear and then set the content to trigger screen reader announcement
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = `Now showing ${slideTitle}`;
      }, 100);
    }
  }

  /**
   * Get current slide index
   * @returns {number} Current slide index
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * Get total number of slides
   * @returns {number} Total slide count
   */
  getSlideCount() {
    return this.slides.length;
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
    return this.currentIndex === this.slides.length - 1;
  }

  /**
   * Cleanup navigation controller
   */
  cleanup() {
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
    
    this._logger(`[Navigation: ${this.slider.id}] Cleanup completed`);
  }
}

export default ImageSliderNavigation;