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
  console.log(`[Login Feature Test] Using Shopify URL: ${shopifyUrl}`);
  
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
    console.error('[Login Feature Test] Page error:', error.message);
  });

  console.log('\n=== Testing Milestone 1: Navigation Integration & Account Icon ===');
  
  console.log('\nTest 1: Homepage - Account icon in navigation...');
  await page.goto(`${shopifyUrl}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(2000);

  // Check if account icon exists in navigation
  const accountIcon = await page.$('.icon-button--login');
  if (accountIcon) {
    console.log('✓ Account icon found in navigation');
    
    // Check if it links to login page when logged out
    const href = await accountIcon.getAttribute('href');
    console.log(`Account icon link: ${href}`);
    
    if (href && href.includes('/account/login')) {
      console.log('✓ Account icon correctly links to login page');
    } else {
      console.log('⚠️ Account icon link may be incorrect');
    }
  } else {
    console.log('❌ Account icon not found in navigation');
  }

  // Take screenshot of navigation
  await page.screenshot({
    path: 'e2e/screenshots/login-milestone1-navigation.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 100 }
  });

  console.log('\nTest 2: Mobile viewport navigation...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1000);
  
  await page.screenshot({
    path: 'e2e/screenshots/login-milestone1-mobile.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 375, height: 100 }
  });

  console.log('\nTest 3: Desktop viewport navigation...');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(1000);
  
  await page.screenshot({
    path: 'e2e/screenshots/login-milestone1-desktop.png',
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 100 }
  });

  console.log('\nTest 4: Account login page access...');
  if (accountIcon) {
    await accountIcon.click();
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Redirected to: ${currentUrl}`);
    
    if (currentUrl.includes('/account/login')) {
      console.log('✓ Successfully redirected to login page');
      
      await page.screenshot({
        path: 'e2e/screenshots/login-milestone1-loginpage.png',
        fullPage: true
      });
    } else {
      console.log('⚠️ Unexpected redirect or login page structure');
    }
  }

  // Console summary
  console.log('\n=== Console Output Summary ===');
  console.log('Total logs:', consoleLogs.length);
  console.log('Errors:', consoleLogs.filter(l => l.type === 'error').length);
  console.log('Warnings:', consoleLogs.filter(l => l.type === 'warning').length);
  console.log('Debug logs:', consoleLogs.filter(l => l.text.includes('[') && l.text.includes(']')).length);

  await browser.close();
  console.log('\n=== Milestone 1 Test Completed! ===');
  console.log('Screenshots saved to e2e/screenshots/');
})();