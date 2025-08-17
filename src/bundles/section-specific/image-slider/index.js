/**
 * Image Slider Section Bundle
 * Entry point for image slider functionality and styles
 */

// Import all styles
import './index.scss';

// Import the ImageSlider class
import ImageSlider from './scripts/ImageSlider.js';

/**
 * Export to global scope for external access and debugging
 */
window.ImageSlider = ImageSlider;

/**
 * Initialize image slider sections on DOM ready
 * Creates ImageSlider instances for each section
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeImageSliders();
});

/**
 * Re-initialize on Shopify theme editor section load
 */
document.addEventListener('shopify:section:load', event => {
    if (event.target.getAttribute('data-section-type') === 'image-slider') {
        initializeImageSliders(event.target);
    }
});

/**
 * Initialize image slider sections by creating ImageSlider instances
 * @param {Element} container - Optional container to search within, defaults to document
 */
function initializeImageSliders(container = document) {
    try {
        const sections = container.querySelectorAll 
            ? container.querySelectorAll('[data-section-type="image-slider"]')
            : container.getAttribute('data-section-type') === 'image-slider' 
                ? [container] 
                : [];

        sections.forEach(section => {
            // Skip if already initialized
            if (section.hasAttribute('data-slider-initialized')) {
                return;
            }

            // Create ImageSlider instance
            new ImageSlider(section);
            
            // Mark as initialized
            section.setAttribute('data-slider-initialized', 'true');
        });

        // Log successful initialization
        if (window.logger) {
            window.logger.log(`Image slider: initialized ${sections.length} section(s)`);
        }
    } catch (error) {
        console.error('Failed to initialize image slider sections:', error);

        // Show user-friendly error if notification system is available
        if (window.showNotification) {
            window.showNotification('There was an issue loading image slider features. Please refresh the page.', 'error');
        }
    }
}