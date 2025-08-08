/**
 * Shared Features Bundle Entry Point
 * Consolidates notification, logger, dropdown, and utility styles into a single optimized bundle
 */

// Import all styles
import './index.scss';

// Import JavaScript components and utilities
import NotificationSystem from './notification-system/scripts/NotificationSystem.js';
import { GeneralLogger, loggers, globalLogger } from './logger/scripts/Logger.js';
import { DropdownFeature, initializeDropdowns } from './dropdown-menu/scripts/DropdownFeature.js';
import './product-card/index.js';

// Export to window for external access and module organization
window.SharedFeaturesBundle = {
  components: {
    NotificationSystem,
    DropdownFeature
  },
  utils: {
    GeneralLogger,
    loggers,
    globalLogger,
    initializeDropdowns
  }
};

// Initialize shared features on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Initialize notification system
    if (!window.NotificationSystem) {
      window.NotificationSystem = new NotificationSystem();
      
      if (window.logger) {
        window.logger.log('NotificationSystem initialized successfully');
      }
    }

    // Set up global logger (preserve original API)
    if (!window.logger) {
      window.logger = globalLogger;
    }

    // Register dropdown custom element
    if (!customElements.get('dropdown-feature')) {
      customElements.define('dropdown-feature', DropdownFeature);
      
      if (window.logger) {
        window.logger.log('DropdownFeature custom element registered');
      }
    }

    // Initialize existing dropdowns
    initializeDropdowns();

    // Log successful initialization
    if (window.logger) {
      window.logger.log('Shared features bundle initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize shared features bundle:', error);
    
    // Show user-friendly error if notification system is available
    if (window.showNotification) {
      window.showNotification('There was an issue loading shared features. Please refresh the page.', 'error');
    }
  }
});

// Global convenience function for notifications (preserve original API)
if (!window.showNotification) {
  window.showNotification = (message, type, duration, options) => {
    if (window.NotificationSystem) {
      return window.NotificationSystem.show(message, type, duration, options);
    } else {
      if (window.logger) {
        window.logger.warn('NotificationSystem not initialized yet');
      }
    }
  };
}

// Global function for initializing dropdowns (preserve original API)
if (!window.initializeDropdowns) {
  window.initializeDropdowns = initializeDropdowns;
}

// Make individual logger instances available globally (preserve original API)
if (typeof window !== 'undefined') {
  window.StartUpLogger = loggers.StartUpLogger;
  window.TabLogger = loggers.TabLogger;
  window.CarouselLogger = loggers.CarouselLogger;
  window.ImageSliderLogger = loggers.ImageSliderLogger;
  window.DrawerLogger = loggers.DrawerLogger;
  window.CollectionPageLogger = loggers.CollectionPageLogger;
}

// Global error handler for shared features-related errors
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('shared-features-bundle')) {
    console.error('Shared features bundle error:', event);
    
    if (window.logger) {
      window.logger.error('Shared features bundle error', {
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
  // Clean up any shared features-related event listeners or timers
  if (window.SharedFeaturesBundle && window.SharedFeaturesBundle.cleanup) {
    window.SharedFeaturesBundle.cleanup();
  }
});

// Hot Module Replacement support for development
if (module.hot) {
  module.hot.accept();
  module.hot.dispose(() => {
    // Cleanup code for HMR
    if (window.SharedFeaturesBundle && window.SharedFeaturesBundle.cleanup) {
      window.SharedFeaturesBundle.cleanup();
    }
  });
}