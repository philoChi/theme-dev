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
  await page.waitForTimeout(2000);

  // Test 1: Collection page with filters in URL
  console.log('Testing URL with filters...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt&filter.color=blue&sort_by=price-ascending', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: 'tests/e2e/screenshots/collection-with-url-filters.png',
    fullPage: true
  });
  console.log('Screenshot saved: collection-with-url-filters.png');

  // Test 2: Open filter drawer on mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(1000);

  // Try to click filter button
  const filterButton = await page.$('[data-drawer-trigger="filter"]');
  if (filterButton) {
    await filterButton.click();
    await page.waitForTimeout(1000);
    
    await page.screenshot({
      path: 'tests/e2e/screenshots/collection-filter-drawer-mobile.png',
      fullPage: true
    });
    console.log('Screenshot saved: collection-filter-drawer-mobile.png');
  }

  // Test 3: Desktop view with filters
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:9292/collections/all?filter.size=M&filter.size=L', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: 'tests/e2e/screenshots/collection-desktop-with-filters.png',
    fullPage: false
  });
  console.log('Screenshot saved: collection-desktop-with-filters.png');

  await browser.close();
  console.log('Collection filter testing completed!');
})();