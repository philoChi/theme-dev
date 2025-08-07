/**
 * Debug script for Collection Page issues
 * Investigating: image visibility, translations, load more behavior
 */

const playwright = require('playwright');

(async () => {
  console.log('🔍 Debugging Collection Page Issues...\n');
  
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

  page.on('pageerror', error => {
    console.error('❌ Page error:', error.message);
  });

  try {
    console.log('📍 Loading collection page...');
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);

    // Bug 1: Check image visibility
    console.log('\n🔍 Bug 1: Checking image visibility...');
    
    const images = await page.locator('.product-showcase-card__image');
    const imageCount = await images.count();
    console.log(`Found ${imageCount} product images`);
    
    if (imageCount > 0) {
      const firstImage = images.first();
      const isVisible = await firstImage.isVisible();
      const opacity = await firstImage.evaluate(img => window.getComputedStyle(img).opacity);
      const display = await firstImage.evaluate(img => window.getComputedStyle(img).display);
      const src = await firstImage.getAttribute('src');
      
      console.log(`First image - Visible: ${isVisible}, Opacity: ${opacity}, Display: ${display}`);
      console.log(`First image src: ${src}`);
      
      // Check for lazy loading classes
      const hasLazyClass = await firstImage.evaluate(img => img.hasAttribute('loading'));
      const isLoaded = await firstImage.evaluate(img => img.classList.contains('is-loaded'));
      
      console.log(`Lazy loading: ${hasLazyClass}, Is loaded: ${isLoaded}`);
    }

    // Bug 2: Check translations
    console.log('\n🔍 Bug 2: Checking translations...');
    
    const filterButton = await page.locator('[data-drawer-trigger="filter"]');
    if (await filterButton.isVisible()) {
      const buttonText = await filterButton.textContent();
      const ariaLabel = await filterButton.getAttribute('aria-label');
      
      console.log(`Filter button text: "${buttonText}"`);
      console.log(`Filter button aria-label: "${ariaLabel}"`);
      
      if (buttonText.includes('missing') || ariaLabel.includes('missing')) {
        console.log('❌ Translation missing detected!');
      }
    }

    // Check sort select options
    const sortSelect = await page.locator('[data-sort-select]');
    if (await sortSelect.isVisible()) {
      const options = await sortSelect.locator('option').allTextContents();
      console.log('Sort options:', options);
      
      options.forEach((option, index) => {
        if (option.includes('missing')) {
          console.log(`❌ Missing translation in sort option ${index}: "${option}"`);
        }
      });
    }

    // Bug 3: Check load more behavior
    console.log('\n🔍 Bug 3: Checking load more behavior...');
    
    const loadMoreButton = await page.locator('[data-load-more]');
    if (await loadMoreButton.isVisible()) {
      console.log('Load more button found');
      
      // Count initial products
      const initialCount = await page.locator('[data-product-grid-item]:visible').count();
      console.log(`Initial product count: ${initialCount}`);
      
      // Click load more
      console.log('Clicking load more...');
      await loadMoreButton.click();
      await page.waitForTimeout(3000);
      
      const afterFirstClick = await page.locator('[data-product-grid-item]:visible').count();
      console.log(`After first click: ${afterFirstClick}`);
      
      // Click again if button still visible
      if (await loadMoreButton.isVisible()) {
        console.log('Clicking load more second time...');
        await loadMoreButton.click();
        await page.waitForTimeout(3000);
        
        const afterSecondClick = await page.locator('[data-product-grid-item]:visible').count();
        console.log(`After second click: ${afterSecondClick}`);
        
        if (afterSecondClick < afterFirstClick) {
          console.log('❌ Bug confirmed: Products decreased after second click!');
        }
      }
      
      // Check load more button state
      const buttonText = await loadMoreButton.textContent();
      const isDisabled = await loadMoreButton.isDisabled();
      console.log(`Load more button text: "${buttonText}"`);
      console.log(`Load more button disabled: ${isDisabled}`);
    } else {
      console.log('No load more button visible');
    }

    // Take screenshots for analysis
    await page.screenshot({ path: 'tests/e2e/screenshots/debug-initial-state.png' });
    
    // Force hover on first product to see if images appear
    if (imageCount > 0) {
      console.log('\n🔍 Testing hover behavior...');
      await page.locator('.product-showcase-card').first().hover();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'tests/e2e/screenshots/debug-after-hover.png' });
    }

    // Console summary
    console.log('\n=== Console Output Summary ===');
    console.log('Total logs:', consoleLogs.length);
    console.log('Errors:', consoleLogs.filter(l => l.type === 'error').length);
    console.log('Warnings:', consoleLogs.filter(l => l.type === 'warning').length);
    
    const errors = consoleLogs.filter(l => l.type === 'error');
    if (errors.length > 0) {
      console.log('\n❌ Console Errors:');
      errors.forEach(error => console.log(`  - ${error.text}`));
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Debug completed');
  }
})();