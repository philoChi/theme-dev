/**
 * test-mobile-navigation.js
 * -------------------------
 * Quick test to verify mobile navigation works
 */

const { chromium, devices } = require('playwright');

(async () => {
  console.log('=== Mobile Navigation Test ===\n');

  const browser = await chromium.launch({ headless: true });
  
  const context = await browser.newContext({
    ...devices['iPhone 12'],
    hasTouch: true,
    isMobile: true
  });
  
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:9292/products/baum-stein-stick');
  await page.waitForSelector('product-gallery-navigation', { state: 'attached' });
  await page.waitForTimeout(1000);

  // Get initial state
  const initialSrc = await page.getAttribute('[data-main-image]', 'src');
  console.log('Initial image loaded successfully');

  // Test arrow navigation
  console.log('Testing arrow navigation...');
  
  // Check if navigation buttons are visible
  const prevVisible = await page.locator('[data-gallery-prev]').isVisible();
  const nextVisible = await page.locator('[data-gallery-next]').isVisible();
  
  console.log(`Previous button visible: ${prevVisible}`);
  console.log(`Next button visible: ${nextVisible}`);
  
  if (nextVisible) {
    // Click next button
    await page.click('[data-gallery-next]');
    await page.waitForTimeout(500);
    
    const newSrc = await page.getAttribute('[data-main-image]', 'src');
    const navigationWorked = initialSrc !== newSrc;
    
    console.log(`Arrow navigation working: ${navigationWorked}`);
    
    if (navigationWorked) {
      console.log('✅ Mobile navigation is working correctly!');
    } else {
      console.log('❌ Mobile navigation not working');
    }
  } else {
    console.log('⚠️ Navigation buttons not visible');
  }

  // Check touch support
  const touchSupported = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    return gallery?.classList.contains('supports-touch');
  });
  
  console.log(`Touch support detected: ${touchSupported}`);

  // Check gallery state
  const galleryState = await page.evaluate(() => {
    const gallery = document.querySelector('product-gallery-navigation');
    return gallery?.getCurrentState();
  });
  
  console.log('Gallery state:', galleryState);

  await browser.close();
  console.log('\nMobile test complete.');
})();