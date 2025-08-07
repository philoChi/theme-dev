const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Testing configured tag filtering...\n');

  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  // Check collection data for new tag structure
  const tagData = await page.evaluate(() => {
    const script = document.querySelector('[data-collection-data]');
    if (script) {
      try {
        const data = JSON.parse(script.textContent);
        return {
          tags: data.filterOptions.tags,
          totalProducts: data.products.length
        };
      } catch (e) {
        return { error: e.message };
      }
    }
    return null;
  });

  console.log('Tag data from collection:', JSON.stringify(tagData, null, 2));

  // Open filter drawer
  await page.click('[data-drawer-trigger="filter"]');
  await page.waitForTimeout(1500);

  // Get tag filter options from UI
  const tagOptions = await page.evaluate(() => {
    const tagLabels = document.querySelectorAll('[data-filter-group="tags"] .filter-option__label');
    const tagCounts = document.querySelectorAll('[data-filter-group="tags"] .filter-option__count');
    
    const options = [];
    tagLabels.forEach((label, index) => {
      const count = tagCounts[index]?.textContent || '';
      options.push({
        label: label.textContent.trim(),
        count: count.trim()
      });
    });
    
    return options;
  });

  console.log('\nTag options in filter UI:');
  tagOptions.forEach((option, index) => {
    console.log(`${index + 1}. ${option.label} ${option.count}`);
  });

  // Test selecting a configured tag
  console.log('\nTesting configured tag selection...');
  const firstTagCheckbox = await page.$('[data-filter-group="tags"] input[type="checkbox"]');
  if (firstTagCheckbox) {
    const tagValue = await firstTagCheckbox.getAttribute('data-filter-value');
    console.log(`Selecting tag: ${tagValue}`);
    
    await firstTagCheckbox.click();
    await page.waitForTimeout(1000);
    
    // Check filtered products
    const filteredCount = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', 
      items => items.length
    );
    console.log(`Products shown after filter: ${filteredCount}`);
  }

  // Take screenshot
  await page.screenshot({
    path: 'tests/e2e/screenshots/configured-tag-filtering.png',
    fullPage: false
  });

  await browser.close();
  console.log('\nConfigured tag filtering test completed!');
})();