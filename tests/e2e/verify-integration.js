const playwright = require('playwright');

(async () => {
  console.log('=== Collection Page Integration Verification ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console output
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Unable to serialize')));
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: args
    });
    if (msg.type() === 'error') {
      console.error('[CONSOLE ERROR]', ...args);
    }
  });

  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });

  try {
    // Test 1: Verify drawer system integration
    console.log('1. Verifying drawer system integration...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Check if filter button exists
    const filterButton = await page.$('[data-drawer-trigger="filter"]');
    console.log('   - Filter drawer trigger button exists:', !!filterButton);

    // Open filter drawer
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      const filterDrawer = await page.$('[data-drawer-id="filter"]');
      const isOpen = filterDrawer ? await filterDrawer.evaluate(el => el.classList.contains('is-open')) : false;
      console.log('   - Filter drawer opens correctly:', isOpen);

      // Check for drawer overlay
      const overlay = await page.$('[data-drawer-overlay]');
      console.log('   - Drawer overlay present:', !!overlay);

      // Close drawer
      if (overlay) {
        await overlay.click();
        await page.waitForTimeout(500);
        const isClosed = filterDrawer ? await filterDrawer.evaluate(el => !el.classList.contains('is-open')) : true;
        console.log('   - Filter drawer closes correctly:', isClosed);
      }
    }

    // Test 2: Verify notification system integration
    console.log('\n2. Verifying notification system integration...');
    
    // Apply a filter to trigger notifications
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Check for notification elements
    const notificationSystem = await page.$('[data-notification-container]');
    console.log('   - Notification system container exists:', !!notificationSystem);

    // Test 3: Verify product card integration
    console.log('\n3. Verifying product card integration...');
    
    const productCards = await page.$$('[data-product-card]');
    console.log('   - Product cards found:', productCards.length);

    if (productCards.length > 0) {
      // Check first product card for embedded components
      const firstCard = productCards[0];
      
      const hasColorSwatches = await firstCard.$('[data-color-swatches]');
      console.log('   - Color swatches embedded in cards:', !!hasColorSwatches);
      
      const hasSizePills = await firstCard.$('[data-size-pills]');
      console.log('   - Size pills embedded in cards:', !!hasSizePills);
      
      const productLink = await firstCard.$('a[href*="/products/"]');
      console.log('   - Product linking preserved:', !!productLink);
    }

    // Test 4: Verify JavaScript architecture compliance
    console.log('\n4. Verifying JavaScript architecture compliance...');
    
    // Check for CollectionPage class
    const hasCollectionPage = await page.evaluate(() => {
      return typeof window.CollectionPage !== 'undefined';
    });
    console.log('   - CollectionPage class exists:', hasCollectionPage);

    // Check for custom events
    const customEventsFired = await page.evaluate(() => {
      let eventCount = 0;
      const originalDispatch = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function(event) {
        if (event.type.includes('collection') || event.type.includes('filter')) {
          eventCount++;
        }
        return originalDispatch.call(this, event);
      };
      return new Promise(resolve => {
        setTimeout(() => resolve(eventCount > 0), 1000);
      });
    });
    console.log('   - Custom events working:', customEventsFired);

    // Check for logger usage
    const hasLogger = consoleLogs.some(log => 
      log.text.includes('[CollectionPage]') || 
      log.text.includes('[FilterDrawer]')
    );
    console.log('   - Logger integration working:', hasLogger);

    // Test 5: Check for console errors
    console.log('\n5. Checking for console errors...');
    const errors = consoleLogs.filter(log => log.type === 'error');
    console.log('   - Console errors found:', errors.length);
    if (errors.length > 0) {
      errors.forEach(error => {
        console.log('   - Error:', error.text);
      });
    }

    // Take screenshots for visual verification
    console.log('\n6. Taking screenshots for visual verification...');
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({
      path: 'tests/e2e/screenshots/integration-desktop.png',
      fullPage: false
    });
    console.log('   - Desktop screenshot saved');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: 'tests/e2e/screenshots/integration-mobile.png',
      fullPage: false
    });
    console.log('   - Mobile screenshot saved');

    console.log('\n=== Integration Verification Summary ===');
    console.log('Total console logs:', consoleLogs.length);
    console.log('Errors encountered:', errors.length);
    console.log('Debug logs found:', consoleLogs.filter(l => l.text.includes('[') && l.text.includes(']')).length);

  } catch (error) {
    console.error('\n[VERIFICATION ERROR]', error.message);
  } finally {
    await browser.close();
    console.log('\nIntegration verification completed!');
  }
})();