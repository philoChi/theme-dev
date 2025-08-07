const { test, expect } = require('@playwright/test');

// Check if working-url.md exists and read it, otherwise use default
const fs = require('fs');
const path = require('path');
const shopifyUrlPath = path.join(__dirname, '../working-url.md');
let working-url = 'http://127.0.0.1:9292';

if (fs.existsSync(shopifyUrlPath)) {
  const urlContent = fs.readFileSync(shopifyUrlPath, 'utf8').trim();
  if (urlContent) {
    working-url = urlContent;
  }
}

test.describe('Liquid Search Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(working-url, { waitUntil: 'networkidle' });
  });

  test('should use Liquid rendering for search results', async ({ page }) => {
    // Open search drawer
    await page.click('[mpe="drawer-button"][aria-controls="DrawerSearch"]');
    await page.waitForSelector('#DrawerSearch[data-open="true"]', { timeout: 5000 });

    // Type a search query
    await page.fill('[mpe="search-input"]', 'test');
    
    // Wait for search to complete
    await page.waitForTimeout(500); // Allow for debounce
    
    // Check console logs for Liquid search
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('[DrawerSearch]')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Perform another search to capture logs
    await page.fill('[mpe="search-input"]', 'product');
    await page.waitForTimeout(1000);
    
    // Verify Liquid search was attempted
    const liquidSearchLog = consoleLogs.find(log => log.includes('Liquid search request:'));
    expect(liquidSearchLog).toBeTruthy();
    
    // Check if results are rendered
    const resultsVisible = await page.isVisible('#SearchResultsList');
    if (resultsVisible) {
      // Verify the HTML structure matches our Liquid template
      const resultsHTML = await page.innerHTML('#SearchResults');
      
      // Check for cart-drawer__item structure
      expect(resultsHTML).toContain('cart-drawer__item');
      
      // Check for product links
      const productLinks = await page.$$eval('#SearchResultsList .cart-drawer__item a', links => 
        links.map(link => link.href)
      );
      
      // Verify links are product URLs
      if (productLinks.length > 0) {
        expect(productLinks[0]).toMatch(/\/products\//);
      }
    }
  });

  test('should fallback to API search if Liquid fails', async ({ page }) => {
    // Intercept the Liquid search request and make it fail
    await page.route('**/search?*view=ajax*', route => {
      route.abort('failed');
    });
    
    // Open search drawer
    await page.click('[mpe="drawer-button"][aria-controls="DrawerSearch"]');
    await page.waitForSelector('#DrawerSearch[data-open="true"]', { timeout: 5000 });
    
    // Listen for console logs
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('[DrawerSearch]')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Type a search query
    await page.fill('[mpe="search-input"]', 'test');
    await page.waitForTimeout(1000);
    
    // Verify fallback was used
    const fallbackLog = consoleLogs.find(log => 
      log.includes('Liquid search failed, falling back to API') ||
      log.includes('API request (fallback)')
    );
    expect(fallbackLog).toBeTruthy();
  });

  test('should render empty state with Liquid template', async ({ page }) => {
    // Open search drawer
    await page.click('[mpe="drawer-button"][aria-controls="DrawerSearch"]');
    await page.waitForSelector('#DrawerSearch[data-open="true"]', { timeout: 5000 });
    
    // Search for something that won't return results
    await page.fill('[mpe="search-input"]', 'xyznonexistentproduct123');
    await page.waitForTimeout(1000);
    
    // Check if empty state is shown
    const emptyStateVisible = await page.isVisible('#SearchEmptyState');
    if (emptyStateVisible) {
      const emptyStateText = await page.textContent('#SearchEmptyState');
      expect(emptyStateText).toContain('No products found');
      expect(emptyStateText).toContain('xyznonexistentproduct123');
    }
  });

  test('should handle Show All button in Liquid template', async ({ page }) => {
    // Open search drawer
    await page.click('[mpe="drawer-button"][aria-controls="DrawerSearch"]');
    await page.waitForSelector('#DrawerSearch[data-open="true"]', { timeout: 5000 });
    
    // Search for a common term
    await page.fill('[mpe="search-input"]', 'product');
    await page.waitForTimeout(1000);
    
    // Check if Show All button exists
    const showAllButton = await page.$('#SearchShowAllButton');
    if (showAllButton) {
      const href = await showAllButton.getAttribute('href');
      expect(href).toContain('/search?q=product');
      expect(href).toContain('type=product');
      
      const ariaLabel = await showAllButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('product');
    }
  });
});

test.describe('Liquid Template Endpoints', () => {
  test('should return HTML from ajax endpoint', async ({ page }) => {
    const response = await page.goto(`${working-url}/search?q=test&type=product&view=ajax`);
    
    expect(response.status()).toBe(200);
    
    const html = await response.text();
    
    // Should not contain layout elements
    expect(html).not.toContain('<html');
    expect(html).not.toContain('<body');
    
    // Should contain search results structure
    if (html.includes('SearchResultsList')) {
      expect(html).toContain('drawer__items');
      expect(html).toContain('cart-drawer__item');
    } else {
      // Empty state
      expect(html).toContain('SearchEmptyState');
      expect(html).toContain('No products found');
    }
  });

  test('should return JSON from products endpoint', async ({ page }) => {
    const response = await page.goto(`${working-url}/search?q=test&type=product&view=products`);
    
    expect(response.status()).toBe(200);
    
    const json = await response.json();
    
    // Verify JSON structure
    expect(json).toHaveProperty('results_count');
    expect(json).toHaveProperty('terms');
    expect(json).toHaveProperty('products');
    expect(Array.isArray(json.products)).toBe(true);
    
    // If there are products, verify their structure
    if (json.products.length > 0) {
      const product = json.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('url');
      expect(product).toHaveProperty('html');
      
      // Verify the HTML contains cart item structure
      expect(product.html).toContain('cart-drawer__item');
    }
  });
});