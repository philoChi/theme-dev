/**
 * Quick gallery navigation test without networkidle dependency
 */

const { test, expect } = require('@playwright/test');

test.describe('Quick Gallery Navigation Test', () => {
  test('should verify gallery navigation functionality', async ({ page }) => {
    // Navigate to the product page
    await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
    
    // Wait for the gallery component to be present (not networkidle)
    await page.waitForSelector('product-gallery-navigation', { 
      state: 'attached',
      timeout: 10000 
    });
    
    // Wait a bit more for initialization
    await page.waitForTimeout(2000);
    
    // Check if gallery component exists
    const gallery = await page.locator('product-gallery-navigation');
    await expect(gallery).toBeVisible();

    // Check if main image exists
    const mainImage = await page.locator('[data-main-image]');
    await expect(mainImage).toBeVisible();
    
    // Check thumbnails
    const thumbnails = await page.locator('.product-gallery__thumbnail-item');
    const thumbnailCount = await thumbnails.count();
    console.log('Thumbnail count:', thumbnailCount);
    
    // Only test navigation if we have multiple images
    if (thumbnailCount > 1) {
      // Check if navigation buttons exist
      const nextButton = await page.locator('[data-gallery-next]');
      const prevButton = await page.locator('[data-gallery-prev]');
      
      console.log('Next button count:', await nextButton.count());
      console.log('Prev button count:', await prevButton.count());
      
      if (await nextButton.count() > 0) {
        // Hover over gallery to make buttons visible
        await gallery.hover();
        await page.waitForTimeout(500);
        
        // Test button visibility after hover
        await expect(nextButton.first()).toBeVisible();
        await expect(prevButton.first()).toBeVisible();
        
        // Test navigation
        const initialSrc = await mainImage.getAttribute('src');
        console.log('Initial image src:', initialSrc);
        
        // Click next button
        await nextButton.first().click();
        await page.waitForTimeout(500);
        
        const newSrc = await mainImage.getAttribute('src');
        console.log('New image src:', newSrc);
        console.log('Image changed:', initialSrc !== newSrc);
        
        // Verify image changed
        expect(newSrc).not.toBe(initialSrc);
      }
    }
    
    console.log('Gallery test completed successfully!');
  });
});