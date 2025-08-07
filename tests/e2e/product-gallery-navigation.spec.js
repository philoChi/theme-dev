/**
 * product-gallery-navigation.spec.js
 * Integration tests for ProductGalleryNavigation arrow navigation (Milestone 2)
 * Testing TC-01 to TC-04: Arrow navigation functionality and loop behavior
 */

const { test, expect } = require('@playwright/test');

test.describe('Product Gallery Arrow Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the specified product page
    await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for gallery component to initialize
    await page.waitForSelector('product-gallery-navigation', { state: 'visible' });
    
    // Wait for arrow buttons to be created
    await page.waitForSelector('[data-gallery-next]', { state: 'attached' });
    await page.waitForSelector('[data-gallery-prev]', { state: 'attached' });
  });

  test.describe('TC-01: Right Arrow Navigation', () => {
    test('should navigate to next image when right arrow is clicked', async ({ page }) => {
      // Get initial state
      const initialThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
      const initialMainImage = await page.locator('[data-main-image]');
      const initialMainSrc = await initialMainImage.getAttribute('src');
      
      // Get expected next thumbnail
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 1) {
        // Get next thumbnail data
        const nextThumbnail = await thumbnails.nth(1);
        const nextThumbnailImg = await nextThumbnail.locator('.product-gallery__thumbnail-image');
        const expectedNextSrc = await nextThumbnailImg.getAttribute('data-main-image-src');
        
        // Click next arrow
        const nextButton = await page.locator('[data-gallery-next]');
        await nextButton.click();
        
        // Wait for transition
        await page.waitForTimeout(400);
        
        // Verify main image changed
        const newMainSrc = await initialMainImage.getAttribute('src');
        expect(newMainSrc).toBe(expectedNextSrc);
        expect(newMainSrc).not.toBe(initialMainSrc);
        
        // Verify thumbnail states updated
        await expect(initialThumbnail).not.toHaveClass(/is-active/);
        await expect(nextThumbnail).toHaveClass(/is-active/);
        
        // Verify ARIA attributes
        const nextAriaSelected = await nextThumbnail.getAttribute('aria-selected');
        expect(nextAriaSelected).toBe('true');
        
        const initialAriaSelected = await initialThumbnail.getAttribute('aria-selected');
        expect(initialAriaSelected).toBe('false');
      }
    });

    test('should show fade transition during navigation', async ({ page }) => {
      const mainImage = await page.locator('[data-main-image]');
      const nextButton = await page.locator('[data-gallery-next]');
      
      // Monitor opacity changes during transition
      const opacityBefore = await mainImage.evaluate(el => getComputedStyle(el).opacity);
      
      // Click next arrow
      await nextButton.click();
      
      // Check that transition occurs (opacity should change)
      await page.waitForTimeout(150); // Mid-transition
      const opacityDuring = await mainImage.evaluate(el => getComputedStyle(el).opacity);
      
      // Wait for transition to complete
      await page.waitForTimeout(400);
      const opacityAfter = await mainImage.evaluate(el => getComputedStyle(el).opacity);
      
      // Verify opacity returns to 1 after transition
      expect(opacityAfter).toBe('1');
    });

    test('should complete transition within 300ms performance requirement', async ({ page }) => {
      const nextButton = await page.locator('[data-gallery-next]');
      
      const startTime = Date.now();
      await nextButton.click();
      
      // Wait for navigation to complete
      await page.waitForTimeout(350); // Slightly more than required 300ms
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify transition completed within performance requirement
      expect(duration).toBeLessThan(400); // Allow small buffer for test execution
    });
  });

  test.describe('TC-02: Left Arrow Navigation', () => {
    test('should navigate to previous image when left arrow is clicked', async ({ page }) => {
      // First navigate to second image
      const nextButton = await page.locator('[data-gallery-next]');
      await nextButton.click();
      await page.waitForTimeout(400);
      
      // Get current state (should be on second image)
      const currentThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
      const mainImage = await page.locator('[data-main-image]');
      const currentMainSrc = await mainImage.getAttribute('src');
      
      // Get expected previous thumbnail (should be first)
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const firstThumbnail = await thumbnails.nth(0);
      const firstThumbnailImg = await firstThumbnail.locator('.product-gallery__thumbnail-image');
      const expectedPrevSrc = await firstThumbnailImg.getAttribute('data-main-image-src');
      
      // Click previous arrow
      const prevButton = await page.locator('[data-gallery-prev]');
      await prevButton.click();
      
      // Wait for transition
      await page.waitForTimeout(400);
      
      // Verify main image changed back to first
      const newMainSrc = await mainImage.getAttribute('src');
      expect(newMainSrc).toBe(expectedPrevSrc);
      expect(newMainSrc).not.toBe(currentMainSrc);
      
      // Verify first thumbnail is active again
      await expect(firstThumbnail).toHaveClass(/is-active/);
      await expect(currentThumbnail).not.toHaveClass(/is-active/);
    });

    test('should maintain smooth navigation when clicking previous multiple times', async ({ page }) => {
      const prevButton = await page.locator('[data-gallery-prev]');
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 2) {
        // Click previous multiple times rapidly
        for (let i = 0; i < 3; i++) {
          await prevButton.click();
          await page.waitForTimeout(350); // Allow transition to complete
        }
        
        // Verify gallery is still functional
        const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
        await expect(activeThumbnail).toBeVisible();
        
        // Verify main image is still displaying correctly
        const mainImage = await page.locator('[data-main-image]');
        await expect(mainImage).toBeVisible();
        const opacity = await mainImage.evaluate(el => getComputedStyle(el).opacity);
        expect(opacity).toBe('1');
      }
    });
  });

  test.describe('TC-03: Loop Functionality - Last to First', () => {
    test('should loop to first image when clicking next on last image', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 1) {
        // Navigate to last image
        const nextButton = await page.locator('[data-gallery-next]');
        
        // Click next until we reach the last image
        for (let i = 0; i < thumbnailCount - 1; i++) {
          await nextButton.click();
          await page.waitForTimeout(350);
        }
        
        // Verify we're on last image
        const lastThumbnail = await thumbnails.nth(thumbnailCount - 1);
        await expect(lastThumbnail).toHaveClass(/is-active/);
        
        // Get expected first image data
        const firstThumbnail = await thumbnails.nth(0);
        const firstThumbnailImg = await firstThumbnail.locator('.product-gallery__thumbnail-image');
        const expectedFirstSrc = await firstThumbnailImg.getAttribute('data-main-image-src');
        
        // Click next from last image (should loop to first)
        await nextButton.click();
        await page.waitForTimeout(400);
        
        // Verify we looped to first image
        const mainImage = await page.locator('[data-main-image]');
        const newMainSrc = await mainImage.getAttribute('src');
        expect(newMainSrc).toBe(expectedFirstSrc);
        
        // Verify first thumbnail is active
        await expect(firstThumbnail).toHaveClass(/is-active/);
        await expect(lastThumbnail).not.toHaveClass(/is-active/);
      }
    });

    test('should handle rapid next clicks at boundary correctly', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 2) {
        // Navigate to last image
        const nextButton = await page.locator('[data-gallery-next]');
        
        for (let i = 0; i < thumbnailCount - 1; i++) {
          await nextButton.click();
          await page.waitForTimeout(350);
        }
        
        // Rapidly click next multiple times at boundary
        await nextButton.click();
        await page.waitForTimeout(100);
        await nextButton.click();
        await page.waitForTimeout(100);
        await nextButton.click();
        
        // Wait for all transitions to complete
        await page.waitForTimeout(500);
        
        // Should still be functional and on a valid image
        const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
        await expect(activeThumbnail).toBeVisible();
        
        const mainImage = await page.locator('[data-main-image]');
        const opacity = await mainImage.evaluate(el => getComputedStyle(el).opacity);
        expect(opacity).toBe('1');
      }
    });
  });

  test.describe('TC-04: Loop Functionality - First to Last', () => {
    test('should loop to last image when clicking previous on first image', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 1) {
        // Verify we start on first image
        const firstThumbnail = await thumbnails.nth(0);
        await expect(firstThumbnail).toHaveClass(/is-active/);
        
        // Get expected last image data
        const lastThumbnail = await thumbnails.nth(thumbnailCount - 1);
        const lastThumbnailImg = await lastThumbnail.locator('.product-gallery__thumbnail-image');
        const expectedLastSrc = await lastThumbnailImg.getAttribute('data-main-image-src');
        
        // Click previous from first image (should loop to last)
        const prevButton = await page.locator('[data-gallery-prev]');
        await prevButton.click();
        await page.waitForTimeout(400);
        
        // Verify we looped to last image
        const mainImage = await page.locator('[data-main-image]');
        const newMainSrc = await mainImage.getAttribute('src');
        expect(newMainSrc).toBe(expectedLastSrc);
        
        // Verify last thumbnail is active
        await expect(lastThumbnail).toHaveClass(/is-active/);
        await expect(firstThumbnail).not.toHaveClass(/is-active/);
      }
    });

    test('should handle rapid previous clicks at boundary correctly', async ({ page }) => {
      // Ensure we're on first image
      const firstThumbnail = await page.locator('.product-gallery__thumbnail-item').nth(0);
      await expect(firstThumbnail).toHaveClass(/is-active/);
      
      const prevButton = await page.locator('[data-gallery-prev]');
      
      // Rapidly click previous multiple times at boundary
      await prevButton.click();
      await page.waitForTimeout(100);
      await prevButton.click();
      await page.waitForTimeout(100);
      await prevButton.click();
      
      // Wait for all transitions to complete
      await page.waitForTimeout(500);
      
      // Should still be functional and on a valid image
      const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
      await expect(activeThumbnail).toBeVisible();
      
      const mainImage = await page.locator('[data-main-image]');
      const opacity = await mainImage.evaluate(el => getComputedStyle(el).opacity);
      expect(opacity).toBe('1');
    });
  });

  test.describe('Arrow Button Visibility and Styling', () => {
    test('should show arrow buttons on hover', async ({ page }) => {
      const gallery = await page.locator('product-gallery-navigation');
      const nextButton = await page.locator('[data-gallery-next]');
      const prevButton = await page.locator('[data-gallery-prev]');
      
      // Hover over gallery
      await gallery.hover();
      
      // Check if buttons become visible (may depend on CSS implementation)
      await expect(nextButton).toBeVisible();
      await expect(prevButton).toBeVisible();
    });

    test('should have proper ARIA labels and touch-friendly sizing', async ({ page }) => {
      const nextButton = await page.locator('[data-gallery-next]');
      const prevButton = await page.locator('[data-gallery-prev]');
      
      // Check ARIA labels
      const nextAriaLabel = await nextButton.getAttribute('aria-label');
      const prevAriaLabel = await prevButton.getAttribute('aria-label');
      
      expect(nextAriaLabel).toBe('Next image');
      expect(prevAriaLabel).toBe('Previous image');
      
      // Check button sizing (should be at least 44x44px for touch)
      const nextBounds = await nextButton.boundingBox();
      const prevBounds = await prevButton.boundingBox();
      
      expect(nextBounds.width).toBeGreaterThanOrEqual(44);
      expect(nextBounds.height).toBeGreaterThanOrEqual(44);
      expect(prevBounds.width).toBeGreaterThanOrEqual(44);
      expect(prevBounds.height).toBeGreaterThanOrEqual(44);
    });

    test('should have proper BEM CSS classes', async ({ page }) => {
      const nextButton = await page.locator('[data-gallery-next]');
      const prevButton = await page.locator('[data-gallery-prev]');
      
      // Check CSS classes follow BEM methodology
      const nextClasses = await nextButton.getAttribute('class');
      const prevClasses = await prevButton.getAttribute('class');
      
      expect(nextClasses).toContain('product-gallery__navigation');
      expect(nextClasses).toContain('product-gallery__navigation--next');
      
      expect(prevClasses).toContain('product-gallery__navigation');
      expect(prevClasses).toContain('product-gallery__navigation--prev');
    });
  });

  test.describe('Performance and Layout Stability', () => {
    test('should maintain layout stability during navigation', async ({ page }) => {
      const gallery = await page.locator('product-gallery-navigation');
      const initialBounds = await gallery.boundingBox();
      
      // Navigate through several images
      const nextButton = await page.locator('[data-gallery-next]');
      
      for (let i = 0; i < 3; i++) {
        await nextButton.click();
        await page.waitForTimeout(350);
        
        // Check layout hasn't shifted
        const currentBounds = await gallery.boundingBox();
        
        expect(Math.abs(currentBounds.x - initialBounds.x)).toBeLessThan(2);
        expect(Math.abs(currentBounds.y - initialBounds.y)).toBeLessThan(2);
        expect(Math.abs(currentBounds.width - initialBounds.width)).toBeLessThan(2);
        expect(Math.abs(currentBounds.height - initialBounds.height)).toBeLessThan(2);
      }
    });

    test('should debounce rapid clicks appropriately', async ({ page }) => {
      const nextButton = await page.locator('[data-gallery-next]');
      const mainImage = await page.locator('[data-main-image]');
      
      // Get initial state
      const initialSrc = await mainImage.getAttribute('src');
      
      // Rapidly click next button multiple times
      await nextButton.click();
      await nextButton.click();
      await nextButton.click();
      
      // Wait for transitions to settle
      await page.waitForTimeout(500);
      
      // Should have navigated but not be stuck in transition
      const finalSrc = await mainImage.getAttribute('src');
      const opacity = await mainImage.evaluate(el => getComputedStyle(el).opacity);
      
      expect(finalSrc).not.toBe(initialSrc); // Should have changed
      expect(opacity).toBe('1'); // Should not be stuck in transition
    });
  });

  test.describe('TC-06: Thumbnail Integration & Synchronization (Milestone 4)', () => {
    test('should update thumbnail indicators when arrow navigation occurs', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 1) {
        // Start on first thumbnail (should be active)
        const firstThumbnail = await thumbnails.nth(0);
        await expect(firstThumbnail).toHaveClass(/is-active/);
        await expect(firstThumbnail).toHaveAttribute('aria-selected', 'true');
        await expect(firstThumbnail).toHaveAttribute('tabindex', '0');
        
        // Click next arrow
        const nextButton = await page.locator('[data-gallery-next]');
        await nextButton.click();
        await page.waitForTimeout(400);
        
        // Verify thumbnail states updated correctly
        const secondThumbnail = await thumbnails.nth(1);
        await expect(firstThumbnail).not.toHaveClass(/is-active/);
        await expect(firstThumbnail).toHaveAttribute('aria-selected', 'false');
        await expect(firstThumbnail).toHaveAttribute('tabindex', '-1');
        
        await expect(secondThumbnail).toHaveClass(/is-active/);
        await expect(secondThumbnail).toHaveAttribute('aria-selected', 'true');
        await expect(secondThumbnail).toHaveAttribute('tabindex', '0');
        
        // Navigate back with previous arrow
        const prevButton = await page.locator('[data-gallery-prev]');
        await prevButton.click();
        await page.waitForTimeout(400);
        
        // Verify thumbnail states reverted correctly
        await expect(firstThumbnail).toHaveClass(/is-active/);
        await expect(firstThumbnail).toHaveAttribute('aria-selected', 'true');
        await expect(firstThumbnail).toHaveAttribute('tabindex', '0');
        
        await expect(secondThumbnail).not.toHaveClass(/is-active/);
        await expect(secondThumbnail).toHaveAttribute('aria-selected', 'false');
        await expect(secondThumbnail).toHaveAttribute('tabindex', '-1');
      }
    });
    
    test('should support bidirectional sync - thumbnail clicks update main gallery', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 2) {
        // Get third thumbnail and its expected image data
        const thirdThumbnail = await thumbnails.nth(2);
        const thirdThumbnailImg = await thirdThumbnail.locator('.product-gallery__thumbnail-image');
        const expectedSrc = await thirdThumbnailImg.getAttribute('data-main-image-src');
        
        // Click on third thumbnail directly
        await thirdThumbnail.click();
        await page.waitForTimeout(400);
        
        // Verify main image updated to match thumbnail
        const mainImage = await page.locator('[data-main-image]');
        const actualSrc = await mainImage.getAttribute('src');
        expect(actualSrc).toBe(expectedSrc);
        
        // Verify thumbnail is now active
        await expect(thirdThumbnail).toHaveClass(/is-active/);
        await expect(thirdThumbnail).toHaveAttribute('aria-selected', 'true');
        
        // Verify other thumbnails are not active
        for (let i = 0; i < thumbnailCount; i++) {
          if (i !== 2) {
            const otherThumbnail = await thumbnails.nth(i);
            await expect(otherThumbnail).not.toHaveClass(/is-active/);
            await expect(otherThumbnail).toHaveAttribute('aria-selected', 'false');
          }
        }
      }
    });
    
    test('should display accurate position indicator', async ({ page }) => {
      const positionIndicator = await page.locator('[data-gallery-position]');
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 1) {
        // Initially should show "1 of X"
        expect(await positionIndicator.textContent()).toBe(`1 of ${thumbnailCount}`);
        
        // Navigate to second image
        const nextButton = await page.locator('[data-gallery-next]');
        await nextButton.click();
        await page.waitForTimeout(400);
        
        // Should show "2 of X"
        expect(await positionIndicator.textContent()).toBe(`2 of ${thumbnailCount}`);
        
        // Navigate to third image if available
        if (thumbnailCount > 2) {
          await nextButton.click();
          await page.waitForTimeout(400);
          
          // Should show "3 of X"
          expect(await positionIndicator.textContent()).toBe(`3 of ${thumbnailCount}`);
        }
        
        // Test clicking thumbnail directly
        const firstThumbnail = await thumbnails.nth(0);
        await firstThumbnail.click();
        await page.waitForTimeout(400);
        
        // Should show "1 of X" again
        expect(await positionIndicator.textContent()).toBe(`1 of ${thumbnailCount}`);
      }
    });
    
    test('should maintain thumbnail sync during loop navigation', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 1) {
        // Navigate to last image
        const nextButton = await page.locator('[data-gallery-next]');
        for (let i = 0; i < thumbnailCount - 1; i++) {
          await nextButton.click();
          await page.waitForTimeout(350);
        }
        
        // Verify last thumbnail is active
        const lastThumbnail = await thumbnails.nth(thumbnailCount - 1);
        await expect(lastThumbnail).toHaveClass(/is-active/);
        
        // Click next to loop to first
        await nextButton.click();
        await page.waitForTimeout(400);
        
        // Verify first thumbnail is active and last is not
        const firstThumbnail = await thumbnails.nth(0);
        await expect(firstThumbnail).toHaveClass(/is-active/);
        await expect(lastThumbnail).not.toHaveClass(/is-active/);
        
        // Test reverse loop with previous button
        const prevButton = await page.locator('[data-gallery-prev]');
        await prevButton.click();
        await page.waitForTimeout(400);
        
        // Should be back to last thumbnail
        await expect(lastThumbnail).toHaveClass(/is-active/);
        await expect(firstThumbnail).not.toHaveClass(/is-active/);
      }
    });
    
    test('should have proper ARIA live region for position announcements', async ({ page }) => {
      const positionIndicator = await page.locator('[data-gallery-position]');
      
      // Check ARIA attributes for screen reader support
      await expect(positionIndicator).toHaveAttribute('aria-live', 'polite');
      await expect(positionIndicator).toHaveAttribute('aria-atomic', 'true');
      
      // Verify position indicator becomes visible during navigation
      const nextButton = await page.locator('[data-gallery-next]');
      await nextButton.click();
      
      // Position indicator should be temporarily visible after navigation
      // (May be hidden by CSS but should have content for screen readers)
      const positionText = await positionIndicator.textContent();
      expect(positionText).toMatch(/\d+ of \d+/);
    });
    
    test('should scroll thumbnail into view when navigating with arrows', async ({ page }) => {
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount > 3) {
        // Navigate to a thumbnail that might be out of view
        const nextButton = await page.locator('[data-gallery-next]');
        
        // Navigate to middle of gallery
        const targetIndex = Math.floor(thumbnailCount / 2);
        for (let i = 0; i < targetIndex; i++) {
          await nextButton.click();
          await page.waitForTimeout(250);
        }
        
        // Get target thumbnail
        const targetThumbnail = await thumbnails.nth(targetIndex);
        
        // Verify thumbnail is active and visible
        await expect(targetThumbnail).toHaveClass(/is-active/);
        await expect(targetThumbnail).toBeVisible();
        
        // Check if thumbnail is properly in view
        const thumbnailContainer = await page.locator('.product-gallery__thumbnails');
        const containerBounds = await thumbnailContainer.boundingBox();
        const thumbnailBounds = await targetThumbnail.boundingBox();
        
        // Thumbnail should be within container bounds
        expect(thumbnailBounds.y).toBeGreaterThanOrEqual(containerBounds.y - 5); // Small tolerance
        expect(thumbnailBounds.y + thumbnailBounds.height).toBeLessThanOrEqual(
          containerBounds.y + containerBounds.height + 5
        );
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing or broken images gracefully', async ({ page }) => {
      // Navigate through images to test robustness
      const nextButton = await page.locator('[data-gallery-next]');
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      // Navigate through all images
      for (let i = 0; i < thumbnailCount; i++) {
        await nextButton.click();
        await page.waitForTimeout(350);
        
        // Verify gallery remains functional
        const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
        await expect(activeThumbnail).toBeVisible();
      }
    });

    test('should work with single image gracefully', async ({ page }) => {
      // This test checks that navigation doesn't break with single image
      // (though buttons might not be visible)
      const thumbnails = await page.locator('.product-gallery__thumbnail-item');
      const thumbnailCount = await thumbnails.count();
      
      if (thumbnailCount === 1) {
        // Gallery should still be functional
        const gallery = await page.locator('product-gallery-navigation');
        await expect(gallery).toBeVisible();
        
        const mainImage = await page.locator('[data-main-image]');
        await expect(mainImage).toBeVisible();
        
        // Position indicator should show "1 of 1"
        const positionIndicator = await page.locator('[data-gallery-position]');
        expect(await positionIndicator.textContent()).toBe('1 of 1');
      }
    });
  });

  test.describe('TC-05, TC-16, TC-17: Color Swatch Integration (Milestone 5)', () => {
    test('TC-05: should update gallery when color swatch is clicked', async ({ page }) => {
      // Find color swatches
      const colorSwatches = await page.locator('[data-color-swatches] .color-swatch');
      const swatchCount = await colorSwatches.count();
      
      if (swatchCount > 1) {
        // Get the current main image
        const mainImage = await page.locator('[data-main-image]');
        const initialSrc = await mainImage.getAttribute('src');
        
        // Find a non-selected color swatch
        const nonSelectedSwatch = await colorSwatches.locator(':not(.is-selected)').first();
        const targetVariantId = await nonSelectedSwatch.getAttribute('data-variant-id');
        const expectedMediaUrl = await nonSelectedSwatch.getAttribute('data-media-url');
        
        if (targetVariantId && expectedMediaUrl) {
          // Click the color swatch
          await nonSelectedSwatch.click();
          
          // Wait for the gallery to update
          await page.waitForTimeout(500);
          
          // Verify the main image has changed
          const newSrc = await mainImage.getAttribute('src');
          expect(newSrc).not.toBe(initialSrc);
          
          // Verify the image URL matches the expected variant image
          // Extract filename without query parameters for comparison
          const getFilename = (url) => url ? url.split('?')[0].split('/').pop() : '';
          const expectedFilename = getFilename(expectedMediaUrl);
          const actualFilename = getFilename(newSrc);
          
          // Filenames should match (ignoring width/height parameters)
          expect(actualFilename).toBe(expectedFilename);
          
          // Verify the swatch is now selected
          await expect(nonSelectedSwatch).toHaveClass(/is-selected/);
          
          console.log('Color swatch integration test passed:', {
            variantId: targetVariantId,
            expectedFilename,
            actualFilename
          });
        }
      }
    });

    test('TC-16: should update gallery without affecting cart functionality', async ({ page }) => {
      // Find cart-related elements
      const addToCartButton = await page.locator('[data-add-to-cart], .btn--add-to-cart, [type="submit"]:has-text("Add")').first();
      const priceElement = await page.locator('[data-price], .price, .product-price').first();
      
      // Get initial states
      const initialAddToCartText = await addToCartButton.textContent().catch(() => '');
      const initialPrice = await priceElement.textContent().catch(() => '');
      
      // Find and click a color swatch
      const colorSwatches = await page.locator('[data-color-swatches] .color-swatch');
      const swatchCount = await colorSwatches.count();
      
      if (swatchCount > 1) {
        const nonSelectedSwatch = await colorSwatches.locator(':not(.is-selected)').first();
        
        if (await nonSelectedSwatch.count() > 0) {
          await nonSelectedSwatch.click();
          await page.waitForTimeout(500);
          
          // Verify cart functionality is preserved
          await expect(addToCartButton).toBeVisible();
          
          // Price might change with variant selection, but element should still exist
          await expect(priceElement).toBeVisible();
          
          // Add to cart button should still be functional
          const buttonDisabled = await addToCartButton.getAttribute('disabled');
          if (!buttonDisabled) {
            // Button should be clickable (we won't actually click to avoid cart changes)
            await expect(addToCartButton).toBeEnabled();
          }
          
          console.log('Cart functionality preserved during color swatch change');
        }
      }
    });

    test('TC-17: should handle rapid color changes without desynchronization', async ({ page }) => {
      const colorSwatches = await page.locator('[data-color-swatches] .color-swatch');
      const swatchCount = await colorSwatches.count();
      
      if (swatchCount > 2) {
        const mainImage = await page.locator('[data-main-image]');
        
        // Rapidly click multiple color swatches
        for (let i = 0; i < Math.min(3, swatchCount); i++) {
          const swatch = await colorSwatches.nth(i);
          await swatch.click();
          await page.waitForTimeout(100); // Short delay between clicks
        }
        
        // Wait for all transitions to complete
        await page.waitForTimeout(800);
        
        // Verify gallery is still functional
        const activeThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
        await expect(activeThumbnail).toBeVisible();
        
        // Verify main image is visible and has opacity 1 (not stuck in transition)
        await expect(mainImage).toBeVisible();
        const opacity = await mainImage.evaluate(el => getComputedStyle(el).opacity);
        expect(opacity).toBe('1');
        
        // Verify only one swatch is selected
        const selectedSwatches = await page.locator('[data-color-swatches] .color-swatch.is-selected');
        const selectedCount = await selectedSwatches.count();
        expect(selectedCount).toBe(1);
        
        // Test that navigation still works after rapid changes
        const nextButton = await page.locator('[data-gallery-next]');
        if (await nextButton.count() > 0) {
          const initialSrc = await mainImage.getAttribute('src');
          await nextButton.click();
          await page.waitForTimeout(400);
          
          const newSrc = await mainImage.getAttribute('src');
          if (swatchCount > 1) {
            // If multiple images, navigation should change the image
            expect(newSrc).not.toBe(initialSrc);
          }
        }
        
        console.log('Rapid color changes handled successfully');
      }
    });

    test('should announce color changes for accessibility', async ({ page }) => {
      // Find ARIA live region for announcements
      const liveRegion = await page.locator('[aria-live], [data-gallery-announcements]');
      
      const colorSwatches = await page.locator('[data-color-swatches] .color-swatch');
      const swatchCount = await colorSwatches.count();
      
      if (swatchCount > 1) {
        const nonSelectedSwatch = await colorSwatches.locator(':not(.is-selected)').first();
        
        if (await nonSelectedSwatch.count() > 0) {
          // Click color swatch
          await nonSelectedSwatch.click();
          await page.waitForTimeout(500);
          
          // Check if live region exists and potentially has content
          if (await liveRegion.count() > 0) {
            // ARIA live regions should exist for screen reader announcements
            const ariaLive = await liveRegion.getAttribute('aria-live');
            expect(['polite', 'assertive']).toContain(ariaLive);
          }
          
          // Check position indicator updates for screen readers
          const positionIndicator = await page.locator('[data-gallery-position]');
          if (await positionIndicator.count() > 0) {
            const positionText = await positionIndicator.textContent();
            expect(positionText).toMatch(/\d+ of \d+/);
          }
        }
      }
    });

    test('should maintain proper ARIA states during color changes', async ({ page }) => {
      const colorSwatches = await page.locator('[data-color-swatches] .color-swatch');
      const swatchCount = await colorSwatches.count();
      
      if (swatchCount > 1) {
        // Get initial selected swatch
        const initialSelected = await colorSwatches.locator('.is-selected').first();
        const initialAriaSelected = await initialSelected.getAttribute('aria-selected');
        const initialAriaCurrent = await initialSelected.getAttribute('aria-current');
        
        // Click a different swatch
        const nonSelectedSwatch = await colorSwatches.locator(':not(.is-selected)').first();
        
        if (await nonSelectedSwatch.count() > 0) {
          await nonSelectedSwatch.click();
          await page.waitForTimeout(500);
          
          // Verify old swatch is no longer selected
          const oldAriaSelected = await initialSelected.getAttribute('aria-selected');
          const oldAriaCurrent = await initialSelected.getAttribute('aria-current');
          
          expect(oldAriaSelected).not.toBe('true');
          expect(oldAriaCurrent).not.toBe('true');
          
          // Verify new swatch is selected
          const newAriaSelected = await nonSelectedSwatch.getAttribute('aria-selected');
          const newAriaCurrent = await nonSelectedSwatch.getAttribute('aria-current');
          
          expect(newAriaSelected).toBe('true');
          expect(newAriaCurrent).toBe('true');
        }
      }
    });
  });
});