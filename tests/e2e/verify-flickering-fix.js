const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Add console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });

  try {
    console.log('1. Loading collection page...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/flickering-test-initial.png',
      fullPage: false
    });
    console.log('✓ Initial screenshot saved');

    // Count initial products
    const initialCount = await page.$$eval('[data-product-grid-item]', items => items.length);
    console.log(`✓ Found ${initialCount} products on initial load`);

    console.log('\n2. Testing filter interaction...');
    // Click on a filter (if available)
    const filterButton = await page.$('[data-filter-value]');
    if (filterButton) {
      await filterButton.click();
      console.log('✓ Clicked on filter');
      await page.waitForTimeout(1500);
      
      // Count products after filter
      const filteredCount = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', items => items.length);
      console.log(`✓ ${filteredCount} products visible after filter`);
    } else {
      console.log('- No filters found to test');
    }

    console.log('\n3. Testing sort interaction...');
    // Try changing sort order
    const sortSelect = await page.$('[data-sort-select]');
    if (sortSelect) {
      await sortSelect.selectOption({ index: 1 });
      console.log('✓ Changed sort order');
      await page.waitForTimeout(1500);
    } else {
      console.log('- No sort options found');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/flickering-test-final.png',
      fullPage: false
    });
    console.log('✓ Final screenshot saved');

    console.log('\n4. Checking for flickering...');
    // Monitor for any unexpected changes
    let changeDetected = false;
    await page.evaluate(() => {
      window.gridMutations = 0;
      const grid = document.querySelector('[data-product-grid]');
      if (grid) {
        const observer = new MutationObserver(() => {
          window.gridMutations++;
        });
        observer.observe(grid, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    });

    // Wait and check for mutations
    await page.waitForTimeout(3000);
    const mutations = await page.evaluate(() => window.gridMutations || 0);
    
    if (mutations > 0) {
      console.log(`⚠ Detected ${mutations} DOM mutations in 3 seconds`);
    } else {
      console.log('✓ No flickering detected - grid is stable');
    }

    console.log('\n✅ Verification complete!');
    console.log('Check screenshots at:');
    console.log('  - tests/e2e/screenshots/flickering-test-initial.png');
    console.log('  - tests/e2e/screenshots/flickering-test-final.png');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await browser.close();
  }
})();