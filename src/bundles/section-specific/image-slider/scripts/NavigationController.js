/**
 * Navigation Controller
 * Handles slide navigation, transitions, and animation management
 */
class NavigationController {
  /**
   * Initialize navigation controller
   * @param {SlideManager} slideManager - Slide manager instance
   * @param {Function} logger - Logger function
   * @param {string} sliderId - Slider ID for logging
   */
  constructor(slideManager, logger, sliderId) {
    this.slideManager = slideManager;
    this._logger = logger;
    this.sliderId = sliderId;
    this.isTransitioning = false;
    
    // Performance optimization: Use bound methods to avoid repeated binding
    this.handlePrevClick = this.handleNavigation.bind(this, 'left');
    this.handleNextClick = this.handleNavigation.bind(this, 'right');
  }

  /**
   * Setup navigation button event listeners
   * @param {HTMLElement} prevButton - Previous navigation button
   * @param {HTMLElement} nextButton - Next navigation button
   */
  setupNavigationListeners(prevButton, nextButton) {
    prevButton.addEventListener('click', this.handlePrevClick, { passive: true });
    nextButton.addEventListener('click', this.handleNextClick, { passive: true });
  }

  /**
   * Handle navigation clicks with performance optimization
   * @param {string} direction - Navigation direction
   * @param {Event} event - Click event
   */
  handleNavigation(direction, event) {
    event.preventDefault();
    this.navigate(direction);
  }

  /**
   * Core navigation handler for slide transitions
   * Handles both left and right navigation with smooth animations
   * @param {string} direction - Navigation direction ('left' or 'right')
   * @param {Function} onComplete - Callback when navigation completes
   */
  navigate(direction, onComplete = null) {
    if (!this.canNavigate()) {
      return;
    }

    try {
      const navigationData = this.prepareNavigation(direction);
      this.startTransition(navigationData, onComplete);
    } catch (error) {
      console.error(`[NavigationController: ${this.sliderId}] Navigation failed:`, error);
      this.isTransitioning = false;
    }
  }

  /**
   * Check if navigation is currently possible
   * @returns {boolean} True if navigation can proceed
   */
  canNavigate() {
    const { slides } = this.slideManager.getCurrentState();
    
    if (this.isTransitioning) {
      this._logger(`Navigation blocked – transition in progress`);
      return false;
    }
    
    if (slides.length <= 1) {
      this._logger(`Navigation skipped – not enough slides`);
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
    const { slides, currentIndex } = this.slideManager.getCurrentState();
    const rightward = direction === 'right';
    const step = rightward ? 1 : -1;

    const slideElements = {
      center: slides[currentIndex],
      target: slides[currentIndex + step],
      offScreen: slides[currentIndex - step],
      onScreen: slides[currentIndex + 2 * step]
    };

    // Validate all required slides exist
    if (!slideElements.center || !slideElements.target || !slideElements.offScreen || !slideElements.onScreen) {
      throw new Error('Could not find required slides for animation');
    }

    return { direction, rightward, step, slides: slideElements };
  }

  /**
   * Start the transition animation with RAF batching
   * @param {Object} navigationData - Prepared navigation data
   * @param {Function} onComplete - Callback when transition completes
   */
  startTransition({ direction, rightward, step, slides }, onComplete) {
    this.isTransitioning = true;
    const { currentIndex } = this.slideManager.getCurrentState();

    // Batch DOM updates in a single RAF
    requestAnimationFrame(() => {
      // Pre-optimize slides for GPU acceleration
      this.preOptimizeSlides([slides.center, slides.target, slides.offScreen, slides.onScreen]);
      
      // Apply animation states to slides
      this.applyAnimationStates(rightward, slides.center, slides.target, slides.offScreen, slides.onScreen);
      this.slideManager.updateIndex(currentIndex + step);
      
      this._logger(`Transition started, new index will be: ${currentIndex + step}`);

      // Listen for animation completion with better performance
      const animationEndHandler = () => {
        this.handleAnimationEnd(direction, onComplete);
      };
      slides.target.addEventListener('animationend', animationEndHandler, { once: true, passive: true });
    });
  }

  /**
   * Pre-optimize slides for smooth animations
   * @param {Array} slides - Array of slide elements to optimize
   */
  preOptimizeSlides(slidesToOptimize) {
    slidesToOptimize.forEach(slide => {
      if (slide) {
        slide.style.willChange = 'transform, opacity';
      }
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
   * Handle animation end cleanup and state updates with performance optimizations
   * @param {string} direction - Direction of the completed navigation
   * @param {Function} onComplete - Callback when animation completes
   */
  handleAnimationEnd(direction, onComplete) {
    try {
      const { slides, currentIndex } = this.slideManager.getCurrentState();
      
      // Clean up will-change for performance
      slides.forEach(slide => {
        if (slide.style.willChange) {
          slide.style.willChange = 'auto';
        }
      });
      
      this.slideManager.updateCentralSlidePositions();
      const curLeft = slides[currentIndex - 1];
      const curRight = slides[currentIndex + 1];
      this.slideManager.updateOffsetSlidePositions();

      if (this.slideManager.isCopySlide(curLeft) || this.slideManager.isCopySlide(curRight)) {
        curLeft && curLeft.removeAttribute('data-copy-slide');
        curRight && curRight.removeAttribute('data-copy-slide');
        this.slideManager.updateOffsetSlidePositions();
        this.slideManager.deleteDuplication(direction);
        this.slideManager.resetCopySlides();
        
        // Update current index after reset
        const newSlides = this.slideManager.getCurrentState().slides;
        const newIndex = newSlides.findIndex(child => child.getAttribute('aria-current') === 'true');
        this.slideManager.updateIndex(newIndex);
      }

      this.slideManager.updateNextSlidePositions();
      this.isTransitioning = false;
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error(`[NavigationController: ${this.sliderId}] Animation end handling failed:`, error);
      this.isTransitioning = false;
    }
  }

  /**
   * Check if currently transitioning
   * @returns {boolean} True if transitioning
   */
  getTransitionState() {
    return this.isTransitioning;
  }
}

export default NavigationController;