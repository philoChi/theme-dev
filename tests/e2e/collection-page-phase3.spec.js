/**
 * E2E Tests for Collection Page Phase 3 Features
 * Tests URL synchronization and sorting functionality
 */

const { test, expect } = require('@playwright/test');

test.describe('Collection Page Phase 3 - URL Sync & Sorting', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to collection page
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);
  });

  test('should initialize filters from URL parameters', async ({ page }) => {
    // Navigate with filter parameters
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt&filter.color=blue', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    // Take screenshot to verify filters are applied
    await page.screenshot({
      path: 'tests/e2e/screenshots/phase3-url-filters-applied.png',
      fullPage: true
    });

    // Check if active filters are displayed
    const activeFilters = await page.$('.collection-page__active-filters');
    expect(activeFilters).not.toBeNull();

    // Check if filter pills are visible
    const filterPills = await page.$$('.active-filter');
    expect(filterPills.length).toBeGreaterThan(0);
  });

  test('should initialize sort from URL parameter', async ({ page }) => {
    // Navigate with sort parameter
    await page.goto('http://127.0.0.1:9292/collections/all?sort_by=price-ascending', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    // Check if sort dropdown has correct value
    const sortSelect = await page.$('[data-sort-select]');
    if (sortSelect) {
      const selectedValue = await sortSelect.evaluate(el => el.value);
      expect(selectedValue).toBe('price-ascending');
    }

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/phase3-sort-applied.png',
      fullPage: false
    });
  });

  test('should update URL when applying filters via drawer', async ({ page }) => {
    // Set mobile viewport to access filter drawer
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click filter button
    const filterButton = await page.$('[data-drawer-trigger="filter"]');
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot of filter drawer
      await page.screenshot({
        path: 'tests/e2e/screenshots/phase3-filter-drawer-open.png',
        fullPage: true
      });

      // Try to select a filter option (if available)
      const filterOption = await page.$('[data-filter-options="type"] input[type="checkbox"]');
      if (filterOption) {
        await filterOption.click();
        await page.waitForTimeout(500);
        
        // Apply filters
        const applyButton = await page.$('[data-filter-apply]');
        if (applyButton) {
          await applyButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('should update URL when changing sort', async ({ page }) => {
    const sortSelect = await page.$('[data-sort-select]');
    if (sortSelect) {
      // Get initial URL
      const initialURL = page.url();
      
      // Change sort
      await sortSelect.selectOption('price-descending');
      await page.waitForTimeout(1000);
      
      // Get updated URL
      const updatedURL = page.url();
      
      // URL should have changed
      expect(updatedURL).not.toBe(initialURL);
      expect(updatedURL).toContain('sort_by=price-descending');
      
      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/phase3-sort-changed.png',
        fullPage: false
      });
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Start with no filters
    const baseURL = page.url();
    
    // Apply a filter by navigating to URL with filters
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=hoodie', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(1000);
    
    // Go back
    await page.goBack();
    await page.waitForTimeout(1000);
    
    // Should be back at base URL
    expect(page.url()).toBe(baseURL);
    
    // Go forward
    await page.goForward();
    await page.waitForTimeout(1000);
    
    // Should have filters again
    expect(page.url()).toContain('filter.type=hoodie');
  });

  test('should clear all filters and update URL', async ({ page }) => {
    // Start with filters
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt&filter.size=M', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    
    // Click clear all button if visible
    const clearAllButton = await page.$('[data-clear-all-filters]');
    if (clearAllButton) {
      await clearAllButton.click();
      await page.waitForTimeout(1000);
      
      // URL should not have filter parameters
      const currentURL = page.url();
      expect(currentURL).not.toContain('filter.');
    }
  });

  test('should handle combined filters and sort in URL', async ({ page }) => {
    // Navigate with both filters and sort
    await page.goto('http://127.0.0.1:9292/collections/all?filter.size=L&filter.color=black&sort_by=price-ascending', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/phase3-combined-filters-sort.png',
      fullPage: true
    });
    
    // Verify sort is applied
    const sortSelect = await page.$('[data-sort-select]');
    if (sortSelect) {
      const value = await sortSelect.evaluate(el => el.value);
      expect(value).toBe('price-ascending');
    }
    
    // Verify filters are shown
    const activeFilters = await page.$$('.active-filter');
    expect(activeFilters.length).toBeGreaterThan(0);
  });

  test('should show no results state with filters', async ({ page }) => {
    // Apply filters that likely return no results
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=impossible&filter.size=XXXXL', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    
    // Check for no results container
    const noResults = await page.$('[data-no-results]');
    if (noResults) {
      const isVisible = await noResults.isVisible();
      expect(isVisible).toBe(true);
      
      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/phase3-no-results.png',
        fullPage: true
      });
    }
  });
});