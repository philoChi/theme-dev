/**
 * debug-mobile-swipe.js
 * ---------------------
 * Debug script to test mobile swipe functionality
 */

const { chromium, devices } = require('playwright');

(async () => {
  console.log('=== Mobile Swipe Debug ===\n');

  const browser = await chromium.launch({ 
    headless: true 
  });
  
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    hasTouch: true,
    isMobile: true
  });
  
  const page = await context.newPage();

  console.log('Navigating to product page...');
  await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
  
  // Wait for gallery initialization
  await page.waitForSelector('product-gallery-navigation', { state: 'attached' });
  await page.waitForTimeout(1000);

  console.log('Gallery loaded. Testing touch support...');
  
  // Check if touch support is detected
  const hasTouchClass = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    return gallery?.classList.contains('supports-touch');
  });
  
  console.log(`Touch support detected: ${hasTouchClass}`);
  
  // Get initial state
  const initialState = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    if (!gallery || !gallery.getCurrentState) return null;
    return gallery.getCurrentState();
  });
  
  console.log('Initial state:', initialState);
  
  // Test manual touch events
  console.log('\nTesting manual touch events...');
  
  const box = await page.locator('.product-gallery__main-image-container').boundingBox();
  
  // Simulate swipe left
  console.log('Performing left swipe...');
  await page.evaluate((box) => {
    const gallery = document.querySelector('.product-gallery__main-image-container');
    
    // Dispatch touch start
    const touchStart = new TouchEvent('touchstart', {
      touches: [new Touch({
        identifier: 1,
        target: gallery,
        clientX: box.x + box.width * 0.8,
        clientY: box.y + box.height / 2
      })]
    });
    gallery.dispatchEvent(touchStart);
    
    // Dispatch touch move
    const touchMove = new TouchEvent('touchmove', {
      touches: [new Touch({
        identifier: 1,
        target: gallery,
        clientX: box.x + box.width * 0.2,
        clientY: box.y + box.height / 2
      })]
    });
    gallery.dispatchEvent(touchMove);
    
    // Dispatch touch end
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [new Touch({
        identifier: 1,
        target: gallery,
        clientX: box.x + box.width * 0.2,
        clientY: box.y + box.height / 2
      })]
    });
    gallery.dispatchEvent(touchEnd);
  }, box);
  
  await page.waitForTimeout(500);
  
  // Check if navigation occurred
  const stateAfterSwipe = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    if (!gallery || !gallery.getCurrentState) return null;
    return gallery.getCurrentState();
  });
  
  console.log('State after swipe:', stateAfterSwipe);
  
  if (initialState && stateAfterSwipe) {
    console.log(`Navigation successful: ${initialState.currentIndex !== stateAfterSwipe.currentIndex}`);
  }
  
  // Test arrow buttons on mobile
  console.log('\nTesting arrow navigation on mobile...');
  const hasNextButton = await page.locator('[data-gallery-next]').isVisible();
  console.log(`Next button visible: ${hasNextButton}`);
  
  if (hasNextButton) {
    await page.click('[data-gallery-next]');
    await page.waitForTimeout(500);
    
    const stateAfterClick = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return gallery?.getCurrentState();
    });
    
    console.log('State after arrow click:', stateAfterClick);
  }
  
  // Check console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
  
  console.log('\nDebug complete.');
  
  await browser.close();
})();