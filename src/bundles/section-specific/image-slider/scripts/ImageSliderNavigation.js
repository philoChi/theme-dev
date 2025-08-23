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
    console.log('[DEBUG] ImageSliderNavigation constructor started', {
      sliderElement,
      config,
      sliderId: sliderElement?.id
    });
    
    this.slider = sliderElement;
    this.config = config;
    this.currentSlide = 2; // Start with 1-based slide numbering (matching Liquid default)
    
    console.log('[DEBUG] Initial values set:', {
      sliderId: this.slider?.id,
      currentSlide: this.currentSlide
    });
    
    // Initialize logger first
    this.initializeLogger();
    console.log('[DEBUG] Logger initialized');
    
    // Validate and cache DOM elements
    console.log('[DEBUG] About to initialize elements');
    this.initializeElements();
    console.log('[DEBUG] Elements initialized successfully');
    
    // Initialize state
    console.log('[DEBUG] About to initialize state');
    this.initializeState();
    console.log('[DEBUG] State initialized successfully');
    
    // Bind event listeners
    console.log('[DEBUG] About to bind events');
    this.bindEvents();
    console.log('[DEBUG] Events bound successfully');
    
    console.log('[DEBUG] Constructor completed successfully', {
      sliderId: this.slider.id,
      slideCount: this.slideCount,
      currentSlide: this.currentSlide
    });
    
    this._logger(`[Navigation: ${this.slider.id}] Initialized with ${this.slideCount} slides`);
  }

  /**
   * Initialize and validate DOM elements
   */
  initializeElements() {
    console.log('[DEBUG] initializeElements started');
    
    console.log('[DEBUG] Looking for container with selector: .image-slider__container');
    this.container = this.slider.querySelector('.image-slider__container');
    console.log('[DEBUG] Container found:', !!this.container);
    
    if (!this.container) {
      console.error('[DEBUG] ERROR: Slider container not found!');
      throw new Error('Navigation: Slider container not found');
    }
    
    // Just store the count, not the array
    console.log('[DEBUG] Looking for slides with selector: .image-slider__slide');
    const slideElements = this.container.querySelectorAll('.image-slider__slide');
    this.slideCount = slideElements.length;
    console.log('[DEBUG] Slides found:', {
      slideElements,
      slideCount: this.slideCount
    });
    
    if (this.slideCount === 0) {
      console.error('[DEBUG] ERROR: No slides found!');
      throw new Error('Navigation: No slides found');
    }
    
    // Navigation controls
    console.log('[DEBUG] Looking for navigation controls');
    this.prevButton = this.slider.querySelector('[data-arrow="prev"]');
    this.nextButton = this.slider.querySelector('[data-arrow="next"]');
    this.dots = Array.from(this.slider.querySelectorAll('.image-slider__dot'));
    
    console.log('[DEBUG] Navigation controls found:', {
      prevButton: !!this.prevButton,
      nextButton: !!this.nextButton,
      dotsCount: this.dots.length
    });
    
    this._logger(`[Navigation: ${this.slider.id}] Found ${this.slideCount} slides, ${this.dots.length} dots`);
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
    console.log('[DEBUG] initializeState started');
    
    // Find current slide based on aria-current attribute
    console.log('[DEBUG] Looking for current slide with aria-current="true"');
    const currentSlideElement = this.container.querySelector('.image-slider__slide[aria-current="true"]');
    console.log('[DEBUG] Current slide element found:', !!currentSlideElement);
    
    if (currentSlideElement) {
      // Extract slide number from element (slides are 1-indexed)
      const slides = this.container.querySelectorAll('.image-slider__slide');
      const arrayIndex = Array.from(slides).indexOf(currentSlideElement);
      this.currentSlide = arrayIndex;
      console.log('[DEBUG] Current slide determined from aria-current:', {
        arrayIndex,
        currentSlide: this.currentSlide
      });
    } else {
      // Default to slide 2 to match Liquid default
      this.currentSlide = 1;
      console.log('[DEBUG] No aria-current found, defaulting to slide 2');
    }
    
    console.log('[DEBUG] Before validation:', {
      currentSlide: this.currentSlide,
      slideCount: this.slideCount
    });
    
    // Ensure we have a valid starting position (1-based)
    if (this.currentSlide < 1 || this.currentSlide > this.slideCount) {
      const oldSlide = this.currentSlide;
      this.currentSlide = Math.min(0, this.slideCount-1);
      console.log('[DEBUG] Invalid slide corrected:', {
        oldSlide,
        newSlide: this.currentSlide,
        slideCount: this.slideCount
      });
    }

    console.log('[DEBUG] Final state:', {
      currentSlide: this.currentSlide,
      slideCount: this.slideCount
    });

    this._logger(`[Navigation: ${this.slider.id}] Starting at slide ${this.currentSlide} (1-based)`);
  }

  /**
   * Bind event listeners for navigation
   */
  bindEvents() {
    console.log('[DEBUG] bindEvents started');
    
    // Arrow button clicks
    if (this.prevButton) {
      console.log('[DEBUG] Binding prev button click event');
      this.prevButton.addEventListener('click', this.goToPreviousSlide.bind(this));
    } else {
      console.log('[DEBUG] No prev button found to bind');
    }
    
    if (this.nextButton) {
      console.log('[DEBUG] Binding next button click event');
      this.nextButton.addEventListener('click', this.goToNextSlide.bind(this));
    } else {
      console.log('[DEBUG] No next button found to bind');
    }
    
    // Dot indicator clicks - convert 0-based data attribute to 1-based slide number
    this.dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const slideIndex = parseInt(dot.dataset.slideIndex, 10);
        this.goToSlide(slideIndex); // Convert 0-based to 1-based
      });
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
        this.goToSlide(1);
        break;
      case 'End':
        event.preventDefault();
        this.goToSlide(this.slideCount);
        break;
    }
  }

  /**
   * Navigate to previous slide
   */
  goToPreviousSlide() {
    console.log('[DEBUG] goToPreviousSlide called, current:', this.currentSlide);
    const newSlide = this.currentSlide > 0 ? this.currentSlide - 1 : this.slideCount - 1;
    console.log('[DEBUG] goToPreviousSlide calculated new slide:', newSlide);
    this.goToSlide(newSlide);
  }

  /**
   * Navigate to next slide
   */
  goToNextSlide() {
    console.log('[DEBUG] goToNextSlide called, current:', this.currentSlide);
    const newSlide = this.currentSlide < this.slideCount - 1 ? this.currentSlide + 1 : 0;
    console.log('[DEBUG] goToNextSlide calculated new slide:', newSlide);
    this.goToSlide(newSlide);
  }

  /**
   * Navigate to specific slide
   * @param {number} slideNumber - Target slide number (1-based)
   */
  goToSlide(slideNumber) {
    console.log('[DEBUG] goToSlide called:', {
      slideNumber,
      currentSlide: this.currentSlide,
      slideCount: this.slideCount
    });
    
    if (slideNumber < 0 || slideNumber > this.slideCount - 1 || slideNumber === this.currentSlide) {
      console.log('[DEBUG] goToSlide rejected - invalid parameters');
      return;
    }

    const previousSlide = this.currentSlide;
    this.currentSlide = slideNumber;

    // Update slider position
    this.updateSliderPosition();
    
    // Update slide states
    this.updateSlideStates(previousSlide);
    
    // Update dot indicators
    this.updateDotStates(previousSlide);
    
    // Announce change to screen readers
    this.announceSlideChange();

    this._logger(`[Navigation: ${this.slider.id}] Moved from slide ${previousSlide} to slide ${slideNumber}`);
  }

  /**
   * Update slider container position to show current slide
   */
  updateSliderPosition() {
    // Calculate new transform position - matches Liquid template exactly
    // The Liquid template uses: calc(50vw - var(--slider-slide-total-max-width) * (index + 0.5))
    // where index is 1-based (same as our currentSlide)
    this.container.style.transform = `translateX(calc(50vw - var(--slider-slide-total-max-width) * (${this.currentSlide} + 0.5)))`;
    
    this._logger(`[Navigation: ${this.slider.id}] Moving to slide ${this.currentSlide} (1-based)`);
  }

  /**
   * Update slide ARIA attributes for accessibility
   * @param {number} previousSlide - Previous slide number (1-based)
   */
  updateSlideStates(previousSlide) {
    const slides = this.container.querySelectorAll('.image-slider__slide');
    
    // Update previous slide (convert 1-based to 0-based for array access)
    if (slides[previousSlide]) {
      slides[previousSlide].setAttribute('aria-current', 'false');
      slides[previousSlide].setAttribute('aria-hidden', 'true');
    }
    
    // Update current slide (convert 1-based to 0-based for array access)
    if (slides[this.currentSlide]) {
      slides[this.currentSlide].setAttribute('aria-current', 'true');
      slides[this.currentSlide].setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Update dot indicator states
   * @param {number} previousSlide - Previous slide number (1-based)
   */
  updateDotStates(previousSlide) {
    if (this.dots.length === 0) return;
    
    // Update previous dot (convert 1-based slide to 0-based array index)
    if (this.dots[previousSlide]) {
      this.dots[previousSlide].classList.remove('image-slider__dot--active');
      this.dots[previousSlide].setAttribute('aria-selected', 'false');
    }
    
    // Update current dot (convert 1-based slide to 0-based array index)
    if (this.dots[this.currentSlide]) {
      this.dots[this.currentSlide].classList.add('image-slider__dot--active');
      this.dots[this.currentSlide].setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Announce slide change to screen readers
   */
  announceSlideChange() {
    const slides = this.container.querySelectorAll('.image-slider__slide');
    const currentSlideElement = slides[this.currentSlide]; // Convert 1-based to 0-based
    const slideTitle = currentSlideElement?.getAttribute('aria-label') || `Slide ${this.currentSlide}`;
    
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
   * Get current slide number
   * @returns {number} Current slide number (1-based)
   */
  getCurrentIndex() {
    return this.currentSlide;
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
    return this.currentSlide === 0;
  }

  /**
   * Check if we're on the last slide
   * @returns {boolean} True if on last slide
   */
  isLastSlide() {
    return this.currentSlide === this.slideCount -1;
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