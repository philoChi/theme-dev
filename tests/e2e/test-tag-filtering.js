const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Add console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });

  console.log('Testing tag filtering functionality...');
  
  // Test 1: Check if tag filter exists
  console.log('\nTest 1: Checking tag filter presence...');
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  // Open filter drawer
  const filterButton = await page.$('[data-drawer-trigger="filter"]');
  if (filterButton) {
    await filterButton.click();
    await page.waitForTimeout(1000);
  }

  // Check if tag filter dropdown exists
  const tagFilterDropdown = await page.$('#filter-tags');
  console.log('Tag filter dropdown exists:', !!tagFilterDropdown);

  // Check if tag options are populated
  const tagOptions = await page.$$('[data-filter-options="tags"] .filter-option');
  console.log('Number of tag filter options:', tagOptions.length);

  // Get tag names
  if (tagOptions.length > 0) {
    const tagNames = await page.$$eval('[data-filter-options="tags"] .filter-option__label', 
      elements => elements.map(el => el.textContent.trim())
    );
    console.log('Available tags:', tagNames.slice(0, 5), '...');
  }

  // Take screenshot of filter drawer
  await page.screenshot({
    path: 'tests/e2e/screenshots/tag-filter-dropdown.png',
    fullPage: false
  });

  // Test 2: Test tag filtering via URL
  console.log('\nTest 2: Testing tag filter via URL...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.tags=sale', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  // Count visible products
  const allProducts = await page.$$('[data-product-grid-item]');
  const visibleProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  
  console.log(`Total products: ${allProducts.length}`);
  console.log(`Visible products with 'sale' tag filter: ${visibleProducts}`);

  // Check if active filter is displayed
  const activeFilter = await page.$('[data-active-filters]');
  if (activeFilter) {
    const activeFilterText = await activeFilter.textContent();
    console.log('Active filter display:', activeFilterText.trim());
  }

  // Take screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/tag-filter-applied.png',
    fullPage: false
  });

  // Test 3: Test combined filters (tag + type)
  console.log('\nTest 3: Testing combined filters (tag + type)...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.tags=sale&filter.type=t-shirt', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  const combinedFilterProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  
  console.log(`Visible products with 'sale' tag AND 't-shirt' type: ${combinedFilterProducts}`);

  await page.screenshot({
    path: 'tests/e2e/screenshots/tag-filter-combined.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nTag filter testing completed!');
})();