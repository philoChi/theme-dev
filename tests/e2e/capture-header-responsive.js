const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 }
  ];
  
  for (const viewport of viewports) {
    const page = await browser.newPage();
    
    try {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Navigate to homepage
      await page.goto('http://127.0.0.1:9292');
      await page.waitForTimeout(3000);
      
      // Try to find header element with common selectors
      const headerSelectors = [
        'header',
        '.header',
        '.site-header',
        '.main-header',
        '[data-section-type="header"]',
        '.section-header',
        'nav',
        '.navigation'
      ];
      
      let headerElement = null;
      let selectorUsed = '';
      
      for (const selector of headerSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found header with selector: ${selector} for ${viewport.name}`);
          headerElement = element;
          selectorUsed = selector;
          break;
        }
      }
      
      if (headerElement) {
        await headerElement.screenshot({ 
          path: `tests/e2e/screenshots/header-navigation-${viewport.name}-${viewport.width}px.png` 
        });
        console.log(`Header screenshot saved as tests/e2e/screenshots/header-navigation-${viewport.name}-${viewport.width}px.png`);
      } else {
        console.log(`No header element found for ${viewport.name}, taking top portion of page`);
        await page.screenshot({ 
          path: `tests/e2e/screenshots/header-navigation-${viewport.name}-${viewport.width}px.png`,
          clip: { x: 0, y: 0, width: viewport.width, height: 200 }
        });
      }
      
    } catch (error) {
      console.error(`Error capturing ${viewport.name}:`, error);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log('All header screenshots completed!');
})();