const playwright = require('playwright');

(async () => {
  console.log('=== Quick Integration Check ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    await page.waitForTimeout(2000);

    // Quick checks
    const checks = {
      filterButton: await page.$('[data-drawer-trigger="filter"]') !== null,
      notificationContainer: await page.$('[data-notification-container]') !== null,
      productCards: (await page.$$('[data-product-card]')).length > 0,
      collectionData: await page.evaluate(() => typeof window.collectionData !== 'undefined'),
    };

    console.log('Integration Check Results:');
    console.log('- Filter drawer button:', checks.filterButton ? '✓' : '✗');
    console.log('- Notification system:', checks.notificationContainer ? '✓' : '✗');
    console.log('- Product cards:', checks.productCards ? '✓' : '✗');
    console.log('- Collection data loaded:', checks.collectionData ? '✓' : '✗');

    const allPassed = Object.values(checks).every(v => v);
    console.log(`\nOverall: ${allPassed ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();