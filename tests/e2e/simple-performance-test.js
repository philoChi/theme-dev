const playwright = require('playwright');

(async () => {
  console.log('=== Simple Performance Tests ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Test 1: Page Load Performance
    console.log('1. PAGE LOAD PERFORMANCE');
    console.log('========================');
    
    const startTime = Date.now();
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    const domContentLoadedTime = Date.now() - startTime;
    
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const totalLoadTime = Date.now() - startTime;
    
    console.log(`DOM Content Loaded: ${domContentLoadedTime}ms`);
    console.log(`Total Load Time: ${totalLoadTime}ms ${totalLoadTime < 2500 ? '✓' : '✗'} (target < 2500ms)`);

    // Test 2: Filter Performance
    console.log('\n2. FILTER PERFORMANCE');
    console.log('====================');
    
    // Wait for collection data to load
    await page.waitForTimeout(2000);
    
    // Measure filter time
    const filterTime = await page.evaluate(() => {
      const start = performance.now();
      if (window.collectionController && window.collectionController.applyFilters) {
        window.collectionController.applyFilters({
          type: ['t-shirt'],
          size: ['M', 'L'],
          color: ['blue']
        });
      }
      return performance.now() - start;
    });
    
    console.log(`Filter application time: ${filterTime.toFixed(2)}ms ${filterTime < 300 ? '✓' : '✗'} (target < 300ms)`);

    // Test 3: Memory Usage
    console.log('\n3. MEMORY USAGE');
    console.log('===============');
    
    const metrics = await page.metrics();
    const memoryMB = (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
    console.log(`JS Heap Size: ${memoryMB}MB ${parseFloat(memoryMB) < 100 ? '✓' : '✗'} (target < 100MB)`);

    // Test 4: Lazy Loading Check
    console.log('\n4. LAZY LOADING CHECK');
    console.log('====================');
    
    const lazyInfo = await page.evaluate(() => {
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      const totalImages = document.querySelectorAll('img').length;
      return {
        lazyImages: lazyImages.length,
        totalImages: totalImages,
        hasIntersectionObserver: typeof IntersectionObserver !== 'undefined'
      };
    });
    
    console.log(`Lazy images: ${lazyInfo.lazyImages}/${lazyInfo.totalImages}`);
    console.log(`IntersectionObserver: ${lazyInfo.hasIntersectionObserver ? '✓' : '✗'}`);

    // Test 5: Product Count
    console.log('\n5. PRODUCT HANDLING');
    console.log('===================');
    
    const productInfo = await page.evaluate(() => {
      const gridItems = document.querySelectorAll('[data-product-grid-item]');
      const collectionProducts = window.collectionData?.products?.length || 0;
      return {
        displayedProducts: gridItems.length,
        totalProducts: collectionProducts
      };
    });
    
    console.log(`Products displayed: ${productInfo.displayedProducts}`);
    console.log(`Total products in collection: ${productInfo.totalProducts}`);
    console.log(`Large product set handling: ${productInfo.totalProducts >= 48 ? '✓' : '✗'} (48+ products)`);

    // Summary
    console.log('\n=== PERFORMANCE SUMMARY ===');
    const passed = totalLoadTime < 2500 && filterTime < 300 && parseFloat(memoryMB) < 100;
    console.log(`Overall: ${passed ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();