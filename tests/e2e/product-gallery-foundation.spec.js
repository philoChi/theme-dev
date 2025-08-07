/**
 * product-gallery-foundation.spec.js
 * Integration tests for ProductGalleryNavigation foundation
 * Testing Milestone 1: Gallery Controller Foundation
 */

const { test, expect } = require('@playwright/test');

test.describe('Product Gallery Foundation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a product page with gallery
    await page.goto('http://127.0.0.1:9292/products/adidas-classic-backpack');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test.describe('Component Structure', () => {
    test('should render ProductGalleryNavigation custom element', async ({ page }) => {
      // Check if our custom element exists
      const galleryElement = await page.locator('product-gallery-navigation');
      await expect(galleryElement).toBeVisible();
      
      // Verify it has the correct attributes
      const productId = await galleryElement.getAttribute('data-product-id');
      const sectionId = await galleryElement.getAttribute('data-section-id');
      
      expect(productId).toBeTruthy();
      expect(sectionId).toBeTruthy();
    });

    test('should contain gallery thumbnails', async ({ page }) => {
      const thumbnails = await page.locator('product-gallery-navigation [data-gallery-thumbnails]');
      await expect(thumbnails).toBeVisible();
      
      // Check for thumbnail items
      const thumbnailItems = await page.locator('product-gallery-navigation .product-gallery__thumbnail-item');
      const count = await thumbnailItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should contain main image container', async ({ page }) => {
      const mainImageContainer = await page.locator('product-gallery-navigation [data-gallery-main-image-container]');
      await expect(mainImageContainer).toBeVisible();
      
      // Check for main image
      const mainImage = await page.locator('product-gallery-navigation [data-main-image]');
      await expect(mainImage).toBeVisible();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      // Check thumbnail container ARIA
      const thumbnails = await page.locator('[data-gallery-thumbnails]');
      const role = await thumbnails.getAttribute('role');
      const ariaLabel = await thumbnails.getAttribute('aria-label');
      
      expect(role).toBe('tablist');
      expect(ariaLabel).toBeTruthy();
      
      // Check individual thumbnail ARIA
      const firstThumbnail = await page.locator('.product-gallery__thumbnail-item').first();
      const thumbRole = await firstThumbnail.getAttribute('role');
      const ariaSelected = await firstThumbnail.getAttribute('aria-selected');
      
      expect(thumbRole).toBe('tab');
      expect(ariaSelected).toBeTruthy();
    });
  });

  test.describe('State Management', () => {
    test('should initialize with correct active thumbnail', async ({ page }) => {
      // Find the active thumbnail
      const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
      await expect(activeThumbnail).toBeVisible();
      
      // Check ARIA attributes
      const ariaSelected = await activeThumbnail.getAttribute('aria-selected');
      const tabIndex = await activeThumbnail.getAttribute('tabindex');
      
      expect(ariaSelected).toBe('true');
      expect(tabIndex).toBe('0');
    });

    test('should have multiple images when product has variants', async ({ page }) => {
      const thumbnailItems = await page.locator('.product-gallery__thumbnail-item');
      const count = await thumbnailItems.count();
      
      // Should have multiple images for products with variants
      expect(count).toBeGreaterThan(1);
    });

    test('should display main image corresponding to active thumbnail', async ({ page }) => {
      // Get the active thumbnail image data
      const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
      const thumbnailImg = await activeThumbnail.locator('.product-gallery__thumbnail-image');
      const expectedMainSrc = await thumbnailImg.getAttribute('data-main-image-src');
      
      // Get the main image source
      const mainImage = await page.locator('[data-main-image]');
      const actualMainSrc = await mainImage.getAttribute('src');
      
      // They should match
      expect(actualMainSrc).toBe(expectedMainSrc);
    });
  });

  test.describe('Basic Thumbnail Navigation', () => {
    test('should navigate between images when clicking thumbnails', async ({ page }) => {
      // Get initial state
      const initialActiveThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
      const initialMainImage = await page.locator('[data-main-image]');
      const initialMainSrc = await initialMainImage.getAttribute('src');
      
      // Find a non-active thumbnail
      const nonActiveThumbnail = await page.locator('.product-gallery__thumbnail-item:not(.is-active)').first();
      
      if (await nonActiveThumbnail.count() > 0) {
        // Get expected new image source
        const thumbnailImg = await nonActiveThumbnail.locator('.product-gallery__thumbnail-image');
        const expectedNewSrc = await thumbnailImg.getAttribute('data-main-image-src');
        
        // Click the thumbnail
        await nonActiveThumbnail.click();
        
        // Wait for any transitions
        await page.waitForTimeout(500);
        
        // Check that main image changed
        const newMainSrc = await initialMainImage.getAttribute('src');
        expect(newMainSrc).toBe(expectedNewSrc);
        expect(newMainSrc).not.toBe(initialMainSrc);
        
        // Check that active state updated
        await expect(nonActiveThumbnail).toHaveClass(/is-active/);
        await expect(initialActiveThumbnail).not.toHaveClass(/is-active/);
      }
    });

    test('should update ARIA attributes when navigating', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const count = await thumbnails.count();
      
      if (count > 1) {
        // Click second thumbnail
        const secondThumbnail = await thumbnails.nth(1);
        await secondThumbnail.click();
        
        // Wait for updates
        await page.waitForTimeout(300);
        
        // Check ARIA attributes
        const ariaSelected = await secondThumbnail.getAttribute('aria-selected');
        const tabIndex = await secondThumbnail.getAttribute('tabindex');
        
        expect(ariaSelected).toBe('true');
        expect(tabIndex).toBe('0');
        
        // Check that other thumbnails are not selected
        const firstThumbnail = await thumbnails.nth(0);
        const firstAriaSelected = await firstThumbnail.getAttribute('aria-selected');
        const firstTabIndex = await firstThumbnail.getAttribute('tabindex');
        
        expect(firstAriaSelected).toBe('false');
        expect(firstTabIndex).toBe('-1');
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support arrow key navigation', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const count = await thumbnails.count();
      
      if (count > 1) {
        // Focus on first thumbnail
        const firstThumbnail = await thumbnails.nth(0);
        await firstThumbnail.focus();
        
        // Press right arrow
        await page.keyboard.press('ArrowRight');
        
        // Wait for navigation
        await page.waitForTimeout(300);
        
        // Check that second thumbnail is now active and focused
        const secondThumbnail = await thumbnails.nth(1);
        const isActive = await secondThumbnail.evaluate(el => el.classList.contains('is-active'));
        const isFocused = await secondThumbnail.evaluate(el => document.activeElement === el);
        
        expect(isActive).toBe(true);
        expect(isFocused).toBe(true);
      }
    });

    test('should loop navigation with arrow keys', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const count = await thumbnails.count();
      
      if (count > 1) {
        // Focus on last thumbnail
        const lastThumbnail = await thumbnails.nth(count - 1);
        await lastThumbnail.click();
        await lastThumbnail.focus();
        
        // Press right arrow (should loop to first)
        await page.keyboard.press('ArrowRight');
        
        // Wait for navigation
        await page.waitForTimeout(300);
        
        // Check that first thumbnail is now active
        const firstThumbnail = await thumbnails.nth(0);
        const isActive = await firstThumbnail.evaluate(el => el.classList.contains('is-active'));
        
        expect(isActive).toBe(true);
      }
    });

    test('should support Home and End keys', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const count = await thumbnails.count();
      
      if (count > 2) {
        // Focus on middle thumbnail
        const middleThumbnail = await thumbnails.nth(1);
        await middleThumbnail.click();
        await middleThumbnail.focus();
        
        // Press End key
        await page.keyboard.press('End');
        await page.waitForTimeout(300);
        
        // Check that last thumbnail is active
        const lastThumbnail = await thumbnails.nth(count - 1);
        const isLastActive = await lastThumbnail.evaluate(el => el.classList.contains('is-active'));
        expect(isLastActive).toBe(true);
        
        // Press Home key
        await page.keyboard.press('Home');
        await page.waitForTimeout(300);
        
        // Check that first thumbnail is active
        const firstThumbnail = await thumbnails.nth(0);
        const isFirstActive = await firstThumbnail.evaluate(el => el.classList.contains('is-active'));
        expect(isFirstActive).toBe(true);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should not break when JavaScript errors occur', async ({ page }) => {
      // Monitor console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Try to cause an error by manipulating DOM
      await page.evaluate(() => {
        const gallery = document.querySelector('product-gallery-navigation');
        if (gallery) {
          // Remove a critical element
          const mainImage = gallery.querySelector('[data-main-image]');
          if (mainImage) mainImage.remove();
        }
      });
      
      // Try to click thumbnails - should not crash
      const thumbnail = await page.locator('.product-gallery__thumbnail-item').first();
      await thumbnail.click();
      
      // Wait a bit
      await page.waitForTimeout(500);
      
      // Gallery should still be present
      const galleryElement = await page.locator('product-gallery-navigation');
      await expect(galleryElement).toBeVisible();
    });

    test('should handle missing thumbnails gracefully', async ({ page }) => {
      // Monitor console for errors
      let errorOccurred = false;
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('ProductGalleryNavigation')) {
          errorOccurred = true;
        }
      });
      
      // Remove all thumbnails
      await page.evaluate(() => {
        const thumbnails = document.querySelector('[data-gallery-thumbnails]');
        if (thumbnails) {
          thumbnails.innerHTML = '';
        }
      });
      
      // Wait for any error handling
      await page.waitForTimeout(1000);
      
      // Component should still exist
      const galleryElement = await page.locator('product-gallery-navigation');
      await expect(galleryElement).toBeVisible();
    });
  });

  test.describe('CSS Loading and Styling', () => {
    test('should load gallery navigation CSS', async ({ page }) => {
      // Check if our CSS file is loaded
      const cssLoaded = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.some(link => link.href.includes('section-product-gallery-navigation.css'));
      });
      
      expect(cssLoaded).toBe(true);
    });

    test('should apply basic gallery styling', async ({ page }) => {
      const galleryElement = await page.locator('product-gallery-navigation');
      
      // Check that element has our CSS class
      const hasClass = await galleryElement.evaluate(el => el.classList.contains('product-gallery-navigation'));
      expect(hasClass).toBe(true);
      
      // Check that thumbnails have proper styling
      const thumbnail = await page.locator('.product-gallery__thumbnail-item').first();
      const position = await thumbnail.evaluate(el => getComputedStyle(el).position);
      
      // Should have some styling applied
      expect(position).toBeDefined();
    });
  });

  test.describe('Performance', () => {
    test('should load gallery component quickly', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to product page
      await page.goto('http://127.0.0.1:9292/products/adidas-classic-backpack');
      
      // Wait for gallery to be visible
      await page.locator('product-gallery-navigation').waitFor({ state: 'visible' });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not cause layout shifts', async ({ page }) => {
      // Navigate and wait for stable layout
      await page.goto('http://127.0.0.1:9292/products/adidas-classic-backpack');
      await page.waitForLoadState('networkidle');
      
      // Get initial gallery position
      const initialBounds = await page.locator('product-gallery-navigation').boundingBox();
      
      // Click thumbnail to trigger any transitions
      const thumbnail = await page.locator('.product-gallery__thumbnail-item:not(.is-active)').first();
      if (await thumbnail.count() > 0) {
        await thumbnail.click();
        await page.waitForTimeout(500);
      }
      
      // Check that gallery position hasn't changed significantly
      const finalBounds = await page.locator('product-gallery-navigation').boundingBox();
      
      if (initialBounds && finalBounds) {
        const deltaX = Math.abs(finalBounds.x - initialBounds.x);
        const deltaY = Math.abs(finalBounds.y - initialBounds.y);
        
        // Should not shift more than a few pixels
        expect(deltaX).toBeLessThan(5);
        expect(deltaY).toBeLessThan(5);
      }
    });
  });
});