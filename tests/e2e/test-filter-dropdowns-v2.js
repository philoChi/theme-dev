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
  await page.waitForTimeout(1500);

  // Take screenshot of filter drawer
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-drawer-overview.png',
    fullPage: false
  });

  // Test each dropdown by clicking the trigger button
  const dropdowns = [
    { panel: 'filter-product-type', name: 'Product Type', selector: '[data-filter-group="type"]' },
    { panel: 'filter-size', name: 'Size', selector: '[data-filter-group="size"]' },
    { panel: 'filter-color', name: 'Color', selector: '[data-filter-group="color"]' },
    { panel: 'filter-gender', name: 'Gender', selector: '[data-filter-group="gender"]' },
    { panel: 'filter-tags', name: 'Tags', selector: '[data-filter-group="tags"]' },
    { panel: 'filter-availability', name: 'Availability', selector: '[data-filter-group="availability"]' }
  ];

  for (let i = 0; i < dropdowns.length; i++) {
    const dropdown = dropdowns[i];
    console.log(`\n2. Testing ${dropdown.name} dropdown...`);
    
    try {
      // Find the trigger button (it's within the dropdown feature)
      const triggerButton = await page.$(`button[aria-controls="${dropdown.panel}-panel"]`);
      
      if (triggerButton) {
        // Click to open
        await triggerButton.click();
        await page.waitForTimeout(800);
        
        // Count options in this filter group
        const options = await page.$$eval(`${dropdown.selector} [data-filter-value], ${dropdown.selector} input[type="checkbox"]`, 
          elements => elements.length
        );
        console.log(`   - Number of options: ${options}`);
        
        // Get option details based on filter type
        if (dropdown.name === 'Size') {
          const sizes = await page.$$eval('.size-pill[data-filter-value]', 
            pills => pills.slice(0, 10).map(p => p.textContent.trim())
          );
          console.log(`   - Sizes available: ${sizes.join(', ')}`);
        } else if (dropdown.name === 'Color') {
          const colors = await page.$$eval('.color-swatch[data-filter-value]', 
            swatches => swatches.slice(0, 10).map(s => s.getAttribute('data-filter-value'))
          );
          console.log(`   - Colors available: ${colors.join(', ')}`);
        } else if (dropdown.name === 'Tags' || dropdown.name === 'Product Type') {
          const items = await page.$$eval(`${dropdown.selector} .filter-option__label`, 
            labels => labels.slice(0, 10).map(l => l.textContent.trim())
          );
          console.log(`   - Options: ${items.join(', ')}`);
        }
        
        // Take screenshot with dropdown open
        await page.screenshot({
          path: `tests/e2e/screenshots/filter-${dropdown.panel}-open.png`,
          fullPage: false
        });
        
        // Close dropdown
        await triggerButton.click();
        await page.waitForTimeout(500);
      } else {
        console.log(`   - Trigger button not found for ${dropdown.name}`);
      }
    } catch (error) {
      console.log(`   - Error testing ${dropdown.name}:`, error.message);
    }
  }

  // Take a full-page screenshot of the filter drawer
  console.log('\n3. Taking full filter drawer screenshot...');
  
  // Open all dropdowns
  for (const dropdown of dropdowns) {
    const trigger = await page.$(`button[aria-controls="${dropdown.panel}-panel"]`);
    if (trigger) {
      await trigger.click();
      await page.waitForTimeout(300);
    }
  }
  
  // Scroll to capture full content
  await page.evaluate(() => {
    const drawer = document.querySelector('[data-filter-drawer-content]');
    if (drawer) drawer.scrollIntoView();
  });
  
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-drawer-all-open.png',
    fullPage: true
  });

  // Test some filter selections
  console.log('\n4. Testing filter interactions...');
  
  // Select a few filters
  const typeCheckbox = await page.$('[data-filter-group="type"] input[type="checkbox"]');
  if (typeCheckbox) {
    await typeCheckbox.click();
    console.log('   - Selected a product type filter');
  }
  
  const colorSwatch = await page.$('.color-swatch[data-filter-value]');
  if (colorSwatch) {
    await colorSwatch.click();
    console.log('   - Selected a color filter');
  }
  
  const sizePill = await page.$('.size-pill[data-filter-value]');
  if (sizePill) {
    await sizePill.click();
    console.log('   - Selected a size filter');
  }
  
  await page.waitForTimeout(1000);
  
  // Check active filters
  await page.screenshot({
    path: 'tests/e2e/screenshots/filter-drawer-with-selections.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nFilter dropdown screenshot tests completed!');
  console.log('\nScreenshots saved in tests/e2e/screenshots/');
})();