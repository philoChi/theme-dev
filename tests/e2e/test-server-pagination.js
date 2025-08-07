const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'log' && (msg.text().includes('[INFO]') || msg.text().includes('Loading more'))) {
      console.log('Browser log:', msg.text());
    }
  });

  // Set up request interception to monitor server calls
  page.on('request', request => {
    if (request.url().includes('page=')) {
      console.log('Server request made:', request.url());
    }
  });

  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  console.log('Test: Load all client-side products first...');
  
  // Click load more once to show all 48 products
  await page.click('[data-load-more]');
  await page.waitForTimeout(2000);
  
  const afterFirst = await page.evaluate(() => {
    const visible = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length;
    const buttonText = document.querySelector('[data-load-more]')?.textContent;
    return { visible, buttonText };
  });
  
  console.log('After first click:', afterFirst);
  
  // Click again to trigger server load
  console.log('\nClicking Load More again to trigger server load...');
  await page.click('[data-load-more]');
  await page.waitForTimeout(3000);
  
  const afterSecond = await page.evaluate(() => {
    const visible = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length;
    const buttonVisible = document.querySelector('[data-load-more]') && 
                         window.getComputedStyle(document.querySelector('[data-load-more]')).display !== 'none';
    const controller = window.collectionPageController;
    return { 
      visible, 
      buttonVisible,
      isLoading: controller?.state?.isLoading,
      currentPage: controller?.state?.currentPage
    };
  });
  
  console.log('After second click:', afterSecond);

  await browser.close();
})();