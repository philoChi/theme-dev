/**
 * Debug navigation button clicks and check for console errors
 */

const { test, expect } = require('@playwright/test');

test.describe('Debug Navigation Clicks', () => {
  test('should test button clicks and log console messages', async ({ page }) => {
    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    // Navigate to the product page
    await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
    
    // Wait for gallery component
    await page.waitForSelector('product-gallery-navigation', { 
      state: 'attached',
      timeout: 10000 
    });
    
    await page.waitForTimeout(2000);
    
    // Hover to make buttons visible
    const gallery = await page.locator('product-gallery-navigation');
    await gallery.hover();
    await page.waitForTimeout(500);
    
    // Get elements
    const mainImage = await page.locator('[data-main-image]');
    const nextButton = await page.locator('[data-gallery-next]');
    
    // Check initial state
    const initialSrc = await mainImage.getAttribute('src');
    console.log('Initial src:', initialSrc);
    
    // Check what thumbnails have
    const secondThumbnail = await page.locator('.product-gallery__thumbnail-item').nth(1);
    const secondThumbImg = await secondThumbnail.locator('img');
    const expectedSrc = await secondThumbImg.getAttribute('data-main-image-src');
    console.log('Expected next src:', expectedSrc);
    
    // Click next button and watch for console messages
    console.log('Clicking next button...');
    await nextButton.click();
    await page.waitForTimeout(1000);
    
    // Check new state
    const newSrc = await mainImage.getAttribute('src');
    console.log('New src:', newSrc);
    console.log('Changed:', initialSrc !== newSrc);
    
    // Print console messages
    console.log('\\n=== Console Messages ===');
    consoleMessages.forEach((msg, i) => {
      console.log(`${i + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    // Check gallery state
    const galleryState = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      if (!gallery || !gallery.getCurrentState) {
        return { error: 'Gallery or getCurrentState method not found' };
      }
      return gallery.getCurrentState();
    });
    
    console.log('Gallery state:', galleryState);
    
    // Check thumbnail states
    const thumbnailStates = await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('.product-gallery__thumbnail-item');
      return Array.from(thumbnails).map((thumb, i) => ({
        index: i,
        isActive: thumb.classList.contains('is-active'),
        ariaSelected: thumb.getAttribute('aria-selected')
      }));
    });
    
    console.log('Thumbnail states:', thumbnailStates);
  });
});