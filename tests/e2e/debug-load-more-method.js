const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('=== LOAD MORE METHOD DEBUG ===');
  
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);
  
  console.log('\n1. Checking current state...');
  const beforeState = await page.evaluate(() => {
    const controller = window.collectionPageController;
    if (!controller) return { error: 'Controller not found' };
    
    return {
      totalProducts: controller.state.originalProducts.length,
      filteredProducts: controller.state.filteredProducts.length,
      currentPage: controller.state.currentPage,
      productsPerPage: controller.config.productsPerPage,
      visibleInDOM: document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length,
      totalInDOM: document.querySelectorAll('[data-product-grid-item]').length
    };
  });
  
  console.log('Before click state:', beforeState);
  
  console.log('\n2. Clicking Load More button...');
  await page.click('[data-load-more]');
  await page.waitForTimeout(1000);
  
  console.log('\n3. Checking state after click...');
  const afterState = await page.evaluate(() => {
    const controller = window.collectionPageController;
    if (!controller) return { error: 'Controller not found' };
    
    return {
      totalProducts: controller.state.originalProducts.length,
      filteredProducts: controller.state.filteredProducts.length,
      currentPage: controller.state.currentPage,
      productsPerPage: controller.config.productsPerPage,
      visibleInDOM: document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length,
      totalInDOM: document.querySelectorAll('[data-product-grid-item]').length
    };
  });
  
  console.log('After click state:', afterState);
  
  console.log('\n4. Checking showProductsUpToIndex method directly...');
  const methodResult = await page.evaluate(() => {
    const controller = window.collectionPageController;
    if (!controller) return { error: 'Controller not found' };
    
    console.log('Before showProductsUpToIndex - Products to show:', 48);
    console.log('Before showProductsUpToIndex - Filtered products count:', controller.state.filteredProducts.length);
    
    // Get first 48 products
    const productsToShow = controller.state.filteredProducts.slice(0, 48);
    console.log('Products to show slice:', productsToShow.length);
    
    const productsToShowIds = new Set(productsToShow.map(p => p.id.toString()));
    console.log('Product IDs to show:', Array.from(productsToShowIds));
    
    // Check grid items
    const gridItems = document.querySelectorAll('[data-product-grid-item]');
    console.log('Total grid items found:', gridItems.length);
    
    let visibleCount = 0;
    let hiddenCount = 0;
    
    gridItems.forEach((item, index) => {
      const productCard = item.querySelector('[data-product-id]');
      if (productCard) {
        const productId = productCard.dataset.productId;
        const shouldBeVisible = productsToShowIds.has(productId);
        const currentlyVisible = item.style.display !== 'none';
        
        console.log('Item ' + index + ': Product ID ' + productId + ', Should be visible: ' + shouldBeVisible + ', Currently visible: ' + currentlyVisible);
        
        if (shouldBeVisible) {
          item.style.display = '';
          visibleCount++;
        } else {
          item.style.display = 'none';
          hiddenCount++;
        }
      }
    });
    
    console.log('Manual method result - Visible:', visibleCount, 'Hidden:', hiddenCount);
    
    return {
      productsToShowCount: productsToShow.length,
      productIdsToShow: Array.from(productsToShowIds).slice(0, 5), // First 5 for brevity
      totalGridItems: gridItems.length,
      manualVisibleCount: visibleCount,
      manualHiddenCount: hiddenCount
    };
  });
  
  console.log('Method result:', methodResult);
  
  console.log('\n5. Final check...');
  const finalState = await page.evaluate(() => {
    return {
      visibleInDOM: document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length,
      totalInDOM: document.querySelectorAll('[data-product-grid-item]').length
    };
  });
  
  console.log('Final DOM state:', finalState);
  
  await browser.close();
  console.log('\n=== DEBUG COMPLETE ===');
})();