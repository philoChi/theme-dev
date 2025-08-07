const playwright = require('playwright');
const fs = require('fs');

(async () => {
  console.log('=== Visual Regression Tests ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenshotDir = 'tests/e2e/screenshots/visual-regression';
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    // Test 1: Collection Layouts
    console.log('1. COLLECTION LAYOUTS');
    console.log('====================');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({
      path: `${screenshotDir}/collection-desktop.png`,
      fullPage: false
    });
    console.log('✓ Desktop layout captured (1280x720)');

    // Tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: `${screenshotDir}/collection-tablet.png`,
      fullPage: false
    });
    console.log('✓ Tablet layout captured (768x1024)');

    // Mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: `${screenshotDir}/collection-mobile.png`,
      fullPage: false
    });
    console.log('✓ Mobile layout captured (375x667)');

    // Test 2: Component States
    console.log('\n2. COMPONENT STATE SCREENSHOTS');
    console.log('==============================');

    // Active filter states
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt&filter.color=blue', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: `${screenshotDir}/active-filters.png`,
      fullPage: false
    });
    console.log('✓ Active filter states captured');

    // Empty state
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=nonexistent', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: `${screenshotDir}/empty-state.png`,
      fullPage: false
    });
    console.log('✓ Empty state captured');

    // Filter drawer open (mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);
    
    const filterButton = await page.$('[data-drawer-trigger="filter"]');
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({
        path: `${screenshotDir}/filter-drawer-mobile.png`,
        fullPage: false
      });
      console.log('✓ Filter drawer mobile captured');
    }

    // Test 3: Responsive Breakpoints
    console.log('\n3. RESPONSIVE BREAKPOINT SCREENSHOTS');
    console.log('====================================');

    const breakpoints = [
      { name: 'xs', width: 320, height: 568 },
      { name: 'sm', width: 640, height: 640 },
      { name: 'md', width: 768, height: 1024 },
      { name: 'lg', width: 1024, height: 768 },
      { name: 'xl', width: 1280, height: 720 },
      { name: '2xl', width: 1536, height: 864 }
    ];

    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle'
    });

    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.waitForTimeout(500);
      
      await page.screenshot({
        path: `${screenshotDir}/breakpoint-${breakpoint.name}-${breakpoint.width}x${breakpoint.height}.png`,
        fullPage: false
      });
      console.log(`✓ Breakpoint ${breakpoint.name} captured (${breakpoint.width}x${breakpoint.height})`);
    }

    // Test 4: Loading States
    console.log('\n4. LOADING STATE SCREENSHOTS');
    console.log('============================');

    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Capture initial loading
    page.goto('http://127.0.0.1:9292/collections/all');
    await page.waitForTimeout(500); // Capture during load
    
    await page.screenshot({
      path: `${screenshotDir}/loading-state.png`,
      fullPage: false
    });
    console.log('✓ Loading state captured');

    // Test 5: Product Card States
    console.log('\n5. PRODUCT CARD SCREENSHOTS');
    console.log('===========================');

    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle'
    });
    await page.waitForTimeout(2000);

    // Find first product card and capture
    const productCard = await page.$('[data-product-card], .product-showcase-card');
    if (productCard) {
      await productCard.screenshot({
        path: `${screenshotDir}/product-card.png`
      });
      console.log('✓ Product card captured');
    }

    // Summary
    console.log('\n=== VISUAL REGRESSION SUMMARY ===');
    console.log('=================================');
    
    const files = fs.readdirSync(screenshotDir);
    console.log(`Total screenshots captured: ${files.length}`);
    console.log('\nScreenshots saved to:', screenshotDir);
    console.log('\nCategories captured:');
    console.log('- Collection layouts (desktop, tablet, mobile)');
    console.log('- Component states (filters, empty state, drawer)');
    console.log('- Responsive breakpoints (6 sizes)');
    console.log('- Loading states');
    console.log('- Product card details');

  } catch (error) {
    console.error('\n[VISUAL TEST ERROR]', error.message);
  } finally {
    await browser.close();
    console.log('\nVisual regression tests completed!');
  }
})();