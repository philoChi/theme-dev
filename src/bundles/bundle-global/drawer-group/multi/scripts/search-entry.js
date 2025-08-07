/**
 * Search Drawer Entry Point
 * 
 * Simple wrapper and entry point for the search drawer functionality.
 * Provides public API and auto-initialization based on data attributes.
 */

import SearchDrawer from './search-drawer.js';

class DrawerSearch {
  constructor() {
    this.instance = null;
  }

  /**
   * Initialize search drawer
   * @returns {boolean} Success status
   */
  init() {
    if (!this.instance) {
      this.instance = new SearchDrawer();
    }
    return this.instance.init();
  }

  /**
   * Search for a query
   * @param {string} query - Search query
   */
  search(query) {
    if (this.instance) {
      this.instance.search(query);
    }
  }

  /**
   * Clear search
   */
  clear() {
    if (this.instance) {
      this.instance.clear();
    }
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.instance ? this.instance.getState() : null;
  }

  /**
   * Get cache stats
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.instance ? this.instance.getCacheStats() : null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    if (this.instance) {
      this.instance.clearCache();
    }
  }

  /**
   * Destroy search drawer
   */
  destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}

// Create global instance
const drawerSearch = new DrawerSearch();

// Auto-initialize when DOM is ready
function autoInitialize() {
  // Check for search drawer data attribute
  const searchElement = document.querySelector('[data-search-drawer]');
  if (searchElement) {
    console.log('[DrawerSearch] Auto-initializing search drawer');
    drawerSearch.init();
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInitialize);
} else {
  autoInitialize();
}

// Export for global access and manual initialization
export default drawerSearch;