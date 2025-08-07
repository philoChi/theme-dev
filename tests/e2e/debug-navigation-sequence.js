/**
 * debug-navigation-sequence.js 
 * Debug specific navigation sequence issue
 */

import { chromium } from 'playwright';

const url = 'http://127.0.0.1:9292/products/baum-stein-stick';

console.log('🔍 Debugging Navigation Sequence');
console.log('================================\n');

async function debugNavigation() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Focus on first thumbnail
    const firstThumbnail = page.locator('.product-gallery__thumbnail-item').first();
    await firstThumbnail.focus();
    
    // Get initial state
    const initialState = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      const mainImage = document.querySelector('[data-main-image]');
      return {
        currentIndex: gallery ? gallery.state.currentIndex : null,
        totalImages: gallery ? gallery.state.totalImages : null,
        imageSrc: mainImage ? mainImage.src.split('/').pop() : null
      };
    });
    
    console.log('🏁 Initial State:');
    console.log(`   Index: ${initialState.currentIndex}`);
    console.log(`   Total: ${initialState.totalImages}`);
    console.log(`   Image: ${initialState.imageSrc}`);
    
    // Navigate right
    console.log('\n➡️  Navigate Right:');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1500); // Increased wait for transition
    
    const afterRight = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      const mainImage = document.querySelector('[data-main-image]');
      return {
        currentIndex: gallery ? gallery.state.currentIndex : null,
        imageSrc: mainImage ? mainImage.src.split('/').pop() : null
      };
    });
    
    console.log(`   New Index: ${afterRight.currentIndex}`);
    console.log(`   New Image: ${afterRight.imageSrc}`);
    console.log(`   Navigation worked: ${afterRight.currentIndex !== initialState.currentIndex}`);
    
    // Navigate left
    console.log('\n⬅️  Navigate Left:');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1500); // Increased wait for transition
    
    const afterLeft = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      const mainImage = document.querySelector('[data-main-image]');
      return {
        currentIndex: gallery ? gallery.state.currentIndex : null,
        imageSrc: mainImage ? mainImage.src.split('/').pop() : null
      };
    });
    
    console.log(`   Back to Index: ${afterLeft.currentIndex}`);
    console.log(`   Back to Image: ${afterLeft.imageSrc}`);
    console.log(`   Returned to start: ${afterLeft.currentIndex === initialState.currentIndex}`);
    console.log(`   Same image: ${afterLeft.imageSrc === initialState.imageSrc}`);
    
    // Test index calculation logic
    console.log('\n🧮 Index Calculation Test:');
    const indexLogic = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      if (!gallery) return null;
      
      const currentIndex = gallery.state.currentIndex;
      const totalImages = gallery.state.totalImages;
      
      // Test getPreviousIndex and getNextIndex methods
      const nextIndex = gallery.getNextIndex();
      const prevIndex = gallery.getPreviousIndex();
      
      return {
        currentIndex,
        totalImages,
        nextIndex,
        prevIndex,
        // Manual calculation
        expectedNext: currentIndex === totalImages - 1 ? 0 : currentIndex + 1,
        expectedPrev: currentIndex === 0 ? totalImages - 1 : currentIndex - 1
      };
    });
    
    console.log(`   Current: ${indexLogic.currentIndex}`);
    console.log(`   Total: ${indexLogic.totalImages}`);
    console.log(`   Next Index: ${indexLogic.nextIndex} (expected: ${indexLogic.expectedNext})`);
    console.log(`   Prev Index: ${indexLogic.prevIndex} (expected: ${indexLogic.expectedPrev})`);
    
    // Test the complete sequence: 0 -> 1 -> 0
    console.log('\n🔄 Complete Sequence Test:');
    
    // Reset to index 0
    await page.keyboard.press('Home');
    await page.waitForTimeout(1000);
    
    const step1 = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return gallery ? gallery.state.currentIndex : null;
    });
    console.log(`   Step 1 (Home): ${step1}`);
    
    // Go to index 1
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const step2 = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return gallery ? gallery.state.currentIndex : null;
    });
    console.log(`   Step 2 (Right): ${step2}`);
    
    // Back to index 0
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1000);
    
    const step3 = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return gallery ? gallery.state.currentIndex : null;
    });
    console.log(`   Step 3 (Left): ${step3}`);
    
    console.log(`\n✅ Sequence Test: ${step1} -> ${step2} -> ${step3}`);
    console.log(`   Should be: 0 -> 1 -> 0`);
    console.log(`   Result: ${step1 === 0 && step2 === 1 && step3 === 0 ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugNavigation();