/**
 * Error handling for collection page operations
 * Centralizes error logging, user messaging, and recovery strategies
 */

export class ErrorHandler {
  constructor() {
    this.errorMessages = {
      'Initialization failed': 'There was a problem loading the page. Please refresh and try again.',
      'Failed to load collection data': 'Unable to load products. Please refresh the page.',
      'Failed to load more products': 'Could not load additional products. Please try again.',
      'Failed to setup filter drawer': 'Filters are temporarily unavailable. You can still browse products.',
      'Failed to update URL': 'Navigation may not work properly. Please refresh if needed.',
      'Failed to initialize from URL': 'Some filters may not be applied correctly. Please check your selections.'
    };
  }

  /**
   * Handle error with context and recovery
   * @param {string} message - Technical error message
   * @param {Error} error - Error object
   * @param {string} context - Error context for recovery
   * @param {Object} state - Application state for recovery
   */
  handleError(message, error, context = null, state = null) {
    const errorInfo = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this._logError(errorInfo);
    this._showUserMessage(message);
    this._attemptRecovery(context, error, state);
  }

  /**
   * Log error to console and logger
   * @private
   * @param {Object} errorInfo - Error information
   */
  _logError(errorInfo) {
    if (window.logger) {
      window.logger.error('CollectionPage Error:', errorInfo);
    } else {
      console.error('CollectionPage Error:', errorInfo);
    }
  }

  /**
   * Show user-friendly error message
   * @private
   * @param {string} technicalMessage - Technical error message
   */
  _showUserMessage(technicalMessage) {
    const userMessage = this._getUserFriendlyMessage(technicalMessage);
    
    if (window.showNotification) {
      window.showNotification(userMessage, 'error');
    } else {
      console.error(userMessage);
    }
  }

  /**
   * Get user-friendly error message
   * @private
   * @param {string} technicalMessage - Technical message
   * @returns {string} User-friendly message
   */
  _getUserFriendlyMessage(technicalMessage) {
    return this.errorMessages[technicalMessage] || 
           'Something went wrong. Please refresh the page and try again.';
  }

  /**
   * Attempt error recovery based on context
   * @private
   * @param {string} context - Error context
   * @param {Error} error - Error object
   * @param {Object} state - Application state
   */
  _attemptRecovery(context, error, state) {
    switch (context) {
      case 'filter-operation':
        this._recoverFromFilterError(state);
        break;
        
      case 'pagination':
        this._recoverFromPaginationError(state);
        break;
        
      case 'collection-data':
        this._recoverFromDataError(state);
        break;
        
      default:
        this._ensureValidUIState();
    }
  }

  /**
   * Recover from filter operation errors
   * @private
   * @param {Object} state - Application state
   */
  _recoverFromFilterError(state) {
    if (state && state.filters) {
      state.filters = { availability: ['in-stock'] };
    }
    
    if (window.showNotification) {
      window.showNotification('Filters have been reset. You can try filtering again.', 'info');
    }
  }

  /**
   * Recover from pagination errors
   * @private
   * @param {Object} state - Application state
   */
  _recoverFromPaginationError(state) {
    if (state) {
      state.currentPage = 1;
      state.isLoading = false;
    }
  }

  /**
   * Recover from data loading errors
   * @private
   * @param {Object} state - Application state
   */
  _recoverFromDataError(state) {
    setTimeout(() => {
      if (state && state.originalProducts && state.originalProducts.length === 0) {
        if (window.showNotification) {
          window.showNotification('Please refresh the page to reload products.', 'warning');
        }
      }
    }, 2000);
  }

  /**
   * Ensure UI is in a valid state after error
   * @private
   */
  _ensureValidUIState() {
    try {
      // Reset loading states
      const loadingElements = document.querySelectorAll('.is-loading');
      loadingElements.forEach(el => el.classList.remove('is-loading'));
      
      // Enable disabled buttons
      const disabledButtons = document.querySelectorAll('button[disabled]');
      disabledButtons.forEach(btn => {
        if (!btn.hasAttribute('data-permanently-disabled')) {
          btn.disabled = false;
        }
      });
      
      // Show grid if hidden
      const grid = document.querySelector('[data-product-grid]');
      if (grid) {
        grid.style.display = 'grid';
        grid.removeAttribute('aria-hidden');
      }
      
      if (window.logger) {
        window.logger.log('UI state normalized after error');
      }
    } catch (recoveryError) {
      console.error('Failed to normalize UI state:', recoveryError);
    }
  }

  /**
   * Handle network errors specifically
   * @param {Error} error - Network error
   * @param {string} operation - Operation that failed
   * @returns {string} User-friendly error message
   */
  handleNetworkError(error, operation) {
    let errorMessage = `Failed to ${operation}`;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timed out. Please check your connection and try again.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('HTTP 4')) {
      errorMessage = 'Some content could not be loaded. Please refresh the page.';
    } else if (error.message.includes('HTTP 5')) {
      errorMessage = 'Server error. Please try again in a moment.';
    }
    
    return errorMessage;
  }

  /**
   * Validate response and throw appropriate errors
   * @param {Response} response - Fetch response
   * @param {string} operation - Operation being performed
   */
  validateResponse(response, operation) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      throw new Error('Invalid response format');
    }
  }

  /**
   * Validate parsed HTML content
   * @param {string} html - HTML content
   * @param {Document} doc - Parsed document
   */
  validateHTMLContent(html, doc) {
    if (!html || html.trim() === '') {
      throw new Error('Empty response from server');
    }

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Failed to parse server response');
    }
  }
}