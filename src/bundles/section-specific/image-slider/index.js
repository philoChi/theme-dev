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
        // Get sections to initialize
        const sections = getSectionsToInitialize(container);

        // Initialize each section
        let initializedCount = 0;
        sections.forEach(section => {
            if (!section.hasAttribute('data-slider-initialized')) {
                new ImageSlider(section);
                section.setAttribute('data-slider-initialized', 'true');
                initializedCount++;
            }
        });

        // Log successful initialization
        if (window.logger && initializedCount > 0) {
            window.logger.log(`Image slider: initialized ${initializedCount} section(s)`);
        }
    } catch (error) {
        console.error('Failed to initialize image slider sections:', error);
        showUserFriendlyError();
    }
}

/**
 * Get sections that need initialization
 * @param {Element} container - Container to search within
 * @returns {NodeList|Array} Array of sections to initialize
 */
function getSectionsToInitialize(container) {
    if (container.querySelectorAll) {
        return container.querySelectorAll('[data-section-type="image-slider"]');
    }
    
    return container.getAttribute('data-section-type') === 'image-slider' ? [container] : [];
}

/**
 * Show user-friendly error notification
 */
function showUserFriendlyError() {
    if (window.showNotification) {
        window.showNotification(
            'There was an issue loading image slider features. Please refresh the page.', 
            'error'
        );
    }
}