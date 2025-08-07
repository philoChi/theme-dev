const playwright = require('playwright');

// Configuration
const TEST_URL = 'http://127.0.0.1:9292/collections/all';
const SCREENSHOT_DIR = 'tests/e2e/screenshots/flickering-test';

// Helper to create timestamp
const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

(async () => {
  console.log('🔍 Starting flickering detection test...\n');
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Browser error:', msg.text());
    }
  });

  try {
    // Test 1: Initial page load and mutation monitoring setup
    console.log('📋 Test 1: Setting up mutation monitoring...');
    await page.goto(TEST_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for initial render
    await page.waitForTimeout(2000);

    // Inject mutation observer to track DOM changes
    await page.evaluate(() => {
      window.mutationData = {
        gridMutations: 0,
        productMutations: 0,
        layoutShifts: 0,
        visibilityChanges: 0,
        mutations: []
      };

      // Track layout shifts
      if ('PerformanceObserver' in window) {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            window.mutationData.layoutShifts++;
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      }

      // Track DOM mutations
      const gridElement = document.querySelector('[data-product-grid]');
      if (gridElement) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            window.mutationData.gridMutations++;
            
            // Track visibility changes
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
              const displayValue = mutation.target.style.display;
              if (displayValue === 'none' || displayValue === 'block') {
                window.mutationData.visibilityChanges++;
              }
            }
            
            // Track product mutations
            if (mutation.target.hasAttribute('data-product-grid-item')) {
              window.mutationData.productMutations++;
            }

            // Store mutation details
            window.mutationData.mutations.push({
              type: mutation.type,
              target: mutation.target.tagName,
              attribute: mutation.attributeName,
              time: Date.now()
            });
          });
        });

        observer.observe(gridElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class', 'data-visible']
        });
      }
    });

    console.log('✅ Mutation monitoring setup complete\n');

    // Test 2: Open filter drawer
    console.log('📋 Test 2: Opening filter drawer...');
    
    // Reset mutation counters
    await page.evaluate(() => {
      window.mutationData.gridMutations = 0;
      window.mutationData.productMutations = 0;
      window.mutationData.visibilityChanges = 0;
      window.mutationData.mutations = [];
    });

    // Click filter button
    await page.click('[data-drawer-trigger="filter"]');
    await page.waitForTimeout(1000);

    const drawerOpenMutations = await page.evaluate(() => window.mutationData);
    console.log(`  Grid mutations during drawer open: ${drawerOpenMutations.gridMutations}`);
    console.log(`  Product mutations: ${drawerOpenMutations.productMutations}`);
    console.log(`  Visibility changes: ${drawerOpenMutations.visibilityChanges}\n`);

    // Test 3: Apply single filter and measure performance
    console.log('📋 Test 3: Applying single filter (Size: M)...');
    
    // Reset counters and add timing
    await page.evaluate(() => {
      window.mutationData.gridMutations = 0;
      window.mutationData.productMutations = 0;
      window.mutationData.visibilityChanges = 0;
      window.mutationData.mutations = [];
      window.filterStartTime = Date.now();
    });

    // Apply size filter
    const sizeFilterApplied = await page.evaluate(() => {
      const sizeFilter = document.querySelector('[data-filter-value="m"][data-filter-type="size"]');
      if (sizeFilter) {
        sizeFilter.click();
        return true;
      }
      return false;
    });

    if (sizeFilterApplied) {
      // Wait for updates to complete
      await page.waitForTimeout(500);

      // Measure time and mutations
      const singleFilterResults = await page.evaluate(() => {
        const endTime = Date.now();
        const duration = endTime - window.filterStartTime;
        return {
          duration,
          ...window.mutationData
        };
      });

      console.log(`  Update duration: ${singleFilterResults.duration}ms`);
      console.log(`  Grid mutations: ${singleFilterResults.gridMutations}`);
      console.log(`  Product mutations: ${singleFilterResults.productMutations}`);
      console.log(`  Visibility changes: ${singleFilterResults.visibilityChanges}`);
      console.log(`  Layout shifts: ${singleFilterResults.layoutShifts}\n`);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/single-filter-${timestamp()}.png`
      });
    }

    // Test 4: Apply multiple filters rapidly
    console.log('📋 Test 4: Applying multiple filters rapidly...');
    
    // Reset everything
    await page.evaluate(() => {
      window.mutationData.gridMutations = 0;
      window.mutationData.productMutations = 0;
      window.mutationData.visibilityChanges = 0;
      window.mutationData.layoutShifts = 0;
      window.mutationData.mutations = [];
      window.rapidFilterStart = Date.now();
      window.filterTimings = [];
    });

    // Apply multiple filters in quick succession
    const filterSequence = [
      { type: 'size', value: 'l' },
      { type: 'color', value: 'black' },
      { type: 'type', value: 't-shirt' }
    ];

    for (const filter of filterSequence) {
      const applied = await page.evaluate((filterData) => {
        const filterElement = document.querySelector(
          `[data-filter-value="${filterData.value}"][data-filter-type="${filterData.type}"]`
        );
        if (filterElement) {
          const clickTime = Date.now();
          filterElement.click();
          window.filterTimings.push({
            filter: `${filterData.type}:${filterData.value}`,
            time: clickTime - window.rapidFilterStart
          });
          return true;
        }
        return false;
      }, filter);

      if (applied) {
        console.log(`  Applied filter: ${filter.type}:${filter.value}`);
        await page.waitForTimeout(100); // Very short wait between filters
      }
    }

    // Wait for all updates to complete
    await page.waitForTimeout(1000);

    const rapidFilterResults = await page.evaluate(() => {
      const endTime = Date.now();
      const totalDuration = endTime - window.rapidFilterStart;
      return {
        totalDuration,
        filterTimings: window.filterTimings,
        ...window.mutationData
      };
    });

    console.log(`\n  Total update duration: ${rapidFilterResults.totalDuration}ms`);
    console.log(`  Grid mutations: ${rapidFilterResults.gridMutations}`);
    console.log(`  Product mutations: ${rapidFilterResults.productMutations}`);
    console.log(`  Visibility changes: ${rapidFilterResults.visibilityChanges}`);
    console.log(`  Layout shifts: ${rapidFilterResults.layoutShifts}`);
    console.log(`  Filter application timings:`, rapidFilterResults.filterTimings);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/multiple-filters-${timestamp()}.png`
    });

    // Test 5: Analyze mutation patterns for flickering
    console.log('\n📋 Test 5: Analyzing mutation patterns...');
    
    const mutationAnalysis = await page.evaluate(() => {
      const mutations = window.mutationData.mutations;
      
      // Group mutations by time windows (50ms buckets)
      const timeBuckets = {};
      mutations.forEach(mut => {
        const bucket = Math.floor(mut.time / 50) * 50;
        timeBuckets[bucket] = (timeBuckets[bucket] || 0) + 1;
      });

      // Find rapid mutation bursts (potential flickering)
      const bursts = Object.entries(timeBuckets)
        .filter(([_, count]) => count > 10)
        .map(([time, count]) => ({ time: parseInt(time), count }));

      return {
        totalMutations: mutations.length,
        mutationBursts: bursts,
        averageMutationsPerBucket: mutations.length / Object.keys(timeBuckets).length
      };
    });

    console.log(`  Total mutations recorded: ${mutationAnalysis.totalMutations}`);
    console.log(`  Average mutations per 50ms: ${mutationAnalysis.averageMutationsPerBucket.toFixed(2)}`);
    console.log(`  Detected mutation bursts (>10 per 50ms):`, mutationAnalysis.mutationBursts);

    // Test 6: Clear filters and test reset performance
    console.log('\n📋 Test 6: Clearing all filters...');
    
    await page.evaluate(() => {
      window.mutationData.gridMutations = 0;
      window.mutationData.productMutations = 0;
      window.mutationData.visibilityChanges = 0;
      window.mutationData.mutations = [];
      window.clearStartTime = Date.now();
    });

    // Clear all filters
    const clearButton = await page.$('[data-clear-filters]');
    if (clearButton) {
      await clearButton.click();
      await page.waitForTimeout(1000);

      const clearResults = await page.evaluate(() => {
        const endTime = Date.now();
        const duration = endTime - window.clearStartTime;
        return {
          duration,
          ...window.mutationData
        };
      });

      console.log(`  Clear duration: ${clearResults.duration}ms`);
      console.log(`  Grid mutations: ${clearResults.gridMutations}`);
      console.log(`  Product mutations: ${clearResults.productMutations}`);
      console.log(`  Visibility changes: ${clearResults.visibilityChanges}\n`);
    }

    // Test 7: Visual stability test during filter application
    console.log('📋 Test 7: Visual stability test...');
    
    // Take rapid screenshots during filter application
    const screenshots = [];
    
    // Start applying a filter
    const stabilityTest = page.evaluate(() => {
      const filter = document.querySelector('[data-filter-value="s"][data-filter-type="size"]');
      if (filter) {
        setTimeout(() => filter.click(), 100);
        return true;
      }
      return false;
    });

    // Take screenshots at intervals
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(100);
      const screenshotPath = `${SCREENSHOT_DIR}/stability-${i}-${timestamp()}.png`;
      await page.screenshot({ path: screenshotPath });
      screenshots.push(screenshotPath);
    }

    console.log(`  Captured ${screenshots.length} screenshots for visual stability analysis`);
    console.log(`  Screenshots saved to: ${SCREENSHOT_DIR}/stability-*.png`);

    // Final summary
    console.log('\n📊 FLICKERING TEST SUMMARY:');
    console.log('================================');
    
    const finalState = await page.evaluate(() => {
      const visibleProducts = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length;
      const totalProducts = document.querySelectorAll('[data-product-grid-item]').length;
      const activeFilters = document.querySelectorAll('[data-filter-chip]').length;
      
      return {
        visibleProducts,
        totalProducts,
        activeFilters,
        finalMutationData: window.mutationData
      };
    });

    console.log(`Visible products: ${finalState.visibleProducts}/${finalState.totalProducts}`);
    console.log(`Active filters: ${finalState.activeFilters}`);
    console.log(`Total layout shifts detected: ${finalState.finalMutationData.layoutShifts}`);
    
    // Flickering assessment
    const flickeringScore = mutationAnalysis.mutationBursts.length;
    if (flickeringScore === 0) {
      console.log('\n✅ EXCELLENT: No flickering detected!');
    } else if (flickeringScore <= 2) {
      console.log('\n⚠️  MINOR: Some rapid mutations detected, minimal flickering possible');
    } else {
      console.log('\n❌ WARNING: Multiple mutation bursts detected, flickering likely!');
    }

    // Performance assessment
    if (rapidFilterResults.totalDuration < 500) {
      console.log('✅ PERFORMANCE: Excellent - Updates complete in under 500ms');
    } else if (rapidFilterResults.totalDuration < 1000) {
      console.log('⚠️  PERFORMANCE: Good - Updates complete in under 1 second');
    } else {
      console.log('❌ PERFORMANCE: Needs improvement - Updates take over 1 second');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
    console.log('\n✅ Flickering test completed!');
    console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}/`);
  }
})();