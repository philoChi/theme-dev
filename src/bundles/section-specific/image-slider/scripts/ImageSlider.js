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

    // Initialize infinite sliding properties
    this.infiniteMode = this.slideCount >= 3; // Enable infinite mode for 3+ slides
    this.isTransitioning = false; // Track transition state
    
    // Initialize virtual positioning system
    this.slidePositions = new Map(); // Track current virtual positions
    this.initializeVirtualPositions();
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
    
    // Transition end event for infinite sliding
    if (this.infiniteMode) {
      this.container.addEventListener('transitionend', this.handleTransitionEnd.bind(this));
    }
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
    if (slideIndex < 0 || slideIndex >= this.slideCount || slideIndex === this.currentIndex || this.isTransitioning) {
      return;
    }

    const previousIndex = this.currentIndex;
    
    // Pre-position adjacent slides for seamless transitions
    if (this.infiniteMode) {
      // Temporarily set current index to prepare adjacent positioning
      const tempCurrentIndex = this.currentIndex;
      this.currentIndex = slideIndex;
      this.updateAdjacentSlidePositions();
      this.currentIndex = tempCurrentIndex; // Restore for transition logic
    }
    
    // Handle infinite sliding for boundary transitions
    if (this.infiniteMode && this.shouldUseInfiniteTransition(previousIndex, slideIndex)) {
      this.executeInfiniteTransition(previousIndex, slideIndex);
      return;
    }

    // Standard transition
    this.currentIndex = slideIndex;
    this.updateContainerPosition();
    
    // Update adjacent positions after standard transition
    if (this.infiniteMode) {
      this.updateAdjacentSlidePositions();
    }
    
    this.updateSlideStates(previousIndex);
    this.updateDotStates(previousIndex);
    this.announceSlideChange();
  }

  /**
   * Initialize virtual positioning system for all slides
   */
  initializeVirtualPositions() {
    if (!this.infiniteMode) {
      // For non-infinite mode, use standard positioning
      this.slides.forEach((slide, index) => {
        this.slidePositions.set(index, index * 100);
      });
      return;
    }
    
    // For infinite mode, set up extended virtual positions
    // Range: -100% to 400% (supports up to 6 slides seamlessly)
    this.slides.forEach((slide, index) => {
      this.slidePositions.set(index, index * 100);
    });
    
    // Apply initial slide positioning
    this.updateSlidePositions();
    
    // Position container to show current slide
    this.updateContainerPosition();
    
    // Set up adjacent slides for seamless infinite transitions
    this.updateAdjacentSlidePositions();
  }

  /**
   * Update container position to center current slide
   */
  updateContainerPosition() {
    // Use the same formula as Liquid template but based on virtual current position
    const virtualCurrentPosition = this.slidePositions.get(this.currentIndex) / 100;
    this.container.style.transform = `translateX(calc(50vw - var(--slider-slide-total-max-width) * (${virtualCurrentPosition} + 0.5)))`;
  }

  /**
   * Update individual slide positions based on virtual positioning
   */
  updateSlidePositions() {
    this.slides.forEach((slide, index) => {
      const position = this.slidePositions.get(index);
      slide.style.transform = `translateX(${position}%)`;
    });
  }

  /**
   * Update adjacent slide positions for seamless infinite transitions
   * Ensures adjacent slides are always visible at boundary positions
   */
  updateAdjacentSlidePositions() {
    if (!this.infiniteMode) return;

    // Current slide should always be at its designated position
    const currentPosition = this.slidePositions.get(this.currentIndex);

    // Get adjacent slide indices (with wrapping for infinite behavior)
    const prevIndex = this.currentIndex === 0 ? this.slideCount - 1 : this.currentIndex - 1;
    const nextIndex = this.currentIndex === this.slideCount - 1 ? 0 : this.currentIndex + 1;

    // Position adjacent slides relative to current slide for seamless transitions
    this.slidePositions.set(prevIndex, currentPosition - 100);
    this.slidePositions.set(nextIndex, currentPosition + 100);

    // Apply updated positions to ensure adjacent slides are visible
    this.updateSlidePositions();
  }

  /**
   * Check if infinite transition should be used for boundary crossings
   * @param {number} fromIndex - Current slide index
   * @param {number} toIndex - Target slide index
   * @returns {boolean} True if infinite transition should be used
   */
  shouldUseInfiniteTransition(fromIndex, toIndex) {
    // Only use infinite transition for sliders with 3+ slides
    if (!this.infiniteMode) {
      return false;
    }
    
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
   * Execute infinite transition for seamless boundary crossings
   * @param {number} fromIndex - Current slide index
   * @param {number} toIndex - Target slide index
   */
  executeInfiniteTransition(fromIndex, toIndex) {
    this.isTransitioning = true;
    
    // Determine transition direction
    const isForward = fromIndex === this.slideCount - 1 && toIndex === 0;
    
    // Update current index first
    this.currentIndex = toIndex;
    
    // Reposition slides for seamless infinite transition
    this.repositionSlidesForInfiniteTransition(fromIndex, toIndex, isForward);
    
    // Execute transition with updated positions
    this.updateContainerPosition();
    
    // Update UI states immediately
    this.updateSlideStates(fromIndex);
    this.updateDotStates(fromIndex);
    this.announceSlideChange();
  }

  /**
   * Reposition slides for seamless infinite transition
   * @param {number} fromIndex - Current slide index
   * @param {number} toIndex - Target slide index
   * @param {boolean} isForward - Direction of transition
   */
  repositionSlidesForInfiniteTransition(fromIndex, toIndex, isForward) {
    if (isForward) {
      // Last → First: The first slide should already be positioned correctly by updateAdjacentSlidePositions
      // But ensure it's in the right virtual position for the transition
      const lastSlidePosition = this.slidePositions.get(fromIndex);
      this.slidePositions.set(toIndex, lastSlidePosition + 100);
    } else {
      // First → Last: The last slide should already be positioned correctly by updateAdjacentSlidePositions  
      // But ensure it's in the right virtual position for the transition
      const firstSlidePosition = this.slidePositions.get(fromIndex);
      this.slidePositions.set(toIndex, firstSlidePosition - 100);
    }
    
    // Apply the repositioning and update adjacent slides for the new current slide
    this.updateSlidePositions();
    this.updateAdjacentSlidePositions();
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
    
    if (this.isTransitioning) {
      // Normalize slide positions after infinite transition
      this.normalizeSlidePositions();
      this.isTransitioning = false;
    }
  }

  /**
   * Normalize slide positions after infinite transition
   * Resets container position while maintaining adjacent slide visibility
   */
  normalizeSlidePositions() {
    try {
      // Temporarily disable transitions for instant repositioning
      const originalTransition = this.container.style.transition;
      this.container.style.transition = 'none';
      
      // Disable transitions on all slides
      this.slides.forEach(slide => {
        slide.style.transition = 'none';
      });
      
      // Reset slides to normalized positions, but keep current slide at 0%
      this.slides.forEach((slide, index) => {
        if (index === this.currentIndex) {
          this.slidePositions.set(index, 0);
        } else {
          // Reset non-current slides to their standard positions
          this.slidePositions.set(index, index * 100);
        }
      });
      
      // Apply normalized positions
      this.updateSlidePositions();
      
      // Reset container to show current slide at 0% position
      const virtualCurrentPosition = 0;
      this.container.style.transform = `translateX(calc(50vw - var(--slider-slide-total-max-width) * (${virtualCurrentPosition} + 0.5)))`;
      
      // Force reflow to ensure instant positioning is applied
      this.container.offsetHeight;
      
      // Re-establish adjacent slide positions for continued seamless transitions
      this.updateAdjacentSlidePositions();
      
      // Restore transitions after ensuring positioning is complete
      requestAnimationFrame(() => {
        try {
          this.container.style.transition = originalTransition;
          this.slides.forEach(slide => {
            slide.style.transition = '';
          });
        } catch (error) {
          this.handleError('Failed to restore transitions after normalization', error);
        }
      });
    } catch (error) {
      this.handleError('Failed to normalize slide positions', error);
      // Fallback: reinitialize virtual positions
      this.initializeVirtualPositions();
    }
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
      
      // Remove infinite sliding event listener
      if (this.infiniteMode) {
        this.container.removeEventListener('transitionend', this.handleTransitionEnd);
      }
      
      this.slider.classList.remove('image-slider--initialized');
    } catch (error) {
      this.handleError('Failed to cleanup slider', error);
    }
  }
}

// Export the class for use in other modules
export default ImageSlider;