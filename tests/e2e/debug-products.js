const playwright = require('playwright');

(async () => {
  console.log('=== Debug Products Loading ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[ERROR]', msg.text());
    } else if (msg.text().includes('[CollectionPage]')) {
      console.log('[LOG]', msg.text());
    }
  });

  try {
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'networkidle',
      timeout: 15000
    });
    
    // Wait for page to settle
    await page.waitForTimeout(3000);

    // Check various selectors for products
    const selectors = [
      '[data-product-card]',
      '.product-card',
      '[data-product-grid-item]',
      '.product-showcase-card',
      '[data-product-showcase-card]'
    ];

    console.log('Checking for product elements:');
    for (const selector of selectors) {
      const count = await page.$$eval(selector, els => els.length).catch(() => 0);
      if (count > 0) {
        console.log(`✓ Found ${count} elements with selector: ${selector}`);
      }
    }

    // Check grid container
    const gridSelectors = [
      '[data-product-grid]',
      '.collection-grid',
      '.product-grid',
      '#product-grid'
    ];

    console.log('\nChecking for grid container:');
    for (const selector of gridSelectors) {
      const exists = await page.$(selector) !== null;
      if (exists) {
        console.log(`✓ Found grid container: ${selector}`);
        
        // Check its content
        const html = await page.$eval(selector, el => el.innerHTML.substring(0, 200));
        console.log(`  Content preview: ${html}...`);
      }
    }

    // Check collection data
    const collectionInfo = await page.evaluate(() => {
      return {
        hasCollectionData: typeof window.collectionData !== 'undefined',
        productCount: window.collectionData?.products?.length || 0,
        collectionTitle: document.querySelector('h1')?.textContent || 'Not found'
      };
    });

    console.log('\nCollection information:');
    console.log('- Collection data loaded:', collectionInfo.hasCollectionData);
    console.log('- Products in data:', collectionInfo.productCount);
    console.log('- Collection title:', collectionInfo.collectionTitle);

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/debug-products.png',
      fullPage: false
    });
    console.log('\nScreenshot saved to debug-products.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();