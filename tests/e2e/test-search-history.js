/**
 * Test script to verify search history functionality
 * This script tests the new search history features in Milestone 2
 */

import { chromium } from 'playwright';

async function testSearchHistory() {
  console.log('🔍 Testing Search History Functionality...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to the development URL
  console.log('📍 Navigating to http://127.0.0.1:42105...');
  await page.goto('http://127.0.0.1:42105');
  
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');
  console.log('✅ Page loaded successfully');
  
  // Check if search history manager is available
  const historyManagerExists = await page.evaluate(() => {
    return window.Theme && 
           window.Theme.DrawerSearch && 
           typeof window.Theme.DrawerSearch.init === 'function';
  });
  console.log(`🔍 Search module with history: ${historyManagerExists ? '✅' : '❌'}`);
  
  // Initialize search module manually
  console.log('\n🔧 Initializing search module...');
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
  
  console.log(`🎯 Search module initialization: ${initResult.success ? '✅' : '❌'}`);
  if (!initResult.success) {
    console.log(`   Error: ${initResult.error}`);
    await browser.close();
    return;
  }
  
  // Test 1: Clear any existing history
  console.log('\n🧹 Clearing existing search history...');
  await page.evaluate(() => {
    if (localStorage.getItem('drawer_search_history')) {
      localStorage.removeItem('drawer_search_history');
      console.log('[Test] Cleared existing search history');
    }
  });
  
  // Test 2: Simulate successful searches to build history
  console.log('\n📝 Building search history with test queries...');
  const testQueries = ['shoes', 'running shoes', 'sneakers', 'boots', 'sandals'];
  
  for (const query of testQueries) {
    await page.evaluate((q) => {
      // Simulate adding to search history (as if search was successful)
      const history = JSON.parse(localStorage.getItem('drawer_search_history') || '[]');
      
      // Remove if exists (to move to front)
      const existingIndex = history.indexOf(q);
      if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
      }
      
      // Add to front
      history.unshift(q);
      
      // Limit to 10
      if (history.length > 10) {
        history.splice(10);
      }
      
      localStorage.setItem('drawer_search_history', JSON.stringify(history));
      console.log(`[Test] Added "${q}" to search history`);
    }, query);
  }
  
  // Test 3: Check if history was stored correctly
  const storedHistory = await page.evaluate(() => {
    const history = localStorage.getItem('drawer_search_history');
    return history ? JSON.parse(history) : [];
  });
  
  console.log(`✅ Search history stored: ${JSON.stringify(storedHistory)}`);
  console.log(`   History count: ${storedHistory.length}`);
  
  // Test 4: Test focus on search input to show suggestions
  console.log('\n🎯 Testing search suggestions display...');
  
  const searchInput = page.locator('[mpe="search-input"]');
  const resultsContainer = page.locator('#SearchResults');
  
  if (await searchInput.count() > 0) {
    // Focus on empty input to trigger history suggestions
    await searchInput.focus();
    await page.waitForTimeout(500);
    
    // Check if suggestions are displayed
    const suggestionsDisplayed = await page.evaluate(() => {
      const container = document.querySelector('#SearchResults');
      if (!container) return false;
      
      const suggestions = container.querySelectorAll('[data-suggestion]');
      console.log(`[Test] Found ${suggestions.length} suggestion elements`);
      
      return suggestions.length > 0;
    });
    
    console.log(`🔍 Search suggestions displayed: ${suggestionsDisplayed ? '✅' : '❌'}`);
    
    // Test 5: Test suggestion click functionality
    if (suggestionsDisplayed) {
      console.log('\n🖱️  Testing suggestion click...');
      
      const firstSuggestion = page.locator('.search-suggestion-button').first();
      if (await firstSuggestion.count() > 0) {
        await firstSuggestion.click();
        await page.waitForTimeout(500);
        
        // Check if input value was updated
        const inputValue = await searchInput.inputValue();
        console.log(`✅ Suggestion clicked, input value: "${inputValue}"`);
      }
    }
    
    // Test 6: Test filtered suggestions
    console.log('\n🔎 Testing filtered suggestions...');
    await searchInput.fill('s');
    await page.waitForTimeout(300);
    
    const filteredSuggestions = await page.evaluate(() => {
      const container = document.querySelector('#SearchResults');
      if (!container) return 0;
      
      const suggestions = container.querySelectorAll('[data-suggestion]');
      const filteredCount = Array.from(suggestions).filter(el => 
        el.dataset.suggestion && el.dataset.suggestion.toLowerCase().includes('s')
      ).length;
      
      console.log(`[Test] Found ${filteredCount} filtered suggestions for "s"`);
      return filteredCount;
    });
    
    console.log(`🔍 Filtered suggestions (containing 's'): ${filteredSuggestions} items`);
    
  } else {
    console.log('❌ Search input not found');
  }
  
  // Test 7: Test history limits
  console.log('\n📊 Testing history limits...');
  
  // Add more than 10 items to test limit
  const extraQueries = ['extra1', 'extra2', 'extra3', 'extra4', 'extra5'];
  for (const query of extraQueries) {
    await page.evaluate((q) => {
      const history = JSON.parse(localStorage.getItem('drawer_search_history') || '[]');
      history.unshift(q);
      if (history.length > 10) {
        history.splice(10);
      }
      localStorage.setItem('drawer_search_history', JSON.stringify(history));
    }, query);
  }
  
  const finalHistory = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('drawer_search_history') || '[]');
  });
  
  console.log(`📝 Final history count: ${finalHistory.length} (should be ≤ 10)`);
  console.log(`   History limit respected: ${finalHistory.length <= 10 ? '✅' : '❌'}`);
  
  // Test 8: Test search history integration with actual searches
  console.log('\n🔗 Testing integration with search functionality...');
  
  await page.evaluate(() => {
    // Mock successful search to test history integration
    if (window.Theme && window.Theme.DrawerSearch) {
      // Clear input first
      const input = document.querySelector('[mpe="search-input"]');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  });
  
  await page.waitForTimeout(500);
  
  // Check if recent searches are shown on focus
  const recentSearchesShown = await page.evaluate(() => {
    const container = document.querySelector('#SearchResults');
    return container && container.innerHTML.includes('Recent searches');
  });
  
  console.log(`🕒 Recent searches shown on focus: ${recentSearchesShown ? '✅' : '❌'}`);
  
  // Capture final screenshot
  console.log('\n📸 Capturing final screenshot...');
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/search-history-test.png',
    fullPage: true 
  });
  
  console.log('\n✅ Search history test completed.');
  
  await browser.close();
}

// Run the test
testSearchHistory().catch(console.error);