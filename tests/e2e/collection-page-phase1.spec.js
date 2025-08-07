/**
 * E2E Tests for Collection Page - Phase 1 Foundation
 * Tests basic collection page structure and rendering
 */

const { test, expect } = require('@playwright/test');

// Collection page URL
const COLLECTION_URL = 'http://127.0.0.1:9292/collections/all-products';

test.describe('Collection Page - Phase 1 Foundation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to collection page with more lenient wait condition
    await page.goto(COLLECTION_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for the collection section to be visible
    await page.waitForSelector('.section-collection-page', { timeout: 10000 });
  });

  test('should load collection page template', async ({ page }) => {
    // Check that collection page section exists
    const collectionSection = await page.locator('.section-collection-page');
    await expect(collectionSection).toBeVisible();
    
    // Verify data attributes
    await expect(collectionSection).toHaveAttribute('data-section-type', 'collection');
  });

  test('should display collection header', async ({ page }) => {
    // Check collection title
    const title = await page.locator('.collection-page__title');
    await expect(title).toBeVisible();
    
    // Check product count if enabled
    const productCount = await page.locator('.collection-page__count');
    const countVisible = await productCount.isVisible();
    
    if (countVisible) {
      const countText = await productCount.textContent();
      expect(countText).toMatch(/\d+ (product|item)/i);
    }
  });

  test('should display toolbar with sort and filter options', async ({ page }) => {
    // Check toolbar exists
    const toolbar = await page.locator('.collection-page__toolbar');
    await expect(toolbar).toBeVisible();
    
    // Check sort dropdown
    const sortSelect = await page.locator('.collection-page__sort-select');
    await expect(sortSelect).toBeVisible();
    
    // Verify sort options
    const sortOptions = await sortSelect.locator('option').allTextContents();
    expect(sortOptions.length).toBeGreaterThanOrEqual(3);
  });

  test('should display product grid', async ({ page }) => {
    // Check grid container
    const grid = await page.locator('.collection-grid[data-product-grid]');
    await expect(grid).toBeVisible();
    
    // Check for product items
    const productItems = await grid.locator('.collection-grid__item');
    const itemCount = await productItems.count();
    expect(itemCount).toBeGreaterThan(0);
    
    // Verify product cards are using the existing snippet
    const firstProduct = await productItems.first().locator('.product-card');
    const hasProductCard = await firstProduct.count() > 0;
    expect(hasProductCard).toBeTruthy();
  });

  test('should integrate with existing product showcase cards', async ({ page }) => {
    // Look for product card structure
    const productCard = await page.locator('.product-card').first();
    await expect(productCard).toBeVisible();
    
    // Check for product data
    await expect(productCard).toHaveAttribute('data-product-id');
    
    // Verify color swatches are present if applicable
    const colorSwatches = await productCard.locator('.product-card__variants');
    const hasColorSwatches = await colorSwatches.count() > 0;
    
    if (hasColorSwatches) {
      await expect(colorSwatches).toBeVisible();
    }
  });

  test('should have responsive grid layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileGrid = await page.locator('.collection-grid');
    await expect(mobileGrid).toBeVisible();
    
    // Check filter trigger on mobile
    const filterTrigger = await page.locator('.collection-page__filter-trigger');
    const isFilterVisible = await filterTrigger.isVisible();
    expect(isFilterVisible).toBeTruthy();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(mobileGrid).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(mobileGrid).toBeVisible();
  });

  test('should handle empty collection state', async ({ page }) => {
    // Navigate to a potentially empty collection
    await page.goto('http://127.0.0.1:9292/collections/empty-collection', { 
      waitUntil: 'networkidle' 
    });
    
    // Check if empty state or products are shown
    const emptyState = await page.locator('.collection-page__empty');
    const productGrid = await page.locator('.collection-grid');
    
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasProducts = await productGrid.isVisible().catch(() => false);
    
    // Either empty state or products should be visible
    expect(hasEmptyState || hasProducts).toBeTruthy();
  });

  test('should load CSS and JavaScript assets', async ({ page }) => {
    // Check CSS bundle is loaded
    const cssLoaded = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      return styles.some(sheet => sheet.href?.includes('section-collection-page-bundle.css'));
    });
    expect(cssLoaded).toBeTruthy();
    
    // Check JavaScript webpack bundle is loaded
    const jsLoaded = await page.evaluate(() => {
      return typeof window.CollectionPageBundle !== 'undefined' && 
             typeof window.collectionPageController !== 'undefined';
    });
    expect(jsLoaded).toBeTruthy();
  });

  test('should have no console errors', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.reload();
    // Use domcontentloaded instead of networkidle for WSL
    await page.waitForLoadState('domcontentloaded');
    
    // Filter out known third-party errors
    const relevantErrors = consoleMessages.filter(msg => 
      !msg.includes('judge.me') && 
      !msg.includes('shopify') &&
      !msg.includes('analytics')
    );
    
    expect(relevantErrors).toHaveLength(0);
  });
});

test.describe('Collection Page - Visual Regression', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should match ${name} layout`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(COLLECTION_URL, { waitUntil: 'domcontentloaded' });
      
      // Wait for the collection section to be visible
      await page.waitForSelector('.section-collection-page', { timeout: 10000 });
      
      // Take screenshot
      await expect(page).toHaveScreenshot(`collection-page-${name}.png`, {
        fullPage: false,
        animations: 'disabled'
      });
    });
  });
});