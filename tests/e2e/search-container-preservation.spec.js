/**
 * Test Search Container Preservation
 * 
 * Verifies that search functionality preserves the original container structure
 * throughout all search operations without destroying DOM elements.
 */

const { test, expect } = require('@playwright/test');

// Read development URL from config file
const fs = require('fs');
const path = require('path');

// Try to read the working-url.md file
let working-url = 'http://127.0.0.1:9292';
try {
  const shopifyUrlPath = path.join(__dirname, '..', 'working-url.md');
  if (fs.existsSync(shopifyUrlPath)) {
    const content = fs.readFileSync(shopifyUrlPath, 'utf8').trim();
    if (content) {
      working-url = content;
    }
  }
} catch (error) {
  console.log('Using default URL:', working-url);
}

test.describe('Search Container Preservation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto(working-url);
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    
    // Open search drawer
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('#DrawerSearch', { state: 'visible' });
    
    // Wait for search to initialize
    await page.waitForTimeout(500);
  });

  test('should preserve container structure during search operations', async ({ page }) => {
    // Verify initial container structure
    const initialContainers = await page.evaluate(() => {
      return {
        searchResults: !!document.querySelector('#SearchResults'),
        loadingState: !!document.querySelector('#SearchLoadingState'),
        resultsList: !!document.querySelector('#SearchResultsList'),
        emptyState: !!document.querySelector('#SearchEmptyState'),
        defaultState: !!document.querySelector('#SearchDefaultState')
      };
    });
    
    expect(initialContainers.searchResults).toBe(true);
    expect(initialContainers.loadingState).toBe(true);
    expect(initialContainers.resultsList).toBe(true);
    expect(initialContainers.emptyState).toBe(true);
    expect(initialContainers.defaultState).toBe(true);
    
    // Perform a search
    const searchInput = await page.locator('[mpe="search-input"]');
    await searchInput.fill('test');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Check containers are still present after search
    const afterSearchContainers = await page.evaluate(() => {
      return {
        searchResults: !!document.querySelector('#SearchResults'),
        loadingState: !!document.querySelector('#SearchLoadingState'),
        resultsList: !!document.querySelector('#SearchResultsList'),
        emptyState: !!document.querySelector('#SearchEmptyState'),
        defaultState: !!document.querySelector('#SearchDefaultState')
      };
    });
    
    expect(afterSearchContainers.searchResults).toBe(true);
    expect(afterSearchContainers.loadingState).toBe(true);
    expect(afterSearchContainers.resultsList).toBe(true);
    expect(afterSearchContainers.emptyState).toBe(true);
    expect(afterSearchContainers.defaultState).toBe(true);
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    
    // Check containers are still present after clearing
    const afterClearContainers = await page.evaluate(() => {
      return {
        searchResults: !!document.querySelector('#SearchResults'),
        loadingState: !!document.querySelector('#SearchLoadingState'),
        resultsList: !!document.querySelector('#SearchResultsList'),
        emptyState: !!document.querySelector('#SearchEmptyState'),
        defaultState: !!document.querySelector('#SearchDefaultState')
      };
    });
    
    expect(afterClearContainers.searchResults).toBe(true);
    expect(afterClearContainers.loadingState).toBe(true);
    expect(afterClearContainers.resultsList).toBe(true);
    expect(afterClearContainers.emptyState).toBe(true);
    expect(afterClearContainers.defaultState).toBe(true);
  });

  test('should only update content within containers, not replace them', async ({ page }) => {
    // Get initial container references
    const initialContainerIds = await page.evaluate(() => {
      const containers = {
        resultsList: document.querySelector('#SearchResultsList'),
        loadingState: document.querySelector('#SearchLoadingState'),
        emptyState: document.querySelector('#SearchEmptyState'),
        defaultState: document.querySelector('#SearchDefaultState')
      };
      
      // Add unique data attributes to track if containers are replaced
      Object.entries(containers).forEach(([key, el]) => {
        if (el) {
          el.setAttribute('data-test-id', `${key}-${Date.now()}`);
        }
      });
      
      return {
        resultsList: containers.resultsList?.getAttribute('data-test-id'),
        loadingState: containers.loadingState?.getAttribute('data-test-id'),
        emptyState: containers.emptyState?.getAttribute('data-test-id'),
        defaultState: containers.defaultState?.getAttribute('data-test-id')
      };
    });
    
    // Perform search
    const searchInput = await page.locator('[mpe="search-input"]');
    await searchInput.fill('product');
    await page.waitForTimeout(500);
    
    // Check if containers still have the same data-test-id (not replaced)
    const afterSearchIds = await page.evaluate(() => {
      return {
        resultsList: document.querySelector('#SearchResultsList')?.getAttribute('data-test-id'),
        loadingState: document.querySelector('#SearchLoadingState')?.getAttribute('data-test-id'),
        emptyState: document.querySelector('#SearchEmptyState')?.getAttribute('data-test-id'),
        defaultState: document.querySelector('#SearchDefaultState')?.getAttribute('data-test-id')
      };
    });
    
    expect(afterSearchIds.resultsList).toBe(initialContainerIds.resultsList);
    expect(afterSearchIds.loadingState).toBe(initialContainerIds.loadingState);
    expect(afterSearchIds.emptyState).toBe(initialContainerIds.emptyState);
    expect(afterSearchIds.defaultState).toBe(initialContainerIds.defaultState);
  });

  test('should handle multiple consecutive searches without breaking', async ({ page }) => {
    const searchInput = await page.locator('[mpe="search-input"]');
    
    // Perform multiple searches rapidly
    const searches = ['test', 'product', 'item', 'search'];
    
    for (const query of searches) {
      await searchInput.clear();
      await searchInput.fill(query);
      await page.waitForTimeout(400);
      
      // Verify containers exist after each search
      const containers = await page.evaluate(() => {
        return {
          searchResults: !!document.querySelector('#SearchResults'),
          resultsList: !!document.querySelector('#SearchResultsList')
        };
      });
      
      expect(containers.searchResults).toBe(true);
      expect(containers.resultsList).toBe(true);
    }
    
    // Final clear and check
    await searchInput.clear();
    await page.waitForTimeout(300);
    
    const finalContainers = await page.evaluate(() => {
      return {
        searchResults: !!document.querySelector('#SearchResults'),
        loadingState: !!document.querySelector('#SearchLoadingState'),
        resultsList: !!document.querySelector('#SearchResultsList'),
        emptyState: !!document.querySelector('#SearchEmptyState'),
        defaultState: !!document.querySelector('#SearchDefaultState')
      };
    });
    
    expect(finalContainers.searchResults).toBe(true);
    expect(finalContainers.loadingState).toBe(true);
    expect(finalContainers.resultsList).toBe(true);
    expect(finalContainers.emptyState).toBe(true);
    expect(finalContainers.defaultState).toBe(true);
  });

  test('should preserve event listeners and functionality after search', async ({ page }) => {
    // Add test event listener to results container
    await page.evaluate(() => {
      const resultsContainer = document.querySelector('#SearchResults');
      window.testEventFired = false;
      resultsContainer.addEventListener('click', () => {
        window.testEventFired = true;
      });
    });
    
    // Perform search
    const searchInput = await page.locator('[mpe="search-input"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    // Click on results container
    await page.click('#SearchResults');
    
    // Check if event listener still works
    const eventFired = await page.evaluate(() => window.testEventFired);
    expect(eventFired).toBe(true);
  });
});