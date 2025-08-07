const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);
  
  // Click filter button
  await page.click('[data-drawer-trigger="filter"]');
  await page.waitForTimeout(1500);
  
  // Take screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-drawer-open.png',
    fullPage: false
  });
  
  console.log('Screenshot saved: filter-drawer-open.png');
  
  // Try to expand a dropdown by clicking on the text
  const dropdowns = await page.$$('.dropdown__trigger');
  console.log(`Found ${dropdowns.length} dropdown triggers`);
  
  if (dropdowns.length > 0) {
    // Click first dropdown
    await dropdowns[0].click();
    await page.waitForTimeout(500);
    
    await page.screenshot({
      path: 'tests/e2e/screenshots/filter-drawer-dropdown-open.png',
      fullPage: false
    });
    
    console.log('Screenshot saved: filter-drawer-dropdown-open.png');
  }

  await browser.close();
})();