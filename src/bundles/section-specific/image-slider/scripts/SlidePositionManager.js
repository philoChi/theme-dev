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
    console.log(`🔄 updateContainerPosition: currentIndex=${currentIndex}, virtualPos=${virtualCurrentPosition}, slidePos=${this.slidePositions.get(currentIndex)}%`);
    this.container.style.transform = `translateX(calc(50vw - var(--slider-slide-total-max-width) * (${virtualCurrentPosition} + 0.5)))`;
  }

  /**
   * Update individual slide positions based on virtual positioning
   */
  updateSlidePositions() {
    console.log(`🎨 updateSlidePositions - Setting positions:`);
    this.slides.forEach((slide, index) => {
      const position = this.slidePositions.get(index);
      slide.style.transform = `translateX(${position}%)`;
      console.log(`   slide${index}: ${position}% ${this.isSlideVisible(position) ? '👁️ VISIBLE' : '❌ hidden'}`);
    });
    this.logVisibleSlides();
  }
  
  /**
   * Helper to determine if a slide position is visible (roughly -150% to +250% range)
   */
  isSlideVisible(position) {
    return position >= -150 && position <= 250;
  }
  
  /**
   * Log which slides should be visible based on positions
   */
  logVisibleSlides() {
    const visible = [];
    this.slidePositions.forEach((pos, index) => {
      if (this.isSlideVisible(pos)) {
        visible.push(`slide${index}`);
      }
    });
    console.log(`👁️ Expected visible slides: [${visible.join(', ')}]`);
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

    console.log(`🔗 updateAdjacentSlidePositions: current=${currentIndex} (pos=${currentPosition}%), prev=${prevIndex}, next=${nextIndex}`);

    // Position adjacent slides relative to current slide for seamless transitions
    this.slidePositions.set(prevIndex, currentPosition - 100);
    this.slidePositions.set(nextIndex, currentPosition + 100);

    console.log(`📍 Adjacent positions set: slide${prevIndex}=${currentPosition - 100}%, slide${nextIndex}=${currentPosition + 100}%`);

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
    console.log(`🚀 repositionSlidesForInfiniteTransition: from=${fromIndex} to=${toIndex}, forward=${isForward}`);
    console.log(`📊 BEFORE - All positions:`, Array.from(this.slidePositions.entries()).map(([i, pos]) => `slide${i}=${pos}%`).join(', '));
    
    if (isForward) {
      // Last → First: The first slide should already be positioned correctly by updateAdjacentSlidePositions
      // But ensure it's in the right virtual position for the transition
      const lastSlidePosition = this.slidePositions.get(fromIndex);
      console.log(`➡️ Forward: Moving slide${toIndex} to position ${lastSlidePosition + 100}% (was ${this.slidePositions.get(toIndex)}%)`);
      this.slidePositions.set(toIndex, lastSlidePosition + 100);
    } else {
      // First → Last: The last slide should already be positioned correctly by updateAdjacentSlidePositions  
      // But ensure it's in the right virtual position for the transition
      const firstSlidePosition = this.slidePositions.get(fromIndex);
      console.log(`⬅️ Backward: Moving slide${toIndex} to position ${firstSlidePosition - 100}% (was ${this.slidePositions.get(toIndex)}%)`);
      this.slidePositions.set(toIndex, firstSlidePosition - 100);
    }
    
    console.log(`📊 AFTER repositioning - All positions:`, Array.from(this.slidePositions.entries()).map(([i, pos]) => `slide${i}=${pos}%`).join(', '));
    
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
          // But ensure no slide overlaps with adjacent positions that will be set later
          this.slidePositions.set(index, index * 100);
        }
      });
      
      // Fix potential position conflicts before updateAdjacentSlidePositions
      // When current slide is at the end (slide3 at 0%), ensure no other slides are at 100% or -100%
      if (currentIndex === this.slideCount - 1) {
        // slide3 is current at 0%, adjacent will be: slide2 at -100%, slide0 at 100%
        // Ensure slide1 is not at 100% (conflicting with slide0)
        const slide1Index = 1;
        const slide0WillBeAt = 100; // slide0 will be positioned at 100% by updateAdjacentSlidePositions
        if (this.slidePositions.get(slide1Index) === slide0WillBeAt) {
          this.slidePositions.set(slide1Index, 200); // Move slide1 to 200% to avoid conflict
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