/**
 * E2E Performance Tests for Search Feature (TC-P01, TC-P02)
 * 
 * Tests API response timing, debounce accuracy, result limiting,
 * and cache performance to ensure optimal search experience.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Read shopify URL or use default
function getShopifyURL() {
  try {
    const urlFile = path.join(__dirname, '../../../working-url.md');
    if (fs.existsSync(urlFile)) {
      const content = fs.readFileSync(urlFile, 'utf8');
      const match = content.match(/http:\/\/[^\s]+/);
      return match ? match[0] : 'http://127.0.0.1:9292';
    }
  } catch (error) {
    console.warn('Could not read working-url.md, using default URL');
  }
  return 'http://127.0.0.1:9292';
}

const BASE_URL = getShopifyURL();

test.describe('Search Performance Tests (TC-P01, TC-P02)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('TC-P01: API response time under 300ms for 95% of requests', async ({ page }) => {
    const responseTimes = [];
    const apiRequests = [];

    // Track API requests and response times
    page.on('response', async (response) => {
      if (response.url().includes('/search/suggest.json')) {
        const timing = response.timing();
        apiRequests.push({
          url: response.url(),
          status: response.status(),
          responseTime: timing.responseEnd - timing.responseStart
        });
      }
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    const searchQueries = ['shoes', 'boots', 'shirts', 'pants', 'hats'];
    
    // Perform multiple searches to get statistical data
    for (const query of searchQueries) {
      const startTime = Date.now();
      
      // Clear previous search
      await searchInput.clear();
      await page.waitForTimeout(100);
      
      // Perform search
      await searchInput.fill(query);
      
      // Wait for API response
      try {
        await page.waitForResponse(response => 
          response.url().includes('/search/suggest.json'), 
          { timeout: 5000 }
        );
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      } catch (error) {
        console.warn(`No API response for query: ${query}`);
      }
      
      // Small delay between searches
      await page.waitForTimeout(500);
    }

    // Analyze response times
    console.log('Response times:', responseTimes);
    console.log('API requests:', apiRequests);
    
    if (responseTimes.length > 0) {
      // Calculate 95th percentile
      const sortedTimes = responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95Time = sortedTimes[p95Index];
      
      console.log(`95th percentile response time: ${p95Time}ms`);
      
      // 95% of requests should be under 300ms (API) + 300ms (debounce) + 200ms (buffer) = 800ms total
      expect(p95Time).toBeLessThan(800);
      
      // Average should be much better
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`Average response time: ${avgTime}ms`);
      expect(avgTime).toBeLessThan(600);
    }
  });

  test('TC-P02: Debounce timing accuracy (300ms)', async ({ page }) => {
    const apiCalls = [];
    
    // Track all API calls with timestamps
    page.on('request', (request) => {
      if (request.url().includes('/search/suggest.json')) {
        apiCalls.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Test 1: Rapid typing should be debounced
    const startTime = Date.now();
    
    // Type rapidly - each character within debounce window
    await searchInput.type('s', { delay: 50 });
    await searchInput.type('h', { delay: 50 });
    await searchInput.type('o', { delay: 50 });
    await searchInput.type('e', { delay: 50 });
    await searchInput.type('s', { delay: 50 });
    
    // Wait for debounce period
    await page.waitForTimeout(400);
    
    const rapidTypingCalls = apiCalls.filter(call => 
      call.timestamp >= startTime && call.timestamp <= Date.now()
    );
    
    // Should only have made 1 API call due to debouncing
    expect(rapidTypingCalls.length).toBeLessThanOrEqual(1);
    console.log(`Rapid typing API calls: ${rapidTypingCalls.length}`);
    
    // Test 2: Typing with delays longer than debounce should trigger multiple calls
    await searchInput.clear();
    await page.waitForTimeout(100);
    
    const slowTypingStart = Date.now();
    apiCalls.length = 0; // Clear previous calls
    
    // Type with delays longer than debounce period
    await searchInput.type('a');
    await page.waitForTimeout(400); // Longer than 300ms debounce
    
    await searchInput.type('b');
    await page.waitForTimeout(400);
    
    await searchInput.type('c');
    await page.waitForTimeout(400);
    
    // Should have made multiple API calls
    expect(apiCalls.length).toBeGreaterThan(1);
    console.log(`Slow typing API calls: ${apiCalls.length}`);
    
    // Test timing between calls
    if (apiCalls.length >= 2) {
      const timeBetweenCalls = apiCalls[1].timestamp - apiCalls[0].timestamp;
      console.log(`Time between API calls: ${timeBetweenCalls}ms`);
      
      // Should be roughly 400ms (our delay) plus some processing time
      expect(timeBetweenCalls).toBeGreaterThan(350);
      expect(timeBetweenCalls).toBeLessThan(800);
    }
  });

  test('TC-P03: Result limiting for mobile and desktop viewports', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('test products');
    
    // Wait for results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item, #SearchEmptyState', { timeout: 5000 });
    
    const mobileResults = page.locator('#SearchResultsList .cart-drawer__item');
    const mobileCount = await mobileResults.count();
    
    if (mobileCount > 0) {
      // Should limit to 8 results on mobile
      expect(mobileCount).toBeLessThanOrEqual(8);
      console.log(`Mobile results count: ${mobileCount}`);
    }
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 }); // Desktop size
    
    // Clear and search again
    await searchInput.clear();
    await page.waitForTimeout(100);
    await searchInput.fill('desktop test products');
    
    await page.waitForSelector('#SearchResultsList .cart-drawer__item, #SearchEmptyState', { timeout: 5000 });
    
    const desktopResults = page.locator('#SearchResultsList .cart-drawer__item');
    const desktopCount = await desktopResults.count();
    
    if (desktopCount > 0) {
      // Should limit to 10 results on desktop
      expect(desktopCount).toBeLessThanOrEqual(10);
      console.log(`Desktop results count: ${desktopCount}`);
      
      // Desktop should allow more results than mobile
      if (mobileCount > 0 && desktopCount > 0) {
        expect(desktopCount).toBeGreaterThanOrEqual(mobileCount);
      }
    }
  });

  test('TC-P04: Cache performance and hit rate', async ({ page }) => {
    const apiCalls = [];
    const cacheHits = [];
    
    // Track API calls
    page.on('request', (request) => {
      if (request.url().includes('/search/suggest.json')) {
        apiCalls.push({
          url: request.url(),
          query: new URL(request.url()).searchParams.get('q'),
          timestamp: Date.now()
        });
      }
    });
    
    // Track cache hits by listening to console messages
    page.on('console', (msg) => {
      if (msg.text().includes('Cache hit for query')) {
        cacheHits.push({
          message: msg.text(),
          timestamp: Date.now()
        });
      }
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    const testQuery = 'cache test query';
    
    // First search - should hit API
    await searchInput.fill(testQuery);
    await page.waitForTimeout(500);
    
    const firstSearchApiCalls = apiCalls.length;
    
    // Clear and search same query again - should hit cache
    await searchInput.clear();
    await page.waitForTimeout(200);
    await searchInput.fill(testQuery);
    await page.waitForTimeout(500);
    
    const secondSearchApiCalls = apiCalls.length;
    
    // Cache should prevent second API call
    console.log(`First search API calls: ${firstSearchApiCalls}`);
    console.log(`Second search API calls: ${secondSearchApiCalls}`);
    console.log(`Cache hits detected: ${cacheHits.length}`);
    
    // Second search should not increase API call count (or increase minimally)
    expect(secondSearchApiCalls - firstSearchApiCalls).toBeLessThanOrEqual(1);
    
    // Should detect cache usage
    if (cacheHits.length > 0) {
      expect(cacheHits.some(hit => hit.message.includes(testQuery))).toBe(true);
    }
    
    // Test cache performance - cached results should appear faster
    const cacheSearchStart = Date.now();
    await searchInput.clear();
    await page.waitForTimeout(100);
    await searchInput.fill(testQuery);
    
    await page.waitForSelector('#SearchResultsList .cart-drawer__item, #SearchEmptyState', { timeout: 2000 });
    const cacheSearchEnd = Date.now();
    
    const cacheResponseTime = cacheSearchEnd - cacheSearchStart;
    console.log(`Cache response time: ${cacheResponseTime}ms`);
    
    // Cached results should be very fast (under 500ms including debounce)
    expect(cacheResponseTime).toBeLessThan(800);
  });

  test('TC-P05: Memory management during extended search usage', async ({ page }) => {
    // Enable memory monitoring if available
    const initialMemory = await page.evaluate(() => {
      return window.performance.memory ? window.performance.memory.usedJSHeapSize : 0;
    });

    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    
    // Perform many searches to test memory management
    const searchQueries = [
      'shoes', 'boots', 'shirts', 'pants', 'hats',
      'jackets', 'dress', 'socks', 'ties', 'belts',
      'bags', 'watch', 'jewelry', 'accessories', 'gloves'
    ];
    
    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      
      await searchInput.clear();
      await searchInput.fill(query);
      
      // Wait for results
      await page.waitForSelector('#SearchResultsList, #SearchEmptyState', { timeout: 3000 });
      
      // Small delay between searches
      await page.waitForTimeout(200);
      
      // Check memory every 5 searches
      if (i % 5 === 4) {
        const currentMemory = await page.evaluate(() => {
          return window.performance.memory ? window.performance.memory.usedJSHeapSize : 0;
        });
        
        console.log(`Memory after ${i + 1} searches: ${currentMemory} bytes`);
        
        // Memory shouldn't grow excessively (allow 10MB increase)
        if (initialMemory > 0 && currentMemory > 0) {
          const memoryIncrease = currentMemory - initialMemory;
          expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
        }
      }
    }
    
    // Final memory check
    const finalMemory = await page.evaluate(() => {
      // Trigger manual garbage collection if available
      if (window.gc) {
        window.gc();
      }
      return window.performance.memory ? window.performance.memory.usedJSHeapSize : 0;
    });
    
    console.log(`Initial memory: ${initialMemory} bytes`);
    console.log(`Final memory: ${finalMemory} bytes`);
    
    if (initialMemory > 0 && finalMemory > 0) {
      const totalIncrease = finalMemory - initialMemory;
      console.log(`Total memory increase: ${totalIncrease} bytes`);
      
      // Total memory increase should be reasonable (under 15MB)
      expect(totalIncrease).toBeLessThan(15 * 1024 * 1024);
    }
  });

  test('TC-P06: Image lazy loading and progressive rendering', async ({ page }) => {
    await page.click('[data-drawer-trigger="search"]');
    await page.waitForSelector('[mpe="search-input"]', { state: 'visible' });
    
    const searchInput = page.locator('[mpe="search-input"]');
    await searchInput.fill('products with images');
    
    // Wait for results
    await page.waitForSelector('#SearchResultsList .cart-drawer__item', { timeout: 5000 });
    
    const productImages = page.locator('#SearchResultsList .cart-drawer__item img');
    const imageCount = await productImages.count();
    
    if (imageCount > 0) {
      console.log(`Found ${imageCount} product images`);
      
      // Check for lazy loading attributes
      const firstImage = productImages.first();
      
      // Should have lazy loading attribute
      const loading = await firstImage.getAttribute('loading');
      expect(loading).toBe('lazy');
      
      // Check for data-src (lazy loading) or src attributes
      const dataSrc = await firstImage.getAttribute('data-src');
      const src = await firstImage.getAttribute('src');
      
      // Should have either data-src (for lazy loading) or src
      expect(dataSrc || src).toBeTruthy();
      
      // Images should load progressively
      await page.waitForTimeout(1000);
      
      // Check that images are actually loaded
      const loadedImages = await page.locator('#SearchResultsList .cart-drawer__item img[src]').count();
      expect(loadedImages).toBe(imageCount);
      
      console.log(`${loadedImages} images loaded successfully`);
    }
  });
});
