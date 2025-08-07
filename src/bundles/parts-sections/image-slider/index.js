/**
 * Image Slider Section
 * Handles image slider functionality
 */

// Import all styles
import './index.scss';

// Import components
import ImageSlider from './scripts/ImageSlider.js';

// Define custom element
customElements.define('image-slider', ImageSlider);

// Export to global scope for external access
window.ImageSlider = ImageSlider;

// Initialize image slider sections on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Auto-initialize image slider sections
        const sliderSections = document.querySelectorAll('[data-section-type="image-slider"]');
        sliderSections.forEach(section => {
            if (!section.hasAttribute('data-slider-initialized')) {
                const slider = section.querySelector('image-slider') || section;
                if (slider.tagName.toLowerCase() !== 'image-slider') {
                    // Convert to custom element if needed
                    const imageSlider = document.createElement('image-slider');
                    imageSlider.innerHTML = slider.innerHTML;
                    Array.from(slider.attributes).forEach(attr => {
                        imageSlider.setAttribute(attr.name, attr.value);
                    });
                    slider.parentNode.replaceChild(imageSlider, slider);
                }
                section.setAttribute('data-slider-initialized', 'true');
            }
        });

        // Log successful initialization
        if (window.logger) {
            window.logger.log('Image slider section initialized successfully');
        }
    } catch (error) {
        console.error('Failed to initialize image slider section:', error);

        // Show user-friendly error if notification system is available
        if (window.showNotification) {
            window.showNotification('There was an issue loading image slider features. Please refresh the page.', 'error');
        }
    }
});

// Re-initialize on Shopify section load
document.addEventListener('shopify:section:load', event => {
    const section = event.target;
    const sectionType = section.getAttribute('data-section-type');

    if (sectionType === 'image-slider') {
        if (!section.hasAttribute('data-slider-initialized')) {
            const slider = section.querySelector('image-slider') || section;
            if (slider.tagName.toLowerCase() !== 'image-slider') {
                // Convert to custom element if needed
                const imageSlider = document.createElement('image-slider');
                imageSlider.innerHTML = slider.innerHTML;
                Array.from(slider.attributes).forEach(attr => {
                    imageSlider.setAttribute(attr.name, attr.value);
                });
                slider.parentNode.replaceChild(imageSlider, slider);
            }
            section.setAttribute('data-slider-initialized', 'true');
        }
    }
});

// Handle Shopify section unload
document.addEventListener('shopify:section:unload', event => {
    const section = event.target;
    const sectionType = section.getAttribute('data-section-type');

    if (sectionType === 'image-slider') {
        section.removeAttribute('data-slider-initialized');
    }
});