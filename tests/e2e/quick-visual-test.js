const playwright = require('playwright');
const fs = require('fs');

(async () => {
  console.log('=== Quick Visual Tests ===\n');
  
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  const screenshotDir = 'tests/e2e/screenshots/visual-regression';
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  try {
    console.log('Capturing collection page at different viewports...\n');
    
    await page.goto('http://127.0.0.1:9292/collections/all', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    await page.waitForTimeout(3000);

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({
      path: `${screenshotDir}/collection-desktop.png`,
      fullPage: false
    });
    console.log('✓ Desktop screenshot captured');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({
      path: `${screenshotDir}/collection-tablet.png`,
      fullPage: false
    });
    console.log('✓ Tablet screenshot captured');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({
      path: `${screenshotDir}/collection-mobile.png`,
      fullPage: false
    });
    console.log('✓ Mobile screenshot captured');

    // With filters
    await page.goto('http://127.0.0.1:9292/collections/all?filter.type=t-shirt', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({
      path: `${screenshotDir}/collection-filtered.png`,
      fullPage: false
    });
    console.log('✓ Filtered state captured');

    console.log('\n=== Visual Test Summary ===');
    const files = fs.readdirSync(screenshotDir);
    console.log(`Screenshots captured: ${files.length}`);
    console.log('Location:', screenshotDir);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();