const playwright = require('playwright');
const fs = require('fs');

(async () => {
  // Read Shopify URL from file, fallback to default if not found
  let shopifyUrl = 'http://127.0.0.1:9292'; // Default
  try {
    shopifyUrl = fs.readFileSync('working-url.md', 'utf8').trim();
  } catch (err) {
    console.log('Note: working-url.md not found, using default URL:', shopifyUrl);
  }
  console.log(`Using Shopify URL: ${shopifyUrl}`);
  
  const browser = await playwright.chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console output
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
    console.error('Page error:', error.message);
  });

  console.log('\nTest 1: Check if FAQ page exists...');
  const response = await page.goto(`${shopifyUrl}/pages/faq`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  if (response.status() === 404) {
    console.log('❌ FAQ page not found. Make sure to create the page in Shopify admin.');
  } else {
    console.log('✅ FAQ page loads successfully (status:', response.status() + ')');
  }

  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({
    path: 'e2e/screenshots/faq-page-initial.png',
    fullPage: true
  });

  console.log('\nTest 2: Check announcement bar for FAQ link...');
  await page.goto(`${shopifyUrl}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  const faqLink = await page.$('a[href="/pages/faq"]');
  if (faqLink) {
    console.log('✅ FAQ link found in announcement bar');
    const linkTitle = await faqLink.getAttribute('title');
    console.log('  Link title:', linkTitle);
  } else {
    console.log('❌ FAQ link not found in announcement bar');
  }

  // Take screenshot of homepage with announcement bar
  await page.screenshot({
    path: 'e2e/screenshots/announcement-bar-with-faq.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 200 }
  });

  // Console summary
  console.log('\n=== Console Output Summary ===');
  console.log('Total logs:', consoleLogs.length);
  console.log('Errors:', consoleLogs.filter(l => l.type === 'error').length);
  console.log('Warnings:', consoleLogs.filter(l => l.type === 'warning').length);
  console.log('Debug logs:', consoleLogs.filter(l => l.text.includes('[') && l.text.includes(']')).length);

  // Debug logs specific to FAQ
  const faqLogs = consoleLogs.filter(l => l.text.includes('[FAQ'));
  if (faqLogs.length > 0) {
    console.log('\nFAQ-specific debug logs:');
    faqLogs.forEach(log => {
      console.log(`  ${log.text}`);
    });
  }

  await browser.close();
  console.log('\nVerification completed! Check screenshots in e2e/screenshots/');
})();