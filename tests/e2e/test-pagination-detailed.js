const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('CollectionPageController')) {
      console.log('Page log:', msg.text());
    }
  });

  console.log('Detailed pagination test...\n');

  // Test 1: Initial state
  console.log('Test 1: Initial page state...');
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  // Get collection data info
  const dataInfo = await page.evaluate(() => {
    const controller = window.collectionPageController || {};
    const script = document.querySelector('[data-collection-data]');
    let data = null;
    
    if (script) {
      try {
        data = JSON.parse(script.textContent);
      } catch (e) {}
    }
    
    return {
      originalProductsCount: data ? data.products.length : 0,
      currentPage: controller.state ? controller.state.currentPage : 'unknown',
      filteredProductsCount: controller.state ? controller.state.filteredProducts.length : 'unknown'
    };
  });
  
  console.log('Collection data:', dataInfo);

  // Count visible grid items
  const visibleItems = await page.$$('[data-product-grid-item]:not([style*="display: none"])');
  console.log('Visible product items:', visibleItems.length);

  // Check load more button state
  const loadMoreState = await page.evaluate(() => {
    const btn = document.querySelector('[data-load-more]');
    if (!btn) return null;
    
    return {
      visible: window.getComputedStyle(btn).display !== 'none',
      text: btn.textContent.trim(),
      disabled: btn.disabled
    };
  });
  console.log('Load more button state:', loadMoreState);

  // Test 2: Click load more
  if (loadMoreState && loadMoreState.visible) {
    console.log('\nTest 2: Clicking load more...');
    
    // Click and wait
    await page.click('[data-load-more]');
    await page.waitForTimeout(3000);
    
    // Count visible items after click
    const visibleAfterClick = await page.$$('[data-product-grid-item]:not([style*="display: none"])');
    console.log('Visible items after load more:', visibleAfterClick.length);
    
    // Check pagination info update
    const paginationText = await page.$eval('[data-pagination-info]', el => el.textContent.trim());
    console.log('Pagination info after load:', paginationText);
    
    // Check load more button again
    const loadMoreAfter = await page.evaluate(() => {
      const btn = document.querySelector('[data-load-more]');
      if (!btn) return null;
      
      return {
        visible: window.getComputedStyle(btn).display !== 'none',
        text: btn.textContent.trim()
      };
    });
    console.log('Load more button after click:', loadMoreAfter);
  }

  // Test 3: Test with a valid filter
  console.log('\nTest 3: Testing with Sweatshirt filter...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.type=Sweatshirt', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  const sweatshirtCount = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  console.log('Visible Sweatshirt products:', sweatshirtCount);

  await browser.close();
  console.log('\nDetailed test completed!');
})();