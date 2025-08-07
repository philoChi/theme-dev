/**
 * Search Configuration
 * 
 * Central configuration for the drawer search functionality.
 * All search-related constants and settings are defined here.
 */

const SearchConfig = {
  // Debounce settings
  debounceDelay: 500,           // 300ms debounce for search input

  // Search constraints
  minQueryLength: 2,            // Minimum characters to trigger search

  // Display limits
  maxResults: {
    mobile: 8,                  // Max results on mobile devices
    desktop: 10                 // Max results on desktop
  },

  // Cache settings
  cache: {
    enabled: true,             // Enable/disable caching
    ttl: 3600000,              // 1 hour cache TTL in milliseconds
    maxEntries: 50,            // Maximum cache entries before LRU eviction
    storageKey: 'drawer_search_cache'
  },

  // API settings
  api: {
    timeout: 5000,             // 5 second timeout for API requests
    minLoadingDuration: 300    // Minimum loading state visibility
  },

  // UI selectors
  selectors: {
    searchInput: '[mpe="search-input"]',
    searchResults: '#SearchResults',
    loadingState: '#SearchLoadingState',
    hintState: '#SearchHintState',
    emptyState: '#SearchEmptyState',
    defaultState: '#SearchDefaultState',
    resultsList: '#SearchResultsList'
  },

  // Search states enum
  states: {
    IDLE: 'idle',
    TYPING: 'typing',
    HINT: 'hint',
    SEARCHING: 'searching',
    RESULTS: 'results',
    EMPTY: 'empty',
    ERROR: 'error'
  },

  // Viewport breakpoints
  breakpoints: {
    mobile: 768
  },

  // Helper methods
  isMobile() {
    return window.innerWidth <= this.breakpoints.mobile;
  },

  getMaxResults() {
    return this.isMobile() ? this.maxResults.mobile : this.maxResults.desktop;
  }
};

export default SearchConfig;