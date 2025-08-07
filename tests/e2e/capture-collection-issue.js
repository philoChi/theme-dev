const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to collection page...');
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  // Wait for page to stabilize
  await page.waitForTimeout(3000);

  // Take full page screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/collection-current-state.png',
    fullPage: true
  });
  console.log('Screenshot saved: collection-current-state.png');

  // Also capture just the grid area
  const grid = await page.$('[data-product-grid]');
  if (grid) {
    await grid.screenshot({
      path: 'tests/e2e/screenshots/collection-grid-only.png'
    });
    console.log('Grid screenshot saved: collection-grid-only.png');
  }

  // Check for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });

  // Wait a bit more to see if there are any console errors
  await page.waitForTimeout(2000);

  await browser.close();
  console.log('Collection issue capture completed!');
})();