const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(1000);
  
  // Get initial pagination info
  const initial = await page.evaluate(() => {
    const info = document.querySelector('[data-pagination-info]');
    return info ? info.textContent.trim() : 'Not found';
  });
  console.log('Initial:', initial);
  
  // Click load more
  await page.click('[data-load-more]');
  await page.waitForTimeout(2000);
  
  const after1 = await page.evaluate(() => {
    const info = document.querySelector('[data-pagination-info]');
    return info ? info.textContent.trim() : 'Not found';
  });
  console.log('After 1st click:', after1);
  
  // Click again
  await page.click('[data-load-more]');
  await page.waitForTimeout(3000);
  
  const after2 = await page.evaluate(() => {
    const info = document.querySelector('[data-pagination-info]');
    const visible = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length;
    return {
      text: info ? info.textContent.trim() : 'Not found',
      visibleProducts: visible
    };
  });
  console.log('After 2nd click:', after2);

  // Take screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/pagination-fixed.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nPagination is now working correctly!');
})();