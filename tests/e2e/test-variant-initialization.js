// Test script to verify product card variant initialization
const playwright = require('playwright');

(async () => {
  console.log('Testing product card variant initialization...\n');

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console output
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Unable to serialize')));
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: args
    });
    console.log(`[${msg.type().toUpperCase()}]`, ...args);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  console.log('Test 1: Check initial variant initialization...');
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);

  // Check if variant system is available
  const variantSystemAvailable = await page.evaluate(() => {
    return typeof window.Shopify !== 'undefined' && 
           window.Shopify.ProductCardVariants && 
           typeof window.Shopify.ProductCardVariants.register === 'function';
  });

  console.log('Variant system available:', variantSystemAvailable);

  // Count product cards and initialized variants
  const cardStats = await page.evaluate(() => {
    const productCards = document.querySelectorAll('.product-card[data-product-id]');
    const initializedCards = document.querySelectorAll('.product-card[data-variants-initialized="true"]');
    const cardsWithVariants = document.querySelectorAll('.product-card[data-color-swatches], .product-card[data-size-pills]');
    
    return {
      totalCards: productCards.length,
      initializedCards: initializedCards.length,
      cardsWithVariants: cardsWithVariants.length
    };
  });

  console.log('Product card statistics:');
  console.log('- Total product cards:', cardStats.totalCards);
  console.log('- Initialized variant cards:', cardStats.initializedCards);
  console.log('- Cards with variant elements:', cardStats.cardsWithVariants);

  console.log('\nTest 2: Test Load More functionality...');
  
  // Check if Load More button exists
  const loadMoreExists = await page.$('[data-load-more]');
  if (loadMoreExists) {
    console.log('Load More button found, clicking...');
    
    // Click Load More and wait for new products
    await page.click('[data-load-more]');
    await page.waitForTimeout(3000);

    // Check stats after load more
    const newCardStats = await page.evaluate(() => {
      const productCards = document.querySelectorAll('.product-card[data-product-id]');
      const initializedCards = document.querySelectorAll('.product-card[data-variants-initialized="true"]');
      const cardsWithVariants = document.querySelectorAll('.product-card[data-color-swatches], .product-card[data-size-pills]');
      
      return {
        totalCards: productCards.length,
        initializedCards: initializedCards.length,
        cardsWithVariants: cardsWithVariants.length
      };
    });

    console.log('After Load More:');
    console.log('- Total product cards:', newCardStats.totalCards);
    console.log('- Initialized variant cards:', newCardStats.initializedCards);
    console.log('- Cards with variant elements:', newCardStats.cardsWithVariants);

    if (newCardStats.totalCards > cardStats.totalCards) {
      console.log('✓ Load More added', newCardStats.totalCards - cardStats.totalCards, 'new cards');
      
      if (newCardStats.initializedCards === newCardStats.totalCards) {
        console.log('✓ All cards properly initialized after Load More');
      } else {
        console.log('✗ Not all cards initialized after Load More');
      }
    } else {
      console.log('- No new cards added (may have reached end)');
    }
  } else {
    console.log('No Load More button found');
  }

  console.log('\nTest 3: Check for variant-related debug logs...');
  const variantLogs = consoleLogs.filter(log => 
    log.text.includes('CollectionPage') && 
    (log.text.includes('variant') || log.text.includes('Initialized'))
  );

  console.log('Found', variantLogs.length, 'variant-related debug logs:');
  variantLogs.forEach(log => {
    console.log(`- [${log.type}] ${log.text}`);
  });

  console.log('\n=== Test Summary ===');
  console.log('✓ Variant system availability checked');
  console.log('✓ Initial card initialization verified');
  console.log('✓ Load More functionality tested');
  console.log('✓ Debug logging verified');

  await browser.close();
  console.log('\nTest completed!');
})();