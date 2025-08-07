const { chromium } = require('playwright');

async function checkMobileResponsiveness() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('📱 Running Mobile Responsiveness Validation...\n');
  
  const viewports = [
    { name: 'Mobile', width: 390, height: 844 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];
  
  let passedTests = 0;
  let totalTests = 0;
  
  for (const viewport of viewports) {
    console.log(`🔍 Testing ${viewport.name} (${viewport.width}x${viewport.height}):`);
    
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('http://127.0.0.1:9292/collections/men-clothing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Allow responsive animations
    
    // Test product cards are visible
    totalTests++;
    const productCards = await page.$$('.product-card');
    if (productCards.length > 0) {
      console.log(`  ✅ Product cards visible: ${productCards.length} cards found`);
      passedTests++;
    } else {
      console.log(`  ❌ No product cards visible`);
    }
    
    // Test layout doesn't overflow
    totalTests++;
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = viewport.width;
    if (bodyWidth <= viewportWidth + 20) { // Allow small margin for scrollbars
      console.log(`  ✅ No horizontal overflow (${bodyWidth}px <= ${viewportWidth}px)`);
      passedTests++;
    } else {
      console.log(`  ❌ Horizontal overflow detected (${bodyWidth}px > ${viewportWidth}px)`);
    }
    
    // Test navigation is accessible
    totalTests++;
    const navElement = await page.$('nav, .navigation, .header');
    if (navElement && await navElement.isVisible()) {
      console.log(`  ✅ Navigation is visible and accessible`);
      passedTests++;
    } else {
      console.log(`  ❌ Navigation not accessible`);
    }
    
    // Test images are properly sized
    totalTests++;
    const images = await page.$$('.product-card img');
    let imagesSized = true;
    for (const img of images.slice(0, 3)) { // Test first 3 images
      const box = await img.boundingBox();
      if (!box || box.width <= 0 || box.height <= 0) {
        imagesSized = false;
        break;
      }
    }
    if (imagesSized && images.length > 0) {
      console.log(`  ✅ Product images properly sized`);
      passedTests++;
    } else {
      console.log(`  ❌ Product images sizing issues`);
    }
    
    console.log('');
  }
  
  await browser.close();
  
  console.log(`📊 Mobile Responsiveness Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`🎯 Pass Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All mobile responsiveness tests passed!');
    return true;
  } else {
    console.log('⚠️  Some responsiveness issues detected');
    return false;
  }
}

checkMobileResponsiveness().catch(console.error);