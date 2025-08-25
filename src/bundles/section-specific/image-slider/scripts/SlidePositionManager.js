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
    
    // Get gap percentage from CSS variable
    this.gapPercentage = this.getGapPercentage();
    
    this.initializeVirtualPositions();
  }

  /**
   * Get gap percentage from CSS custom property
   * @returns {number} Gap percentage as decimal (e.g., 5% returns 5)
   */
  getGapPercentage() {
    const sliderElement = this.container.closest('.image-slider');
    if (!sliderElement) return 0;
    
    const computedStyle = getComputedStyle(sliderElement);
    const gapValue = computedStyle.getPropertyValue('--slider-slide-spacing').trim();
    
    // Parse percentage value (e.g., "5%" -> 5)
    if (gapValue.endsWith('%')) {
      return parseFloat(gapValue.replace('%', '')) || 0;
    }
    
    return 0;
  }

  /**
   * Initialize virtual positioning system for all slides
   */
  initializeVirtualPositions() {
    // Set up extended virtual positions for infinite mode
    // Include gap percentage in slide spacing calculations
    this.slides.forEach((slide, index) => {
      this.slidePositions.set(index, index * (100 + this.gapPercentage));
    });
    
    // Apply initial slide positioning
    this.updateSlidePositions();
  }

  /**
   * Update container position to center current slide
   * @param {number} currentIndex - Current slide index
   */
  updateContainerPosition(currentIndex) {
    // Calculate virtual position including gaps
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
    
    // Calculate slide spacing including gap
    const slideSpacing = 100 + this.gapPercentage;

    // Get adjacent slide indices (with wrapping for infinite behavior)
    const prevIndex = currentIndex === 0 ? this.slideCount - 1 : currentIndex - 1;
    const nextIndex = currentIndex === this.slideCount - 1 ? 0 : currentIndex + 1;

    // Position adjacent slides relative to current slide for seamless transitions
    this.slidePositions.set(prevIndex, currentPosition - slideSpacing);
    this.slidePositions.set(nextIndex, currentPosition + slideSpacing);

    // Apply updated positions to ensure adjacent slides are visible
    this.updateSlidePositions();
  }

  /**
   * Prepare infinite transition by positioning only the incoming slide
   * Phase 1: Position target slide for smooth entry without affecting outgoing slide
   * @param {number} fromIndex - Current slide index
   * @param {number} toIndex - Target slide index
   * @param {boolean} isForward - Direction of transition
   */
  prepareInfiniteTransition(fromIndex, toIndex, isForward) {
    // Calculate slide spacing including gap
    const slideSpacing = 100 + this.gapPercentage;
    
    if (isForward) {
      // Last → First: Position the first slide for seamless forward transition
      const lastSlidePosition = this.slidePositions.get(fromIndex);
      this.slidePositions.set(toIndex, lastSlidePosition + slideSpacing);
    } else {
      // First → Last: Position the last slide for seamless backward transition
      const firstSlidePosition = this.slidePositions.get(fromIndex);
      this.slidePositions.set(toIndex, firstSlidePosition - slideSpacing);
    }
    
    // Apply positioning of target slide only
    this.updateSlidePositions();
  }

  /**
   * Complete infinite transition by repositioning remaining slides
   * Phase 2: Deferred repositioning when slides are less visible
   * @param {number} toIndex - Target slide index (now current)
   */
  completeInfiniteTransition(toIndex) {
    // Now update adjacent slide positions for the new current slide
    // This happens after a delay when slides are mid-transition and less visible
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
          // But ensure no slide overlaps with adjacent positions that will be set later
          this.slidePositions.set(index, index * (100 + this.gapPercentage));
        }
      });
      
      // Prevent position conflicts after updateAdjacentSlidePositions is called
      // When the last slide becomes current, ensure non-adjacent slides don't overlap with adjacent ones
      if (currentIndex === this.slideCount - 1) {
        // Current slide will be at 0%, adjacent slides at negative and positive spacing
        // Move any non-adjacent slides that would conflict with these positions
        const slideSpacing = 100 + this.gapPercentage;
        const slide1Index = 1;
        if (this.slidePositions.get(slide1Index) === slideSpacing) {
          this.slidePositions.set(slide1Index, slideSpacing * 2); // Avoid overlap with adjacent slide
        }
      }
      
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