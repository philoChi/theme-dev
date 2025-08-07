const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Track console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Track network errors
  page.on('pageerror', error => {
    consoleMessages.push(`[ERROR] ${error.message}`);
  });

  console.log('🧪 Starting Smooth Filtering Test\n');

  try {
    // Step 1: Load collection page
    console.log('📍 Step 1: Loading collection page...');
    const startTime = Date.now();
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(2000); // Let page settle
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Page loaded in ${loadTime}ms`);
    
    // Count initial products
    const initialCount = await page.$$eval('[data-product-grid-item]', items => 
      items.filter(item => !item.style.display || item.style.display !== 'none').length
    );
    console.log(`📊 Initial visible products: ${initialCount}`);
    
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-01-initial.png',
      fullPage: false
    });

    // Step 2: Open filter drawer
    console.log('\n📍 Step 2: Opening filter drawer...');
    const filterButton = await page.$('[data-drawer-trigger="filter"]');
    if (!filterButton) {
      throw new Error('Filter button not found!');
    }
    
    await filterButton.click();
    await page.waitForTimeout(500); // Wait for drawer animation
    
    const filterDrawer = await page.$('[data-drawer="filter"]');
    const isDrawerOpen = await filterDrawer.evaluate(el => 
      el.classList.contains('is-open') || el.hasAttribute('open')
    );
    
    if (!isDrawerOpen) {
      throw new Error('Filter drawer did not open!');
    }
    
    console.log('✅ Filter drawer opened');
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-02-drawer-open.png',
      fullPage: false
    });

    // Step 3: Apply size filter
    console.log('\n📍 Step 3: Applying size filter (M)...');
    
    // Watch for DOM changes
    let flickerDetected = false;
    await page.evaluate(() => {
      window.domChanges = 0;
      const grid = document.querySelector('[data-product-grid]');
      if (grid) {
        const observer = new MutationObserver(() => {
          window.domChanges++;
        });
        observer.observe(grid, { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    });
    
    const sizeFilterStart = Date.now();
    
    // Click size M
    const sizeM = await page.$('[data-filter-value="M"]');
    if (sizeM) {
      await sizeM.click();
      console.log('✅ Clicked size M filter');
    } else {
      console.log('⚠️  Size M filter not found, trying alternative selector...');
      const altSizeM = await page.$('text=M');
      if (altSizeM) await altSizeM.click();
    }
    
    // Screenshot during transition
    await page.waitForTimeout(100);
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-03-during-size-filter.png',
      fullPage: false
    });
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    const sizeFilterTime = Date.now() - sizeFilterStart;
    const domChangesAfterSize = await page.evaluate(() => window.domChanges);
    
    // Count products after size filter
    const afterSizeCount = await page.$$eval('[data-product-grid-item]', items => 
      items.filter(item => !item.style.display || item.style.display !== 'none').length
    );
    
    console.log(`📊 Products after size filter: ${afterSizeCount} (was ${initialCount})`);
    console.log(`⏱️  Size filter applied in ${sizeFilterTime}ms`);
    console.log(`🔄 DOM changes detected: ${domChangesAfterSize}`);
    
    if (domChangesAfterSize > 10) {
      flickerDetected = true;
      console.log('⚠️  Warning: High DOM mutation count may indicate flickering');
    }
    
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-04-after-size-filter.png',
      fullPage: false
    });

    // Step 4: Apply color filter
    console.log('\n📍 Step 4: Applying color filter (black)...');
    
    // Reset DOM change counter
    await page.evaluate(() => { window.domChanges = 0; });
    
    const colorFilterStart = Date.now();
    
    // Click color black
    const colorBlack = await page.$('[data-filter-value="black"]');
    if (colorBlack) {
      await colorBlack.click();
      console.log('✅ Clicked black color filter');
    } else {
      console.log('⚠️  Black color filter not found, trying alternative selector...');
      const altColorBlack = await page.$('text=Black');
      if (altColorBlack) await altColorBlack.click();
    }
    
    // Screenshot during transition
    await page.waitForTimeout(100);
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-05-during-color-filter.png',
      fullPage: false
    });
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    const colorFilterTime = Date.now() - colorFilterStart;
    const domChangesAfterColor = await page.evaluate(() => window.domChanges);
    
    // Count products after both filters
    const afterBothCount = await page.$$eval('[data-product-grid-item]', items => 
      items.filter(item => !item.style.display || item.style.display !== 'none').length
    );
    
    console.log(`📊 Products after both filters: ${afterBothCount} (was ${afterSizeCount})`);
    console.log(`⏱️  Color filter applied in ${colorFilterTime}ms`);
    console.log(`🔄 DOM changes detected: ${domChangesAfterColor}`);
    
    if (domChangesAfterColor > 10) {
      flickerDetected = true;
      console.log('⚠️  Warning: High DOM mutation count may indicate flickering');
    }
    
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-06-after-both-filters.png',
      fullPage: false
    });

    // Step 5: Check URL and active filters
    console.log('\n📍 Step 5: Verifying filter state...');
    
    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);
    
    const hasUrlFilters = currentUrl.includes('filter.') || currentUrl.includes('filter=');
    console.log(`✅ URL contains filters: ${hasUrlFilters ? 'Yes' : 'No'}`);
    
    // Check active filter indicators
    const activeFilters = await page.$$eval('.filter--active, [data-filter-active]', elements => 
      elements.map(el => el.textContent.trim())
    );
    console.log(`🏷️  Active filters shown: ${activeFilters.length > 0 ? activeFilters.join(', ') : 'None visible'}`);

    // Final assessment
    console.log('\n📋 TEST RESULTS:');
    console.log('================');
    
    const testsPassed = [];
    const testsFailed = [];
    
    // Check 1: Products filtered
    if (afterBothCount < initialCount) {
      testsPassed.push('Products were filtered correctly');
    } else {
      testsFailed.push('Products were not filtered (count unchanged)');
    }
    
    // Check 2: No flickering
    if (!flickerDetected) {
      testsPassed.push('No excessive flickering detected');
    } else {
      testsFailed.push('Possible flickering detected (high DOM mutations)');
    }
    
    // Check 3: Performance
    if (sizeFilterTime < 1000 && colorFilterTime < 1000) {
      testsPassed.push('Filters applied quickly');
    } else {
      testsFailed.push('Filters took too long to apply');
    }
    
    // Check 4: No errors
    const errors = consoleMessages.filter(msg => msg.includes('[error]'));
    if (errors.length === 0) {
      testsPassed.push('No JavaScript errors');
    } else {
      testsFailed.push(`JavaScript errors detected: ${errors.length}`);
      errors.forEach(err => console.log(`  ${err}`));
    }
    
    // Print results
    console.log('\n✅ PASSED:');
    testsPassed.forEach(test => console.log(`  - ${test}`));
    
    if (testsFailed.length > 0) {
      console.log('\n❌ FAILED:');
      testsFailed.forEach(test => console.log(`  - ${test}`));
    }
    
    // Overall result
    const overallPass = testsFailed.length === 0;
    console.log(`\n${overallPass ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
    
    // Summary stats
    console.log('\n📊 Summary:');
    console.log(`  - Initial products: ${initialCount}`);
    console.log(`  - After size filter: ${afterSizeCount}`);
    console.log(`  - After both filters: ${afterBothCount}`);
    console.log(`  - Total filtering time: ${sizeFilterTime + colorFilterTime}ms`);
    console.log(`  - Screenshots saved: 6`);

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    await page.screenshot({
      path: 'tests/e2e/screenshots/smooth-error.png',
      fullPage: false
    });
  } finally {
    await browser.close();
    console.log('\n✅ Test completed!');
  }
})();