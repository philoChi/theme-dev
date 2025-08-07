const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing pagination functionality...\n');

  // Test 1: Initial page load
  console.log('Test 1: Checking initial pagination state...');
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  // Check visible products
  const initialProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  console.log('Initial products displayed:', initialProducts);

  // Check if load more button exists
  const loadMoreExists = await page.$('[data-load-more]');
  console.log('Load more button exists:', !!loadMoreExists);

  if (loadMoreExists) {
    const loadMoreText = await page.$eval('[data-load-more]', el => el.textContent.trim());
    console.log('Load more button text:', loadMoreText);
  }

  // Check pagination info
  const paginationInfo = await page.$('[data-pagination-info]');
  if (paginationInfo) {
    const infoText = await paginationInfo.textContent();
    console.log('Pagination info:', infoText.trim());
  }

  // Test 2: Test load more functionality
  if (loadMoreExists) {
    console.log('\nTest 2: Testing load more button...');
    
    // Click load more
    await page.click('[data-load-more]');
    await page.waitForTimeout(2000);

    // Check products after load more
    const productsAfterLoad = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
      items => items.length
    );
    console.log('Products after clicking load more:', productsAfterLoad);
    console.log('New products loaded:', productsAfterLoad - initialProducts);

    // Check updated pagination info
    const updatedInfo = await page.$eval('[data-pagination-info]', el => el.textContent.trim());
    console.log('Updated pagination info:', updatedInfo);
  }

  // Test 3: Test pagination with filters
  console.log('\nTest 3: Testing pagination with filters...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.type=T-SHIRTS', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  const filteredProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  console.log('Filtered products (T-SHIRTS):', filteredProducts);

  // Check if load more is visible for filtered results
  const loadMoreVisibleFiltered = await page.$eval('[data-load-more]', el => 
    window.getComputedStyle(el).display !== 'none'
  ).catch(() => false);
  console.log('Load more visible with filter:', loadMoreVisibleFiltered);

  // Take screenshots
  await page.screenshot({
    path: 'tests/e2e/screenshots/pagination-test.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nPagination tests completed!');
})();