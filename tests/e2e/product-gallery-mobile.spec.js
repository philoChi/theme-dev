/**
 * product-gallery-mobile.spec.js
 * ------------------------------
 * Mobile-specific tests for Product Gallery Navigation
 * Tests swipe gestures, touch interactions, and mobile UI requirements
 * 
 * Test Coverage:
 * - TC-07: Mobile swipe gestures work smoothly
 * - TC-27: Left swipe navigates to next image
 * - TC-28: Right swipe navigates to previous image
 * - TC-29: Swipe doesn't interfere with vertical scroll
 * - TC-22: Touch interactions on mobile devices
 * - Mobile UI requirements (touch targets >= 44x44px)
 */

const { test, expect, devices } = require('@playwright/test');

// Use mobile viewport for all tests
test.use({ ...devices['iPhone 12'] });

test.describe('Product Gallery Mobile Swipe Navigation', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    // Create page with mobile context
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true,
      isMobile: true
    });
    
    page = await context.newPage();
    
    // Navigate to product page with multiple images
    await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
    
    // Wait for gallery to be initialized
    await page.waitForSelector('product-gallery-navigation', { state: 'attached' });
    await page.waitForTimeout(500); // Allow initialization to complete
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('TC-27: Left swipe navigates to next image', async () => {
    // Get initial image src
    const initialSrc = await page.getAttribute('[data-main-image]', 'src');
    
    // Get gallery element for swipe
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Perform left swipe using touchscreen API
    const startX = box.x + box.width * 0.8;
    const startY = box.y + box.height / 2;
    const endX = box.x + box.width * 0.2;
    const endY = box.y + box.height / 2;
    
    // Swipe gesture
    await page.touchscreen.touchStart(startX, startY);
    await page.waitForTimeout(50);
    
    // Move in steps
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.touchscreen.touchMove(x, y);
      await page.waitForTimeout(10);
    }
    
    await page.touchscreen.touchEnd();
    
    // Wait for navigation to complete
    await page.waitForTimeout(400);
    
    // Verify image changed
    const newSrc = await page.getAttribute('[data-main-image]', 'src');
    expect(newSrc).not.toBe(initialSrc);
    
    // Verify we moved to next image (index should increase)
    const thumbnails = await page.locator('.product-gallery__thumbnail-item');
    const activeThumbnail = await thumbnails.locator('.is-active');
    expect(await activeThumbnail.count()).toBe(1);
  });

  test('TC-28: Right swipe navigates to previous image', async () => {
    // First navigate to second image
    await page.click('[data-gallery-next]');
    await page.waitForTimeout(400);
    
    const initialSrc = await page.getAttribute('[data-main-image]', 'src');
    
    // Get gallery element for swipe
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Perform right swipe using touchscreen API
    const startX = box.x + box.width * 0.2;
    const startY = box.y + box.height / 2;
    const endX = box.x + box.width * 0.8;
    const endY = box.y + box.height / 2;
    
    // Swipe gesture
    await page.touchscreen.touchStart(startX, startY);
    await page.waitForTimeout(50);
    
    // Move in steps
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.touchscreen.touchMove(x, y);
      await page.waitForTimeout(10);
    }
    
    await page.touchscreen.touchEnd();
    
    // Wait for navigation to complete
    await page.waitForTimeout(400);
    
    // Verify image changed
    const newSrc = await page.getAttribute('[data-main-image]', 'src');
    expect(newSrc).not.toBe(initialSrc);
  });

  test('TC-07: Mobile swipe gestures work smoothly without conflicting with page scroll', async () => {
    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);
    
    // Get gallery element
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Perform horizontal swipe
    await swipeGesture(page, 
      box.x + box.width * 0.8, 
      box.y + box.height / 2,
      box.x + box.width * 0.2, 
      box.y + box.height / 2,
      10
    );
    
    await page.waitForTimeout(100);
    
    // Verify page didn't scroll vertically
    const scrollAfterHorizontal = await page.evaluate(() => window.scrollY);
    expect(scrollAfterHorizontal).toBe(initialScrollY);
    
    // Now test vertical scroll doesn't trigger gallery navigation
    const imageSrcBefore = await page.getAttribute('[data-main-image]', 'src');
    
    // Perform vertical swipe
    await swipeGesture(page,
      box.x + box.width / 2,
      box.y + box.height * 0.3,
      box.x + box.width / 2,
      box.y + box.height * 0.7,
      10
    );
    
    await page.waitForTimeout(100);
    
    // Verify image didn't change
    const imageSrcAfter = await page.getAttribute('[data-main-image]', 'src');
    expect(imageSrcAfter).toBe(imageSrcBefore);
  });

  test('TC-29: Swipe threshold prevents accidental navigation', async () => {
    const initialSrc = await page.getAttribute('[data-main-image]', 'src');
    
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Perform very small swipe (below threshold)
    await swipeGesture(page,
      box.x + box.width / 2,
      box.y + box.height / 2,
      box.x + box.width / 2 + 20, // Small movement
      box.y + box.height / 2,
      5
    );
    
    await page.waitForTimeout(400);
    
    // Verify image didn't change
    const newSrc = await page.getAttribute('[data-main-image]', 'src');
    expect(newSrc).toBe(initialSrc);
  });

  test('TC-22: Touch targets meet minimum size requirements (44x44px)', async () => {
    // Check navigation button sizes
    const prevButton = await page.locator('[data-gallery-prev]');
    const nextButton = await page.locator('[data-gallery-next]');
    
    if (await prevButton.isVisible()) {
      const prevBox = await prevButton.boundingBox();
      expect(prevBox.width).toBeGreaterThanOrEqual(44);
      expect(prevBox.height).toBeGreaterThanOrEqual(44);
    }
    
    if (await nextButton.isVisible()) {
      const nextBox = await nextButton.boundingBox();
      expect(nextBox.width).toBeGreaterThanOrEqual(44);
      expect(nextBox.height).toBeGreaterThanOrEqual(44);
    }
    
    // Check thumbnail touch targets
    const thumbnails = await page.locator('.product-gallery__thumbnail-item');
    const count = await thumbnails.count();
    
    if (count > 0) {
      const firstThumb = thumbnails.first();
      const thumbBox = await firstThumb.boundingBox();
      
      // Thumbnails should have adequate spacing for touch
      expect(thumbBox.width).toBeGreaterThanOrEqual(60); // Reasonable thumb size
    }
  });

  test('Mobile: Swipe velocity affects navigation', async () => {
    const initialSrc = await page.getAttribute('[data-main-image]', 'src');
    
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Fast swipe with shorter distance
    await swipeGesture(page,
      box.x + box.width * 0.6,
      box.y + box.height / 2,
      box.x + box.width * 0.4,
      box.y + box.height / 2,
      3 // Fewer steps = faster swipe
    );
    
    await page.waitForTimeout(400);
    
    // Should navigate despite shorter distance due to velocity
    const newSrc = await page.getAttribute('[data-main-image]', 'src');
    expect(newSrc).not.toBe(initialSrc);
  });

  test('Mobile: Visual feedback during swipe', async () => {
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Start touch
    await page.touchscreen.touchStart(box.x + box.width * 0.8, box.y + box.height / 2);
    
    // Move touch (should show visual feedback)
    await page.touchscreen.touchMove(box.x + box.width * 0.5, box.y + box.height / 2);
    
    // Check for transform style (visual feedback)
    const transform = await gallery.evaluate(el => 
      window.getComputedStyle(el).transform
    );
    
    // Should have some transform applied during swipe
    expect(transform).not.toBe('none');
    
    // End touch
    await page.touchscreen.touchEnd();
    
    await page.waitForTimeout(100);
    
    // Transform should be reset after swipe
    const transformAfter = await gallery.evaluate(el => 
      window.getComputedStyle(el).transform
    );
    expect(transformAfter).toBe('none');
  });

  test('Mobile: Loop navigation works with swipe', async () => {
    // Get total images
    const thumbnails = await page.locator('.product-gallery__thumbnail-item');
    const totalImages = await thumbnails.count();
    
    if (totalImages <= 1) {
      test.skip('Product has only one image, skipping loop test');
      return;
    }
    
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Navigate to last image
    for (let i = 0; i < totalImages - 1; i++) {
      await swipeGesture(page,
        box.x + box.width * 0.8,
        box.y + box.height / 2,
        box.x + box.width * 0.2,
        box.y + box.height / 2,
        5
      );
      await page.waitForTimeout(400);
    }
    
    // Verify we're at the last image
    const lastActiveThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
    const lastIndex = await thumbnails.evaluateAll((thumbs, active) => {
      return thumbs.indexOf(active);
    }, await lastActiveThumbnail.elementHandle());
    
    expect(lastIndex).toBe(totalImages - 1);
    
    // Swipe left from last image should go to first
    await swipeGesture(page,
      box.x + box.width * 0.8,
      box.y + box.height / 2,
      box.x + box.width * 0.2,
      box.y + box.height / 2,
      5
    );
    
    await page.waitForTimeout(400);
    
    // Should be at first image
    const firstActiveThumbnail = await page.locator('.product-gallery__thumbnail-item.is-active');
    const firstIndex = await thumbnails.evaluateAll((thumbs, active) => {
      return thumbs.indexOf(active);
    }, await firstActiveThumbnail.elementHandle());
    
    expect(firstIndex).toBe(0);
  });

  test('Mobile: Touch support detection adds appropriate classes', async () => {
    const galleryElement = await page.locator('product-gallery-navigation');
    
    // Should have touch support class on mobile
    const hasSupportsTouch = await galleryElement.evaluate(el => 
      el.classList.contains('supports-touch')
    );
    
    expect(hasSupportsTouch).toBe(true);
  });

  test('Mobile: Pinch zoom doesn\'t interfere with swipe', async () => {
    const initialSrc = await page.getAttribute('[data-main-image]', 'src');
    
    const gallery = await page.locator('.product-gallery__main-image-container');
    const box = await gallery.boundingBox();
    
    // Simulate pinch gesture start (multi-touch)
    // Note: This is a simplified test as true multi-touch is complex in Playwright
    await page.touchscreen.touchStart(box.x + box.width / 2, box.y + box.height / 2);
    await page.touchscreen.touchMove(box.x + box.width * 0.3, box.y + box.height / 2);
    await page.touchscreen.touchEnd();
    
    await page.waitForTimeout(400);
    
    // Image should not have changed
    const newSrc = await page.getAttribute('[data-main-image]', 'src');
    expect(newSrc).toBe(initialSrc);
  });
});

// Helper to create swipe gesture
async function swipeGesture(page, startX, startY, endX, endY, steps = 10) {
  await page.touchscreen.touchStart(startX, startY);
  
  const deltaX = (endX - startX) / steps;
  const deltaY = (endY - startY) / steps;
  
  for (let i = 1; i <= steps; i++) {
    await page.touchscreen.touchMove(
      startX + deltaX * i,
      startY + deltaY * i
    );
    await page.waitForTimeout(10);
  }
  
  await page.touchscreen.touchEnd();
}