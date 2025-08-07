const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Add console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });

  console.log('Test 1: Initial page load (no filters)...');
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  // Count visible products
  const visibleProducts1 = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', items => items.length);
  console.log(`Visible products on initial load: ${visibleProducts1}`);

  // Take screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/test-initial-load.png',
    fullPage: false
  });

  console.log('\nTest 2: Apply a filter...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  const visibleProducts2 = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', items => items.length);
  console.log(`Visible products with filter: ${visibleProducts2}`);

  await page.screenshot({
    path: 'tests/e2e/screenshots/test-with-filter.png',
    fullPage: false
  });

  console.log('\nTest 3: Check for flickering...');
  // Watch for changes
  let changeCount = 0;
  await page.evaluate(() => {
    const grid = document.querySelector('[data-product-grid]');
    if (grid) {
      const observer = new MutationObserver(() => {
        window.gridChanged = (window.gridChanged || 0) + 1;
      });
      observer.observe(grid, { childList: true, subtree: true, attributes: true });
    }
  });

  // Wait and see if there are changes
  await page.waitForTimeout(3000);
  
  changeCount = await page.evaluate(() => window.gridChanged || 0);
  console.log(`Grid mutations detected in 3 seconds: ${changeCount}`);

  await browser.close();
  console.log('\nTest completed!');
})();