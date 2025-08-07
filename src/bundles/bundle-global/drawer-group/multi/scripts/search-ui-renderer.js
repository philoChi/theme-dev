/**
 * Search UI Renderer
 * 
 * Handles all UI rendering and DOM manipulation for search functionality.
 * Manages different UI states and accessibility features.
 */

import SearchConfig from './search-config.js';

class UIRenderer {
  constructor() {
    this.config = SearchConfig;
    this.selectors = this.config.selectors;
    this._cacheElements();
  }

  /**
   * Cache DOM elements
   * @private
   */
  _cacheElements() {
    this.elements = {
      searchResults: null,
      loadingState: null,
      hintState: null,
      emptyState: null,
      defaultState: null,
      resultsList: null
    };

    // Initial cache attempt
    this._refreshElementCache();
  }

  /**
   * Refresh element cache
   * @private
   */
  _refreshElementCache() {
    this.elements.searchResults = document.querySelector(this.selectors.searchResults);
    this.elements.loadingState = document.querySelector(this.selectors.loadingState);
    this.elements.hintState = document.querySelector(this.selectors.hintState);
    this.elements.emptyState = document.querySelector(this.selectors.emptyState);
    this.elements.defaultState = document.querySelector(this.selectors.defaultState);
    this.elements.resultsList = document.querySelector(this.selectors.resultsList);
  }

  /**
   * Show loading state
   */
  showLoadingState() {
    this._showState('loading');
    // Hide footer during loading
    this._hideSearchFooter();
    // Screen reader announcement is handled by the loading state element itself
  }

  /**
   * Show hint state when only 1 character is typed
   */
  showHintState() {
    this._showState('hint');
    // Hide footer in hint state
    this._hideSearchFooter();
    // Screen reader announcement is handled by the hint state element itself
  }

  /**
   * Show empty state
   * @param {string} query - Search query that returned no results
   */
  async showEmptyState(query) {
    // Just show the empty state element - translations are handled in Liquid templates
    this._showState('empty');

    // Update the query message and other elements with the actual search query
    this._updateEmptyStateWithQuery(query);

    // Hide footer when no results
    this._hideSearchFooter();

    // Screen reader announcement is handled by the empty state element itself
  }

  /**
   * Update empty state elements with the actual query
   * @private
   * @param {string} query - Search query
   */
  _updateEmptyStateWithQuery(query) {
    if (!query) return;

    // Update the title element
    const titleElement = document.querySelector('#search-empty-title');
    if (titleElement) {
      // Use a simple template approach for the title
      titleElement.textContent = `No products found for "${query}"`;
    }

    // Update the message element
    const messageElement = document.querySelector('#search-empty-query-message');
    if (messageElement) {
      // Use a simple template approach for the message
      messageElement.textContent = `Your search for "${query}" did not yield any results.`;
    }

    // Update aria-label if it contains placeholders
    const emptyContent = document.querySelector('.search-empty-content');
    if (emptyContent) {
      const ariaLabel = emptyContent.getAttribute('aria-label');
      if (ariaLabel && (ariaLabel.includes('PLACEHOLDER'))) {
        let text = ariaLabel;
        text = text.replace(/TERMS_PLACEHOLDER/g, query);
        text = text.replace(/QUERY_PLACEHOLDER/g, query);
        emptyContent.setAttribute('aria-label', text);
      }
    }
  }

  /**
   * Show error state
   * @param {Error} error - Error object
   */
  showErrorState(error) {
    console.error('[UIRenderer] Showing error state:', error);

    // Use notification system for errors
    if (window.showNotification) {
      const message = this._getErrorMessage(error);
      window.showNotification(message, 'error', 4000);
    }

    // Hide footer on error
    this._hideSearchFooter();

    // Show default state as fallback
    this._showState('default');
    // Error messages are handled by the notification system which uses translations
  }

  /**
   * Render search results
   * @param {Object} results - Search results object
   * @param {string} query - Search query
   */
  renderResults(results, query) {
    if (!results || !results.html) {
      console.error('[UIRenderer] Invalid results object');
      this.showErrorState(new Error('Invalid search results'));
      return;
    }

    try {
      console.log('[UIRenderer] Rendering results for:', query);

      // Hide all states first
      this._hideAllStates();

      // Instead of replacing entire container, just update the results list
      if (this.elements.resultsList) {
        this.elements.resultsList.innerHTML = results.html;
        this.elements.resultsList.style.removeProperty('display');
        this.elements.resultsList.style.setProperty('display', 'block', 'important');
        this.elements.resultsList.setAttribute('aria-hidden', 'false');
        this.elements.resultsList.classList.add('search-state--active');
      }

      // Control footer visibility based on results
      if (results.hasResults) {
        this._showSearchFooter();
        this.updateDynamicElements(query);
      } else {
        this._hideSearchFooter();
      }

      // Screen reader announcements are handled by the result elements themselves via role="status"
      // No need for manual announcements as the content changes trigger automatic announcements

      // Dispatch render complete event
      document.dispatchEvent(new CustomEvent('search:rendered', {
        detail: { query, hasResults: results.hasResults }
      }));

    } catch (error) {
      console.error('[UIRenderer] Error rendering results:', error);
      this.showErrorState(error);
    }
  }

  /**
   * Clear results and show default state
   */
  clearResults() {
    this._refreshElementCache();

    if (this.elements.resultsList) {
      this.elements.resultsList.innerHTML = '';
    }

    // Hide footer when clearing results
    this._hideSearchFooter();

    this._showState('default');
  }

  /**
   * Show idle/default state
   */
  showDefaultState() {
    // Hide footer in default/welcome state
    this._hideSearchFooter();
    this._showState('default');
  }

  /**
   * Show specific UI state
   * @private
   * @param {string} state - State to show
   */
  _showState(state) {
    console.log(`[UIRenderer] Showing state: ${state}`);

    // Refresh cache in case elements were added dynamically
    this._refreshElementCache();

    // Get current visible state element
    const currentVisibleElement = this._getCurrentVisibleStateElement();

    // Get the target state element
    const stateElementMap = {
      'loading': this.elements.loadingState,
      'hint': this.elements.hintState,
      'empty': this.elements.emptyState,
      'results': this.elements.resultsList,
      'default': this.elements.defaultState
    };

    const targetElement = stateElementMap[state];

    // If we're already showing the target state, don't re-render
    // This prevents animation restarts
    if (currentVisibleElement === targetElement && targetElement?.classList.contains('search-state--active')) {
      console.log(`[UIRenderer] State ${state} already active, skipping re-render`);
      return;
    }

    // Hide all states first - this is critical
    this._hideAllStates();

    // Force a reflow to ensure hiding is complete before showing new state
    void this.elements.searchResults?.offsetHeight;

    // Show the requested state
    if (targetElement) {
      // Remove the important display none and show the element
      targetElement.style.removeProperty('display');
      targetElement.style.setProperty('display', 'block', 'important');
      targetElement.setAttribute('aria-hidden', 'false');

      // Add active state class for styling
      targetElement.classList.add('search-state--active');

      console.log(`[UIRenderer] State ${state} shown successfully`);
    } else {
      console.warn(`[UIRenderer] State element not found for: ${state}`);
    }
  }

  /**
   * Get currently visible state element
   * @private
   * @returns {HTMLElement|null} The currently visible state element
   */
  _getCurrentVisibleStateElement() {
    const elements = [
      this.elements.loadingState,
      this.elements.hintState,
      this.elements.resultsList,
      this.elements.emptyState,
      this.elements.defaultState
    ];

    return elements.find(element =>
      element && element.classList.contains('search-state--active')
    ) || null;
  }

  /**
   * Hide all UI states
   * @private
   */
  _hideAllStates() {
    const elements = [
      this.elements.loadingState,
      this.elements.hintState,
      this.elements.resultsList,
      this.elements.emptyState,
      this.elements.defaultState
    ];

    elements.forEach(element => {
      if (element) {
        // Force hide with important to override any other styles
        element.style.setProperty('display', 'none', 'important');
        element.setAttribute('aria-hidden', 'true');
        element.classList.remove('search-state--active');
      }
    });

    // Also hide the main search results container content
    if (this.elements.searchResults) {
      // Clear any innerHTML that might have been set
      const searchResultsChildren = this.elements.searchResults.children;
      for (let child of searchResultsChildren) {
        if (child.id && child.id.startsWith('Search')) {
          child.style.setProperty('display', 'none', 'important');
        }
      }
    }
  }

  /**
   * Render HTML content into search results container
   * @private
   * @param {string} html - HTML content to render
   */
  _renderHtml(html) {
    if (!this.elements.searchResults) {
      this._refreshElementCache();
    }

    if (this.elements.searchResults) {
      this.elements.searchResults.innerHTML = html;
      this.elements.searchResults.style.display = 'block';
      this.elements.searchResults.setAttribute('aria-hidden', 'false');
    } else {
      throw new Error('Search results container not found');
    }
  }

  /**
   * Announce message to screen readers
   * @private
   * @param {string} message - Message to announce
   */
  _announceToScreenReader(message) {
    if (!this.elements.searchResults) return;

    // Create announcement element
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.textContent = message;

    // Add to DOM
    this.elements.searchResults.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  /**
   * Get user-friendly error message
   * @private
   * @param {Error} error - Error object
   * @returns {string} User-friendly message
   */
  _getErrorMessage(error) {
    if (error.type === 'timeout' || error.message?.includes('timeout')) {
      return 'Search request timed out. Please try again.';
    } else if (error.type === 'network' || error.message?.includes('Network')) {
      return 'Search is temporarily unavailable. Please check your connection.';
    } else if (error.message?.includes('cancelled')) {
      return 'Search was cancelled.';
    }

    return 'Search encountered an error. Please try again.';
  }

  /**
   * Update any dynamic UI elements
   * @param {string} query - Current search query
   */
  updateDynamicElements(query) {
    // Update "Show All" button if it exists
    const showAllBtn = document.querySelector('#SearchShowAllButton');
    if (showAllBtn && query) {
      const searchUrl = new URL('/search', window.location.origin);
      searchUrl.searchParams.set('q', query);
      showAllBtn.href = searchUrl.toString();
      showAllBtn.setAttribute('aria-label', `Show all search results for "${query}"`);
    }
  }

  /**
   * Toggle search footer visibility
   * @private
   * @param {boolean} show - Whether to show or hide the footer
   */
  _toggleSearchFooter(show) {
    const searchFooter = document.querySelector('#drawer__footer__search');
    if (!searchFooter) return;

    if (show) {
      searchFooter.classList.remove('search-no-results');
      searchFooter.style.removeProperty('display');
      searchFooter.style.setProperty('display', 'flex', 'important');
      void searchFooter.offsetHeight;
      requestAnimationFrame(() => {
        searchFooter.classList.add('is-open', 'search-has-results');
      });
    } else {
      searchFooter.classList.remove('is-open', 'search-has-results');
      searchFooter.classList.add('search-no-results');
      setTimeout(() => {
        if (searchFooter.classList.contains('search-no-results')) {
          searchFooter.style.setProperty('display', 'none', 'important');
        }
      }, 300);
    }

    console.log(`[UIRenderer] Search footer ${show ? 'shown' : 'hidden'}`);
  }

  /**
   * Show search footer
   * @private
   */
  _showSearchFooter() {
    this._toggleSearchFooter(true);
  }

  /**
   * Hide search footer
   * @private
   */
  _hideSearchFooter() {
    this._toggleSearchFooter(false);
  }
}

export default UIRenderer;