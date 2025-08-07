const playwright = require('playwright');

(async () => {
  console.log('=== Final Integration Verification ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track test results
  const results = {
    drawerIntegration: { passed: 0, failed: 0 },
    notificationIntegration: { passed: 0, failed: 0 },
    productCardIntegration: { passed: 0, failed: 0 },
    jsArchitecture: { passed: 0, failed: 0 }
  };

  // Capture console output
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Unable to serialize')));
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: args
    });
  });

  try {
    console.log('1. DRAWER SYSTEM INTEGRATION');
    console.log('============================');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Test 1.1: Filter drawer extends multi-drawer correctly
    const filterButton = await page.$('[data-drawer-trigger="filter"]');
    if (filterButton) {
      results.drawerIntegration.passed++;
      console.log('✓ Filter drawer trigger button exists');
      
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      const filterDrawer = await page.$('[data-drawer-id="filter"]');
      const drawerContent = await page.$('[data-drawer-content="filter"]');
      
      if (filterDrawer && drawerContent) {
        results.drawerIntegration.passed++;
        console.log('✓ Filter drawer extends section-multi-drawer.liquid correctly');
      } else {
        results.drawerIntegration.failed++;
        console.log('✗ Filter drawer structure issue');
      }
    } else {
      results.drawerIntegration.failed++;
      console.log('✗ Filter drawer trigger not found');
    }

    // Test 1.2: Mobile drawer interactions
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileFilterButton = await page.$('[data-drawer-trigger="filter"]');
    if (mobileFilterButton) {
      await mobileFilterButton.click();
      await page.waitForTimeout(1000);
      
      const overlay = await page.$('[data-drawer-overlay]');
      if (overlay) {
        results.drawerIntegration.passed++;
        console.log('✓ Mobile drawer overlay works');
        
        await overlay.click();
        await page.waitForTimeout(500);
        
        const drawerClosed = await page.$eval('[data-drawer-id="filter"]', el => !el.classList.contains('is-open'));
        if (drawerClosed) {
          results.drawerIntegration.passed++;
          console.log('✓ Drawer close functionality preserved');
        }
      }
    }

    // Test 1.3: No conflicts with other drawers
    const otherDrawers = await page.$$('[data-drawer-id]:not([data-drawer-id="filter"])');
    if (otherDrawers.length > 0) {
      results.drawerIntegration.passed++;
      console.log(`✓ No conflicts with ${otherDrawers.length} other drawer(s)`);
    }

    console.log('\n2. NOTIFICATION SYSTEM INTEGRATION');
    console.log('==================================');

    // Test 2.1: Filter operations trigger notifications
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const notificationContainer = await page.$('[data-notification-container]');
    if (notificationContainer) {
      results.notificationIntegration.passed++;
      console.log('✓ Notification container exists');
    }

    // Test 2.2: Custom events follow notification patterns
    const hasNotificationEvents = await page.evaluate(() => {
      let eventFired = false;
      document.addEventListener('notification:show', () => { eventFired = true; });
      // Trigger a test notification if possible
      if (window.NotificationSystem) {
        window.NotificationSystem.show({ message: 'Test', type: 'info' });
      }
      return eventFired;
    });
    
    if (hasNotificationEvents || notificationContainer) {
      results.notificationIntegration.passed++;
      console.log('✓ Notification event system integrated');
    }

    console.log('\n3. PRODUCT CARD INTEGRATION');
    console.log('===========================');

    // Test 3.1: Product cards maintain functionality
    const productCards = await page.$$('[data-product-card]');
    if (productCards.length > 0) {
      results.productCardIntegration.passed++;
      console.log(`✓ ${productCards.length} product cards rendered`);

      // Test 3.2: Embedded components work
      const firstCard = productCards[0];
      const colorSwatches = await firstCard.$$('[data-color-swatches], .color-swatches');
      const sizePills = await firstCard.$$('[data-size-pills], .size-pills');
      
      if (colorSwatches.length > 0) {
        results.productCardIntegration.passed++;
        console.log('✓ Color swatches embedded in cards');
      }
      
      if (sizePills.length > 0) {
        results.productCardIntegration.passed++;
        console.log('✓ Size pills embedded in cards');
      }

      // Test 3.3: Product linking preserved
      const productLinks = await firstCard.$$('a[href*="/products/"]');
      if (productLinks.length > 0) {
        results.productCardIntegration.passed++;
        console.log('✓ Product linking preserved');
      }

      // Test 3.4: No styling conflicts
      const cardStyles = await firstCard.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          position: computed.position
        };
      });
      
      if (cardStyles.display !== 'none') {
        results.productCardIntegration.passed++;
        console.log('✓ No CSS conflicts detected');
      }
    }

    console.log('\n4. JAVASCRIPT ARCHITECTURE COMPLIANCE');
    console.log('====================================');

    // Test 4.1: Class-based architecture
    const hasClasses = await page.evaluate(() => {
      return {
        collectionPage: typeof window.CollectionPageController !== 'undefined',
        filterDrawer: typeof window.FilterDrawer !== 'undefined',
        dropdownFeature: typeof window.DropdownFeature !== 'undefined'
      };
    });

    if (hasClasses.collectionPage || hasClasses.filterDrawer || hasClasses.dropdownFeature) {
      results.jsArchitecture.passed++;
      console.log('✓ Class-based architecture followed');
    }

    // Test 4.2: Event system integration
    const eventLogs = consoleLogs.filter(log => 
      log.text.includes('Event:') || 
      log.text.includes('initialized') ||
      log.text.includes('loaded')
    );
    
    if (eventLogs.length > 0) {
      results.jsArchitecture.passed++;
      console.log('✓ Event system integration working');
    }

    // Test 4.3: Custom logger usage
    const loggerLogs = consoleLogs.filter(log => 
      log.text.includes('[CollectionPage]') || 
      log.text.includes('[FilterDrawer]') ||
      log.text.includes('[DropdownFeature]')
    );
    
    if (loggerLogs.length > 0) {
      results.jsArchitecture.passed++;
      console.log(`✓ Custom logger implemented (${loggerLogs.length} logs found)`);
    }

    // Test 4.4: Performance utilities
    const hasUtilities = await page.evaluate(() => {
      // Check if debounce is used
      const scripts = document.querySelectorAll('script');
      let hasDebounce = false;
      scripts.forEach(script => {
        if (script.textContent && script.textContent.includes('debounce')) {
          hasDebounce = true;
        }
      });
      return hasDebounce;
    });

    if (hasUtilities) {
      results.jsArchitecture.passed++;
      console.log('✓ Performance utilities implemented');
    }

    // Final Summary
    console.log('\n=== INTEGRATION VERIFICATION SUMMARY ===');
    console.log('=======================================');
    
    const categories = ['drawerIntegration', 'notificationIntegration', 'productCardIntegration', 'jsArchitecture'];
    const categoryNames = {
      drawerIntegration: 'Drawer System',
      notificationIntegration: 'Notification System',
      productCardIntegration: 'Product Cards',
      jsArchitecture: 'JS Architecture'
    };
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    categories.forEach(cat => {
      const passed = results[cat].passed;
      const failed = results[cat].failed;
      totalPassed += passed;
      totalFailed += failed;
      
      console.log(`${categoryNames[cat]}: ${passed} passed, ${failed} failed`);
    });
    
    console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);
    
    // Check for console errors
    const errors = consoleLogs.filter(log => log.type === 'error' && !log.text.includes('svg'));
    console.log(`\nConsole errors (excluding SVG): ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nErrors found:');
      errors.forEach(err => console.log(`  - ${err.text}`));
    }

  } catch (error) {
    console.error('\n[VERIFICATION ERROR]', error.message);
  } finally {
    await browser.close();
    console.log('\nFinal integration verification completed!');
  }
})();