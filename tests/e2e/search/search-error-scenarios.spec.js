/**
 * E2E Error Handling Tests for Search Feature (TC-E01, TC-E02, TC-E03)
 * 
 * Tests network errors, API failures, progressive enhancement,
 * and graceful degradation scenarios for the search functionality.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Read shopify URL or use default
function getShopifyURL() {
  try {
    const urlFile = path.join(__dirname, '../../../working-url.md');
    if (fs.existsSync(urlFile)) {
      const content = fs.readFileSync(urlFile, 'utf8');
      const match = content.match(/http:\/\/[^\s]+/);
      return match ? match[0] : 'http://127.0.0.1:9292';
    }
  } catch (error) {
    console.warn('Could not read working-url.md, using default URL');
  }
  return 'http://127.0.0.1:9292';
}

const BASE_URL = getShopifyURL();

test.describe('Search Error Handling Tests (TC-E01, TC-E02, TC-E03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('TC-E01: Network error handling and retry mechanism', async ({ page }) => {
    // Intercept API requests and simulate network errors
    let requestCount = 0;
    await page.route('**/search/suggest.json*', async (route) => {
      requestCount++;
      if (requestCount <= 2) {
        // Fail first 2 requests
        await route.abort('failed');
      } else {
        // Allow third request to succeed
        await route.continue();
      }
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('network error test');
    
    // Wait for error handling to kick in
    await page.waitForTimeout(2000);
    
    // Should show error state initially
    const errorState = page.locator('#SearchErrorState, .search-error');
    const isErrorVisible = await errorState.count() > 0 ? await errorState.isVisible() : false;
    
    // Should have retry mechanism (button or automatic retry)
    const retryButton = page.locator('[data-search-retry], .retry-button');
    const hasRetryButton = await retryButton.count() > 0;
    
    if (hasRetryButton) {
      await retryButton.click();
      await page.waitForTimeout(1000);
    }
    
    // After retries, should eventually show results or appropriate error message
    await page.waitForSelector('#SearchResultsList, #SearchEmptyState, #SearchErrorState', { timeout: 10000 });
    
    console.log(`Network requests made: ${requestCount}`);
    console.log(`Error state visible: ${isErrorVisible}`);
    console.log(`Retry mechanism available: ${hasRetryButton}`);
    
    // Should handle network errors gracefully
    expect(requestCount).toBeGreaterThan(1); // Should retry at least once
  });

  test('TC-E02: API error responses (4xx, 5xx)', async ({ page }) => {
    // Test different HTTP error codes
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    
    for (const errorCode of errorCodes) {
      console.log(`Testing error code: ${errorCode}`);
      
      // Intercept and return specific error code
      await page.route('**/search/suggest.json*', async (route) => {
        await route.fulfill({
          status: errorCode,
          contentType: 'application/json',
          body: JSON.stringify({
            error: `HTTP ${errorCode} error`,
            message: `Server returned ${errorCode}`
          })
        });
      });

      await page.click('[data-drawer-trigger="search"]');
      await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
      
      const searchInput = page.locator('[mpe="search-input"]');
      await searchInput.clear();
      await searchInput.fill(`error${errorCode} test`);
      
      // Wait for error handling
      await page.waitForTimeout(1500);
      
      // Should handle error gracefully - either show error message or fallback
      const hasErrorHandling = await page.evaluate(() => {
        // Check for error indicators
        const errorElements = document.querySelectorAll('[data-error], .error-message, .search-error');
        const emptyState = document.querySelector('#SearchEmptyState');
        const hasNotification = window.showNotification && window.showNotification.mock;
        
        return errorElements.length > 0 || 
               (emptyState && emptyState.style.display !== 'none') ||
               hasNotification;
      });
      
      console.log(`Error ${errorCode} handled gracefully: ${hasErrorHandling}`);
      
      // Should not crash the interface
      const isSearchStillFunctional = await searchInput.isVisible();
      expect(isSearchStillFunctional).toBe(true);
      
      // Clear the route for next iteration
      await page.unroute('**/search/suggest.json*');
      
      // Small delay between tests
      await page.waitForTimeout(500);
    }
  });

  test('TC-E03: Progressive enhancement - JavaScript disabled fallback', async ({ page }) => {
    // Disable JavaScript to test progressive enhancement
    await page.addInitScript(() => {
      // Simulate JavaScript failure by disabling key functions
      delete window.fetch;
      window.addEventListener = () => {};
      window.Theme = undefined;
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Open search drawer
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    const searchForm = page.locator('[data-search-form], form[action*="search"]');
    
    // Should have a form that can submit without JavaScript
    const hasSearchForm = await searchForm.count() > 0;
    console.log(`Progressive enhancement form available: ${hasSearchForm}`);
    
    if (hasSearchForm) {
      // Fill search input
      await searchInput.fill('progressive enhancement test');
      
      // Should be able to submit form
      const formAction = await searchForm.getAttribute('action');
      const formMethod = await searchForm.getAttribute('method');
      
      console.log(`Form action: ${formAction}`);
      console.log(`Form method: ${formMethod}`);
      
      expect(formAction).toContain('/search');
      expect(formMethod?.toLowerCase()).toBe('get');
      
      // Test form submission
      await searchForm.press('Enter');
      
      // Should navigate to search results page
      await page.waitForURL(/\/search\?/, { timeout: 5000 });
      expect(page.url()).toContain('/search');
      expect(page.url()).toContain('progressive+enhancement+test');
    }
  });

  test('TC-E04: Malformed API responses and JSON parsing errors', async ({ page }) => {
    // Test various malformed responses
    const malformedResponses = [
      { name: 'Invalid JSON', body: '{ invalid json }', contentType: 'application/json' },
      { name: 'Empty response', body: '', contentType: 'application/json' },
      { name: 'HTML instead of JSON', body: '<html><body>Error</body></html>', contentType: 'text/html' },
      { name: 'Partial JSON', body: '{"products":[{"title":"Test"', contentType: 'application/json' },
      { name: 'Wrong structure', body: '{"wrong": "structure"}', contentType: 'application/json' }
    ];
    
    for (const response of malformedResponses) {
      console.log(`Testing malformed response: ${response.name}`);
      
      // Intercept and return malformed response
      await page.route('**/search/suggest.json*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: response.contentType,
          body: response.body
        });
      });

      await page.click('[data-drawer-trigger="search"]');
      await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
      
      const searchInput = page.locator('[mpe="search-input"]');
      await searchInput.clear();
      await searchInput.fill(`malformed ${response.name.toLowerCase()}`);
      
      // Wait for error handling
      await page.waitForTimeout(2000);
      
      // Should handle malformed responses gracefully
      const hasErrorHandling = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('[data-error], .error-message');
        const emptyState = document.querySelector('#SearchEmptyState');
        const defaultState = document.querySelector('#SearchDefaultState');
        
        return errorElements.length > 0 || 
               (emptyState && emptyState.style.display !== 'none') ||
               (defaultState && defaultState.style.display !== 'none');
      });
      
      console.log(`Malformed response handled: ${hasErrorHandling}`);
      
      // Should not crash the search functionality
      const isSearchStillFunctional = await searchInput.isVisible();
      expect(isSearchStillFunctional).toBe(true);
      
      // Clear route for next test
      await page.unroute('**/search/suggest.json*');
      await page.waitForTimeout(300);
    }
  });

  test('TC-E05: Request timeout handling', async ({ page }) => {
    // Simulate slow/timeout responses
    await page.route('**/search/suggest.json*', async (route) => {
      // Delay response beyond reasonable timeout
      await new Promise(resolve => setTimeout(resolve, 10000));
      await route.continue();
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('timeout test');
    
    // Wait for timeout handling (should be much less than 10 seconds)
    await page.waitForTimeout(3000);
    
    // Should handle timeout gracefully
    const hasTimeoutHandling = await page.evaluate(() => {
      const loadingState = document.querySelector('#SearchLoadingState');
      const errorState = document.querySelector('#SearchErrorState');
      const emptyState = document.querySelector('#SearchEmptyState');
      
      // Loading should not be stuck indefinitely
      const isLoadingStuck = loadingState && loadingState.style.display !== 'none';
      
      // Should show error or empty state
      const hasErrorFallback = (errorState && errorState.style.display !== 'none') ||
                              (emptyState && emptyState.style.display !== 'none');
      
      return !isLoadingStuck || hasErrorFallback;
    });
    
    console.log(`Timeout handled gracefully: ${hasTimeoutHandling}`);
    expect(hasTimeoutHandling).toBe(true);
  });

  test('TC-E06: Concurrent request handling', async ({ page }) => {
    let requestCount = 0;
    const requestTimes = [];
    
    // Track concurrent requests
    await page.route('**/search/suggest.json*', async (route) => {
      requestCount++;
      requestTimes.push(Date.now());
      
      // Add delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await route.continue();
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Make multiple rapid searches to test concurrent handling
    const searches = ['conc1', 'conc12', 'conc123', 'conc1234', 'conc12345'];
    
    for (const search of searches) {
      await searchInput.clear();
      await searchInput.fill(search);
      await page.waitForTimeout(100); // Small delay between searches
    }
    
    // Wait for all requests to complete
    await page.waitForTimeout(3000);
    
    console.log(`Total requests made: ${requestCount}`);
    console.log(`Request times:`, requestTimes);
    
    // Should handle concurrent requests properly (debouncing should limit requests)
    expect(requestCount).toBeLessThan(searches.length);
    
    // Final search should show results
    await page.waitForSelector('#SearchResultsList, #SearchEmptyState', { timeout: 2000 });
    
    const finalState = await page.evaluate(() => {
      const resultsList = document.querySelector('#SearchResultsList');
      const emptyState = document.querySelector('#SearchEmptyState');
      
      return {
        hasResults: resultsList && resultsList.style.display !== 'none',
        isEmpty: emptyState && emptyState.style.display !== 'none'
      };
    });
    
    console.log('Final search state:', finalState);
    expect(finalState.hasResults || finalState.isEmpty).toBe(true);
  });

  test('TC-E07: Cache corruption and recovery', async ({ page }) => {
    // First, populate cache with valid data
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('cache test');
    await page.waitForTimeout(1000);
    
    // Corrupt the cache manually
    await page.evaluate(() => {
      // Corrupt localStorage cache
      try {
        localStorage.setItem('search_cache_cache test', 'corrupted data');
        localStorage.setItem('search_cache_metadata', 'invalid json');
      } catch (error) {
        console.log('LocalStorage corruption simulation failed:', error);
      }
    });
    
    // Clear and search again - should handle corrupted cache
    await searchInput.clear();
    await page.waitForTimeout(200);
    await searchInput.fill('cache recovery test');
    
    // Wait for cache recovery
    await page.waitForTimeout(2000);
    
    // Should handle cache corruption gracefully
    const searchStillWorks = await page.evaluate(() => {
      const resultsList = document.querySelector('#SearchResultsList');
      const emptyState = document.querySelector('#SearchEmptyState');
      const defaultState = document.querySelector('#SearchDefaultState');
      
      return (resultsList && resultsList.style.display !== 'none') ||
             (emptyState && emptyState.style.display !== 'none') ||
             (defaultState && defaultState.style.display !== 'none');
    });
    
    console.log(`Search functionality recovered from cache corruption: ${searchStillWorks}`);
    expect(searchStillWorks).toBe(true);
  });

  test('TC-E08: Memory pressure and resource constraints', async ({ page }) => {
    // Simulate memory pressure by making many searches
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Get initial memory usage if available
    const initialMemory = await page.evaluate(() => {
      return window.performance.memory ? window.performance.memory.usedJSHeapSize : 0;
    });
    
    // Make many searches to stress test memory management
    const searchTerms = Array.from({ length: 20 }, (_, i) => `memory${i}`);
    
    for (const term of searchTerms) {
      await searchInput.clear();
      await searchInput.fill(term);
      await page.waitForTimeout(200);
    }
    
    // Wait for all processing to complete
    await page.waitForTimeout(2000);
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return window.performance.memory ? window.performance.memory.usedJSHeapSize : 0;
    });
    
    console.log(`Initial memory: ${initialMemory} bytes`);
    console.log(`Final memory: ${finalMemory} bytes`);
    
    // Memory increase should be reasonable
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory increase: ${memoryIncrease} bytes`);
      
      // Should not leak excessive memory (allow 20MB increase)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    }
    
    // Search should still be functional
    await searchInput.clear();
    await searchInput.fill('final memory test');
    await page.waitForSelector('#SearchResultsList, #SearchEmptyState', { timeout: 5000 });
    
    const isStillFunctional = await searchInput.isVisible();
    expect(isStillFunctional).toBe(true);
  });

  test('Graceful degradation when notifications are unavailable', async ({ page }) => {
    // Disable notification system
    await page.addInitScript(() => {
      delete window.showNotification;
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Simulate error scenario without notifications
    await page.route('**/search/suggest.json*', async (route) => {
      await route.abort('failed');
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('no notification test');
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Should handle errors gracefully even without notification system
    const hasAlternativeErrorDisplay = await page.evaluate(() => {
      const errorStates = document.querySelectorAll('#SearchErrorState, .search-error, .error-message');
      const emptyState = document.querySelector('#SearchEmptyState');
      
      return errorStates.length > 0 || (emptyState && emptyState.style.display !== 'none');
    });
    
    console.log(`Alternative error handling without notifications: ${hasAlternativeErrorDisplay}`);
    expect(hasAlternativeErrorDisplay).toBe(true);
  });

  test('Browser compatibility edge cases', async ({ page }) => {
    // Test with limited browser capabilities
    await page.addInitScript(() => {
      // Simulate older browser without modern features
      delete window.IntersectionObserver;
      delete window.fetch;
      delete window.AbortController;
      
      // Mock reduced localStorage
      const limitedStorage = {
        setItem: () => { throw new Error('QuotaExceededError'); },
        getItem: () => null,
        removeItem: () => {},
        clear: () => {}
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: limitedStorage,
        writable: false
      });
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('compatibility test');
    
    // Should still be functional with reduced capabilities
    await page.waitForTimeout(2000);
    
    const isStillUsable = await page.evaluate(() => {
      const input = document.querySelector('[mpe="search-input"]');
      const container = document.querySelector('#SearchResults');
      
      return input && input.value === 'compatibility test' && container;
    });
    
    console.log(`Search usable with limited browser features: ${isStillUsable}`);
    expect(isStillUsable).toBe(true);
  });
});