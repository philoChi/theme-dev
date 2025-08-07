const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Test results tracking
  const results = {
    styleChanges: 0,
    layoutShifts: 0,
    visibilityToggles: 0,
    unexpectedReflows: 0,
    passed: true,
    details: []
  };

  console.log('🔍 FLICKERING VERIFICATION TEST');
  console.log('================================\n');

  try {
    // Step 1: Navigate to collection page
    console.log('📄 Loading collection page...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for initial render
    await page.waitForSelector('[data-collection-grid]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Step 2: Inject monitoring code
    console.log('🔧 Setting up DOM monitoring...\n');
    
    await page.evaluate(() => {
      window.flickerMonitor = {
        styleChanges: [],
        layoutShifts: [],
        visibilityToggles: [],
        reflows: []
      };

      // Monitor style changes
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, value) {
        if (name === 'style' && this.hasAttribute('data-product-grid-item')) {
          window.flickerMonitor.styleChanges.push({
            element: this.dataset.productId || 'unknown',
            timestamp: Date.now(),
            oldValue: this.getAttribute('style'),
            newValue: value
          });
        }
        return originalSetAttribute.call(this, name, value);
      };

      // Monitor CSS class changes that affect visibility
      const originalClassList = Object.getOwnPropertyDescriptor(Element.prototype, 'classList');
      Object.defineProperty(Element.prototype, 'classList', {
        get: function() {
          const classList = originalClassList.get.call(this);
          const originalAdd = classList.add;
          const originalRemove = classList.remove;
          const originalToggle = classList.toggle;

          classList.add = function(...classes) {
            if (this.hasAttribute && this.hasAttribute('data-product-grid-item')) {
              const visibilityClasses = classes.filter(c => 
                c.includes('hidden') || c.includes('visible') || c.includes('show') || c.includes('hide')
              );
              if (visibilityClasses.length > 0) {
                window.flickerMonitor.visibilityToggles.push({
                  action: 'add',
                  classes: visibilityClasses,
                  timestamp: Date.now()
                });
              }
            }
            return originalAdd.apply(this, classes);
          };

          classList.remove = function(...classes) {
            if (this.hasAttribute && this.hasAttribute('data-product-grid-item')) {
              const visibilityClasses = classes.filter(c => 
                c.includes('hidden') || c.includes('visible') || c.includes('show') || c.includes('hide')
              );
              if (visibilityClasses.length > 0) {
                window.flickerMonitor.visibilityToggles.push({
                  action: 'remove',
                  classes: visibilityClasses,
                  timestamp: Date.now()
                });
              }
            }
            return originalRemove.apply(this, classes);
          };

          return classList;
        },
        configurable: true
      });

      // Monitor layout shifts
      if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.value > 0) {
              window.flickerMonitor.layoutShifts.push({
                value: entry.value,
                timestamp: entry.startTime
              });
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      }

      // Monitor forced reflows
      const reflowProperties = ['offsetHeight', 'offsetWidth', 'clientHeight', 'clientWidth'];
      reflowProperties.forEach(prop => {
        const originalGetter = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
        Object.defineProperty(HTMLElement.prototype, prop, {
          get: function() {
            if (this.hasAttribute && this.hasAttribute('data-product-grid-item')) {
              window.flickerMonitor.reflows.push({
                property: prop,
                timestamp: Date.now()
              });
            }
            return originalGetter.get.call(this);
          },
          configurable: true
        });
      });
    });

    // Step 3: Get initial state
    const initialProductCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]');
      return Array.from(items).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).length;
    });
    console.log(`✅ Initial state: ${initialProductCount} products visible`);

    // Step 4: Simulate filter change through controller
    console.log('\n🎯 Applying filter through controller...');
    
    await page.evaluate(() => {
      // Clear monitoring data
      window.flickerMonitor.styleChanges = [];
      window.flickerMonitor.layoutShifts = [];
      window.flickerMonitor.visibilityToggles = [];
      window.flickerMonitor.reflows = [];
      
      // Mark test start
      window.testStartTime = Date.now();
    });

    // Apply filter by calling controller method directly
    await page.evaluate(() => {
      const controller = document.querySelector('[data-collection-controller]');
      if (controller && controller.collectionController) {
        // Simulate filter change
        controller.collectionController.filters = { type: 't-shirt' };
        controller.collectionController.applyFilters();
      } else {
        throw new Error('Collection controller not found');
      }
    });

    // Wait for filter to be applied
    await page.waitForTimeout(1000);

    // Step 5: Collect monitoring data
    const monitoringData = await page.evaluate(() => {
      const testDuration = Date.now() - window.testStartTime;
      return {
        duration: testDuration,
        styleChanges: window.flickerMonitor.styleChanges,
        layoutShifts: window.flickerMonitor.layoutShifts,
        visibilityToggles: window.flickerMonitor.visibilityToggles,
        reflows: window.flickerMonitor.reflows
      };
    });

    // Step 6: Analyze results
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('-------------------');
    
    // Check for style changes
    const duplicateStyleChanges = monitoringData.styleChanges.filter((change, index) => {
      return monitoringData.styleChanges.findIndex((c, i) => 
        i !== index && c.element === change.element && Math.abs(c.timestamp - change.timestamp) < 100
      ) !== -1;
    });

    results.styleChanges = duplicateStyleChanges.length;
    console.log(`Style changes (potential flicker): ${duplicateStyleChanges.length}`);
    if (duplicateStyleChanges.length > 0) {
      results.passed = false;
      results.details.push(`Found ${duplicateStyleChanges.length} rapid style changes`);
    }

    // Check for layout shifts
    results.layoutShifts = monitoringData.layoutShifts.length;
    const significantShifts = monitoringData.layoutShifts.filter(shift => shift.value > 0.1);
    console.log(`Layout shifts detected: ${monitoringData.layoutShifts.length} (${significantShifts.length} significant)`);
    if (significantShifts.length > 0) {
      results.passed = false;
      results.details.push(`Found ${significantShifts.length} significant layout shifts`);
    }

    // Check for visibility toggles
    results.visibilityToggles = monitoringData.visibilityToggles.length;
    console.log(`Visibility class toggles: ${monitoringData.visibilityToggles.length}`);
    if (monitoringData.visibilityToggles.length > 5) {
      results.passed = false;
      results.details.push(`Excessive visibility toggles: ${monitoringData.visibilityToggles.length}`);
    }

    // Check for excessive reflows
    results.unexpectedReflows = monitoringData.reflows.length;
    console.log(`Forced reflows: ${monitoringData.reflows.length}`);
    if (monitoringData.reflows.length > 10) {
      results.passed = false;
      results.details.push(`Excessive reflows: ${monitoringData.reflows.length}`);
    }

    // Step 7: Verify final state
    const finalProductCount = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-product-grid-item]');
      return Array.from(items).filter(item => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).length;
    });
    console.log(`\n✅ Final state: ${finalProductCount} products visible`);
    console.log(`📏 Products filtered: ${initialProductCount - finalProductCount}`);

    // Step 8: Final verdict
    console.log('\n🏁 FINAL VERDICT:');
    console.log('=================');
    
    if (results.passed) {
      console.log('✅ PASS - No flickering detected!');
      console.log('\nThe collection page filtering is stable:');
      console.log('- No duplicate style changes');
      console.log('- No significant layout shifts');
      console.log('- Minimal visibility toggles');
      console.log('- Acceptable reflow count');
    } else {
      console.log('❌ FAIL - Flickering issues detected!');
      console.log('\nProblems found:');
      results.details.forEach(detail => console.log(`- ${detail}`));
    }

    // Additional performance metrics
    console.log('\n📈 Performance Metrics:');
    console.log(`- Filter duration: ${monitoringData.duration}ms`);
    console.log(`- Style changes per product: ${(monitoringData.styleChanges.length / initialProductCount).toFixed(2)}`);
    console.log(`- Average reflows: ${(monitoringData.reflows.length / (monitoringData.duration / 1000)).toFixed(2)}/sec`);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    results.passed = false;
    results.details.push(`Error: ${error.message}`);
  } finally {
    await browser.close();
    
    // Exit with appropriate code
    process.exit(results.passed ? 0 : 1);
  }
})();