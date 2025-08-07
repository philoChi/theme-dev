const playwright = require('playwright');

(async () => {
  console.log('=== Quick Product Card Test ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://127.0.0.1:9292/collections/men-clothing', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    await page.waitForTimeout(3000);

    // Check product cards
    const cardInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('.product-card[data-product-id]');
      const showcaseCards = document.querySelectorAll('.product-showcase-card');
      const variantSystem = typeof window.Shopify?.ProductCardVariants !== 'undefined';
      
      let cardWithSwatches = 0;
      let cardWithSecondaryImage = 0;
      let initializedCards = 0;
      
      cards.forEach(card => {
        if (card.querySelector('.color-swatch')) cardWithSwatches++;
        if (card.querySelector('.product-card__image-secondary, .product-showcase-card__image-secondary')) cardWithSecondaryImage++;
        if (card.hasAttribute('data-variants-initialized')) initializedCards++;
      });
      
      showcaseCards.forEach(card => {
        if (card.querySelector('.color-swatch')) cardWithSwatches++;
        if (card.querySelector('.product-card__image-secondary, .product-showcase-card__image-secondary')) cardWithSecondaryImage++;
        if (card.hasAttribute('data-variants-initialized')) initializedCards++;
      });
      
      return {
        productCards: cards.length,
        showcaseCards: showcaseCards.length,
        variantSystem,
        cardWithSwatches,
        cardWithSecondaryImage,
        initializedCards
      };
    });

    console.log('Results:');
    console.log(`Product cards (.product-card): ${cardInfo.productCards}`);
    console.log(`Showcase cards (.product-showcase-card): ${cardInfo.showcaseCards}`);
    console.log(`Variant system available: ${cardInfo.variantSystem ? '✓' : '✗'}`);
    console.log(`Cards with color swatches: ${cardInfo.cardWithSwatches}`);
    console.log(`Cards with secondary images: ${cardInfo.cardWithSecondaryImage}`);
    console.log(`Initialized cards: ${cardInfo.initializedCards}`);

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/men-clothing-cards.png',
      fullPage: false
    });
    console.log('\nScreenshot saved: men-clothing-cards.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();