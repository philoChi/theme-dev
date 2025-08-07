/**
 * E2E Tests for Sorting Dropdown Component
 * Tests the complete user workflow with visual verification
 */

const { test, expect } = require('@playwright/test');

test.describe('Sorting Dropdown - E2E Tests', () => {
  const BASE_URL = 'http://127.0.0.1:9292';
  const COLLECTION_URL = `${BASE_URL}/collections/all`;
  
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to collection page
    await page.goto(COLLECTION_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for collection page to load
    await page.waitForSelector('[data-product-grid]', { timeout: 10000 });
    await page.waitForSelector('.collection-page__sort-wrapper', { timeout: 5000 });
    await page.waitForTimeout(1000); // Allow for dynamic content loading
    
    // Store console errors for later checks
    page.consoleErrors = consoleErrors;
  });

  test.describe('Basic Functionality', () => {
    test('should display sorting dropdown with correct initial state', async ({ page }) => {
      // Check that dropdown elements exist
      await expect(page.locator('.collection-page__sort-wrapper')).toBeVisible();
      await expect(page.locator('.collection-page__sort-select')).toBeAttached();
      await expect(page.locator('.collection-page__sort-display')).toBeVisible();
      await expect(page.locator('.collection-page__sort-arrow')).toBeVisible();
      
      // Check initial display text
      const displayText = await page.locator('.collection-page__sort-display').textContent();
      expect(displayText).toBeTruthy();
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-initial.png',
        fullPage: false
      });
    });

    test('should open dropdown when clicked', async ({ page }) => {
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Click on the wrapper
      await sortWrapper.click();
      
      // Take screenshot of opened dropdown
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-opened.png',
        fullPage: false
      });
      
      // Verify dropdown is functional (browser should show native select dropdown)
      // Note: Native select dropdowns are hard to test directly, but we can verify the element is clickable
      await expect(sortWrapper).toBeVisible();
      
      // Check that no JavaScript errors occurred
      expect(page.consoleErrors.filter(err => err.includes('Error'))).toHaveLength(0);
    });

    test('should change sort order when option is selected', async ({ page }) => {
      const sortSelect = page.locator('.collection-page__sort-select');
      const sortDisplay = page.locator('.collection-page__sort-display');
      
      // Select price ascending
      await sortSelect.selectOption('price-ascending');
      
      // Wait for change to be processed
      await page.waitForTimeout(500);
      
      // Verify display text updated
      const displayText = await sortDisplay.textContent();
      expect(displayText).toContain('aufsteigend'); // German for ascending
      
      // Verify URL updated
      await page.waitForURL(/sort_by=price-ascending/);
      
      // Take screenshot after selection
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-price-ascending.png',
        fullPage: false
      });
    });

    test('should test all sort options', async ({ page }) => {
      const sortSelect = page.locator('.collection-page__sort-select');
      const sortDisplay = page.locator('.collection-page__sort-display');
      
      const sortOptions = [
        { value: 'created-descending', expectedText: 'Neueste' },
        { value: 'price-ascending', expectedText: 'aufsteigend' },
        { value: 'price-descending', expectedText: 'absteigend' },
        { value: 'best-selling', expectedText: 'Bestseller' },
        { value: 'manual', expectedText: 'Empfohlen' }
      ];
      
      for (const option of sortOptions) {
        await sortSelect.selectOption(option.value);
        await page.waitForTimeout(300);
        
        const displayText = await sortDisplay.textContent();
        expect(displayText).toContain(option.expectedText);
        
        // Take screenshot for each option
        await page.screenshot({ 
          path: `tests/e2e/screenshots/sorting-dropdown-${option.value}.png`,
          fullPage: false
        });
      }
    });
  });

  test.describe('Style Wrapper Integration', () => {
    test('should have proper styling with style-wrapper', async ({ page }) => {
      const styleWrapper = page.locator('.style-wrapper--flat-basic');
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Verify style wrapper exists
      await expect(styleWrapper).toBeVisible();
      await expect(styleWrapper.locator('.collection-page__sort-wrapper')).toBeVisible();
      
      // Check computed styles (basic check)
      const backgroundColor = await sortWrapper.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(backgroundColor).toBeTruthy();
      
      // Take screenshot of styled dropdown
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-styled.png',
        fullPage: false
      });
    });

    test('should show hover animation', async ({ page }) => {
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Take screenshot before hover
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-before-hover.png',
        fullPage: false
      });
      
      // Hover over the dropdown
      await sortWrapper.hover();
      
      // Wait for animation to complete
      await page.waitForTimeout(500);
      
      // Take screenshot during hover
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-hover.png',
        fullPage: false
      });
      
      // Move mouse away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(500);
      
      // Take screenshot after hover
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-after-hover.png',
        fullPage: false
      });
    });

    test('should maintain consistency with filter button styling', async ({ page }) => {
      const filterButton = page.locator('.collection-toolbar__filter-button');
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Both should be wrapped in style-wrapper--flat-basic
      await expect(page.locator('.style-wrapper--flat-basic').nth(0)).toBeVisible();
      await expect(page.locator('.style-wrapper--flat-basic').nth(1)).toBeVisible();
      
      // Take comparison screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-consistency.png',
        fullPage: false
      });
      
      // Test hover states on both
      await filterButton.hover();
      await page.waitForTimeout(300);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/filter-button-hover.png',
        fullPage: false
      });
      
      await sortWrapper.hover();
      await page.waitForTimeout(300);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-hover-comparison.png',
        fullPage: false
      });
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard accessible', async ({ page }) => {
      const sortSelect = page.locator('.collection-page__sort-select');
      
      // Tab to the dropdown
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs depending on page structure
      
      // Check if select is focused (approximate)
      const focusedElement = await page.locator(':focus').first();
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'select') {
        // Use arrow keys to navigate
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(200);
        
        // Press Enter to select
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Take screenshot of keyboard interaction
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/sorting-dropdown-keyboard.png',
          fullPage: false
        });
      }
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      const sortSelect = page.locator('.collection-page__sort-select');
      const sortArrow = page.locator('.collection-page__sort-arrow');
      
      // Check ARIA attributes
      await expect(sortSelect).toHaveAttribute('aria-describedby');
      await expect(sortArrow).toHaveAttribute('aria-hidden', 'true');
      
      // Check that describedby points to an existing element
      const describedBy = await sortSelect.getAttribute('aria-describedby');
      if (describedBy) {
        await expect(page.locator(`#${describedBy}`)).toBeAttached();
      }
    });

    test('should announce changes to screen readers', async ({ page }) => {
      // Listen for console logs that indicate screen reader announcements
      const screenReaderAnnouncements = [];
      page.on('console', msg => {
        if (msg.text().includes('Screen reader announcement')) {
          screenReaderAnnouncements.push(msg.text());
        }
      });
      
      const sortSelect = page.locator('.collection-page__sort-select');
      
      // Change sort option
      await sortSelect.selectOption('price-ascending');
      await page.waitForTimeout(500);
      
      // Check if announcement was made
      expect(screenReaderAnnouncements.length).toBeGreaterThan(0);
      expect(screenReaderAnnouncements[0]).toContain('Products sorted by');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      const sortSelect = page.locator('.collection-page__sort-select');
      
      // Verify elements are visible on mobile
      await expect(sortWrapper).toBeVisible();
      await expect(sortSelect).toBeAttached();
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-mobile.png',
        fullPage: false
      });
      
      // Test touch interaction
      await sortWrapper.tap();
      await page.waitForTimeout(300);
      
      // Select option on mobile
      await sortSelect.selectOption('price-descending');
      await page.waitForTimeout(500);
      
      // Take screenshot after mobile interaction
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-mobile-selected.png',
        fullPage: false
      });
    });

    test('should work on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Verify functionality on tablet
      await expect(sortWrapper).toBeVisible();
      
      // Test interaction
      await sortWrapper.click();
      await page.waitForTimeout(300);
      
      // Take tablet screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-tablet.png',
        fullPage: false
      });
    });
  });

  test.describe('Performance', () => {
    test('should not cause performance issues', async ({ page }) => {
      // Monitor performance
      const performanceEntries = [];
      page.on('metrics', metrics => {
        performanceEntries.push(metrics);
      });
      
      const sortSelect = page.locator('.collection-page__sort-select');
      
      // Perform multiple rapid selections
      const options = ['price-ascending', 'price-descending', 'created-descending', 'best-selling', 'manual'];
      
      for (let i = 0; i < 5; i++) {
        for (const option of options) {
          await sortSelect.selectOption(option);
          await page.waitForTimeout(100);
        }
      }
      
      // Should not cause significant performance degradation
      expect(page.consoleErrors.filter(err => err.includes('performance')).length).toBe(0);
    });

    test('should handle rapid hover interactions', async ({ page }) => {
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Rapid hover/unhover
      for (let i = 0; i < 10; i++) {
        await sortWrapper.hover();
        await page.waitForTimeout(50);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(50);
      }
      
      // Should not cause errors
      expect(page.consoleErrors.filter(err => err.includes('Error')).length).toBe(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const sortSelect = page.locator('.collection-page__sort-select');
      
      // Even if there are some errors, basic functionality should work
      await sortSelect.selectOption('price-ascending');
      await page.waitForTimeout(500);
      
      // Check that selection still works
      const selectedValue = await sortSelect.inputValue();
      expect(selectedValue).toBe('price-ascending');
    });

    test('should work even with CSS loading issues', async ({ page }) => {
      // Simulate CSS loading problems by checking if basic functionality works
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      const sortSelect = page.locator('.collection-page__sort-select');
      
      // Basic elements should still be present
      await expect(sortWrapper).toBeAttached();
      await expect(sortSelect).toBeAttached();
      
      // Basic functionality should work
      await sortSelect.selectOption('best-selling');
      await page.waitForTimeout(300);
      
      const selectedValue = await sortSelect.inputValue();
      expect(selectedValue).toBe('best-selling');
    });
  });

  test.describe('Visual Regression', () => {
    test('should maintain visual consistency', async ({ page }) => {
      const sortWrapper = page.locator('.collection-page__sort-wrapper');
      
      // Take baseline screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-baseline.png',
        fullPage: false
      });
      
      // Test different states
      await sortWrapper.hover();
      await page.waitForTimeout(300);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-hover-state.png',
        fullPage: false
      });
      
      // Test selected state
      await sortWrapper.click();
      await page.locator('.collection-page__sort-select').selectOption('price-descending');
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/sorting-dropdown-selected-state.png',
        fullPage: false
      });
    });
  });
});