/**
 * Image Slider Configuration Manager
 * Handles configuration constants and data attribute parsing
 */
class ImageSliderConfig {
  /**
   * Configuration constants for the slider behavior
   */
  static get CONSTANTS() {
    return {
      SWIPE_THRESHOLD: 40,
      ANIMATION_DELAY: 600, // Matches CSS --slider-transition-duration for synchronization
      DEFAULT_AUTOPLAY_INTERVAL: 5000,
      DEFAULT_TRANSITION_DURATION: 600, // Aligned with CSS transition duration
      CENTER_POSITION: 1, // Default position for active slide in DOM
      SYNC_BUFFER: 50, // Additional buffer for animation synchronization
    };
  }

  /**
   * Initialize configuration from slider element
   * @param {HTMLElement} sliderElement - The slider container element
   */
  constructor(sliderElement) {
    this.slider = sliderElement;
    this.parseConfiguration();
  }

  /**
   * Parse configuration from data attributes on the slider element
   * Extracts autoplay settings from HTML data attributes set by Liquid template
   */
  parseConfiguration() {
    this.autoplayEnabled = this.slider.dataset.autoplay === 'true';
    this.autoplayInterval = parseInt(
      this.slider.dataset.interval || ImageSliderConfig.CONSTANTS.DEFAULT_AUTOPLAY_INTERVAL.toString(), 
      10
    );
  }

  /**
   * Get autoplay configuration
   * @returns {Object} Autoplay settings
   */
  getAutoplayConfig() {
    return {
      enabled: this.autoplayEnabled,
      interval: this.autoplayInterval
    };
  }
}

export default ImageSliderConfig;