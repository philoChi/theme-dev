/**
 * Test script to verify search module initialization
 * This script opens the search drawer and checks if the search module initializes properly
 */

import { chromium } from 'playwright';

async function testSearchInitialization() {
  console.log('🔍 Testing Search Module Initialization...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to the development URL
  console.log('📍 Navigating to http://127.0.0.1:42105...');
  await page.goto('http://127.0.0.1:42105');
  
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');
  console.log('✅ Page loaded successfully');
  
  // Check if search input exists
  const searchInput = await page.locator('[mpe="search-input"]');
  const searchInputExists = await searchInput.count() > 0;
  console.log(`🔍 Search input exists: ${searchInputExists ? '✅' : '❌'}`);
  
  // Check if results container exists
  const resultsContainer = await page.locator('#SearchResults');
  const resultsContainerExists = await resultsContainer.count() > 0;
  console.log(`📋 Results container exists: ${resultsContainerExists ? '✅' : '❌'}`);
  
  // Check if Theme.DrawerSearch exists
  const themeSearchExists = await page.evaluate(() => {
    return window.Theme && window.Theme.DrawerSearch && typeof window.Theme.DrawerSearch.init === 'function';
  });
  console.log(`🎯 Theme.DrawerSearch module loaded: ${themeSearchExists ? '✅' : '❌'}`);
  
  // Try to find and click search button to open drawer
  console.log('\n🖱️  Attempting to open search drawer...');
  
  const searchButtons = [
    '#search-button-drawer-id',
    '#search-button-drawer-id-mobile', 
    '#search-button-drawer-id-desktop',
    '[aria-label*="search" i]',
    '.search-button'
  ];
  
  let searchButtonFound = false;
  for (const selector of searchButtons) {
    const button = page.locator(selector);
    const count = await button.count();
    if (count > 0) {
      console.log(`🔍 Found search button: ${selector}`);
      try {
        await button.first().click();
        searchButtonFound = true;
        console.log('✅ Search button clicked');
        break;
      } catch (error) {
        console.log(`❌ Failed to click search button ${selector}: ${error.message}`);
      }
    }
  }
  
  if (!searchButtonFound) {
    console.log('❌ No search button found, trying alternative approach...');
    
    // Try clicking hamburger/menu button
    const menuButton = page.locator('[aria-label*="menu" i], .hamburger, [aria-expanded]').first();
    if (await menuButton.count() > 0) {
      await menuButton.click();
      console.log('🍔 Clicked menu button instead');
    }
  }
  
  // Wait a moment for drawer to open
  await page.waitForTimeout(500);
  
  // Check if drawer is open
  const drawerOpen = await page.evaluate(() => {
    const drawer = document.querySelector('#multi-drawer');
    return drawer && (drawer.classList.contains('open') || drawer.getAttribute('open') !== null);
  });
  console.log(`🚪 Drawer is open: ${drawerOpen ? '✅' : '❌'}`);
  
  // Try to manually initialize search module
  console.log('\n🔧 Attempting manual search module initialization...');
  const initResult = await page.evaluate(() => {
    if (window.Theme && window.Theme.DrawerSearch) {
      try {
        const result = window.Theme.DrawerSearch.init();
        return { success: result, error: null };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Theme.DrawerSearch not found' };
  });
  
  console.log(`🎯 Manual initialization result: ${initResult.success ? '✅' : '❌'}`);
  if (!initResult.success) {
    console.log(`   Error: ${initResult.error}`);
  }
  
  // Test search input focus and typing
  if (searchInputExists) {
    console.log('\n⌨️  Testing search input...');
    try {
      await searchInput.focus();
      console.log('✅ Search input focused');
      
      await searchInput.fill('test');
      console.log('✅ Test query typed');
      
      // Wait a moment to see if debouncing works
      await page.waitForTimeout(400);
      
      // Check current search state
      const searchState = await page.evaluate(() => {
        return window.Theme && window.Theme.DrawerSearch ? 
          window.Theme.DrawerSearch.getState() : 'Module not available';
      });
      console.log(`🔄 Search state: ${searchState}`);
      
    } catch (error) {
      console.log(`❌ Search input test failed: ${error.message}`);
    }
  }
  
  // Capture final screenshot
  console.log('\n📸 Capturing final screenshot...');
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/search-test-final.png',
    fullPage: true 
  });
  
  // Test completed
  console.log('\n✅ Search initialization test completed.');
  
  await browser.close();
}

// Run the test
testSearchInitialization().catch(console.error);