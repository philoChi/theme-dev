const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Unable to serialize')));
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      args: args
    });
    console.log(`[CONSOLE-${msg.type().toUpperCase()}]`, ...args);
  });
  
  page.on('pageerror', error => {
    console.error('[PAGE-ERROR]', error.message);
  });
  
  console.log('=== LOAD MORE BUTTON INVESTIGATION ===');
  console.log('1. Loading collection page...');
  
  await page.goto('http://127.0.0.1:9292/collections/all', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await page.waitForTimeout(2000);
  
  console.log('\n2. Checking Load More button HTML structure...');
  const loadMoreButton = await page.$('[data-load-more]');
  if (loadMoreButton) {
    const buttonHTML = await loadMoreButton.evaluate(el => el.outerHTML);
    console.log('Button HTML:', buttonHTML);
    
    const buttonText = await loadMoreButton.textContent();
    console.log('Button text:', buttonText);
    
    const buttonVisible = await loadMoreButton.isVisible();
    console.log('Button visible:', buttonVisible);
    
    const buttonStyles = await loadMoreButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        textAlign: styles.textAlign,
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems
      };
    });
    console.log('Button computed styles:', buttonStyles);
    
    const parentContainer = await page.$('.collection-page__pagination');
    if (parentContainer) {
      const parentStyles = await parentContainer.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          textAlign: styles.textAlign,
          display: styles.display,
          justifyContent: styles.justifyContent
        };
      });
      console.log('Parent container styles:', parentStyles);
    }
  } else {
    console.log('Load More button NOT FOUND');
  }
  
  console.log('\n3. Testing button click...');
  if (loadMoreButton) {
    const beforeClickProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', items => items.length);
    console.log('Products visible before click:', beforeClickProducts);
    
    await loadMoreButton.click();
    await page.waitForTimeout(2000);
    
    const afterClickProducts = await page.$$eval('[data-product-grid-item]:not([style*="display: none"])', items => items.length);
    console.log('Products visible after click:', afterClickProducts);
    
    const buttonAfterClick = await loadMoreButton.textContent();
    console.log('Button text after click:', buttonAfterClick);
  }
  
  console.log('\n4. Console log summary:');
  console.log('Total console messages:', consoleLogs.length);
  console.log('Errors:', consoleLogs.filter(l => l.type === 'error').length);
  console.log('Debug messages:', consoleLogs.filter(l => l.text.includes('Load more')).length);
  
  await browser.close();
  console.log('\n=== INVESTIGATION COMPLETE ===');
})();