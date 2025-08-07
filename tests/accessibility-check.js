const { chromium } = require('playwright');

async function checkAccessibility() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:9292/collections/men-clothing');
  await page.waitForLoadState('domcontentloaded');
  
  console.log('🔍 Running Accessibility Validation...\n');
  
  // Test ARIA attributes and semantic markup
  const cards = await page.$$('.product-card');
  console.log('✅ Found', cards.length, 'product cards');
  
  let passedTests = 0;
  let totalTests = 0;
  
  for (let i = 0; i < Math.min(3, cards.length); i++) {
    const card = cards[i];
    
    // Test schema.org markup
    totalTests++;
    const itemscope = await card.getAttribute('itemscope');
    const itemtype = await card.getAttribute('itemtype');
    if (itemscope !== null && itemtype === 'http://schema.org/Product') {
      console.log(`✅ Card ${i+1}: Schema.org markup correct`);
      passedTests++;
    } else {
      console.log(`❌ Card ${i+1}: Schema.org markup missing or incorrect`);
    }
    
    // Test image alt attributes
    const images = await card.$$('img');
    for (let j = 0; j < images.length; j++) {
      totalTests++;
      const alt = await images[j].getAttribute('alt');
      if (alt !== null && alt !== '') {
        console.log(`✅ Card ${i+1} Image ${j+1}: Has alt text`);
        passedTests++;
      } else {
        console.log(`❌ Card ${i+1} Image ${j+1}: Missing alt text`);
      }
    }
    
    // Test price markup
    totalTests++;
    const offers = await card.$('[itemprop="offers"]');
    if (offers) {
      const offerType = await offers.getAttribute('itemtype');
      if (offerType === 'http://schema.org/Offer') {
        console.log(`✅ Card ${i+1}: Price markup correct`);
        passedTests++;
      } else {
        console.log(`❌ Card ${i+1}: Price markup incorrect`);
      }
    } else {
      console.log(`❌ Card ${i+1}: Price markup missing`);
    }
    
    // Test links are accessible
    totalTests++;
    const productLink = await card.$('a[href*="/products/"]');
    if (productLink) {
      console.log(`✅ Card ${i+1}: Product link accessible`);
      passedTests++;
    } else {
      console.log(`❌ Card ${i+1}: Product link missing`);
    }
  }
  
  // Test keyboard navigation
  totalTests++;
  const firstProductLink = await page.$('.product-card a');
  if (firstProductLink) {
    await firstProductLink.focus();
    const isFocused = await page.evaluate(() => document.activeElement.tagName === 'A');
    if (isFocused) {
      console.log('✅ Keyboard navigation: Focus works correctly');
      passedTests++;
    } else {
      console.log('❌ Keyboard navigation: Focus not working');
    }
  }
  
  await browser.close();
  
  console.log(`\n📊 Accessibility Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`🎯 Pass Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All accessibility tests passed!');
    return true;
  } else {
    console.log('⚠️  Some accessibility issues detected');
    return false;
  }
}

checkAccessibility().catch(console.error);