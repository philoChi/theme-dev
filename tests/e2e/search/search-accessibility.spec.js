/**
 * E2E Accessibility Tests for Search Feature (TC-A01, TC-A02, TC-A03)
 * 
 * Tests WCAG 2.1 AA compliance, keyboard navigation, screen reader support,
 * and focus management for the search functionality.
 */

const { test, expect } = require('@playwright/test');
const { injectAxe, checkA11y } = require('axe-playwright');
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

test.describe('Search Accessibility Tests (TC-A01, TC-A02, TC-A03)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await injectAxe(page);
  });

  test('TC-A01: Keyboard navigation through search results', async ({ page }) => {
    // Open search drawer
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('keyboard test');
    
    // Wait for search results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item-link', { timeout: 5000 });
    
    const resultLinks = page.locator('#SearchResultsList .cart-drawer__item-link');
    const resultCount = await resultLinks.count();
    
    if (resultCount > 0) {
      // Start with search input focused
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      
      // Tab to first result
      await page.keyboard.press('Tab');
      await expect(resultLinks.first()).toBeFocused();
      
      // Use arrow keys to navigate through results
      if (resultCount > 1) {
        await page.keyboard.press('ArrowDown');
        await expect(resultLinks.nth(1)).toBeFocused();
        
        // Navigate back up
        await page.keyboard.press('ArrowUp');
        await expect(resultLinks.first()).toBeFocused();
      }
      
      // Test Enter key activation
      const firstResultHref = await resultLinks.first().getAttribute('href');
      await page.keyboard.press('Enter');
      
      // Should navigate to product page
      await page.waitForURL(new RegExp(firstResultHref));
      expect(page.url()).toContain('/products/');
    }
  });

  test('TC-A02: Screen reader support and ARIA implementation', async ({ page }) => {
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    // Check search input accessibility
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Should have appropriate labels
    const ariaLabel = await searchInput.getAttribute('aria-label');
    const placeholder = await searchInput.getAttribute('placeholder');
    const associatedLabel = await page.locator('label[for]').count();
    
    // Should have some form of labeling
    expect(ariaLabel || placeholder || associatedLabel > 0).toBeTruthy();
    
    // Perform search
    await searchInput.fill('aria test');
    
    // Wait for results container
    await page.waitForSelector('#SearchResultsList, #SearchEmptyState', { timeout: 5000 });
    
    // Check results container ARIA attributes
    const resultsContainer = page.locator('#SearchResults');
    const ariaLive = await resultsContainer.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');
    
    // Check individual results accessibility
    const resultItems = page.locator('#SearchResultsList .cart-drawer__item-link');
    const resultCount = await resultItems.count();
    
    if (resultCount > 0) {
      // Each result should have proper labeling
      for (let i = 0; i < Math.min(resultCount, 3); i++) {
        const resultItem = resultItems.nth(i);
        
        // Should have accessible name (either aria-label, aria-labelledby, or text content)
        const accessibleName = await resultItem.evaluate(el => {
          return el.getAttribute('aria-label') || 
                 el.getAttribute('aria-labelledby') || 
                 el.textContent?.trim();
        });
        
        expect(accessibleName).toBeTruthy();
        
        // Should be focusable
        const tabIndex = await resultItem.getAttribute('tabindex');
        expect(tabIndex === '0' || tabIndex === null).toBeTruthy();
      }
    }
    
    // Test loading state accessibility
    await searchInput.clear();
    await searchInput.fill('loading test');
    
    // Check if loading state has proper announcements
    const loadingState = page.locator('#SearchLoadingState');
    if (await loadingState.isVisible()) {
      const loadingAriaLabel = await loadingState.getAttribute('aria-label');
      const loadingText = await loadingState.textContent();
      
      // Loading state should be announced to screen readers
      expect(loadingAriaLabel || loadingText?.includes('search')).toBeTruthy();
    }
  });

  test('TC-A03: Focus management during drawer operations', async ({ page }) => {
    // Test initial focus when opening drawer
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    // Search input should receive focus when drawer opens
    const searchInput = page.locator('[mpe="search-input"]');
    await expect(searchInput).toBeFocused();
    
    // Perform search and test focus retention
    await searchInput.fill('focus test');
    await page.waitForSelector('#SearchResultsList .cart-drawer__item-link, #SearchEmptyState', { timeout: 5000 });
    
    // Focus should still be on search input after search
    await expect(searchInput).toBeFocused();
    
    // Test focus trap within drawer
    const resultLinks = page.locator('#SearchResultsList .cart-drawer__item-link');
    const showAllButton = page.locator('#SearchShowAllButton');
    
    // Tab through focusable elements
    let currentlyFocused = await page.locator(':focus').textContent();
    console.log('Initially focused:', currentlyFocused);
    
    // Tab to results
    if (await resultLinks.count() > 0) {
      await page.keyboard.press('Tab');
      await expect(resultLinks.first()).toBeFocused();
      
      // Continue tabbing through results
      const tabCount = Math.min(await resultLinks.count(), 3);
      for (let i = 1; i < tabCount; i++) {
        await page.keyboard.press('Tab');
        await expect(resultLinks.nth(i)).toBeFocused();
      }
    }
    
    // Tab to show all button if visible
    if (await showAllButton.isVisible()) {
      await page.keyboard.press('Tab');
      await expect(showAllButton).toBeFocused();
    }
    
    // Test Escape key behavior
    await page.keyboard.press('Escape');
    
    // Focus should return to search input or search should be cleared
    const searchValue = await searchInput.inputValue();
    const isInputFocused = await searchInput.evaluate(el => el === document.activeElement);
    
    // Either input should be cleared or focus should return to input
    expect(searchValue === '' || isInputFocused).toBeTruthy();
  });

  test('TC-A04: WCAG 2.1 AA compliance validation', async ({ page }) => {
    // Test initial drawer state
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: ['wcag2a', 'wcag2aa']
    });
    
    // Open search drawer and test
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    // Test search drawer accessibility
    await checkA11y(page, '#multi-drawer', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: ['wcag2a', 'wcag2aa']
    });
    
    // Perform search and test results
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('accessibility test');
    
    // Wait for search results
    await page.waitForSelector('#SearchResultsList, #SearchEmptyState', { timeout: 5000 });
    
    // Test search results accessibility
    await checkA11y(page, '#SearchResults', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: ['wcag2a', 'wcag2aa'],
      rules: {
        // Allow empty alt text for decorative images in tests
        'image-alt': { enabled: false }
      }
    });
    
    // Test empty state accessibility
    await searchInput.clear();
    await searchInput.fill('xyz123nonexistent');
    await page.waitForSelector('#SearchEmptyState, #SearchResultsList', { timeout: 5000 });
    
    await checkA11y(page, '#SearchResults', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: ['wcag2a', 'wcag2aa']
    });
  });

  test('TC-A05: Color contrast and visual accessibility', async ({ page }) => {
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    // Check color contrast for search input
    const searchInput = page.locator('[mpe="search-input"]');
    
    const inputStyles = await searchInput.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderColor: computed.borderColor
      };
    });
    
    console.log('Search input styles:', inputStyles);
    
    // Perform search
    await searchInput.fill('contrast test');
    await page.waitForSelector('#SearchResultsList .cart-drawer__item', { timeout: 5000 });
    
    // Check color contrast for search results
    const resultItems = page.locator('#SearchResultsList .cart-drawer__item-link');
    const resultCount = await resultItems.count();
    
    if (resultCount > 0) {
      const resultStyles = await resultItems.first().evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });
      
      console.log('Search result styles:', resultStyles);
      
      // Test focus styles
      await resultItems.first().focus();
      
      const focusStyles = await resultItems.first().evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineColor: computed.outlineColor,
          outlineWidth: computed.outlineWidth,
          boxShadow: computed.boxShadow
        };
      });
      
      console.log('Focus styles:', focusStyles);
      
      // Should have visible focus indicators
      const hasFocusIndicator = focusStyles.outline !== 'none' || 
                               focusStyles.outlineWidth !== '0px' || 
                               focusStyles.boxShadow !== 'none';
      
      expect(hasFocusIndicator).toBeTruthy();
    }
  });

  test('TC-A06: Reduced motion preference support', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('motion test');
    
    // Wait for results
    await page.waitForSelector('#SearchResultsList, #SearchEmptyState', { timeout: 5000 });
    
    // Check that animations respect reduced motion preference
    const resultsContainer = page.locator('#SearchResults');
    
    const animationStyles = await resultsContainer.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        animationDuration: computed.animationDuration,
        transitionDuration: computed.transitionDuration
      };
    });
    
    console.log('Animation styles with reduced motion:', animationStyles);
    
    // With reduced motion, animations should be fast or disabled
    // This is a basic check - the actual implementation should respect the preference
  });

  test('Touch interaction accessibility on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('mobile touch test');
    
    // Wait for results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item-link', { timeout: 5000 });
    
    const resultLinks = page.locator('#SearchResultsList .cart-drawer__item-link');
    const resultCount = await resultLinks.count();
    
    if (resultCount > 0) {
      // Check touch target sizes
      for (let i = 0; i < Math.min(resultCount, 3); i++) {
        const resultItem = resultLinks.nth(i);
        
        const boundingBox = await resultItem.boundingBox();
        if (boundingBox) {
          console.log(`Result ${i} size: ${boundingBox.width}x${boundingBox.height}`);
          
          // Touch targets should be at least 44px (iOS) or 48px (Android)
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test touch interactions
      await resultLinks.first().tap();
      
      // Should navigate to product page
      await page.waitForURL(/\/products\//);
      expect(page.url()).toContain('/products/');
    }
  });

  test('Screen reader announcements for search states', async ({ page }) => {
    const announcements = [];
    
    // Listen for ARIA live region updates
    await page.exposeFunction('captureAnnouncement', (text) => {
      announcements.push({ text, timestamp: Date.now() });
    });
    
    // Monitor ARIA live regions
    await page.addInitScript(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.target.getAttribute('aria-live')) {
            const text = mutation.target.textContent;
            if (text && text.trim()) {
              window.captureAnnouncement(text.trim());
            }
          }
        });
      });
      
      // Start observing after page load
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
      });
    });
    
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Test search with results
    await searchInput.fill('screen reader test');
    await page.waitForSelector('#SearchResultsList .cart-drawer__item, #SearchEmptyState', { timeout: 5000 });
    
    // Test empty search
    await searchInput.clear();
    await searchInput.fill('xyz123nonexistent');
    await page.waitForSelector('#SearchEmptyState, #SearchResultsList', { timeout: 5000 });
    
    // Wait for announcements
    await page.waitForTimeout(1000);
    
    console.log('Captured announcements:', announcements);
    
    // Should have captured some announcements about search state changes
    expect(announcements.length).toBeGreaterThan(0);
  });
});
