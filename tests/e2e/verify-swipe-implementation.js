/**
 * verify-swipe-implementation.js
 * ------------------------------
 * Verify swipe implementation is working
 */

const { chromium, devices } = require('playwright');

(async () => {
  console.log('=== Swipe Implementation Verification ===\n');

  const browser = await chromium.launch({ headless: true });
  
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    hasTouch: true,
    isMobile: true
  });
  
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('Touch') || 
        msg.text().includes('Swipe') || 
        msg.text().includes('swipe')) {
      console.log('Gallery log:', msg.text());
    }
  });

  await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
  await page.waitForSelector('product-gallery-navigation', { state: 'attached' });
  await page.waitForTimeout(1000);

  // Check touch support
  const touchSupported = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    return gallery?.classList.contains('supports-touch');
  });
  console.log('Touch support detected:', touchSupported);

  // Get initial state
  const initialState = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    return gallery?.getCurrentState();
  });
  console.log('Initial state:', initialState);

  // Test swipe by injecting touch events
  console.log('\nPerforming swipe gesture...');
  
  const swipeResult = await page.evaluate(() => {
    return new Promise((resolve) => {
      const gallery = document.querySelector('product-gallery-navigation');
      const container = gallery.querySelector('.product-gallery__main-image-container');
      
      if (!gallery || !container) {
        resolve({ error: 'Gallery elements not found' });
        return;
      }
      
      const rect = container.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.8;
      const startY = rect.top + rect.height / 2;
      const endX = rect.left + rect.width * 0.2;
      
      // Listen for gallery navigation event
      let navigationOccurred = false;
      gallery.addEventListener('gallery:imageChanged', () => {
        navigationOccurred = true;
      });
      
      // Create touch events
      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{
          identifier: 1,
          target: container,
          clientX: startX,
          clientY: startY,
          pageX: startX,
          pageY: startY
        }],
        targetTouches: [{
          identifier: 1,
          target: container,
          clientX: startX,
          clientY: startY,
          pageX: startX,
          pageY: startY
        }]
      });
      
      // Dispatch start
      gallery.dispatchEvent(touchStart);
      
      // Simulate move
      setTimeout(() => {
        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [{
            identifier: 1,
            target: container,
            clientX: endX,
            clientY: startY,
            pageX: endX,
            pageY: startY
          }],
          targetTouches: [{
            identifier: 1,
            target: container,
            clientX: endX,
            clientY: startY,
            pageX: endX,
            pageY: startY
          }]
        });
        gallery.dispatchEvent(touchMove);
        
        // End touch
        setTimeout(() => {
          const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            touches: [],
            targetTouches: [],
            changedTouches: [{
              identifier: 1,
              target: container,
              clientX: endX,
              clientY: startY,
              pageX: endX,
              pageY: startY
            }]
          });
          gallery.dispatchEvent(touchEnd);
          
          // Check result after a delay
          setTimeout(() => {
            const finalState = gallery.getCurrentState();
            resolve({
              navigationOccurred,
              finalState,
              touchState: gallery.state
            });
          }, 500);
        }, 50);
      }, 50);
    });
  });
  
  console.log('Swipe result:', swipeResult);
  
  // Verify the implementation works
  if (swipeResult.navigationOccurred || 
      (swipeResult.finalState && swipeResult.finalState.currentIndex !== initialState.currentIndex)) {
    console.log('\n✅ Swipe navigation is working!');
  } else {
    console.log('\n❌ Swipe navigation not working');
    console.log('Touch state:', swipeResult.touchState);
  }

  await browser.close();
})();