/**
 * test-simple-swipe.js
 * --------------------
 * Simple test to verify swipe functionality
 */

const { chromium, devices } = require('playwright');

(async () => {
  console.log('=== Simple Swipe Test ===\n');

  const browser = await chromium.launch({ headless: true });
  
  // Create mobile context
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    hasTouch: true,
    isMobile: true
  });
  
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('ProductGalleryNavigation') || 
        msg.text().includes('swipe') || 
        msg.text().includes('touch')) {
      console.log('Console:', msg.text());
    }
  });

  console.log('Navigating to product page...');
  await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
  
  // Wait for gallery
  await page.waitForSelector('product-gallery-navigation', { state: 'attached' });
  await page.waitForTimeout(1000);

  // Get initial image
  const initialSrc = await page.getAttribute('[data-main-image]', 'src');
  console.log('Initial image:', initialSrc);

  // Test arrow navigation first
  console.log('\nTesting arrow navigation...');
  await page.click('[data-gallery-next]');
  await page.waitForTimeout(500);
  
  const afterArrowSrc = await page.getAttribute('[data-main-image]', 'src');
  console.log('After arrow click:', afterArrowSrc);
  console.log('Arrow navigation works:', initialSrc !== afterArrowSrc);

  // Reset to first image
  await page.click('[data-gallery-prev]');
  await page.waitForTimeout(500);

  // Now test swipe
  console.log('\nTesting swipe navigation...');
  const box = await page.locator('.product-gallery__main-image-container').boundingBox();
  
  // Execute swipe in page context
  await page.evaluate(async (box) => {
    const gallery = document.querySelector('product-gallery-navigation');
    const container = document.querySelector('.product-gallery__main-image-container');
    
    // Create and dispatch touch events
    const touchStart = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [{
        identifier: 1,
        target: container,
        clientX: box.x + box.width * 0.8,
        clientY: box.y + box.height / 2,
        pageX: box.x + box.width * 0.8,
        pageY: box.y + box.height / 2
      }],
      targetTouches: [{
        identifier: 1,
        target: container,
        clientX: box.x + box.width * 0.8,
        clientY: box.y + box.height / 2,
        pageX: box.x + box.width * 0.8,
        pageY: box.y + box.height / 2
      }]
    });
    
    const touchMove = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [{
        identifier: 1,
        target: container,
        clientX: box.x + box.width * 0.2,
        clientY: box.y + box.height / 2,
        pageX: box.x + box.width * 0.2,
        pageY: box.y + box.height / 2
      }],
      targetTouches: [{
        identifier: 1,
        target: container,
        clientX: box.x + box.width * 0.2,
        clientY: box.y + box.height / 2,
        pageX: box.x + box.width * 0.2,
        pageY: box.y + box.height / 2
      }]
    });
    
    const touchEnd = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [{
        identifier: 1,
        target: container,
        clientX: box.x + box.width * 0.2,
        clientY: box.y + box.height / 2,
        pageX: box.x + box.width * 0.2,
        pageY: box.y + box.height / 2
      }]
    });
    
    // Dispatch events on the gallery element
    gallery.dispatchEvent(touchStart);
    await new Promise(r => setTimeout(r, 50));
    gallery.dispatchEvent(touchMove);
    await new Promise(r => setTimeout(r, 50));
    gallery.dispatchEvent(touchEnd);
  }, box);
  
  await page.waitForTimeout(500);
  
  const afterSwipeSrc = await page.getAttribute('[data-main-image]', 'src');
  console.log('After swipe:', afterSwipeSrc);
  console.log('Swipe navigation works:', initialSrc !== afterSwipeSrc);

  // Get final state
  const finalState = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    return gallery?.getCurrentState();
  });
  console.log('\nFinal state:', finalState);

  await browser.close();
  console.log('\nTest complete.');
})();