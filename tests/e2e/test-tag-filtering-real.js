const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test specific tag filter
  console.log('Testing specific tag filters...\n');
  
  // Test 1: Filter by 'adidas' tag
  console.log('Test 1: Filtering by "adidas" tag...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.tags=adidas', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);
  
  const adidasProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  console.log('Products with adidas tag:', adidasProducts);
  
  // Get product titles to verify
  const adidasTitles = await page.$$eval('[data-product-grid-item]:not([style*="display: none"]) .product-showcase-card__title', 
    elements => elements.slice(0, 3).map(el => el.textContent.trim())
  );
  console.log('Sample adidas products:', adidasTitles);
  
  // Test 2: Multiple tags (OR operation)
  console.log('\nTest 2: Filtering by multiple tags (adidas OR new)...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.tags=adidas&filter.tags=new', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);
  
  const multiTagProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  console.log('Products with adidas OR new tags:', multiTagProducts);
  
  // Test 3: Tag + Type combination (AND operation between different filter types)
  console.log('\nTest 3: Combining tag and type filters (adidas tag AND SHOES type)...');
  await page.goto('http://127.0.0.1:9292/collections/all?filter.tags=adidas&filter.type=SHOES', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);
  
  const combinedProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
    items => items.length
  );
  console.log('Products with adidas tag AND SHOES type:', combinedProducts);
  
  const combinedTitles = await page.$$eval('[data-product-grid-item]:not([style*="display: none"]) .product-showcase-card__title', 
    elements => elements.map(el => el.textContent.trim())
  );
  console.log('Products found:', combinedTitles);
  
  // Take screenshots
  await page.screenshot({
    path: 'tests/e2e/screenshots/tag-filter-combined-final.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nTag filtering tests completed successfully!');
})();