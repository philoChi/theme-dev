/**
 * Autoplay Manager
 * Handles automatic slide progression, user interaction pause/resume, and visibility detection
 */
class AutoplayManager {
  /**
   * Initialize autoplay manager
   * @param {HTMLElement} sliderElement - Slider container element
   * @param {Object} config - Autoplay configuration
   * @param {NavigationController} navigationController - Navigation controller instance
   * @param {Function} logger - Logger function
   * @param {string} sliderId - Slider ID for logging
   */
  constructor(sliderElement, config, navigationController, logger, sliderId) {
    this.slider = sliderElement;
    this.config = config;
    this.navigationController = navigationController;
    this._logger = logger;
    this.sliderId = sliderId;
    
    this.autoplayTimer = null;
    this.intersectionObserver = null;
  }

  /**
   * Setup autoplay with user preference checking and performance optimizations
   */
  setupAutoplay() {
    if (this.config.enabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.setupIntersectionObserver();
      this.setupUserInteractionHandlers();
      this.startAutoplay();
    }
  }

  /**
   * Setup intersection observer for autoplay pause when off-screen
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleVisibilityChange.bind(this),
        { threshold: 0.1 }
      );
      this.intersectionObserver.observe(this.slider);
    }
  }

  /**
   * Setup user interaction handlers for pause/resume
   */
  setupUserInteractionHandlers() {
    // Pause on user interaction; resume afterwards
    const interactionEvents = ['mouseenter', 'focusin', 'touchstart'];
    const resumeEvents = ['mouseleave', 'focusout', 'touchend'];
    
    interactionEvents.forEach(event => 
      this.slider.addEventListener(event, () => this.stopAutoplay(), { passive: true })
    );
    resumeEvents.forEach(event => 
      this.slider.addEventListener(event, () => this.startAutoplay(), { passive: true })
    );
  }

  /**
   * Handle intersection observer visibility changes
   * Pauses autoplay when slider is off-screen for performance optimization
   * @param {IntersectionObserverEntry[]} entries - Intersection observer entries
   */
  handleVisibilityChange(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.startAutoplay();
      } else {
        this.stopAutoplay();
      }
    });
  }

  /**
   * Starts the autoplay timer for automatic slide progression
   * Only starts if autoplay is enabled and not already running
   */
  startAutoplay() {
    if (!this.shouldStartAutoplay()) {
      return;
    }
    
    this.autoplayTimer = setInterval(() => {
      this.navigationController.navigate('right');
    }, this.config.interval);
    
    this._logger(`Autoplay started (interval: ${this.config.interval} ms)`);
  }

  /**
   * Check if autoplay should start
   * @returns {boolean} True if autoplay should start
   */
  shouldStartAutoplay() {
    return this.config.enabled && !this.autoplayTimer;
  }

  /**
   * Stops the autoplay timer
   * Clears the interval and resets the timer reference
   */
  stopAutoplay() {
    if (!this.autoplayTimer) {
      return;
    }
    
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = null;
    this._logger(`Autoplay paused`);
  }

  /**
   * Restarts the autoplay timer
   * Stops current timer and starts a new one (used after manual navigation)
   */
  restartAutoplay() {
    if (!this.config.enabled) {
      return;
    }
    
    this.stopAutoplay();
    this.startAutoplay();
  }

  /**
   * Cleanup method for memory management
   */
  cleanup() {
    // Clear autoplay timer
    this.stopAutoplay();
    
    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this._logger(`Autoplay cleanup completed`);
  }
}

export default AutoplayManager;