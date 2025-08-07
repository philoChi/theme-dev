/**
 * debug-gallery-navigation.spec.js
 * Debug tests for gallery navigation issues
 */

const { test, expect } = require('@playwright/test');

test.describe('Debug Gallery Navigation', () => {
  test('should verify basic gallery setup and button creation', async ({ page }) => {
    // Navigate to the product page
    await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
    await page.waitForLoadState('networkidle');

    // Check if gallery component exists
    const gallery = await page.locator('product-gallery-navigation');
    await expect(gallery).toBeVisible();

    // Check if buttons are created
    const nextButton = await page.locator('[data-gallery-next]');
    const prevButton = await page.locator('[data-gallery-prev]');
    
    console.log('Next button count:', await nextButton.count());
    console.log('Prev button count:', await prevButton.count());

    // Check if buttons are attached to DOM
    if (await nextButton.count() > 0) {
      const nextVisible = await nextButton.first().isVisible();
      const prevVisible = await prevButton.first().isVisible();
      
      console.log('Next button visible:', nextVisible);
      console.log('Prev button visible:', prevVisible);
    }

    // Check thumbnails
    const thumbnails = await page.locator('.product-gallery__thumbnail-item');
    const thumbnailCount = await thumbnails.count();
    console.log('Thumbnail count:', thumbnailCount);

    // Check for any console errors
    let consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any late console errors
    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }

    // Check if gallery was initialized
    const galleryInitialized = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return gallery && gallery.state && gallery.state.isInitialized;
    });
    
    console.log('Gallery initialized:', galleryInitialized);
  });

  test('should test simple button click', async ({ page }) => {
    await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get current image src
    const mainImage = await page.locator('[data-main-image]');
    const initialSrc = await mainImage.getAttribute('src');
    console.log('Initial image src:', initialSrc);

    // Try to click next button
    const nextButtons = await page.locator('[data-gallery-next]');
    const buttonCount = await nextButtons.count();
    console.log('Found next buttons:', buttonCount);

    if (buttonCount > 0) {
      // Try clicking the first visible button
      await nextButtons.first().click();
      await page.waitForTimeout(1000);

      const newSrc = await mainImage.getAttribute('src');
      console.log('New image src:', newSrc);
      console.log('Image changed:', initialSrc !== newSrc);
    }
  });
});