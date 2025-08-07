const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Debug output file
const debugLogFile = path.join(__dirname, 'filter-debug-output.log');
const debugMessages = [];

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  debugMessages.push(logEntry);
}

(async () => {
  log('Starting filter debug test...');
  
  const browser = await playwright.chromium.launch({
    headless: false, // Set to true for CI
    slowMo: 500 // Slow down actions to observe behavior
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    
    // Log all messages
    const logEntry = `[BROWSER-${type.toUpperCase()}] ${text}`;
    log(logEntry);
    
    // Also log errors with full details
    if (type === 'error') {
      msg.args().forEach(async (arg, i) => {
        try {
          const value = await arg.jsonValue();
          log(`  Error arg[${i}]: ${JSON.stringify(value)}`);
        } catch (e) {
          log(`  Error arg[${i}]: [Could not serialize]`);
        }
      });
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    log(`[PAGE ERROR] ${error.message}`);
    log(`  Stack: ${error.stack}`);
  });

  // Capture request failures
  page.on('requestfailed', request => {
    log(`[REQUEST FAILED] ${request.url()}`);
    log(`  Failure: ${request.failure().errorText}`);
  });

  try {
    // Step 1: Navigate to collection page
    log('\n=== STEP 1: Navigating to collection page ===');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for page to stabilize
    await page.waitForTimeout(3000);
    
    // Step 2: Check initial state
    log('\n=== STEP 2: Checking initial page state ===');
    
    // Count initial products
    const initialProductCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]');
      const visibleItems = Array.from(items).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      console.log(`DEBUG: Total products found: ${items.length}`);
      console.log(`DEBUG: Visible products: ${visibleItems.length}`);
      
      return {
        total: items.length,
        visible: visibleItems.length
      };
    });
    
    log(`Initial products - Total: ${initialProductCount.total}, Visible: ${initialProductCount.visible}`);
    
    // Take initial screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'debug-1-initial-state.png'),
      fullPage: false
    });
    log('Screenshot saved: debug-1-initial-state.png');
    
    // Step 3: Open filter drawer
    log('\n=== STEP 3: Opening filter drawer ===');
    
    // Find and click filter button
    const filterButton = await page.$('[data-drawer-toggle="filter"]');
    if (!filterButton) {
      throw new Error('Filter button not found');
    }
    
    await filterButton.click();
    await page.waitForTimeout(1000); // Wait for drawer animation
    
    // Verify drawer is open
    const drawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector('[data-drawer-id="filter"]');
      if (!drawer) {
        console.log('DEBUG: Filter drawer element not found');
        return false;
      }
      
      const isOpen = drawer.classList.contains('drawer--active');
      console.log(`DEBUG: Filter drawer open: ${isOpen}`);
      console.log(`DEBUG: Drawer classes: ${drawer.className}`);
      
      return isOpen;
    });
    
    if (!drawerOpen) {
      throw new Error('Filter drawer did not open');
    }
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'debug-2-filter-drawer-open.png'),
      fullPage: false
    });
    log('Screenshot saved: debug-2-filter-drawer-open.png');
    
    // Step 4: Find and apply a filter
    log('\n=== STEP 4: Applying filter ===');
    
    // Look for ACCESSORIES filter or any available filter
    const filterInfo = await page.evaluate(() => {
      const filters = document.querySelectorAll('[data-filter-group="product_type"] [data-filter-value]');
      console.log(`DEBUG: Found ${filters.length} product type filters`);
      
      const filterData = [];
      filters.forEach((filter, index) => {
        const value = filter.getAttribute('data-filter-value');
        const text = filter.textContent.trim();
        const isActive = filter.classList.contains('filter--active');
        
        console.log(`DEBUG: Filter ${index}: "${text}" (value: "${value}", active: ${isActive})`);
        filterData.push({ value, text, isActive, element: filter });
      });
      
      // Find ACCESSORIES or use first available filter
      let targetFilter = filterData.find(f => f.text.includes('ACCESSORIES'));
      if (!targetFilter && filterData.length > 0) {
        targetFilter = filterData[0];
      }
      
      return {
        available: filterData.map(f => ({ value: f.value, text: f.text, isActive: f.isActive })),
        target: targetFilter ? { value: targetFilter.value, text: targetFilter.text } : null
      };
    });
    
    log(`Available filters: ${JSON.stringify(filterInfo.available, null, 2)}`);
    log(`Target filter: ${JSON.stringify(filterInfo.target, null, 2)}`);
    
    if (!filterInfo.target) {
      throw new Error('No filters available to test');
    }
    
    // Click the filter
    log(`\nClicking filter: "${filterInfo.target.text}"`);
    
    // Set up mutation observer before clicking
    await page.evaluate(() => {
      window.gridMutations = [];
      const grid = document.querySelector('[data-product-grid]');
      
      if (grid) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            const timestamp = new Date().toISOString();
            const info = {
              time: timestamp,
              type: mutation.type,
              target: mutation.target.tagName,
              targetClasses: mutation.target.className
            };
            
            if (mutation.type === 'attributes') {
              info.attributeName = mutation.attributeName;
              info.oldValue = mutation.oldValue;
              info.newValue = mutation.target.getAttribute(mutation.attributeName);
            } else if (mutation.type === 'childList') {
              info.addedNodes = mutation.addedNodes.length;
              info.removedNodes = mutation.removedNodes.length;
            }
            
            window.gridMutations.push(info);
            console.log('DEBUG: Grid mutation:', JSON.stringify(info));
          });
        });
        
        observer.observe(grid, {
          childList: true,
          attributes: true,
          attributeOldValue: true,
          subtree: true
        });
        
        console.log('DEBUG: Mutation observer set up on product grid');
      }
    });
    
    // Click the filter
    await page.click(`[data-filter-value="${filterInfo.target.value}"]`);
    
    // Wait for filtering to complete
    log('Waiting for filter to apply...');
    await page.waitForTimeout(3000);
    
    // Step 5: Check filter results
    log('\n=== STEP 5: Checking filter results ===');
    
    const filterResults = await page.evaluate(() => {
      // Get mutation count
      const mutationCount = window.gridMutations ? window.gridMutations.length : 0;
      console.log(`DEBUG: Total grid mutations detected: ${mutationCount}`);
      
      // Count products after filtering
      const items = document.querySelectorAll('[data-product-grid-item]');
      const visibleItems = Array.from(items).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      console.log(`DEBUG: After filter - Total products: ${items.length}`);
      console.log(`DEBUG: After filter - Visible products: ${visibleItems.length}`);
      
      // Check active filters
      const activeFilters = Array.from(document.querySelectorAll('.filter--active')).map(f => ({
        text: f.textContent.trim(),
        value: f.getAttribute('data-filter-value')
      }));
      
      console.log(`DEBUG: Active filters: ${JSON.stringify(activeFilters)}`);
      
      // Check URL
      console.log(`DEBUG: Current URL: ${window.location.href}`);
      
      return {
        total: items.length,
        visible: visibleItems.length,
        mutations: mutationCount,
        activeFilters: activeFilters,
        url: window.location.href
      };
    });
    
    log(`Filter results:`);
    log(`  - Total products: ${filterResults.total}`);
    log(`  - Visible products: ${filterResults.visible}`);
    log(`  - Grid mutations: ${filterResults.mutations}`);
    log(`  - Active filters: ${JSON.stringify(filterResults.activeFilters)}`);
    log(`  - URL: ${filterResults.url}`);
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'debug-3-filter-applied.png'),
      fullPage: false
    });
    log('Screenshot saved: debug-3-filter-applied.png');
    
    // Step 6: Close drawer and check final state
    log('\n=== STEP 6: Closing drawer and checking final state ===');
    
    // Close drawer
    const closeButton = await page.$('[data-drawer-id="filter"] [data-drawer-close]');
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Final product count
    const finalProductCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]');
      const visibleItems = Array.from(items).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      return {
        total: items.length,
        visible: visibleItems.length
      };
    });
    
    log(`Final products - Total: ${finalProductCount.total}, Visible: ${finalProductCount.visible}`);
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'debug-4-final-state.png'),
      fullPage: false
    });
    log('Screenshot saved: debug-4-final-state.png');
    
    // Step 7: Test flicker by monitoring for additional changes
    log('\n=== STEP 7: Monitoring for flickering (5 seconds) ===');
    
    // Reset mutation counter
    await page.evaluate(() => {
      window.additionalMutations = 0;
      const grid = document.querySelector('[data-product-grid]');
      
      if (grid) {
        const observer = new MutationObserver(() => {
          window.additionalMutations++;
        });
        
        observer.observe(grid, {
          childList: true,
          attributes: true,
          subtree: true
        });
      }
    });
    
    // Wait and check for unexpected changes
    await page.waitForTimeout(5000);
    
    const flickerCheck = await page.evaluate(() => {
      return {
        additionalMutations: window.additionalMutations || 0
      };
    });
    
    log(`Flicker check - Additional mutations in 5 seconds: ${flickerCheck.additionalMutations}`);
    
    if (flickerCheck.additionalMutations > 0) {
      log('WARNING: Flickering detected! Grid changed after filtering completed.');
    } else {
      log('SUCCESS: No flickering detected. Grid remained stable.');
    }
    
  } catch (error) {
    log(`\n[ERROR] Test failed: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
    
    // Take error screenshot
    try {
      await page.screenshot({
        path: path.join(screenshotsDir, 'debug-error-state.png'),
        fullPage: false
      });
      log('Error screenshot saved: debug-error-state.png');
    } catch (screenshotError) {
      log('Failed to capture error screenshot');
    }
  } finally {
    // Save all debug output to file
    fs.writeFileSync(debugLogFile, debugMessages.join('\n'), 'utf8');
    log(`\nDebug output saved to: ${debugLogFile}`);
    
    // Close browser
    await browser.close();
    log('Browser closed. Test completed.');
  }
})();