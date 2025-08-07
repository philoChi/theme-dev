const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing lazy loading functionality...\n');
  
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(1000);
  
  // Check initial lazy loading state
  const initialState = await page.evaluate(() => {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const loadedImages = document.querySelectorAll('img.is-loaded');
    
    return {
      totalLazyImages: lazyImages.length,
      loadedImages: loadedImages.length,
      viewportHeight: window.innerHeight
    };
  });
  
  console.log('Initial state:');
  console.log('- Total lazy images:', initialState.totalLazyImages);
  console.log('- Already loaded:', initialState.loadedImages);
  console.log('- Viewport height:', initialState.viewportHeight);
  
  // Scroll down to trigger lazy loading
  console.log('\nScrolling down to trigger lazy loading...');
  await page.evaluate(() => window.scrollTo(0, 1000));
  await page.waitForTimeout(1500);
  
  // Check after scroll
  const afterScroll = await page.evaluate(() => {
    const loadedImages = document.querySelectorAll('img.is-loaded');
    return loadedImages.length;
  });
  
  console.log('Images loaded after scroll:', afterScroll);
  console.log('New images loaded:', afterScroll - initialState.loadedImages);
  
  // Click load more to test lazy loading on new products
  console.log('\nClicking load more...');
  await page.click('[data-load-more]');
  await page.waitForTimeout(2000);
  
  // Check lazy loading after load more
  const afterLoadMore = await page.evaluate(() => {
    const totalImages = document.querySelectorAll('img[loading="lazy"]');
    const loadedImages = document.querySelectorAll('img.is-loaded');
    
    return {
      totalImages: totalImages.length,
      loadedImages: loadedImages.length
    };
  });
  
  console.log('\nAfter load more:');
  console.log('- Total images:', afterLoadMore.totalImages);
  console.log('- Loaded images:', afterLoadMore.loadedImages);
  
  // Take screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/lazy-loading-test.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nLazy loading test completed!');
})();