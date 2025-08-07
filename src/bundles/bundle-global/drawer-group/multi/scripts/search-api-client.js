/**
 * Search API Client
 * 
 * Handles all API communication for search functionality.
 * Manages search requests, caching, and error handling.
 */

import SearchConfig from './search-config.js';

class APIClient {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.config = SearchConfig;
    this.activeRequest = null;
  }

  /**
   * Perform search request
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async search(query) {
    // Cancel any active request
    this.cancelActiveRequest();

    const searchStartTime = Date.now();

    try {
      // Check cache first
      const cachedResult = this.cacheManager.get(query);
      if (cachedResult) {
        await this._ensureMinimumLoadingDuration(searchStartTime);
        return cachedResult;
      }

      // Perform Liquid search
      const results = await this._performLiquidSearch(query);

      // Cache successful results
      if (results) {
        this.cacheManager.set(query, results);
      }

      await this._ensureMinimumLoadingDuration(searchStartTime);
      return results;

    } catch (error) {
      console.error('[APIClient] Search error:', error);
      throw this._enhanceError(error);
    }
  }

  /**
   * Cancel active request if any
   * @param {boolean} isUserInitiated - Whether the cancellation is user-initiated
   */
  cancelActiveRequest(isUserInitiated = false) {
    if (this.activeRequest && this.activeRequest.controller) {
      // Mark whether this is an automatic cancellation (new search) or user-initiated
      this.activeRequest.isUserInitiated = isUserInitiated;
      this.activeRequest.controller.abort();
      this.activeRequest = null;
      console.log('[APIClient] Cancelled active request');
    }
  }

  /**
   * Perform search using Liquid template rendering
   * @private
   * @param {string} query - Search query
   * @returns {Promise<Object>} Search results
   */
  async _performLiquidSearch(query) {
    const searchUrl = this._buildSearchUrl(query);
    console.log(`[APIClient] Searching: ${searchUrl}`);

    // Create abort controller for this request
    const controller = new AbortController();
    this.activeRequest = { controller, query };

    try {
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: controller.signal
      });

      // Clear active request reference
      const wasUserInitiated = this.activeRequest?.isUserInitiated || false;
      this.activeRequest = null;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Validate response
      if (!html || html.trim().length === 0) {
        throw new Error('Empty response from server');
      }

      // Return structured result
      return {
        html: html,
        isLiquidRendered: true,
        hasResults: this._checkHasResults(html),
        query: query,
        timestamp: Date.now()
      };

    } catch (error) {
      // Clear active request reference and check if cancellation was user-initiated
      const wasUserInitiated = this.activeRequest?.isUserInitiated || false;
      this.activeRequest = null;

      // Handle cancellation based on whether it was user-initiated
      if (error.name === 'AbortError') {
        if (wasUserInitiated) {
          throw new Error('Search request was cancelled');
        } else {
          // Silent cancellation for automatic cancellations (new search started)
          // Don't throw an error as this is expected behavior
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Build search URL
   * @private
   * @param {string} query - Search query
   * @returns {string} Search URL
   */
  _buildSearchUrl(query) {
    const params = new URLSearchParams({
      q: query,
      type: 'product',
      view: 'ajax'
    });

    // Add timestamp to prevent caching
    params.append('t', Date.now());

    return `/search?${params.toString()}`;
  }

  /**
   * Check if HTML contains results
   * @private
   * @param {string} html - HTML response
   * @returns {boolean} True if has results
   */
  _checkHasResults(html) {
    // Check for product item indicators
    const hasResults = html.includes('cart-drawer__item') ||
      html.includes('search-result-item') ||
      html.includes('product-item');

    // Also check for empty state indicators
    const isEmpty = html.includes('no-results') ||
      html.includes('empty-state') ||
      html.includes('SearchEmptyState');

    return hasResults && !isEmpty;
  }

  /**
   * Ensure minimum loading duration for better UX
   * @private
   * @param {number} startTime - Start timestamp
   */
  async _ensureMinimumLoadingDuration(startTime) {
    const elapsed = Date.now() - startTime;
    const remaining = this.config.api.minLoadingDuration - elapsed;

    if (remaining > 0) {
      console.log(`[APIClient] Waiting ${remaining}ms for minimum loading duration`);
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
  }

  /**
   * Enhance error with additional context
   * @private
   * @param {Error} error - Original error
   * @returns {Error} Enhanced error
   */
  _enhanceError(error) {
    error.type = error.message.includes('fetch') || error.message.includes('Network') ? 'network' :
      error.message.includes('timeout') || error.name === 'AbortError' ? 'timeout' :
        error.message.includes('HTTP') ? 'http' : 'unknown';
    return error;
  }
}

export default APIClient;