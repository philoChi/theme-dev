/**
 * Slide UI Updater
 * Handles all UI state updates including dots, ARIA attributes, and announcements
 */
class SlideUIUpdater {
  /**
   * Initialize UI updater
   * @param {NodeList} slides - All slide elements
   * @param {Array} dots - Dot indicator elements
   * @param {HTMLElement} liveRegion - ARIA live region element
   */
  constructor(slides, dots, liveRegion) {
    this.slides = slides;
    this.dots = dots || [];
    this.liveRegion = liveRegion;
  }

  /**
   * Update all UI states for slide transition
   * @param {number} currentIndex - Current slide index
   * @param {number} previousIndex - Previous slide index
   */
  updateAllStates(currentIndex, previousIndex) {
    this.updateSlideStates(currentIndex, previousIndex);
    this.updateDotStates(currentIndex, previousIndex);
    this.announceSlideChange(currentIndex);
  }

  /**
   * Update slide ARIA attributes for accessibility
   * @param {number} currentIndex - Current slide index
   * @param {number} previousIndex - Previous slide index
   */
  updateSlideStates(currentIndex, previousIndex) {
    // Update previous slide
    if (this.slides[previousIndex]) {
      this.slides[previousIndex].setAttribute('aria-current', 'false');
      this.slides[previousIndex].setAttribute('aria-hidden', 'true');
    }
    
    // Update current slide
    if (this.slides[currentIndex]) {
      this.slides[currentIndex].setAttribute('aria-current', 'true');
      this.slides[currentIndex].setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Update dot indicator states
   * @param {number} currentIndex - Current slide index
   * @param {number} previousIndex - Previous slide index
   */
  updateDotStates(currentIndex, previousIndex) {
    if (this.dots.length === 0) return;
    
    // Update previous dot
    if (this.dots[previousIndex]) {
      this.dots[previousIndex].classList.remove('image-slider__dot--active');
      this.dots[previousIndex].setAttribute('aria-selected', 'false');
    }
    
    // Update current dot
    if (this.dots[currentIndex]) {
      this.dots[currentIndex].classList.add('image-slider__dot--active');
      this.dots[currentIndex].setAttribute('aria-selected', 'true');
    }
  }

  /**
   * Announce slide change to screen readers
   * @param {number} currentIndex - Current slide index
   */
  announceSlideChange(currentIndex) {
    const currentSlideElement = this.slides[currentIndex];
    const slideTitle = currentSlideElement?.getAttribute('aria-label') || `Slide ${currentIndex + 1}`;
    
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
   * Set up initial UI state based on current slide
   * @param {number} currentIndex - Current slide index
   */
  initializeStates(currentIndex) {
    // Initialize slide states
    this.slides.forEach((slide, index) => {
      if (index === currentIndex) {
        slide.setAttribute('aria-current', 'true');
        slide.setAttribute('aria-hidden', 'false');
      } else {
        slide.setAttribute('aria-current', 'false');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    // Initialize dot states
    this.dots.forEach((dot, index) => {
      if (index === currentIndex) {
        dot.classList.add('image-slider__dot--active');
        dot.setAttribute('aria-selected', 'true');
      } else {
        dot.classList.remove('image-slider__dot--active');
        dot.setAttribute('aria-selected', 'false');
      }
    });
  }

  /**
   * Get slide title for announcements
   * @param {number} index - Slide index
   * @returns {string} Slide title or default
   */
  getSlideTitle(index) {
    const slide = this.slides[index];
    return slide?.getAttribute('aria-label') || `Slide ${index + 1}`;
  }

  /**
   * Update dots array (used when dots are dynamically added/removed)
   * @param {Array} newDots - New array of dot elements
   */
  updateDots(newDots) {
    this.dots = newDots || [];
  }

  /**
   * Update live region element
   * @param {HTMLElement} newLiveRegion - New live region element
   */
  updateLiveRegion(newLiveRegion) {
    this.liveRegion = newLiveRegion;
  }
}

export default SlideUIUpdater;