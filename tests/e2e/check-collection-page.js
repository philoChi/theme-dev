const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Unable to serialize')));
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: args
    });
    console.log(`[${msg.type().toUpperCase()}]`, ...args);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  console.log('Testing collection page at http://127.0.0.1:42597/collections/all...');
  
  try {
    await page.goto('http://127.0.0.1:42597/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000);
    
    // Check for critical elements
    const hasCollectionSection = await page.$('.section-collection-page') !== null;
    const hasProductGrid = await page.$('[data-product-grid]') !== null;
    const hasFilterButton = await page.$('[data-drawer-trigger="filter"]') !== null;
    const hasProducts = await page.$$('[data-product-grid-item]').then(items => items.length);
    
    console.log('\n=== Page Structure Analysis ===');
    console.log('Collection section found:', hasCollectionSection);
    console.log('Product grid found:', hasProductGrid);
    console.log('Filter button found:', hasFilterButton);
    console.log('Number of products:', hasProducts);
    
    // Check collection data
    const hasCollectionData = await page.$('[data-collection-data]') !== null;
    console.log('Collection data script found:', hasCollectionData);
    
    if (hasCollectionData) {
      const dataContent = await page.$eval('[data-collection-data]', el => {
        try {
          const data = JSON.parse(el.textContent);
          return {
            hasProducts: Array.isArray(data.products),
            productCount: data.products?.length || 0,
            hasFilterOptions: !!data.filterOptions
          };
        } catch (e) {
          return { error: e.message };
        }
      });
      console.log('Collection data:', dataContent);
    }
    
    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/collection-page-check.png',
      fullPage: false
    });
    
    // Test filter drawer interaction
    if (hasFilterButton) {
      console.log('\n=== Testing Filter Drawer ===');
      await page.click('[data-drawer-trigger="filter"]');
      await page.waitForTimeout(500);
      
      const drawerOpen = await page.$('.drawer.is-open') !== null;
      const filterContent = await page.$('[data-filter-drawer-content]') !== null;
      
      console.log('Drawer opened:', drawerOpen);
      console.log('Filter content found:', filterContent);
      
      await page.screenshot({
        path: 'tests/e2e/screenshots/filter-drawer-open.png',
        fullPage: false
      });
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
  }
  
  console.log('\n=== Console Log Summary ===');
  console.log('Total logs:', consoleLogs.length);
  console.log('Errors:', consoleLogs.filter(l => l.type === 'error').length);
  console.log('Warnings:', consoleLogs.filter(l => l.type === 'warning').length);
  
  await browser.close();
})();