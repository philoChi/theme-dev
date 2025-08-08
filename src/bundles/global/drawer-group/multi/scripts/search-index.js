/**
 * Search Bundle Entry Point
 * 
 * Main entry point for webpack compilation of the search functionality.
 * Imports all search modules and sets up global compatibility layer.
 */

import SearchConfig from './search-config.js';
import StateManager from './search-state-manager.js';
import CacheManager from './search-cache-manager.js';
import APIClient from './search-api-client.js';
import UIRenderer from './search-ui-renderer.js';
import SearchDrawer from './search-drawer.js';
import drawerSearch from './search-entry.js';

// Create global namespace for backward compatibility
window.Theme = window.Theme || {};
window.Theme.Search = window.Theme.Search || {};

// Expose classes and config globally for backward compatibility
window.Theme.Search.Config = SearchConfig;
window.Theme.Search.StateManager = StateManager;
window.Theme.Search.CacheManager = CacheManager;
window.Theme.Search.APIClient = APIClient;
window.Theme.Search.UIRenderer = UIRenderer;
window.Theme.Search.SearchDrawer = SearchDrawer;

// Expose the main API globally
window.Theme.DrawerSearch = drawerSearch;

// Log bundle initialization
console.log('[SearchBundle] Search functionality loaded via webpack');

// Export main API as default
export default drawerSearch;