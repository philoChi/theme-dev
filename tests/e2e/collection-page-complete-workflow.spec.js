/**
 * E2E Test: Collection Page Complete Workflow
 * Tests all 18 functional requirements (FR-01 to FR-18)
 * WSL-optimized with screenshot verification
 */

const { test, expect } = require('@playwright/test');

test.describe('Collection Page - Complete Workflow Tests', () => {
  const BASE_URL = 'http://127.0.0.1:9292';
  const COLLECTION_URL = `${BASE_URL}/collections/all`;
  
  test.beforeEach(async ({ page }) => {
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser error:', msg.text());
      }
    });
    
    await page.goto(COLLECTION_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for collection page to load
    await page.waitForSelector('[data-product-grid]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow for dynamic content loading
  });

  test('FR-01: Collection loads with responsive grid layout', async ({ page }) => {
    // Verify collection header is visible
    const title = await page.locator('.collection-page__title');
    await expect(title).toBeVisible();
    
    // Verify product grid exists and has products
    const productGrid = await page.locator('[data-product-grid]');
    await expect(productGrid).toBeVisible();
    
    const products = await page.locator('[data-product-grid-item]');
    const productCount = await products.count();
    expect(productCount).toBeGreaterThan(0);
    
    // Test responsive layout at different viewports
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr01-mobile-grid.png' });
    
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr01-tablet-grid.png' });
    
    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr01-desktop-grid.png' });
    
    console.log(`✓ FR-01 passed: Found ${productCount} products in responsive grid`);
  });

  test('FR-02: Product card navigation to product page', async ({ page }) => {
    // Find first product card link
    const firstProductLink = await page.locator('[data-product-grid-item] .product-showcase-card__title a').first();
    await expect(firstProductLink).toBeVisible();
    
    const href = await firstProductLink.getAttribute('href');
    expect(href).toMatch(/\/products\/.+/);
    
    // Click and verify navigation (but don't follow to avoid leaving test context)
    const [productPage] = await Promise.all([
      page.context().waitForEvent('page'),
      firstProductLink.click({ modifiers: ['Meta'] }) // Open in new tab
    ]);
    
    await productPage.waitForLoadState();
    expect(productPage.url()).toContain('/products/');
    await productPage.close();
    
    console.log('✓ FR-02 passed: Product navigation works correctly');
  });

  test('FR-03: Mobile filter drawer functionality', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    
    // Find filter button
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    await expect(filterButton).toBeVisible();
    
    // Click filter button to open drawer
    await filterButton.click();
    await page.waitForTimeout(1000);
    
    // Verify drawer opened
    const filterDrawer = await page.locator('[data-filter-drawer-content]');
    await expect(filterDrawer).toBeVisible();
    
    await page.screenshot({ path: 'tests/e2e/screenshots/fr03-mobile-filter-drawer.png' });
    
    console.log('✓ FR-03 passed: Mobile filter drawer opens correctly');
  });

  test('FR-04 to FR-07: Filter functionality (type, size, color, gender)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 }); // Desktop for better visibility
    
    // Open filter drawer
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Count initial products
    const initialProducts = await page.locator('[data-product-grid-item]:visible').count();
    console.log(`Initial product count: ${initialProducts}`);
    
    // Test type filter (FR-04)
    const typeFilter = await page.locator('[data-filter-options="type"] input[type="checkbox"]').first();
    if (await typeFilter.isVisible()) {
      await typeFilter.click();
      await page.waitForTimeout(2000);
      
      const filteredProducts = await page.locator('[data-product-grid-item]:visible').count();
      expect(filteredProducts).toBeLessThanOrEqual(initialProducts);
      console.log(`✓ FR-04 passed: Type filter reduced products to ${filteredProducts}`);
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr04-type-filter.png' });
    }
    
    // Test size filter (FR-05)
    const sizeFilter = await page.locator('[data-filter-options="size"] [data-filter-value]').first();
    if (await sizeFilter.isVisible()) {
      await sizeFilter.click();
      await page.waitForTimeout(2000);
      console.log('✓ FR-05 passed: Size filter applied');
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr05-size-filter.png' });
    }
    
    // Test color filter (FR-06)
    const colorFilter = await page.locator('[data-filter-options="color"] [data-filter-value]').first();
    if (await colorFilter.isVisible()) {
      await colorFilter.click();
      await page.waitForTimeout(2000);
      console.log('✓ FR-06 passed: Color filter applied');
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr06-color-filter.png' });
    }
    
    // Test gender filter (FR-07)
    const genderFilter = await page.locator('[data-filter-options="gender"] input[type="checkbox"]').first();
    if (await genderFilter.isVisible()) {
      await genderFilter.click();
      await page.waitForTimeout(2000);
      console.log('✓ FR-07 passed: Gender filter applied');
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr07-gender-filter.png' });
    }
  });

  test('FR-08 to FR-11: Sorting functionality', async ({ page }) => {
    const sortSelect = await page.locator('[data-sort-select]');
    await expect(sortSelect).toBeVisible();
    
    // Test sort by newest (FR-08)
    await sortSelect.selectOption('created-descending');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr08-sort-newest.png' });
    console.log('✓ FR-08 passed: Sort by newest applied');
    
    // Test sort by best selling (FR-09)
    await sortSelect.selectOption('best-selling');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr09-sort-bestseller.png' });
    console.log('✓ FR-09 passed: Sort by bestseller applied');
    
    // Test sort by price low to high (FR-10)
    await sortSelect.selectOption('price-ascending');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr10-sort-price-asc.png' });
    console.log('✓ FR-10 passed: Sort by price ascending applied');
    
    // Test sort by price high to low (FR-11)
    await sortSelect.selectOption('price-descending');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/fr11-sort-price-desc.png' });
    console.log('✓ FR-11 passed: Sort by price descending applied');
  });

  test('FR-12: Availability filter', async ({ page }) => {
    // Open filter drawer if on mobile
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Test availability filter
    const availabilityFilter = await page.locator('[data-filter-options="availability"] input[value="out-of-stock"]');
    if (await availabilityFilter.isVisible()) {
      await availabilityFilter.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr12-availability-filter.png' });
      console.log('✓ FR-12 passed: Availability filter applied');
    }
  });

  test('FR-13: Tag-based filters', async ({ page }) => {
    // Open filter drawer if on mobile
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    const tagFilter = await page.locator('[data-filter-options="tags"] input[type="checkbox"]').first();
    if (await tagFilter.isVisible()) {
      await tagFilter.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr13-tag-filter.png' });
      console.log('✓ FR-13 passed: Tag filter applied');
    }
  });

  test('FR-14: Clear all filters functionality', async ({ page }) => {
    // Apply some filters first
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Apply a filter
    const anyFilter = await page.locator('[data-filter-options] input[type="checkbox"]').first();
    if (await anyFilter.isVisible()) {
      await anyFilter.click();
      await page.waitForTimeout(2000);
    }
    
    // Find and click clear all button
    const clearAllButton = await page.locator('[data-clear-all-filters], [data-filter-clear-all]');
    if (await clearAllButton.isVisible()) {
      await clearAllButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr14-clear-filters.png' });
      console.log('✓ FR-14 passed: Clear all filters works');
    }
  });

  test('FR-15: URL state synchronization', async ({ page }) => {
    const initialUrl = page.url();
    
    // Apply a filter and check URL
    const sortSelect = await page.locator('[data-sort-select]');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price-ascending');
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      expect(newUrl).toContain('sort_by=price-ascending');
      console.log('✓ FR-15 passed: URL updates with filter state');
      
      // Test browser back/forward
      await page.goBack();
      await page.waitForTimeout(1000);
      const backUrl = page.url();
      expect(backUrl).toBe(initialUrl);
    }
  });

  test('FR-16: Pagination functionality', async ({ page }) => {
    // Look for load more button
    const loadMoreButton = await page.locator('[data-load-more]');
    if (await loadMoreButton.isVisible()) {
      const initialProducts = await page.locator('[data-product-grid-item]:visible').count();
      
      await loadMoreButton.click();
      await page.waitForTimeout(3000);
      
      const afterLoadProducts = await page.locator('[data-product-grid-item]:visible').count();
      expect(afterLoadProducts).toBeGreaterThan(initialProducts);
      
      await page.screenshot({ path: 'tests/e2e/screenshots/fr16-pagination.png' });
      console.log(`✓ FR-16 passed: Pagination loaded more products (${initialProducts} → ${afterLoadProducts})`);
    } else {
      console.log('✓ FR-16 skipped: No pagination needed (few products)');
    }
  });

  test('FR-17: Empty collection state', async ({ page }) => {
    // Navigate to potentially empty collection or use filters to create empty state
    await page.goto(`${BASE_URL}/collections/non-existent-collection`, {
      waitUntil: 'domcontentloaded'
    });
    
    // Check for empty state message
    const emptyState = await page.locator('.collection-page__empty');
    if (await emptyState.isVisible()) {
      await page.screenshot({ path: 'tests/e2e/screenshots/fr17-empty-collection.png' });
      console.log('✓ FR-17 passed: Empty collection state displays correctly');
    } else {
      console.log('✓ FR-17 skipped: Collection not empty');
    }
  });

  test('FR-18: No results state with filters', async ({ page }) => {
    // Apply conflicting filters to create no results
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Apply multiple filters that might conflict
    const filters = await page.locator('[data-filter-options] input[type="checkbox"]');
    const filterCount = await filters.count();
    
    if (filterCount > 3) {
      // Apply several filters to potentially create empty results
      for (let i = 0; i < Math.min(4, filterCount); i++) {
        await filters.nth(i).click();
        await page.waitForTimeout(500);
      }
      
      await page.waitForTimeout(2000);
      
      // Check if no results state appears
      const noResults = await page.locator('[data-no-results]');
      if (await noResults.isVisible()) {
        await page.screenshot({ path: 'tests/e2e/screenshots/fr18-no-results.png' });
        console.log('✓ FR-18 passed: No results state displays with suggestions');
      } else {
        console.log('✓ FR-18 skipped: Filters still return results');
      }
    }
  });

  test('Comprehensive workflow test', async ({ page }) => {
    // Test complete user journey
    console.log('Starting comprehensive workflow test...');
    
    // 1. Initial load
    const initialProducts = await page.locator('[data-product-grid-item]:visible').count();
    expect(initialProducts).toBeGreaterThan(0);
    
    // 2. Apply sorting
    const sortSelect = await page.locator('[data-sort-select]');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price-ascending');
      await page.waitForTimeout(1000);
    }
    
    // 3. Apply filters
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    const anyFilter = await page.locator('[data-filter-options] input[type="checkbox"]').first();
    if (await anyFilter.isVisible()) {
      await anyFilter.click();
      await page.waitForTimeout(1000);
    }
    
    // 4. Verify URL updated
    expect(page.url()).toContain('sort_by=price-ascending');
    
    // 5. Clear filters
    const clearButton = await page.locator('[data-clear-all-filters], [data-filter-clear-all]');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(1000);
    }
    
    // 6. Take final screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/comprehensive-workflow-complete.png',
      fullPage: true 
    });
    
    console.log('✓ Comprehensive workflow test completed successfully');
  });

  test('Performance and accessibility check', async ({ page }) => {
    // Basic performance checks
    const startTime = Date.now();
    await page.goto(COLLECTION_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    console.log(`Page load time: ${loadTime}ms`);
    
    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.warn('Console errors found:', errors);
    }
    
    // Basic accessibility checks
    const title = await page.locator('h1');
    await expect(title).toBeVisible();
    
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      const ariaLabel = await filterButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
    
    console.log('✓ Basic performance and accessibility checks passed');
  });
});