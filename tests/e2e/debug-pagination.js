const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('[INFO]')) {
      console.log('Browser log:', msg.text());
    }
  });

  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  // Get state info
  const stateInfo = await page.evaluate(() => {
    const controller = window.collectionPageController;
    const collectionInfo = document.querySelector('.collection-page__count')?.textContent;
    
    return {
      controllerExists: Boolean(controller),
      state: controller ? {
        originalProducts: controller.state.originalProducts.length,
        filteredProducts: controller.state.filteredProducts.length,
        currentPage: controller.state.currentPage,
        productsPerPage: controller.config.productsPerPage,
        collectionDataProducts: controller.state.collectionData ? controller.state.collectionData.productsCount : 0
      } : null,
      collectionInfo: collectionInfo
    };
  });

  console.log('Initial state:', JSON.stringify(stateInfo, null, 2));

  // Check the collection data script
  const collectionData = await page.evaluate(() => {
    const script = document.querySelector('[data-collection-data]');
    if (script) {
      try {
        const data = JSON.parse(script.textContent);
        return {
          productsCount: data.productsCount,
          productsLength: data.products.length
        };
      } catch (e) {
        return { error: e.message };
      }
    }
    return null;
  });

  console.log('\nCollection data script:', collectionData);

  // Click load more
  console.log('\nClicking Load More...');
  await page.click('[data-load-more]');
  await page.waitForTimeout(3000);

  // Get state after click
  const afterClick = await page.evaluate(() => {
    const controller = window.collectionPageController;
    const visibleProducts = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])').length;
    const loadMoreBtn = document.querySelector('[data-load-more]');
    const loadMoreVisible = loadMoreBtn ? window.getComputedStyle(loadMoreBtn).display !== 'none' : false;
    
    return {
      state: controller ? {
        currentPage: controller.state.currentPage,
        filteredProducts: controller.state.filteredProducts.length,
        isLoading: controller.state.isLoading
      } : null,
      visibleProducts: visibleProducts,
      loadMoreVisible: loadMoreVisible
    };
  });

  console.log('\nAfter click:', JSON.stringify(afterClick, null, 2));

  await browser.close();
})();