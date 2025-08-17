/**
 * Swipe Handler
 * Manages touch and swipe gesture detection for navigation
 */
class SwipeHandler {
  /**
   * Initialize swipe handler
   * @param {HTMLElement} sliderElement - Slider container element
   * @param {NavigationController} navigationController - Navigation controller instance
   * @param {number} swipeThreshold - Minimum distance for swipe detection
   */
  constructor(sliderElement, navigationController, swipeThreshold = 40) {
    this.slider = sliderElement;
    this.navigationController = navigationController;
    this.swipeThreshold = swipeThreshold;
    
    this.startX = null;
    this.startY = null;
    this.lastSwipeTime = 0;
    this.swipeDebounceDelay = 150; // Prevent rapid swipe triggers
    
    // Pre-bind event handlers for better performance
    this.handlePointerStart = this.handlePointerStart.bind(this);
    this.handlePointerEnd = this.handlePointerEnd.bind(this);
  }

  /**
   * Sets up swipe gesture support for touch devices
   * Uses pointer events for better touch/pen support with passive listeners for performance
   */
  setupSwipeEvents() {
    // Use passive listeners to maintain scrolling performance
    this.slider.addEventListener('pointerdown', this.handlePointerStart, { passive: true });
    this.slider.addEventListener('pointerup', this.handlePointerEnd, { passive: true });
    this.slider.addEventListener('pointercancel', this.handlePointerEnd, { passive: true });
  }

  /**
   * Handle pointer start event
   * @param {PointerEvent} e - Pointer event
   */
  handlePointerStart(e) {
    // Only handle touch and pen inputs
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    this.startX = e.clientX;
    this.startY = e.clientY;
  }

  /**
   * Handle pointer end event and process swipe gesture with debouncing
   * @param {PointerEvent} e - Pointer event
   */
  handlePointerEnd(e) {
    if (this.startX === null) return;
    
    const currentTime = Date.now();
    
    // Debounce rapid swipes for better performance
    if (currentTime - this.lastSwipeTime < this.swipeDebounceDelay) {
      this.startX = this.startY = null;
      return;
    }
    
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    // Reset tracking variables
    this.startX = this.startY = null;

    // Only trigger navigation if gesture is primarily horizontal and meets threshold
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
    const exceedsThreshold = Math.abs(deltaX) > this.swipeThreshold;
    
    if (isHorizontalGesture && exceedsThreshold) {
      this.lastSwipeTime = currentTime;
      this.navigationController.navigate(deltaX < 0 ? 'right' : 'left');
    }
  }

  /**
   * Cleanup method for memory management
   */
  cleanup() {
    if (this.slider) {
      this.slider.removeEventListener('pointerdown', this.handlePointerStart);
      this.slider.removeEventListener('pointerup', this.handlePointerEnd);
      this.slider.removeEventListener('pointercancel', this.handlePointerEnd);
    }
  }
}

export default SwipeHandler;