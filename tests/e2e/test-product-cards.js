const playwright = require('playwright');

(async () => {
  console.log('=== Product Card Functionality Test ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('[CollectionPage]') || text.includes('ProductCard') || text.includes('Variants')) {
      console.log('[LOG]', text);
    }
    if (msg.type() === 'error') {
      console.log('[ERROR]', text);
    }
  });

  try {
    // Load the men-clothing collection
    console.log('Loading men-clothing collection...');
    await page.goto('http://127.0.0.1:9292/collections/men-clothing', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(3000);

    // Test 1: Check if product cards exist
    console.log('\n1. PRODUCT CARD STRUCTURE');
    console.log('=========================');
    
    const productCards = await page.$$('.product-card[data-product-id]');
    console.log(`Product cards found: ${productCards.length}`);

    if (productCards.length === 0) {
      console.log('No product cards found! Checking alternative selectors...');
      const altCards = await page.$$('[data-product-grid-item] .product-showcase-card');
      console.log(`Alternative cards found: ${altCards.length}`);
    }

    // Test 2: Check for variant JavaScript
    console.log('\n2. VARIANT JAVASCRIPT AVAILABILITY');
    console.log('==================================');
    
    const variantSystem = await page.evaluate(() => {
      return {
        shopifyExists: typeof window.Shopify !== 'undefined',
        productCardVariantsExists: typeof window.Shopify?.ProductCardVariants !== 'undefined',
        registerMethod: typeof window.Shopify?.ProductCardVariants?.register === 'function'
      };
    });

    console.log(`Shopify object exists: ${variantSystem.shopifyExists ? '✓' : '✗'}`);
    console.log(`ProductCardVariants exists: ${variantSystem.productCardVariantsExists ? '✓' : '✗'}`);
    console.log(`Register method available: ${variantSystem.registerMethod ? '✓' : '✗'}`);

    // Test 3: Check color swatches
    console.log('\n3. COLOR SWATCH FUNCTIONALITY');
    console.log('=============================');
    
    if (productCards.length > 0) {
      const firstCard = productCards[0];
      
      // Check for color swatches
      const colorSwatches = await firstCard.$$('[data-color-swatches] .color-swatch, .color-swatches .color-swatch');
      console.log(`Color swatches found: ${colorSwatches.length}`);
      
      if (colorSwatches.length > 0) {
        console.log('Testing color swatch click...');
        
        // Get initial image src
        const initialImageSrc = await firstCard.$eval('img', img => img.src).catch(() => null);
        console.log(`Initial image: ${initialImageSrc ? 'found' : 'not found'}`);
        
        // Click first color swatch
        await colorSwatches[0].click();
        await page.waitForTimeout(500);
        
        // Check if image changed
        const newImageSrc = await firstCard.$eval('img', img => img.src).catch(() => null);
        const imageChanged = initialImageSrc !== newImageSrc;
        console.log(`Image changed after swatch click: ${imageChanged ? '✓' : '✗'}`);
      }
    }

    // Test 4: Check hover effects
    console.log('\n4. HOVER EFFECTS');
    console.log('================');
    
    if (productCards.length > 0) {
      const firstCard = productCards[0];
      
      // Check for secondary image
      const secondaryImage = await firstCard.$('.product-card__image-secondary, .product-showcase-card__image-secondary');
      console.log(`Secondary image exists: ${secondaryImage ? '✓' : '✗'}`);
      
      if (secondaryImage) {
        // Simulate hover
        await firstCard.hover();
        await page.waitForTimeout(500);
        
        const isVisible = await secondaryImage.isVisible();
        console.log(`Secondary image visible on hover: ${isVisible ? '✓' : '✗'}`);
      }
    }

    // Test 5: Check for initialization
    console.log('\n5. INITIALIZATION CHECK');
    console.log('=======================');
    
    const initializationStatus = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-card[data-product-id]');
      let initializedCount = 0;
      
      cards.forEach(card => {
        if (card.hasAttribute('data-variants-initialized')) {
          initializedCount++;
        }
      });
      
      return {
        totalCards: cards.length,
        initializedCards: initializedCount
      };
    });
    
    console.log(`Total cards: ${initializationStatus.totalCards}`);
    console.log(`Initialized cards: ${initializationStatus.initializedCards}`);
    console.log(`Initialization rate: ${initializationStatus.totalCards > 0 ? (initializationStatus.initializedCards / initializationStatus.totalCards * 100).toFixed(1) : 0}%`);

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    const hasCards = productCards.length > 0;
    const hasVariantSystem = variantSystem.shopifyExists && variantSystem.productCardVariantsExists;
    const isInitialized = initializationStatus.initializedCards > 0;
    
    console.log(`Product cards present: ${hasCards ? '✓' : '✗'}`);
    console.log(`Variant system available: ${hasVariantSystem ? '✓' : '✗'}`);
    console.log(`Cards initialized: ${isInitialized ? '✓' : '✗'}`);
    
    const overallStatus = hasCards && hasVariantSystem && isInitialized;
    console.log(`Overall status: ${overallStatus ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
    console.log('\nProduct card test completed!');
  }
})();