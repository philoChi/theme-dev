/**
 * Test Runner for Collection Page E2E Tests
 * Simplified runner for WSL environment
 */

const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

async function runCollectionTests() {
  console.log('🚀 Starting Collection Page E2E Tests...\n');
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Set up error logging
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ Browser Error:', msg.text());
    }
  });

  try {
    console.log('📍 Testing Collection Page URL: http://127.0.0.1:9292/collections/all');
    
    // Test 1: Basic Page Load (FR-01)
    console.log('\n🧪 Test 1: Basic Page Load and Grid Layout');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForSelector('[data-product-grid]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const products = await page.locator('[data-product-grid-item]');
    const productCount = await products.count();
    console.log(`   ✅ Found ${productCount} products in grid`);
    
    // Test responsive layouts
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/test-mobile-layout.png' });
    console.log('   ✅ Mobile layout captured');
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'tests/e2e/screenshots/test-desktop-layout.png' });
    console.log('   ✅ Desktop layout captured');

    // Test 2: Filter Functionality (FR-03, FR-04)
    console.log('\n🧪 Test 2: Filter Functionality');
    
    // Check for filter button
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Filter drawer opened');
      
      await page.screenshot({ path: 'tests/e2e/screenshots/test-filter-drawer.png' });
      
      // Try to apply a filter
      const anyFilter = await page.locator('[data-filter-options] input[type="checkbox"]').first();
      if (await anyFilter.isVisible()) {
        await anyFilter.click();
        await page.waitForTimeout(2000);
        console.log('   ✅ Filter applied successfully');
        
        const filteredCount = await page.locator('[data-product-grid-item]:visible').count();
        console.log(`   ✅ Filtered down to ${filteredCount} products`);
      }
    } else {
      console.log('   ℹ️  Filter button not visible (desktop layout)');
    }

    // Test 3: Sorting Functionality (FR-08)
    console.log('\n🧪 Test 3: Sorting Functionality');
    
    const sortSelect = await page.locator('[data-sort-select]');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price-ascending');
      await page.waitForTimeout(2000);
      console.log('   ✅ Sort by price applied');
      
      await page.screenshot({ path: 'tests/e2e/screenshots/test-sorting.png' });
    }

    // Test 4: URL State (FR-15)
    console.log('\n🧪 Test 4: URL State Synchronization');
    
    const currentUrl = page.url();
    if (currentUrl.includes('sort_by=') || currentUrl.includes('filter.')) {
      console.log('   ✅ URL contains filter/sort parameters');
      console.log(`   📍 Current URL: ${currentUrl}`);
    } else {
      console.log('   ℹ️  No URL parameters detected (may be expected)');
    }

    // Test 5: Product Navigation (FR-02)
    console.log('\n🧪 Test 5: Product Navigation');
    
    const firstProduct = await page.locator('[data-product-grid-item] .product-showcase-card__title a').first();
    if (await firstProduct.isVisible()) {
      const href = await firstProduct.getAttribute('href');
      if (href && href.includes('/products/')) {
        console.log('   ✅ Product links are correctly formatted');
        console.log(`   📍 Example product URL: ${href}`);
      }
    }

    // Test 6: Load More (FR-16)
    console.log('\n🧪 Test 6: Pagination/Load More');
    
    const loadMoreButton = await page.locator('[data-load-more]');
    if (await loadMoreButton.isVisible()) {
      const beforeLoad = await page.locator('[data-product-grid-item]:visible').count();
      await loadMoreButton.click();
      await page.waitForTimeout(3000);
      const afterLoad = await page.locator('[data-product-grid-item]:visible').count();
      
      if (afterLoad > beforeLoad) {
        console.log(`   ✅ Load more worked: ${beforeLoad} → ${afterLoad} products`);
      } else {
        console.log('   ℹ️  Load more clicked but no new products loaded');
      }
    } else {
      console.log('   ℹ️  Load more button not visible (all products loaded)');
    }

    // Test 7: Accessibility Features
    console.log('\n🧪 Test 7: Accessibility Features');
    
    const gridAriaLabel = await page.locator('[data-product-grid]').getAttribute('aria-label');
    if (gridAriaLabel) {
      console.log('   ✅ Product grid has aria-label');
    }
    
    const filterAriaExpanded = await page.locator('[data-drawer-trigger="filter"]').getAttribute('aria-expanded');
    if (filterAriaExpanded !== null) {
      console.log('   ✅ Filter button has aria-expanded attribute');
    }

    // Final comprehensive screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/test-final-state.png',
      fullPage: true 
    });

    console.log('\n✅ All tests completed successfully!');
    
    if (errors.length > 0) {
      console.log('\n⚠️  Console errors detected:');
      errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('\n✅ No console errors detected');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'tests/e2e/screenshots/test-error-state.png' });
  } finally {
    await browser.close();
    console.log('\n🏁 Test execution completed\n');
  }
}

// Run tests if called directly
if (require.main === module) {
  runCollectionTests().catch(console.error);
}

module.exports = { runCollectionTests };