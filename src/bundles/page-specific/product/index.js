/**
 * Product Page Bundle Entry Point
 * Consolidates all product-related functionality into a single optimized bundle
 */

// Import all styles
import './index.scss';

// Import components
import ProductPageMain from './scripts/ProductPageMain.js';
import ProductGalleryNavigation from './scripts/ProductPageGallery.js';
import createProductPageVariantController from './scripts/ProductPageVariantController.js';

// Export to window for external access
window.ProductPageBundle = {
    components: {
        ProductPageMain,
        ProductGalleryNavigation,
        createProductPageVariantController
    }
};

// Define custom elements
customElements.define('product-page-main', ProductPageMain);
// ProductGalleryNavigation defines itself in its own file

// Export classes to global scope for external access
window.ProductPageMain = ProductPageMain;
// ProductGalleryNavigation exports itself to window in its own file

// Registry is defined in ProductPageVariantController.js

// Global initialization function for product page main
window.initProductPageMain = function (sectionId) {
    const section = document.querySelector(`[data-section-id="${sectionId}"]`);

    if (!section) {
        if (window.logger) {
            window.logger.warn(`Product page section with ID "${sectionId}" not found`);
        }
        return null;
    }

    // Check if already initialized
    if (section.tagName.toLowerCase() === 'product-page-main') {
        return section;
    }

    // Convert to custom element
    const productPageMain = document.createElement('product-page-main');
    productPageMain.innerHTML = section.innerHTML;

    // Copy attributes
    Array.from(section.attributes).forEach(attr => {
        productPageMain.setAttribute(attr.name, attr.value);
    });

    section.parentNode.replaceChild(productPageMain, section);
    return productPageMain;
};

// Initialize product page components on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Auto-initialize product page main sections
        const autoInitSections = document.querySelectorAll('[data-section-type="product-main"][data-auto-init]');
        autoInitSections.forEach(section => {
            const sectionId = section.getAttribute('data-section-id');
            if (sectionId) {
                window.initProductPageMain(sectionId);
            }
        });

        // Initialize product variants
        const variantContainers = document.querySelectorAll('[data-product-variants]');
        variantContainers.forEach(container => {
            Shopify.ProductPageVariants.register(container);
        });

        // Log successful initialization
        if (window.logger) {
            window.logger.log('Product page bundle initialized successfully');
        }
    } catch (error) {
        console.error('Failed to initialize product page bundle:', error);

        // Show user-friendly error if notification system is available
        if (window.showNotification) {
            window.showNotification('There was an issue loading product features. Please refresh the page.', 'error');
        }
    }
});

// Re-initialize on Shopify section load
document.addEventListener('shopify:section:load', event => {
    const section = event.target;
    const sectionType = section.getAttribute('data-section-type');

    if (sectionType === 'product-main') {
        const sectionId = section.getAttribute('data-section-id');
        if (sectionId) {
            window.initProductPageMain(sectionId);
        }
    }
});

// Handle Shopify section unload  
// Currently no specific unload handling needed for product-main sections

// Global error handler for product-related errors
window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('product-page-bundle')) {
        console.error('Product bundle error:', event);

        if (window.logger) {
            window.logger.error('Product bundle error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clean up any product-related event listeners or timers
    if (window.ProductPageBundle && window.ProductPageBundle.cleanup) {
        window.ProductPageBundle.cleanup();
    }
});

// Hot Module Replacement support for development
if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => {
        // Cleanup code for HMR
        if (window.ProductPageBundle && window.ProductPageBundle.cleanup) {
            window.ProductPageBundle.cleanup();
        }
    });
}