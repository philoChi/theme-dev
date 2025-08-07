const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Array to collect all console messages
  const consoleMessages = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Capture all console messages
  page.on('console', msg => {
    const logEntry = `[${new Date().toISOString()}] ${msg.type().toUpperCase()}: ${msg.text()}`;
    console.log(logEntry);
    consoleMessages.push(logEntry);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const errorEntry = `[${new Date().toISOString()}] PAGE ERROR: ${error.message}`;
    console.log(errorEntry);
    consoleMessages.push(errorEntry);
  });

  try {
    console.log('=== Starting Flickering Debug Session ===\n');
    consoleMessages.push('=== Starting Flickering Debug Session ===');

    // Step 1: Initial page load
    console.log('Step 1: Loading collection page...');
    consoleMessages.push('\n--- STEP 1: Initial Page Load ---');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for initial render
    await page.waitForTimeout(2000);
    
    // Count initial products
    const initialProductCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]');
      const visibleItems = Array.from(items).filter(item => 
        window.getComputedStyle(item).display !== 'none'
      );
      return {
        total: items.length,
        visible: visibleItems.length
      };
    });
    
    console.log(`Initial state: ${initialProductCount.visible} visible products out of ${initialProductCount.total} total`);
    consoleMessages.push(`Initial state: ${initialProductCount.visible} visible products out of ${initialProductCount.total} total`);
    
    // Take initial screenshot
    await page.screenshot({
      path: `tests/e2e/screenshots/debug-1-initial-${timestamp}.png`,
      fullPage: false
    });
    console.log('Screenshot saved: debug-1-initial.png\n');

    // Step 2: Open filter drawer
    console.log('Step 2: Opening filter drawer...');
    consoleMessages.push('\n--- STEP 2: Opening Filter Drawer ---');
    
    // Find and click filter button
    const filterButton = await page.$('[data-drawer-trigger="filter"]');
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(1000); // Wait for drawer animation
      console.log('Filter drawer opened');
      
      await page.screenshot({
        path: `tests/e2e/screenshots/debug-2-drawer-open-${timestamp}.png`,
        fullPage: false
      });
      console.log('Screenshot saved: debug-2-drawer-open.png\n');
    } else {
      console.error('Filter button not found!');
      consoleMessages.push('ERROR: Filter button not found!');
    }

    // Step 3: Apply a filter
    console.log('Step 3: Applying filter...');
    consoleMessages.push('\n--- STEP 3: Applying Filter ---');
    
    // Try to find and click the first available filter checkbox
    const filterCheckbox = await page.$('[data-filter-checkbox]:first-of-type');
    if (filterCheckbox) {
      // Get filter details before clicking
      const filterInfo = await page.evaluate(el => {
        return {
          name: el.dataset.filterName || 'unknown',
          value: el.dataset.filterValue || 'unknown',
          checked: el.checked
        };
      }, filterCheckbox);
      
      console.log(`Clicking filter: ${filterInfo.name} = ${filterInfo.value} (currently ${filterInfo.checked ? 'checked' : 'unchecked'})`);
      consoleMessages.push(`Clicking filter: ${filterInfo.name} = ${filterInfo.value} (currently ${filterInfo.checked ? 'checked' : 'unchecked'})`);
      
      await filterCheckbox.click();
      
      // Wait for filter to be applied
      await page.waitForTimeout(2000);
      
      // Count products after filter
      const filteredProductCount = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-product-grid-item]');
        const visibleItems = Array.from(items).filter(item => 
          window.getComputedStyle(item).display !== 'none'
        );
        return {
          total: items.length,
          visible: visibleItems.length
        };
      });
      
      console.log(`After filter: ${filteredProductCount.visible} visible products out of ${filteredProductCount.total} total`);
      consoleMessages.push(`After filter: ${filteredProductCount.visible} visible products out of ${filteredProductCount.total} total`);
      
      await page.screenshot({
        path: `tests/e2e/screenshots/debug-3-filter-applied-${timestamp}.png`,
        fullPage: false
      });
      console.log('Screenshot saved: debug-3-filter-applied.png\n');
    } else {
      console.error('No filter checkbox found!');
      consoleMessages.push('ERROR: No filter checkbox found!');
    }

    // Step 4: Monitor for flickering
    console.log('Step 4: Monitoring for flickering (5 seconds)...');
    consoleMessages.push('\n--- STEP 4: Monitoring for Flickering ---');
    
    // Set up mutation observer to detect changes
    const mutations = await page.evaluate(() => {
      return new Promise((resolve) => {
        const mutations = [];
        const startTime = Date.now();
        
        const observer = new MutationObserver((mutationsList) => {
          mutationsList.forEach(mutation => {
            mutations.push({
              time: Date.now() - startTime,
              type: mutation.type,
              target: mutation.target.tagName + (mutation.target.className ? `.${mutation.target.className}` : ''),
              addedNodes: mutation.addedNodes.length,
              removedNodes: mutation.removedNodes.length
            });
          });
        });
        
        const grid = document.querySelector('[data-product-grid]');
        if (grid) {
          observer.observe(grid, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
          });
        }
        
        // Monitor for 5 seconds
        setTimeout(() => {
          observer.disconnect();
          resolve(mutations);
        }, 5000);
      });
    });
    
    console.log(`Detected ${mutations.length} DOM mutations in 5 seconds`);
    consoleMessages.push(`Detected ${mutations.length} DOM mutations in 5 seconds`);
    
    if (mutations.length > 0) {
      console.log('First 10 mutations:');
      consoleMessages.push('First 10 mutations:');
      mutations.slice(0, 10).forEach(m => {
        const msg = `  - ${m.time}ms: ${m.type} on ${m.target} (added: ${m.addedNodes}, removed: ${m.removedNodes})`;
        console.log(msg);
        consoleMessages.push(msg);
      });
    }
    
    // Final screenshot
    await page.screenshot({
      path: `tests/e2e/screenshots/debug-4-final-${timestamp}.png`,
      fullPage: false
    });
    console.log('\nScreenshot saved: debug-4-final.png');

  } catch (error) {
    console.error('Error during debugging:', error);
    consoleMessages.push(`\nERROR: ${error.message}`);
  } finally {
    // Save console output to file
    const outputPath = path.join('e2e', 'screenshots', `debug-console-output-${timestamp}.txt`);
    fs.writeFileSync(outputPath, consoleMessages.join('\n'));
    console.log(`\n=== Debug session complete ===`);
    console.log(`Console output saved to: ${outputPath}`);
    console.log(`Screenshots saved with timestamp: ${timestamp}`);
    
    await browser.close();
  }
})();