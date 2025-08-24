/**
 * Slide Navigation Controller
 * Manages slide navigation logic and transition states
 */
class SlideNavigationController {
  /**
   * Initialize navigation controller
   * @param {number} slideCount - Total number of slides
   * @param {SlidePositionManager} positionManager - Position manager instance
   */
  constructor(slideCount, positionManager) {
    this.slideCount = slideCount;
    this.positionManager = positionManager;
    this.currentIndex = 0;
    this.isTransitioning = false;
    this.infiniteMode = true; // Infinite mode enabled for seamless transitions
    this.deferredRepositionTimeout = null; // Track pending deferred repositioning
  }

  /**
   * Set current slide index from DOM state
   * @param {number} index - Current slide index
   */
  setCurrentIndex(index) {
    // Ensure valid index
    if (index < 0 || index >= this.slideCount) {
      this.currentIndex = 0;
    } else {
      this.currentIndex = index;
    }
  }

  /**
   * Navigate to previous slide
   * @returns {Object} Navigation result with new index and transition type
   */
  goToPreviousSlide() {
    const newIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.slideCount - 1;
    return this.goToSlide(newIndex);
  }

  /**
   * Navigate to next slide
   * @returns {Object} Navigation result with new index and transition type
   */
  goToNextSlide() {
    const newIndex = this.currentIndex < this.slideCount - 1 ? this.currentIndex + 1 : 0;
    return this.goToSlide(newIndex);
  }

  /**
   * Navigate to specific slide
   * @param {number} slideIndex - Target slide index (0-based)
   * @returns {Object} Navigation result with success status, indexes, and transition type
   */
  goToSlide(slideIndex) {
    // Validation checks
    if (slideIndex < 0 || slideIndex >= this.slideCount || slideIndex === this.currentIndex || this.isTransitioning) {
      return { success: false };
    }

    const previousIndex = this.currentIndex;
    const shouldUseInfinite = this.shouldUseInfiniteTransition(previousIndex, slideIndex);
    const isForward = shouldUseInfinite ? (previousIndex === this.slideCount - 1 && slideIndex === 0) : null;
    
    
    // Update current index
    this.currentIndex = slideIndex;

    return {
      success: true,
      previousIndex,
      currentIndex: slideIndex,
      useInfiniteTransition: shouldUseInfinite,
      isForward
    };
  }

  /**
   * Check if infinite transition should be used for boundary crossings
   * @param {number} fromIndex - Current slide index
   * @param {number} toIndex - Target slide index
   * @returns {boolean} True if infinite transition should be used
   */
  shouldUseInfiniteTransition(fromIndex, toIndex) {
    // Last slide to first slide (forward infinite)
    if (fromIndex === this.slideCount - 1 && toIndex === 0) {
      return true;
    }
    // First slide to last slide (backward infinite)
    if (fromIndex === 0 && toIndex === this.slideCount - 1) {
      return true;
    }
    
    return false;
  }

  /**
   * Set transition state
   * @param {boolean} transitioning - Whether slider is currently transitioning
   */
  setTransitioning(transitioning) {
    this.isTransitioning = transitioning;
  }

  /**
   * Execute standard slide transition
   * @param {number} newIndex - New slide index
   * @param {number} transitionDuration - Transition duration in milliseconds (default: 500)
   */
  executeStandardTransition(newIndex, transitionDuration = 500) {
    // Clear any pending deferred repositioning
    if (this.deferredRepositionTimeout) {
      clearTimeout(this.deferredRepositionTimeout);
      this.deferredRepositionTimeout = null;
    }
    
    // Update container position immediately
    this.positionManager.updateContainerPosition(newIndex);
    
    // For 3-slide configurations, use deferred repositioning to prevent visible slide disappearing
    if (this.slideCount === 3) {
      this.isTransitioning = true;
      
      // Defer the adjacent slide positioning to when slides are less visible
      this.deferredRepositionTimeout = setTimeout(() => {
        this.positionManager.updateAdjacentSlidePositions(newIndex);
        this.deferredRepositionTimeout = null;
        this.isTransitioning = false;
      }, transitionDuration * 0.4);
    } else {
      // For 4+ slides, use immediate repositioning (works fine)
      this.positionManager.updateAdjacentSlidePositions(newIndex);
    }
  }

  /**
   * Execute infinite transition for seamless boundary crossings using two-phase approach
   * @param {number} fromIndex - Current slide index
   * @param {number} toIndex - Target slide index
   * @param {boolean} isForward - Direction of transition
   * @param {number} transitionDuration - Transition duration in milliseconds (default: 500)
   */
  executeInfiniteTransition(fromIndex, toIndex, isForward, transitionDuration = 500) {
    this.isTransitioning = true;
    
    // Clear any pending deferred repositioning
    if (this.deferredRepositionTimeout) {
      clearTimeout(this.deferredRepositionTimeout);
      this.deferredRepositionTimeout = null;
    }
    
    // Phase 1: Prepare infinite transition by positioning only the incoming slide
    this.positionManager.prepareInfiniteTransition(fromIndex, toIndex, isForward);
    
    // Execute transition with updated positions
    this.positionManager.updateContainerPosition(toIndex);
    
    // Phase 2: Deferred repositioning of remaining slides
    // This happens 40% into the transition when slides are less visible
    this.deferredRepositionTimeout = setTimeout(() => {
      this.positionManager.completeInfiniteTransition(toIndex);
      this.deferredRepositionTimeout = null;
    }, transitionDuration * 0.4);
  }

  /**
   * Handle transition end event
   * @param {Function} errorHandler - Error handling callback
   */
  handleTransitionEnd(errorHandler) {
    if (this.isTransitioning) {
      // Clear any pending deferred repositioning since transition is complete
      if (this.deferredRepositionTimeout) {
        clearTimeout(this.deferredRepositionTimeout);
        this.deferredRepositionTimeout = null;
      }
      
      // Normalize slide positions after infinite transition
      this.positionManager.normalizeSlidePositions(this.currentIndex, errorHandler);
      this.isTransitioning = false;
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
   * Check if currently transitioning
   * @returns {boolean} True if transitioning
   */
  getTransitioningState() {
    return this.isTransitioning;
  }
}

export default SlideNavigationController;