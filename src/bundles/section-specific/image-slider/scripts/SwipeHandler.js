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
  }

  /**
   * Sets up swipe gesture support for touch devices
   * Uses pointer events for better touch/pen support with passive listeners for performance
   */
  setupSwipeEvents() {
    // Use passive listeners to maintain scrolling performance
    this.slider.addEventListener('pointerdown', this.handlePointerStart.bind(this), { passive: true });
    this.slider.addEventListener('pointerup', this.handlePointerEnd.bind(this), { passive: true });
    this.slider.addEventListener('pointercancel', this.handlePointerEnd.bind(this), { passive: true });
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
   * Handle pointer end event and process swipe gesture
   * @param {PointerEvent} e - Pointer event
   */
  handlePointerEnd(e) {
    if (this.startX === null) return;
    
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    // Reset tracking variables
    this.startX = this.startY = null;

    // Only trigger navigation if gesture is primarily horizontal and meets threshold
    const isHorizontalGesture = Math.abs(deltaX) > Math.abs(deltaY);
    const exceedsThreshold = Math.abs(deltaX) > this.swipeThreshold;
    
    if (isHorizontalGesture && exceedsThreshold) {
      this.navigationController.navigate(deltaX < 0 ? 'right' : 'left');
    }
  }
}

export default SwipeHandler;