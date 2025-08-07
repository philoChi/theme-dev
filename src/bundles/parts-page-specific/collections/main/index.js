/**
 * Collection Page Bundle Entry Point
 * 
 * This demonstrates webpack bundling for Shopify themes with nested folder structure.
 * All collection page modules are imported here and bundled into a single file
 * that gets output to assets/section-collection-page-bundle.js
 * 
 * Benefits:
 * - Modular development with nested folders
 * - Single HTTP request for all collection page JS
 * - Tree shaking eliminates unused code
 * - Code splitting for common utilities
 * - Better caching with webpack hashing
 */

// Import CSS (will be extracted to separate file)
// import './styles/index.css'; // Removed as requested

// Import all styles
import './index.scss';


// Import existing collection page modules
import { CollectionPageController } from './scripts/CollectionPageController.js';
import { FilterManager } from './scripts/FilterManager.js';
import { SortManager } from './scripts/SortManager.js';
import { ErrorHandler } from './scripts/ErrorHandler.js';
import { AccessibilityManager } from './scripts/AccessibilityManager.js';
import { DOMUtils, PerformanceUtils, EventUtils } from './scripts/CollectionUtils.js';

// Set up Shopify registry for product card variants
if (typeof window.Shopify === 'undefined') window.Shopify = {};

// ProductCardVariants registry will be handled by the global features-shared-all bundle
// This avoids duplicate registrations and ensures consistency across the site

// Export for external access and debugging
window.CollectionPageBundle = {
    CollectionPageController,
    FilterManager,
    SortManager,
    ErrorHandler,
    AccessibilityManager,
    DOMUtils,
    PerformanceUtils,
    EventUtils,
    // Note: ProductCardVariants and ProductVariantControllerBase are exported from features-shared-all bundle
};

// Initialize the collection page system
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize the bundled collection page controller
        window.collectionPageController = new CollectionPageController();

        // Log successful initialization
        if (window.logger) {
            window.logger.log('Collection page bundle initialized successfully');
        } else {
            console.log('Collection page bundle initialized successfully');
        }

        // Set up global error handling for the bundle
        setupGlobalErrorHandling();

    } catch (error) {
        console.error('Failed to initialize collection page bundle:', error);

        if (window.showNotification) {
            window.showNotification(
                'Collection page could not be initialized. Please refresh the page.',
                'error'
            );
        }
    }
});

/**
 * Set up global error handling for the collection page bundle
 */
function setupGlobalErrorHandling() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('collection-page-bundle')) {
            if (window.logger) {
                window.logger.error('Error in collection page bundle:', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error
                });
            }

            // Show user-friendly message for critical errors
            if (window.showNotification && event.message.includes('Cannot read prop')) {
                window.showNotification(
                    'There was a problem with the page. Please refresh and try again.',
                    'error'
                );
            }
        }
    });

    // Handle promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        if (event.reason && event.reason.stack && event.reason.stack.includes('collection-page-bundle')) {
            if (window.logger) {
                window.logger.error('Unhandled promise rejection in collection page bundle:', event.reason);
            }

            // Prevent console error for handled cases
            event.preventDefault();

            // Show user-friendly message
            if (window.showNotification) {
                window.showNotification(
                    'A network error occurred. Please check your connection and try again.',
                    'warning'
                );
            }
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.collectionPageController && typeof window.collectionPageController.destroy === 'function') {
        window.collectionPageController.destroy();
    }
});

// Hot Module Replacement support for development
if (module.hot) {
    module.hot.accept();
}