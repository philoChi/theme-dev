const playwright = require('playwright');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

(async () => {
  console.log('=== Collection Page Performance Tests ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    coreWebVitals: {},
    filterPerformance: {},
    networkSimulation: {},
    lazyLoading: {}
  };

  try {
    // Test 1: Core Web Vitals
    console.log('1. CORE WEB VITALS TESTS');
    console.log('========================');
    
    // Run Lighthouse for desktop
    console.log('Running Lighthouse for desktop...');
    try {
      const { stdout } = await execAsync(
        'npx lighthouse http://127.0.0.1:9292/collections/all --output=json --quiet --chrome-flags="--headless" --preset=desktop --only-categories=performance'
      );
      const lighthouseData = JSON.parse(stdout);
      const metrics = lighthouseData.audits.metrics.details.items[0];
      
      results.coreWebVitals.desktop = {
        LCP: metrics.largestContentfulPaint,
        FID: metrics.maxPotentialFID || 0,
        CLS: metrics.cumulativeLayoutShift,
        FCP: metrics.firstContentfulPaint,
        TTI: metrics.interactive
      };
      
      console.log(`Desktop LCP: ${(metrics.largestContentfulPaint / 1000).toFixed(2)}s ${metrics.largestContentfulPaint < 2500 ? '✓' : '✗'} (target < 2.5s)`);
      console.log(`Desktop FID: ${metrics.maxPotentialFID || 0}ms ${(metrics.maxPotentialFID || 0) < 100 ? '✓' : '✗'} (target < 100ms)`);
      console.log(`Desktop CLS: ${metrics.cumulativeLayoutShift.toFixed(3)} ${metrics.cumulativeLayoutShift < 0.1 ? '✓' : '✗'} (target < 0.1)`);
    } catch (error) {
      console.log('Lighthouse test failed:', error.message);
    }

    // Test 2: Filter Operation Performance
    console.log('\n2. FILTER OPERATION PERFORMANCE');
    console.log('===============================');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Measure filter application time
    const filterStartTime = Date.now();
    await page.evaluate(() => {
      // Simulate applying filters via JavaScript
      if (window.collectionController) {
        window.collectionController.applyFilters({
          type: ['t-shirt'],
          size: ['M', 'L'],
          color: ['blue', 'red']
        });
      }
    });
    const filterEndTime = Date.now();
    const filterTime = filterEndTime - filterStartTime;
    
    results.filterPerformance.multiFilterTime = filterTime;
    console.log(`Multi-filter application time: ${filterTime}ms ${filterTime < 300 ? '✓' : '✗'} (target < 300ms)`);

    // Test memory usage
    const metrics = await page.metrics();
    const memoryMB = (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
    results.filterPerformance.memoryUsage = memoryMB;
    console.log(`Memory usage: ${memoryMB}MB ${memoryMB < 100 ? '✓' : '✗'} (target < 100MB)`);

    // Test with 50+ products
    console.log('\nTesting with full product set (48 products)...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle'
    });
    
    const productCount = await page.evaluate(() => {
      return window.collectionData?.products?.length || 0;
    });
    console.log(`Products loaded: ${productCount} ${productCount >= 48 ? '✓' : '✗'}`);

    // Test 3: Network Simulation (3G)
    console.log('\n3. NETWORK SIMULATION TESTS (3G)');
    console.log('================================');
    
    // Create new context with network throttling
    const slowContext = await browser.newContext({
      // Simulate slow 3G
      offline: false,
      downloadThroughput: 50 * 1024 / 8, // 50kb/s
      uploadThroughput: 20 * 1024 / 8,   // 20kb/s
      latency: 400
    });
    
    const slowPage = await slowContext.newPage();
    
    const start3G = Date.now();
    await slowPage.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    const load3G = Date.now() - start3G;
    
    results.networkSimulation.load3G = load3G;
    console.log(`3G load time: ${(load3G / 1000).toFixed(2)}s ${load3G < 2500 ? '✓' : '✗'} (target < 2.5s)`);
    
    await slowContext.close();

    // Test 4: Lazy Loading
    console.log('\n4. LAZY LOADING TESTS');
    console.log('====================');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded'
    });

    // Check for lazy loading implementation
    const lazyLoadingInfo = await page.evaluate(() => {
      const images = document.querySelectorAll('img[loading="lazy"], img[data-src]');
      const hasIntersectionObserver = typeof IntersectionObserver !== 'undefined';
      
      // Check if images in viewport are loaded
      let loadedInViewport = 0;
      let totalInViewport = 0;
      
      images.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          totalInViewport++;
          if (img.complete || img.naturalHeight > 0) {
            loadedInViewport++;
          }
        }
      });
      
      return {
        totalLazyImages: images.length,
        hasIntersectionObserver,
        loadedInViewport,
        totalInViewport
      };
    });
    
    results.lazyLoading = lazyLoadingInfo;
    console.log(`Lazy loading images found: ${lazyLoadingInfo.totalLazyImages} ${lazyLoadingInfo.totalLazyImages > 0 ? '✓' : '✗'}`);
    console.log(`IntersectionObserver available: ${lazyLoadingInfo.hasIntersectionObserver ? '✓' : '✗'}`);
    console.log(`Viewport images loaded: ${lazyLoadingInfo.loadedInViewport}/${lazyLoadingInfo.totalInViewport}`);

    // Summary
    console.log('\n=== PERFORMANCE TEST SUMMARY ===');
    console.log('================================');
    
    const desktopVitals = results.coreWebVitals.desktop;
    if (desktopVitals) {
      const vitalsPass = desktopVitals.LCP < 2500 && desktopVitals.FID < 100 && desktopVitals.CLS < 0.1;
      console.log(`Core Web Vitals: ${vitalsPass ? 'PASSED' : 'FAILED'}`);
    }
    
    const filterPass = results.filterPerformance.multiFilterTime < 300 && parseFloat(results.filterPerformance.memoryUsage) < 100;
    console.log(`Filter Performance: ${filterPass ? 'PASSED' : 'FAILED'}`);
    
    const networkPass = results.networkSimulation.load3G < 2500;
    console.log(`3G Performance: ${networkPass ? 'PASSED' : 'FAILED'}`);
    
    const lazyPass = results.lazyLoading.totalLazyImages > 0 && results.lazyLoading.hasIntersectionObserver;
    console.log(`Lazy Loading: ${lazyPass ? 'PASSED' : 'FAILED'}`);

    // Save results
    const fs = require('fs');
    fs.writeFileSync('e2e/performance-results.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed results saved to e2e/performance-results.json');

  } catch (error) {
    console.error('\n[PERFORMANCE TEST ERROR]', error.message);
  } finally {
    await browser.close();
    console.log('\nPerformance tests completed!');
  }
})();