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
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable detailed logging
  const logs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    logs.push(logEntry);
    console.log(logEntry);
  });

  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`HTTP ${response.status()} - ${response.url()}`);
    }
  });

  console.log('\nNavigating to FAQ page...');
  try {
    const response = await page.goto(`${shopifyUrl}/pages/faq`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log('Response status:', response.status());
    
    // Get the page HTML to look for errors
    const pageHTML = await page.content();
    
    // Save HTML for inspection
    fs.writeFileSync('e2e/faq-page-output.html', pageHTML);
    console.log('Page HTML saved to e2e/faq-page-output.html');
    
    // Look for Liquid errors in the page
    if (pageHTML.includes('Liquid error') || pageHTML.includes('Error:')) {
      console.log('\n=== LIQUID ERRORS FOUND ===');
      
      // Extract error messages
      const errorMatches = pageHTML.match(/Liquid error[^<]*/g) || [];
      const generalErrors = pageHTML.match(/Error:[^<]*/g) || [];
      
      [...errorMatches, ...generalErrors].forEach(err => {
        console.log('ERROR:', err.trim());
      });
    }
    
    // Check if FAQ section exists
    const faqSection = await page.$('faq-section, .faq-section');
    if (!faqSection) {
      console.log('WARNING: FAQ section not found on page');
    } else {
      console.log('✓ FAQ section found');
    }
    
    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/faq-page-debug.png',
      fullPage: true
    });
    
  } catch (error) {
    console.error('Navigation error:', error);
  }

  await browser.close();
  
  console.log('\n=== Console Log Summary ===');
  console.log(`Total logs: ${logs.length}`);
})();