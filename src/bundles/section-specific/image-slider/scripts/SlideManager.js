/**
 * Slide Manager
 * Handles slide positioning, copy slide management, and slide state updates
 */
class SlideManager {
  /**
   * Initialize slide manager
   * @param {HTMLElement} container - Slider container element
   * @param {Array} slides - Array of slide elements
   * @param {number} currentIndex - Current slide index
   * @param {Function} logger - Logger function
   */
  constructor(container, slides, currentIndex, logger) {
    this.container = container;
    this.slides = slides;
    this.currentIndex = currentIndex;
    this._logger = logger;
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
    if (activeIndex !== -1 && activeIndex !== 1) { // CENTER_POSITION = 1
      const activeSlide = this.slides[activeIndex];
      activeSlide.remove();
      this.container.insertBefore(activeSlide, this.container.children[1] || null);
      this.slides = Array.from(this.container.querySelectorAll('.image-slider__slide'));
    }
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
    
    this._logger(`Position updated – Center: ${this.currentIndex}`);
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
  isCopySlide(slide) { 
    return slide && slide.dataset.copySlide === 'true' 
  }

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
   * Update the current index and slides array
   * @param {number} newIndex - New current index
   */
  updateIndex(newIndex) {
    this.currentIndex = newIndex;
  }

  /**
   * Get current slides array and index
   * @returns {Object} Current state
   */
  getCurrentState() {
    return {
      slides: this.slides,
      currentIndex: this.currentIndex
    };
  }
}

export default SlideManager;