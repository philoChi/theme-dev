/**
 * Image Slider Component
 * High-performance image slider with infinite scrolling and accessibility features
 * Enhanced class-based implementation following CLAUDE.md guidelines
 */
class ImageSlider {
  /**
   * Configuration constants for the slider behavior
   */
  static get CONSTANTS() {
    return {
      SWIPE_THRESHOLD: 40,
      ANIMATION_DELAY: 400,
      DEFAULT_AUTOPLAY_INTERVAL: 5000,
      DEFAULT_TRANSITION_DURATION: 1000,
      CENTER_POSITION: 1, // Default position for active slide in DOM
    };
  }

  /**
   * Initialize the image slider component
   * @param {HTMLElement} sliderElement - The container element for the slider
   */
  constructor(sliderElement) {
    this.slider = sliderElement;
    this.sliderId = this.generateSliderId(sliderElement);
    
    // Validate and cache DOM elements
    this.initializeElements();
    this.initializeState();
    this.initializeLogger();
    
    this._logger(`[Slider: ${this.sliderId}] Initializing with ${this.slides.length} slides`);

    // Setup all slider components
    this.positionActiveSlide();
    this.parseConfiguration();
    this.init();
    this.setupEnhancements();
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

    this.prevButton = this.slider.querySelector('[data-arrow="prev"]');
    this.nextButton = this.slider.querySelector('[data-arrow="next"]');
    if (!this.prevButton || !this.nextButton) {
      throw new Error('Navigation buttons not found');
    }
  }

  /**
   * Initialize state variables
   */
  initializeState() {
    this.currentIndex = ImageSlider.CONSTANTS.CENTER_POSITION;
    this.isTransitioning = false;
    this.autoplayTimer = null;
    this.intersectionObserver = null;
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
   * Setup all enhancements (performance, autoplay, swipe)
   */
  setupEnhancements() {
    this.setupPerformanceOptimizations();
    this.setupAutoplay();
    this.setupSwipeEvents();
  }

  /**
   * Find and position the active slide in DOM position 1 for proper initialization
   * This ensures the slide marked as active in liquid is positioned correctly for the slider logic
   */
  positionActiveSlide() {
    const activeIndex = this.slides.findIndex(slide => 
      slide.getAttribute('aria-current') === 'true'
    );
    
    // Move active slide to center position if it's not already there
    if (activeIndex !== -1 && activeIndex !== ImageSlider.CONSTANTS.CENTER_POSITION) {
      const activeSlide = this.slides[activeIndex];
      activeSlide.remove();
      this.container.insertBefore(activeSlide, this.container.children[ImageSlider.CONSTANTS.CENTER_POSITION] || null);
      this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
    }
  }

  /**
   * Parse configuration from data attributes on the slider element
   * Extracts autoplay settings from HTML data attributes set by Liquid template
   */
  parseConfiguration() {
    this.autoplayEnabled = this.slider.dataset.autoplay === 'true';
    this.autoplayInterval = parseInt(
      this.slider.dataset.interval || ImageSlider.CONSTANTS.DEFAULT_AUTOPLAY_INTERVAL.toString(), 
      10
    );
  }

  /**
   * Setup performance optimizations including IntersectionObserver
   */
  setupPerformanceOptimizations() {
    // Setup intersection observer for autoplay pause when off-screen
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleVisibilityChange.bind(this),
        { threshold: 0.1 }
      );
      this.intersectionObserver.observe(this.slider);
    }

    // Add will-change CSS hint when needed
    this.container.style.willChange = 'transform';
  }

  /**
   * Setup autoplay with user preference checking
   */
  setupAutoplay() {
    if (this.autoplayEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.startAutoplay();

      // Pause on user interaction; resume afterwards
      const interactionEvents = ['mouseenter', 'focusin', 'touchstart'];
      const resumeEvents = ['mouseleave', 'focusout', 'touchend'];
      
      interactionEvents.forEach(event => 
        this.slider.addEventListener(event, () => this.stopAutoplay(), { passive: true })
      );
      resumeEvents.forEach(event => 
        this.slider.addEventListener(event, () => this.startAutoplay(), { passive: true })
      );
    }
  }

  /**
   * Sets up swipe gesture support for touch devices
   * Uses pointer events for better touch/pen support with passive listeners for performance
   */
  setupSwipeEvents() {
    let startX = null;
    let startY = null;

    const handlePointerStart = (e) => {
      // Only handle touch and pen inputs
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      startX = e.clientX;
      startY = e.clientY;
    };

    const handlePointerEnd = (e) => {
      if (startX === null) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Reset tracking variables
      startX = startY = null;

      // Only trigger navigation if gesture is primarily horizontal and meets threshold
      const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
      const exceedsThreshold = Math.abs(deltaX) > ImageSlider.CONSTANTS.SWIPE_THRESHOLD;
      
      if (isHorizontalGesture && exceedsThreshold) {
        this.navigate(deltaX < 0 ? 'right' : 'left');
      }
    };

    // Use passive listeners to maintain scrolling performance
    this.slider.addEventListener('pointerdown', handlePointerStart, { passive: true });
    this.slider.addEventListener('pointerup', handlePointerEnd, { passive: true });
    this.slider.addEventListener('pointercancel', handlePointerEnd, { passive: true });
  }

  /**
   * Handle intersection observer visibility changes
   * Pauses autoplay when slider is off-screen for performance optimization
   * @param {IntersectionObserverEntry[]} entries - Intersection observer entries
   */
  handleVisibilityChange(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.startAutoplay();
      } else {
        this.stopAutoplay();
      }
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
    // Clear autoplay timer
    this.stopAutoplay();
    
    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    // Remove will-change CSS hint
    if (this.container) {
      this.container.style.willChange = 'auto';
    }
    
    this._logger(`[Slider: ${this.sliderId}] Cleanup completed`);
  }

  /**
   * Initialize the slider component
   * Sets up slide positioning, event listeners, and reveals the slider
   */
  init() {
    try {
      // Setup slide positions and infinite scroll
      this.updateCentralSlidePositions();
      this.resetCopySlides();
      this.currentIndex += 1; // Account for copy slide inserted at index 0
      this.updateOffsetSlidePositions();
      this.updateNextSlidePositions();

      // Setup navigation event listeners
      this.setupNavigationListeners();

      // Reveal slider with smooth timing
      this.revealSlider();

      this._logger(`[Slider: ${this.sliderId}] Initialization complete`);
    } catch (error) {
      this.handleError('Failed to initialize slider components', error);
    }
  }

  /**
   * Setup navigation button event listeners
   */
  setupNavigationListeners() {
    this.prevButton.addEventListener('click', () => this.navigate('left'), { passive: true });
    this.nextButton.addEventListener('click', () => this.navigate('right'), { passive: true });
  }

  /**
   * Reveal the slider with smooth timing after positioning is complete
   */
  revealSlider() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.container.style.opacity = '1';
        this._logger(`[Slider: ${this.sliderId}] Slides revealed after positioning`);
      }, ImageSlider.CONSTANTS.ANIMATION_DELAY);
    });
  }



  /**
   * Removes old copy slides and inserts fresh clones at both ends
   * This enables infinite scrolling by duplicating first/last slides
   */
  resetCopySlides() {
    // Remove existing copy slides
    this.removeCopySlides();
    
    // Update slides array and create new clones
    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
    const { lastClone, firstClone } = this.createCopySlides();
    
    // Position and append copy slides
    this.positionCopySlides(lastClone, firstClone);
    
    // Update slides array with new copy slides
    this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
  }

  /**
   * Remove all existing copy slides
   */
  removeCopySlides() {
    const copySlides = this.container.querySelectorAll('[data-copy-slide]');
    copySlides.forEach(slide => slide.remove());
  }

  /**
   * Create copy slides for infinite scrolling
   * @returns {Object} Object containing lastClone and firstClone elements
   */
  createCopySlides() {
    const lastReal = this.slides[this.slides.length - 1];
    const firstReal = this.slides[0];
    
    const lastClone = lastReal.cloneNode(true);
    const firstClone = firstReal.cloneNode(true);
    
    // Configure clone attributes
    [lastClone, firstClone].forEach(clone => {
      clone.dataset.copySlide = 'true';
      clone.removeAttribute('data-slide-position');
      clone.removeAttribute('aria-current');
    });
    
    return { lastClone, firstClone };
  }

  /**
   * Position and append copy slides to container
   * @param {HTMLElement} lastClone - Clone of last slide
   * @param {HTMLElement} firstClone - Clone of first slide
   */
  positionCopySlides(lastClone, firstClone) {
    lastClone.dataset.slidePosition = 'offscreen-left';
    firstClone.dataset.slidePosition = 'offscreen-right';
    
    this.container.prepend(lastClone);
    this.container.append(firstClone);
  }

  /**
   * Updates the central, left, and right slide positions using ARIA and data attributes
   * Sets the current slide as center and adjacent slides as left/right
   */
  updateCentralSlidePositions() {
    // Reset all slides to default state
    this.resetAllSlideStates();
    
    // Get current and adjacent slides
    const slidePositions = this.getCurrentSlidePositions();
    
    // Apply new positions
    this.applyCentralPositions(slidePositions);
    
    this._logger(`[Slider: ${this.sliderId}] Position updated – Center: ${this.currentIndex}`);
  }

  /**
   * Reset all slides to default hidden state
   */
  resetAllSlideStates() {
    this.slides.forEach(slide => {
      slide.removeAttribute('data-slide-position');
      slide.removeAttribute('data-animating');
      slide.removeAttribute('aria-current');
      slide.ariaHidden = 'true';
    });
  }

  /**
   * Get current slide and adjacent slides
   * @returns {Object} Object containing current, previous, and next slide elements
   */
  getCurrentSlidePositions() {
    return {
      current: this.slides[this.currentIndex],
      previous: this.slides[this.currentIndex - 1],
      next: this.slides[this.currentIndex + 1]
    };
  }

  /**
   * Apply central positioning to current and adjacent slides
   * @param {Object} slidePositions - Object containing slide elements
   */
  applyCentralPositions({ current, previous, next }) {
    if (current) {
      current.dataset.slidePosition = 'center';
      current.setAttribute('aria-current', 'true');
      current.ariaHidden = 'false';
    }
    
    if (previous) {
      previous.dataset.slidePosition = 'left';
    }
    
    if (next) {
      next.dataset.slidePosition = 'right';
    }
  }

  /**
   * Updates off-screen slide positions using data attributes
   * Positions slides that are not in the center/left/right visible area
   */
  updateOffsetSlidePositions() {
    // Remove any existing offscreen animation states
    this.slides.forEach(slide => {
      const currentAnimating = slide.dataset.animating
      if (currentAnimating && currentAnimating.includes('offscreen')) {
        slide.removeAttribute('data-animating')
      }
    })

    for (let i = 0; i < this.currentIndex - 1; i++) {
      if (!this.slides[i].dataset.slidePosition || !this.slides[i].dataset.slidePosition.includes('offscreen')) {
        this.slides[i].dataset.slidePosition = 'offscreen-left'
      }
      this.slides[i].ariaHidden = 'true'
    }

    for (let i = this.currentIndex + 2; i < this.slides.length; i++) {
      if (!this.slides[i].dataset.slidePosition || !this.slides[i].dataset.slidePosition.includes('offscreen')) {
        this.slides[i].dataset.slidePosition = 'offscreen-right'
      }
      this.slides[i].ariaHidden = 'true'
    }
  }

  /**
   * Pre-marks the next slides which will roll into view (data-next)
   * Helps with animation preparation and performance optimization
   */
  updateNextSlidePositions() {
    this.slides.forEach(slide => delete slide.dataset.next)

    const offLeft = this.slides[this.currentIndex - 2]
    const offRight = this.slides[this.currentIndex + 2]
    if (offLeft) offLeft.dataset.next = 'true'
    if (offRight) offRight.dataset.next = 'true'
  }

  /**
   * Identifies if a slide is a copy slide (used for infinite scrolling)
   */
  isCopySlide(slide) { return slide && slide.dataset.copySlide === 'true' }

  /**
   * Deletes duplicate slide that became a real slide after navigation
   * Maintains the infinite scroll illusion by removing excess copies
   */
  deleteDuplication(direction) {
    this._logger(direction === 'left' ? 'Most left reached' : 'Most right reached')
    if (direction === 'left') {
      const dup = this.slides[this.slides.length - 2]
      dup.remove()
      this.slides.splice(this.slides.length - 2, 1)
    } else {
      const dup = this.slides[1]
      dup.remove()
      this.slides.splice(1, 1)
    }
  }

  /**
   * Core navigation handler for slide transitions
   * Handles both left and right navigation with smooth animations
   */
  navigate(direction) {
    if (!this.canNavigate()) {
      return;
    }

    try {
      const navigationData = this.prepareNavigation(direction);
      this.startTransition(navigationData);
      this.restartAutoplay();
    } catch (error) {
      this.handleError('Navigation failed', error);
      this.isTransitioning = false;
    }
  }

  /**
   * Check if navigation is currently possible
   * @returns {boolean} True if navigation can proceed
   */
  canNavigate() {
    if (this.isTransitioning) {
      this._logger(`[Slider: ${this.sliderId}] Navigation blocked – transition in progress`);
      return false;
    }
    
    if (this.slides.length <= 1) {
      this._logger(`[Slider: ${this.sliderId}] Navigation skipped – not enough slides`);
      return false;
    }
    
    return true;
  }

  /**
   * Prepare navigation data and validate required slides
   * @param {string} direction - Navigation direction ('left' or 'right')
   * @returns {Object} Navigation data object
   */
  prepareNavigation(direction) {
    const rightward = direction === 'right';
    const step = rightward ? 1 : -1;

    const slides = {
      center: this.slides[this.currentIndex],
      target: this.slides[this.currentIndex + step],
      offScreen: this.slides[this.currentIndex - step],
      onScreen: this.slides[this.currentIndex + 2 * step]
    };

    // Validate all required slides exist
    if (!slides.center || !slides.target || !slides.offScreen || !slides.onScreen) {
      throw new Error('Could not find required slides for animation');
    }

    return { direction, rightward, step, slides };
  }

  /**
   * Start the transition animation
   * @param {Object} navigationData - Prepared navigation data
   */
  startTransition({ direction, rightward, step, slides }) {
    this.isTransitioning = true;

    requestAnimationFrame(() => {
      // Apply animation states to slides
      this.applyAnimationStates(rightward, slides.center, slides.target, slides.offScreen, slides.onScreen);
      this.currentIndex += step;
      
      this._logger(`[Slider: ${this.sliderId}] Transition started, new index will be: ${this.currentIndex}`);

      // Listen for animation completion
      slides.target.addEventListener('animationend', () => {
        this.handleAnimationEnd(direction);
      }, { once: true });
    });
  }

  /**
   * Apply animation states to slides for smooth transitions
   * @param {boolean} rightward - Direction of navigation
   * @param {HTMLElement} centerSlide - Current center slide
   * @param {HTMLElement} targetSlide - Target slide becoming center
   * @param {HTMLElement} offScreenSlide - Slide moving off screen
   * @param {HTMLElement} onScreenSlide - Slide coming on screen
   */
  applyAnimationStates(rightward, centerSlide, targetSlide, offScreenSlide, onScreenSlide) {
    if (rightward) {
      centerSlide.dataset.animating = 'center-to-left';
      targetSlide.dataset.animating = 'right-to-center';
      offScreenSlide.dataset.animating = 'left-to-offscreen';
      onScreenSlide.dataset.animating = 'offscreen-to-right';
    } else {
      centerSlide.dataset.animating = 'center-to-right';
      targetSlide.dataset.animating = 'left-to-center';
      offScreenSlide.dataset.animating = 'right-to-offscreen';
      onScreenSlide.dataset.animating = 'offscreen-to-left';
    }
  }

  /**
   * Handle animation end cleanup and state updates
   * @param {string} direction - Direction of the completed navigation
   */
  handleAnimationEnd(direction) {
    try {
      this.updateCentralSlidePositions();
      const curLeft = this.slides[this.currentIndex - 1];
      const curRight = this.slides[this.currentIndex + 1];
      this.updateOffsetSlidePositions();

      if (this.isCopySlide(curLeft) || this.isCopySlide(curRight)) {
        curLeft && curLeft.removeAttribute('data-copy-slide');
        curRight && curRight.removeAttribute('data-copy-slide');
        this.updateOffsetSlidePositions();
        this.deleteDuplication(direction);
        this.resetCopySlides();
        this.currentIndex = this.slides.findIndex(child => child.getAttribute('aria-current') === 'true');
      }

      this.updateNextSlidePositions();
      this.isTransitioning = false;
    } catch (error) {
      this.handleError('Animation end handling failed', error);
      this.isTransitioning = false;
    }
  }

  /**
   * Starts the autoplay timer for automatic slide progression
   * Only starts if autoplay is enabled and not already running
   */
  startAutoplay() {
    if (!this.shouldStartAutoplay()) {
      return;
    }
    
    this.autoplayTimer = setInterval(() => this.navigate('right'), this.autoplayInterval);
    this._logger(`[Slider: ${this.sliderId}] Autoplay started (interval: ${this.autoplayInterval} ms)`);
  }

  /**
   * Check if autoplay should start
   * @returns {boolean} True if autoplay should start
   */
  shouldStartAutoplay() {
    return this.autoplayEnabled && !this.autoplayTimer;
  }

  /**
   * Stops the autoplay timer
   * Clears the interval and resets the timer reference
   */
  stopAutoplay() {
    if (!this.autoplayTimer) {
      return;
    }
    
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = null;
    this._logger(`[Slider: ${this.sliderId}] Autoplay paused`);
  }

  /**
   * Restarts the autoplay timer
   * Stops current timer and starts a new one (used after manual navigation)
   */
  restartAutoplay() {
    if (!this.autoplayEnabled) {
      return;
    }
    
    this.stopAutoplay();
    this.startAutoplay();
  }
}

// Export the class for use in other modules
export default ImageSlider;
