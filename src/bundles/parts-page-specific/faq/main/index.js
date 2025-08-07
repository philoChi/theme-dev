/**
 * FAQ Page Bundle Entry Point
 * Consolidates FAQ page functionality into a single optimized bundle
 */

// Import all styles
import './index.scss';

// Import components
import FAQPage from './scripts/FAQPage.js';

// Export to window for external access
window.FAQPageBundle = {
    components: {
        FAQPage
    }
};

// Define custom element
customElements.define('faq-page', FAQPage);

// Export to global scope for external access
window.FAQPage = FAQPage;

// Initialize FAQ page on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Auto-initialize FAQ sections
        const faqSections = document.querySelectorAll('[data-section-type="faq-main"]');
        faqSections.forEach(section => {
            if (!section.hasAttribute('data-faq-initialized')) {
                new FAQPage(section);
                section.setAttribute('data-faq-initialized', 'true');
            }
        });

        // Log successful initialization
        if (window.logger) {
            window.logger.log('FAQ page bundle initialized successfully');
        }
    } catch (error) {
        console.error('Failed to initialize FAQ page bundle:', error);

        // Show user-friendly error if notification system is available
        if (window.showNotification) {
            window.showNotification('There was an issue loading FAQ features. Please refresh the page.', 'error');
        }
    }
});

// Re-initialize on Shopify section load
document.addEventListener('shopify:section:load', event => {
    const section = event.target;
    const sectionType = section.getAttribute('data-section-type');

    if (sectionType === 'faq-main') {
        if (!section.hasAttribute('data-faq-initialized')) {
            new FAQPage(section);
            section.setAttribute('data-faq-initialized', 'true');
        }
    }
});

// Handle Shopify section unload
document.addEventListener('shopify:section:unload', event => {
    const section = event.target;
    const sectionType = section.getAttribute('data-section-type');

    if (sectionType === 'faq-main') {
        section.removeAttribute('data-faq-initialized');
    }
});

// Hot Module Replacement support for development
if (module.hot) {
    module.hot.accept();
}