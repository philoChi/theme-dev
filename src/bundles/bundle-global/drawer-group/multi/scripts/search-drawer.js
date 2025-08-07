/**
 * Search Drawer
 * 
 * Main orchestrator class for the drawer search functionality.
 * Coordinates between different modules to provide search capabilities.
 */

import SearchConfig from './search-config.js';
import StateManager from './search-state-manager.js';
import CacheManager from './search-cache-manager.js';
import APIClient from './search-api-client.js';
import UIRenderer from './search-ui-renderer.js';

class SearchDrawer {
  constructor() {
    this.config = SearchConfig;
    this.isInitialized = false;
    this.debounceTimer = null;
    this.currentQuery = '';

    // Initialize modules
    this.stateManager = new StateManager();
    this.cacheManager = new CacheManager();
    this.apiClient = new APIClient(this.cacheManager);
    this.uiRenderer = new UIRenderer();

    // Cache DOM elements
    this.elements = {
      searchInput: null
    };
  }

  /**
   * Initialize the search drawer
   * @returns {boolean} Success status
   */
  init() {
    if (this.isInitialized) {
      console.log('[SearchDrawer] Already initialized');
      return true;
    }

    console.log('[SearchDrawer] Initializing...');

    // Find search input
    this.elements.searchInput = document.querySelector(this.config.selectors.searchInput);

    if (!this.elements.searchInput) {
      console.error('[SearchDrawer] Search input not found:', this.config.selectors.searchInput);
      return false;
    }

    // Set up event listeners
    this._setupEventListeners();

    // Set up state change handlers
    this._setupStateHandlers();

    // Set up drawer close event handlers
    this._setupDrawerCloseHandlers();

    // Initialize with idle state
    this.stateManager.setState(this.config.states.IDLE);

    this.isInitialized = true;
    console.log('[SearchDrawer] Initialization complete');

    // Dispatch initialization event
    document.dispatchEvent(new CustomEvent('search:initialized'));

    return true;
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupEventListeners() {
    // Input events
    this.elements.searchInput.addEventListener('input', this._handleInput.bind(this));
    this.elements.searchInput.addEventListener('keydown', this._handleKeydown.bind(this));

    // Focus events for better UX
    this.elements.searchInput.addEventListener('focus', this._handleFocus.bind(this));
    this.elements.searchInput.addEventListener('blur', this._handleBlur.bind(this));
  }

  /**
   * Set up state change handlers
   * @private
   */
  _setupStateHandlers() {
    document.addEventListener('search:stateChange', (event) => {
      const { currentState, data } = event.detail;

      // Handle state-specific UI updates
      switch (currentState) {
        case this.config.states.SEARCHING:
          this.uiRenderer.showLoadingState();
          break;

        case this.config.states.HINT:
          this.uiRenderer.showHintState();
          break;

        case this.config.states.RESULTS:
          this.uiRenderer.renderResults(data.results, data.query);
          this.uiRenderer.updateDynamicElements(data.query);
          break;

        case this.config.states.EMPTY:
          this.uiRenderer.showEmptyState(data.query);
          break;

        case this.config.states.ERROR:
          this.uiRenderer.showErrorState(data.error);
          break;

        case this.config.states.IDLE:
          this.uiRenderer.clearResults();
          break;
      }
    });
  }

  /**
   * Handle input changes
   * @private
   * @param {Event} event - Input event
   */
  _handleInput(event) {
    const query = event.target.value.trim();
    const previousLength = this.currentQuery.length;

    // Clear any existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Cancel any active API requests when input changes
    this.apiClient.cancelActiveRequest();

    // Handle empty query
    if (query.length === 0) {
      this.clear();
      return;
    }

    // Handle single character
    if (query.length === 1) {
      this.currentQuery = query;
      // Always show hint state for single character
      this.stateManager.setState(this.config.states.HINT);
      return;
    }

    // Check minimum length
    if (query.length < this.config.minQueryLength) {
      this.currentQuery = query;
      // This case shouldn't happen with minQueryLength = 2, but keep for safety
      this.stateManager.setState(this.config.states.HINT);
      return;
    }

    this.currentQuery = query;

    // Only show loading state if we're not already in searching state
    // This prevents the animation from restarting on each keystroke
    if (!this.stateManager.isState(this.config.states.SEARCHING)) {
      this.stateManager.setState(this.config.states.SEARCHING, { query });
    }

    // Start debounce timer
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this._performSearch(query);
    }, this.config.debounceDelay);
  }

  /**
   * Handle keydown events
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeydown(event) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.clear();
        break;

      case 'Enter':
        // If we have a valid query and are in searching state, search immediately
        if (this.currentQuery.length >= this.config.minQueryLength &&
          this.stateManager.isState(this.config.states.SEARCHING)) {
          event.preventDefault();
          this._cancelDebounce();
          this._performSearch(this.currentQuery);
        }
        break;
    }
  }

  /**
   * Handle focus event
   * @private
   * @param {FocusEvent} event - Focus event
   */
  _handleFocus(event) {
    // Could show search history or suggestions here
    console.log('[SearchDrawer] Search input focused');
  }

  /**
   * Handle blur event
   * @private
   * @param {FocusEvent} event - Blur event
   */
  _handleBlur(event) {
    // Maintain state on blur
    console.log('[SearchDrawer] Search input blurred');
  }

  /**
   * Perform search
   * @private
   * @param {string} query - Search query
   */
  async _performSearch(query) {
    console.log(`[SearchDrawer] Searching for: "${query}"`);

    try {
      // Perform search (state is already set to SEARCHING in _handleInput)
      const results = await this.apiClient.search(query);

      // Handle null results (automatically cancelled search - don't change state)
      if (results === null) {
        console.log('[SearchDrawer] Search was automatically cancelled (new search started)');
        return;
      }

      // Handle results
      if (results && results.hasResults) {
        this.stateManager.setState(this.config.states.RESULTS, {
          results: results,
          query: query
        });
      } else {
        this.stateManager.setState(this.config.states.EMPTY, { query });
      }

    } catch (error) {
      console.error('[SearchDrawer] Search error:', error);
      this.stateManager.setState(this.config.states.ERROR, {
        error: error,
        query: query
      });
    }
  }

  /**
   * Cancel debounce timer
   * @private
   */
  _cancelDebounce() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Perform a search programmatically
   * @param {string} query - Search query
   */
  search(query) {
    if (!this.isInitialized) {
      console.error('[SearchDrawer] Not initialized');
      return;
    }

    if (typeof query === 'string' && query.trim().length >= this.config.minQueryLength) {
      this.currentQuery = query.trim();

      if (this.elements.searchInput) {
        this.elements.searchInput.value = this.currentQuery;
      }

      this._cancelDebounce();
      this._performSearch(this.currentQuery);
    }
  }

  /**
   * Clear search and reset to idle state
   */
  clear() {
    this._cancelDebounce();
    this.currentQuery = '';

    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }

    // Cancel any active API requests
    this.apiClient.cancelActiveRequest();

    this.stateManager.setState(this.config.states.IDLE);
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.stateManager.getCurrentState();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.cacheManager.clear();
    console.log('[SearchDrawer] Cache cleared');
  }

  /**
   * Destroy the search drawer
   */
  destroy() {
    if (!this.isInitialized) return;

    console.log('[SearchDrawer] Destroying...');

    // Cancel any pending operations
    this._cancelDebounce();
    this.apiClient.cancelActiveRequest();

    // Remove event listeners
    if (this.elements.searchInput) {
      this.elements.searchInput.removeEventListener('input', this._handleInput);
      this.elements.searchInput.removeEventListener('keydown', this._handleKeydown);
      this.elements.searchInput.removeEventListener('focus', this._handleFocus);
      this.elements.searchInput.removeEventListener('blur', this._handleBlur);
    }

    // Remove drawer close event listener
    if (this._handleDrawerClosed) {
      document.removeEventListener('drawer:closed', this._handleDrawerClosed);
    }

    // Reset state
    this.isInitialized = false;
    this.currentQuery = '';
    this.elements.searchInput = null;

    console.log('[SearchDrawer] Destroyed');
  }

  /**
   * Set up drawer close event handlers
   * @private
   */
  _setupDrawerCloseHandlers() {
    // Listen for drawer closed event (after animation completes)
    this._handleDrawerClosed = (event) => {
      // Only reset if this is the search drawer
      if (event.detail && event.detail.drawerId === 'multi-drawer') {
        console.log('[SearchDrawer] Drawer closed - performing reset');
        this._resetOnDrawerClose();
      }
    };

    document.addEventListener('drawer:closed', this._handleDrawerClosed);
  }

  /**
   * Reset search state and UI when drawer closes
   * @private
   */
  _resetOnDrawerClose() {
    try {
      // Clear search input
      if (this.elements.searchInput) {
        this.elements.searchInput.value = '';
      }

      // Clear any existing timers
      this._cancelDebounce();

      // Cancel active API requests
      this.apiClient.cancelActiveRequest();

      // Reset state to idle
      this.stateManager.setState(this.config.states.IDLE);

      // Clear UI renderer
      this.uiRenderer.clearResults();

      // Reset current query
      this.currentQuery = '';

      console.log('[SearchDrawer] Reset complete on drawer close');
    } catch (error) {
      console.error('[SearchDrawer] Error during drawer close reset:', error);
    }
  }
}

export default SearchDrawer;