const playwright = require('playwright');
const fs = require('fs');

(async () => {
  // Read Shopify URL
  let shopifyUrl = 'http://127.0.0.1:9292';
  try {
    shopifyUrl = fs.readFileSync('working-url.md', 'utf8').trim();
  } catch (err) {
    console.log('Using default URL:', shopifyUrl);
  }
  
  const browser = await playwright.chromium.launch({
    headless: false, // Show browser to see any errors
    devtools: true   // Open devtools
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable detailed logging
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });

  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
    console.error('Stack:', error.stack);
  });

  page.on('requestfailed', request => {
    console.error('REQUEST FAILED:', request.url(), request.failure());
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  console.log('\nNavigating to FAQ page...');
  try {
    const response = await page.goto(`${shopifyUrl}/pages/faq`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('Response status:', response.status());
    console.log('Response URL:', response.url());
    
    // Try to get error details from the page
    const pageContent = await page.content();
    
    // Look for error messages in the HTML
    if (pageContent.includes('Liquid error') || pageContent.includes('error')) {
      console.log('\n=== CHECKING FOR ERRORS IN PAGE ===');
      
      // Get all text content that might contain error info
      const errorText = await page.evaluate(() => {
        const errors = [];
        // Look for Liquid errors
        document.querySelectorAll('*').forEach(el => {
          if (el.textContent.includes('Liquid error') || 
              el.textContent.includes('Error in template') ||
              el.textContent.includes('undefined method') ||
              el.textContent.includes('cannot be parsed')) {
            errors.push(el.textContent.trim());
          }
        });
        return errors;
      });
      
      if (errorText.length > 0) {
        console.log('Found errors:');
        errorText.forEach(err => console.log(' -', err));
      }
    }
    
    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/faq-error-debug.png',
      fullPage: true
    });
    
  } catch (error) {
    console.error('Navigation error:', error);
  }

  console.log('\nKeeping browser open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();