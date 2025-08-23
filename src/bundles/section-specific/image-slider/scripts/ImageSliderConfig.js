/**
 * Image Slider Configuration Manager
 * Reads configuration from data attributes and CSS variables
 */
class ImageSliderConfig {
  /**
   * Initialize configuration from slider element
   * @param {HTMLElement} sliderElement - The slider container element
   */
  constructor(sliderElement) {
    this.slider = sliderElement;
    this.readConfiguration();
  }

  /**
   * Read configuration from slider element
   */
  readConfiguration() {
    // Read data attributes
    this.autoplay = this.slider.dataset.autoplay === 'true';
    this.interval = parseInt(this.slider.dataset.interval || '10000', 10);
    this.sectionType = this.slider.dataset.sectionType || 'image-slider';
    
    // Read CSS variables for transition duration
    const computedStyle = getComputedStyle(this.slider);
    this.transitionDuration = parseInt(computedStyle.getPropertyValue('--slider-transition-duration') || '500', 10);
    
    // Navigation settings
    this.enableNavigation = true; // Always enable navigation for multiple slides
    this.enableKeyboardNavigation = true;
    this.enableDotsNavigation = true;
    
    // Accessibility settings
    this.announceSlideChanges = true;
    this.ariaLive = this.slider.getAttribute('aria-live') || 'polite';
  }

  /**
   * Get autoplay setting
   * @returns {boolean} Whether autoplay is enabled
   */
  isAutoplayEnabled() {
    return this.autoplay;
  }

  /**
   * Get autoplay interval
   * @returns {number} Autoplay interval in milliseconds
   */
  getAutoplayInterval() {
    return this.interval;
  }

  /**
   * Get transition duration
   * @returns {number} Transition duration in milliseconds
   */
  getTransitionDuration() {
    return this.transitionDuration;
  }

  /**
   * Check if navigation is enabled
   * @returns {boolean} Whether navigation is enabled
   */
  isNavigationEnabled() {
    return this.enableNavigation;
  }

  /**
   * Check if keyboard navigation is enabled
   * @returns {boolean} Whether keyboard navigation is enabled
   */
  isKeyboardNavigationEnabled() {
    return this.enableKeyboardNavigation;
  }

  /**
   * Check if dots navigation is enabled
   * @returns {boolean} Whether dots navigation is enabled
   */
  isDotsNavigationEnabled() {
    return this.enableDotsNavigation;
  }

  /**
   * Check if slide change announcements are enabled
   * @returns {boolean} Whether announcements are enabled
   */
  shouldAnnounceSlideChanges() {
    return this.announceSlideChanges;
  }

  /**
   * Get ARIA live setting
   * @returns {string} ARIA live setting
   */
  getAriaLive() {
    return this.ariaLive;
  }
}

export default ImageSliderConfig;