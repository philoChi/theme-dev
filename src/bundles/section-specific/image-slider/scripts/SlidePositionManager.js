/**
 * Slide Position Manager
 * Handles virtual positioning system for infinite sliding transitions
 */
class SlidePositionManager {
  /**
   * Initialize position manager
   * @param {HTMLElement} container - Slider container element
   * @param {NodeList} slides - All slide elements
   */
  constructor(container, slides) {
    this.container = container;
    this.slides = slides;
    this.slideCount = slides.length;
    this.slidePositions = new Map();
    
    this.initializeVirtualPositions();
  }

  /**
   * Initialize virtual positioning system for all slides
   */
  initializeVirtualPositions() {
    // Set up extended virtual positions for infinite mode
    // Range: -100% to 400% (supports up to 6 slides seamlessly)
    this.slides.forEach((slide, index) => {
      this.slidePositions.set(index, index * 100);
    });
    
    // Apply initial slide positioning
    this.updateSlidePositions();
  }

  /**
   * Update container position to center current slide
   * @param {number} currentIndex - Current slide index
   */
  updateContainerPosition(currentIndex) {
    // Use the same formula as Liquid template but based on virtual current position
    const virtualCurrentPosition = this.slidePositions.get(currentIndex) / 100;
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
   * @param {number} currentIndex - Current slide index
   */
  updateAdjacentSlidePositions(currentIndex) {
    // Current slide should always be at its designated position
    const currentPosition = this.slidePositions.get(currentIndex);

    // Get adjacent slide indices (with wrapping for infinite behavior)
    const prevIndex = currentIndex === 0 ? this.slideCount - 1 : currentIndex - 1;
    const nextIndex = currentIndex === this.slideCount - 1 ? 0 : currentIndex + 1;

    // Position adjacent slides relative to current slide for seamless transitions
    this.slidePositions.set(prevIndex, currentPosition - 100);
    this.slidePositions.set(nextIndex, currentPosition + 100);

    // Apply updated positions to ensure adjacent slides are visible
    this.updateSlidePositions();
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
    this.updateAdjacentSlidePositions(toIndex);
  }

  /**
   * Normalize slide positions after infinite transition
   * Resets container position while maintaining adjacent slide visibility
   * @param {number} currentIndex - Current slide index
   * @param {Function} errorHandler - Error handling callback
   */
  normalizeSlidePositions(currentIndex, errorHandler) {
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
        if (index === currentIndex) {
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
      this.updateAdjacentSlidePositions(currentIndex);
      
      // Restore transitions after ensuring positioning is complete
      requestAnimationFrame(() => {
        try {
          this.container.style.transition = originalTransition;
          this.slides.forEach(slide => {
            slide.style.transition = '';
          });
        } catch (error) {
          errorHandler('Failed to restore transitions after normalization', error);
        }
      });
    } catch (error) {
      errorHandler('Failed to normalize slide positions', error);
      // Fallback: reinitialize virtual positions
      this.initializeVirtualPositions();
    }
  }

  /**
   * Get current position of a slide
   * @param {number} index - Slide index
   * @returns {number} Current position percentage
   */
  getSlidePosition(index) {
    return this.slidePositions.get(index);
  }
}

export default SlidePositionManager;