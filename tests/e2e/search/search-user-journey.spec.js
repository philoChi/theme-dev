/**
 * E2E Tests for Critical User Journey Scenarios (TC-F01, TC-F02, TC-F03)
 * 
 * Tests complete user workflows for the most critical functional requirements:
 * - Real-time search with debounced input (FR-01)
 * - Product navigation to detail pages (FR-02) 
 * - "Show All Results" navigation to search page (FR-03)
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

test.describe('Critical Search User Journey (TC-F01, TC-F02, TC-F03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('TC-F01: Real-time search with debounced input (FR-01)', async ({ page }) => {
    // Open search drawer
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });

    const searchInput = page.locator('[mpe="search-input"]');
    
    // Start tracking network requests
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/search/suggest.json')) {
        apiRequests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    // Type rapidly to test debouncing
    await searchInput.type('s');
    await page.waitForTimeout(100);
    await searchInput.type('h');
    await page.waitForTimeout(100);
    await searchInput.type('o');
    await page.waitForTimeout(100);
    await searchInput.type('e');
    await page.waitForTimeout(100);
    await searchInput.type('s');

    // Wait for debounce period (300ms) plus buffer
    await page.waitForTimeout(500);

    // Should only make one API call due to debouncing
    expect(apiRequests.length).toBeLessThanOrEqual(1);
    
    if (apiRequests.length > 0) {
      expect(apiRequests[0].url).toContain('shoes');
    }

    // Wait for results to appear
    await page.waitForSelector('#SearchResultsList .cart-drawer__item', { timeout: 5000 });
    
    // Verify results are displayed
    const searchResults = page.locator('#SearchResultsList .cart-drawer__item');
    const resultCount = await searchResults.count();
    expect(resultCount).toBeGreaterThan(0);
    expect(resultCount).toBeLessThanOrEqual(10); // Should respect result limits
  });

  test('TC-F02: Product navigation to detail pages (FR-02)', async ({ page }) => {
    // Open search drawer and perform search
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('test product');
    
    // Wait for search results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item-link', { timeout: 5000 });
    
    // Get first product link
    const firstProductLink = page.locator('#SearchResultsList .cart-drawer__item-link').first();
    const productUrl = await firstProductLink.getAttribute('href');
    
    // Verify product URL format
    expect(productUrl).toMatch(/\/products\/.+/);
    
    // Click on product to navigate
    await firstProductLink.click();
    
    // Verify navigation to product page
    await page.waitForURL(new RegExp(productUrl));
    expect(page.url()).toContain('/products/');
    
    // Verify we're on a product page (look for product-specific elements)
    await expect(page.locator('.product-form, .product-title, .product-price')).toBeVisible();
  });

  test('TC-F03: "Show All Results" navigation to search page (FR-03)', async ({ page }) => {
    // Open search drawer and perform search
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    const searchQuery = 'test query';
    await searchInput.fill(searchQuery);
    
    // Wait for search results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item', { timeout: 5000 });
    
    // Find "Show All Results" button
    const showAllButton = page.locator('#SearchShowAllButton');
    await expect(showAllButton).toBeVisible();
    
    // Verify button href is updated with search query
    const buttonHref = await showAllButton.getAttribute('href');
    expect(buttonHref).toContain('/search');
    expect(buttonHref).toContain(encodeURIComponent(searchQuery));
    
    // Click "Show All Results" button
    await showAllButton.click();
    
    // Verify navigation to search results page
    await page.waitForURL(/\/search\?/);
    expect(page.url()).toContain('/search');
    expect(page.url()).toContain(encodeURIComponent(searchQuery));
    
    // Verify we're on search results page with query preserved
    const searchPageInput = page.locator('input[name="q"], .search-input');
    if (await searchPageInput.count() > 0) {
      const searchPageValue = await searchPageInput.inputValue();
      expect(searchPageValue).toBe(searchQuery);
    }
  });

  test('Complete user workflow: search → view product → return to search', async ({ page }) => {
    // Step 1: Open search and search for products
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('shoes');
    
    // Wait for results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item-link', { timeout: 5000 });
    
    // Step 2: Click on first product
    const firstProduct = page.locator('#SearchResultsList .cart-drawer__item-link').first();
    const productTitle = await page.locator('#SearchResultsList .cart-drawer__item-title').first().textContent();
    
    await firstProduct.click();
    await page.waitForURL(/\/products\//);
    
    // Step 3: Verify product page
    expect(page.url()).toContain('/products/');
    
    // Step 4: Return to home/search (simulate user going back)
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Step 5: Open search again and verify it still works
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    // Search should still be functional
    const searchInput2 = page.locator('[mpe="search-input"]');
    await searchInput2.fill('boots');
    await page.waitForSelector('#SearchResultsList .cart-drawer__item', { timeout: 5000 });
    
    const newResults = page.locator('#SearchResultsList .cart-drawer__item');
    expect(await newResults.count()).toBeGreaterThan(0);
  });

  test('Search performance: results appear within reasonable time', async ({ page }) => {
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Measure search response time
    const startTime = Date.now();
    await searchInput.fill('performance test');
    
    // Wait for results or timeout
    await page.waitForSelector('#SearchResultsList .cart-drawer__item, #SearchEmptyState', { timeout: 10000 });
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    // Should get results within reasonable time (including debounce + API + render)
    expect(responseTime).toBeLessThan(3000); // 3 seconds max for E2E
    
    // Log performance for monitoring
    console.log(`Search response time: ${responseTime}ms`);
  });

  test('Search handles empty results gracefully', async ({ page }) => {
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Search for something unlikely to exist
    await searchInput.fill('xyz123nonexistentproduct456');
    
    // Wait for empty state or results
    await page.waitForSelector('#SearchEmptyState, #SearchResultsList', { timeout: 5000 });
    
    // Should show empty state or just no results
    const emptyState = page.locator('#SearchEmptyState');
    const resultsList = page.locator('#SearchResultsList .cart-drawer__item');
    
    const isEmptyVisible = await emptyState.isVisible();
    const resultCount = await resultsList.count();
    
    // Either empty state is shown OR no results in list
    expect(isEmptyVisible || resultCount === 0).toBe(true);
    
    // If empty state is shown, verify it has helpful content
    if (isEmptyVisible) {
      await expect(emptyState).toContainText(/no.*found|try.*different/i);
    }
  });
});
