const playwright = require('playwright');

(async () => {
  console.log('Starting filter test in headless mode...\n');
  
  const browser = await playwright.chromium.launch({
    headless: true // No display needed
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    
    // Print DEBUG messages immediately
    if (text.includes('DEBUG') || text.includes('Filter')) {
      console.log(`CONSOLE: ${text}`);
    }
  });

  // Also capture any errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    // Step 1: Load the collection page
    console.log('Step 1: Loading collection page...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait a bit for JavaScript to initialize
    await page.waitForTimeout(2000);
    
    // Count initial products
    const initialCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])');
      return items.length;
    });
    console.log(`Initial visible products: ${initialCount}\n`);

    // Step 2: Inject script to trigger filter
    console.log('Step 2: Triggering filter change...');
    const filterResult = await page.evaluate(() => {
      // Find the collection page instance
      const collectionPage = document.querySelector('collection-page');
      if (!collectionPage) {
        return { error: 'collection-page element not found' };
      }

      // Try to access the filter system
      const filterDrawer = document.querySelector('[data-drawer-id="filter"]');
      const filterCheckboxes = document.querySelectorAll('[data-filter-checkbox]');
      
      // Get some debug info
      const debugInfo = {
        hasCollectionPage: !!collectionPage,
        hasFilterDrawer: !!filterDrawer,
        checkboxCount: filterCheckboxes.length,
        firstCheckboxValue: filterCheckboxes[0]?.value || 'none'
      };

      // Try to trigger a filter change manually
      if (filterCheckboxes.length > 0) {
        const firstCheckbox = filterCheckboxes[0];
        
        // Simulate checking the checkbox
        firstCheckbox.checked = true;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        firstCheckbox.dispatchEvent(changeEvent);
        
        debugInfo.triggered = true;
        debugInfo.filterValue = firstCheckbox.value;
      }

      return debugInfo;
    });

    console.log('Filter trigger result:', JSON.stringify(filterResult, null, 2));
    console.log('');

    // Step 3: Wait and observe changes
    console.log('Step 3: Waiting for filter to apply...');
    await page.waitForTimeout(3000);

    // Count products after filter
    const afterCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])');
      return items.length;
    });
    console.log(`\nVisible products after filter: ${afterCount}`);
    console.log(`Products hidden: ${initialCount - afterCount}\n`);

    // Step 4: Check for multiple renders (flickering)
    console.log('Step 4: Monitoring for flickering (5 seconds)...');
    
    const renderCounts = await page.evaluate(() => {
      let renderCount = 0;
      let lastHTML = '';
      const grid = document.querySelector('[data-product-grid]');
      
      if (grid) {
        // Monitor for changes
        const checkInterval = setInterval(() => {
          const currentHTML = grid.innerHTML;
          if (currentHTML !== lastHTML) {
            renderCount++;
            lastHTML = currentHTML;
            console.log(`DEBUG: Grid rendered ${renderCount} times`);
          }
        }, 100);

        // Stop after 5 seconds
        return new Promise(resolve => {
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(renderCount);
          }, 5000);
        });
      }
      
      return 0;
    });

    console.log(`\nTotal grid renders detected: ${renderCounts}`);
    
    // Print all collected console logs
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(log => console.log(log));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
    console.log('\nTest completed.');
  }
})();