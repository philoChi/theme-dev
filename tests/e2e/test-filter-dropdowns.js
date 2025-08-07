const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing filter dropdown contents...\n');

  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  // Open filter drawer first
  console.log('1. Opening filter drawer...');
  await page.click('[data-drawer-trigger="filter"]');
  await page.waitForTimeout(1000);

  // Take screenshot of closed dropdowns
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-drawer-closed-dropdowns.png',
    fullPage: false
  });

  // Test each dropdown
  const dropdowns = [
    { id: 'filter-product-type', name: 'Product Type' },
    { id: 'filter-size', name: 'Size' },
    { id: 'filter-color', name: 'Color' },
    { id: 'filter-gender', name: 'Gender' },
    { id: 'filter-tags', name: 'Tags' },
    { id: 'filter-availability', name: 'Availability' }
  ];

  for (const dropdown of dropdowns) {
    console.log(`\n2. Testing ${dropdown.name} dropdown...`);
    
    // Find and click the dropdown trigger
    const trigger = await page.$(`#${dropdown.id}`);
    if (trigger) {
      // Click to open
      await trigger.click();
      await page.waitForTimeout(500);
      
      // Check if panel is expanded
      const isExpanded = await page.$eval(`#${dropdown.id}`, el => 
        el.getAttribute('aria-expanded') === 'true'
      );
      
      console.log(`   - Dropdown opened: ${isExpanded}`);
      
      // Count options
      const optionCount = await page.$$eval(`#${dropdown.id}-panel [data-filter-value]`, 
        options => options.length
      );
      console.log(`   - Number of options: ${optionCount}`);
      
      // Get first few option texts
      if (optionCount > 0) {
        const optionTexts = await page.$$eval(`#${dropdown.id}-panel [data-filter-value]`, 
          options => options.slice(0, 5).map(opt => {
            const label = opt.textContent || opt.getAttribute('aria-label') || '';
            return label.trim();
          })
        );
        console.log(`   - Sample options: ${optionTexts.join(', ')}`);
      }
      
      // Take screenshot
      await page.screenshot({
        path: `tests/e2e/screenshots/filter-dropdown-${dropdown.id}.png`,
        fullPage: false
      });
      
      // Click again to close
      await trigger.click();
      await page.waitForTimeout(300);
    } else {
      console.log(`   - Dropdown not found: ${dropdown.id}`);
    }
  }

  // Test opening multiple dropdowns
  console.log('\n3. Testing multiple dropdowns open...');
  
  // Open type and size dropdowns
  const typeDropdown = await page.$('#filter-product-type');
  const sizeDropdown = await page.$('#filter-size');
  
  if (typeDropdown) await typeDropdown.click();
  await page.waitForTimeout(300);
  if (sizeDropdown) await sizeDropdown.click();
  await page.waitForTimeout(300);
  
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-multiple-dropdowns-open.png',
    fullPage: false
  });

  // Test filter interaction
  console.log('\n4. Testing filter selection...');
  
  // Select a type filter
  const firstTypeOption = await page.$('#filter-product-type-panel input[type="checkbox"]');
  if (firstTypeOption) {
    await firstTypeOption.click();
    await page.waitForTimeout(500);
  }
  
  // Select a color
  const firstColorSwatch = await page.$('.color-swatch[data-filter-type="color"]');
  if (firstColorSwatch) {
    await firstColorSwatch.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-with-selections.png',
    fullPage: false
  });

  // Check active filters display
  const activeFilters = await page.$$eval('[data-active-filters] .active-filter', 
    filters => filters.map(f => f.textContent.trim())
  );
  console.log('\n5. Active filters:', activeFilters);

  await browser.close();
  console.log('\nFilter dropdown testing completed!');
})();