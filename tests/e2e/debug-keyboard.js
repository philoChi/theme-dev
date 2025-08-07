/**
 * debug-keyboard.js 
 * Debug keyboard navigation specifically
 */

import { chromium } from 'playwright';

const url = 'http://127.0.0.1:9292/products/baum-stein-stick';

console.log('🎹 Debugging Keyboard Navigation');
console.log('===============================\n');

async function debugKeyboard() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('🔍 Initial State:');
    
    const initialState = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      const thumbnail = document.querySelector('.product-gallery__thumbnail-item');
      const mainImage = document.querySelector('[data-main-image]');
      
      return {
        galleryExists: !!gallery,
        galleryHasHandlers: gallery && typeof gallery.handleKeydown === 'function',
        thumbnailExists: !!thumbnail,
        mainImageSrc: mainImage ? mainImage.src.split('/').pop() : null,
        activeElement: document.activeElement?.className || 'none',
        totalImages: gallery && gallery.state ? gallery.state.totalImages : null
      };
    });
    
    console.log(`   Gallery exists: ${initialState.galleryExists}`);
    console.log(`   Gallery has keyboard handlers: ${initialState.galleryHasHandlers}`);
    console.log(`   Initial image: ${initialState.mainImageSrc}`);
    console.log(`   Active element: ${initialState.activeElement}`);
    console.log(`   Total images: ${initialState.totalImages}`);
    
    // Focus on first thumbnail
    console.log('\n🎯 Focusing on gallery:');
    const firstThumbnail = page.locator('.product-gallery__thumbnail-item').first();
    await firstThumbnail.focus();
    
    const afterFocus = await page.evaluate(() => {
      return {
        activeElement: document.activeElement?.className || 'none',
        activeElementTag: document.activeElement?.tagName || 'none',
        isInsideGallery: document.activeElement && 
                         document.querySelector('product-gallery-navigation').contains(document.activeElement)
      };
    });
    
    console.log(`   Active after focus: ${afterFocus.activeElement}`);
    console.log(`   Active element tag: ${afterFocus.activeElementTag}`);
    console.log(`   Is inside gallery: ${afterFocus.isInsideGallery}`);
    
    // Clear previous logs
    logs.length = 0;
    
    // Try keyboard navigation
    console.log('\n⌨️  Sending ArrowRight:');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const afterKeyboard = await page.evaluate(() => {
      const mainImage = document.querySelector('[data-main-image]');
      const gallery = document.querySelector('product-gallery-navigation');
      
      return {
        mainImageSrc: mainImage ? mainImage.src.split('/').pop() : null,
        currentIndex: gallery && gallery.state ? gallery.state.currentIndex : null,
        isTransitioning: gallery && gallery.state ? gallery.state.isTransitioning : null,
        activeElement: document.activeElement?.className || 'none'
      };
    });
    
    console.log(`   Image after keyboard: ${afterKeyboard.mainImageSrc}`);
    console.log(`   Current index: ${afterKeyboard.currentIndex}`);
    console.log(`   Is transitioning: ${afterKeyboard.isTransitioning}`);
    console.log(`   Active element: ${afterKeyboard.activeElement}`);
    
    // Check console logs for keyboard events
    console.log('\n📝 Console logs during keyboard navigation:');
    const keyboardLogs = logs.filter(log => 
      log.includes('Keyboard') || 
      log.includes('Arrow') || 
      log.includes('Navigation') ||
      log.includes('Error') ||
      log.includes('keyboard')
    );
    
    if (keyboardLogs.length > 0) {
      keyboardLogs.forEach(log => console.log(`   ${log}`));
    } else {
      console.log('   No keyboard-related logs found');
    }
    
    // Try clicking navigation button to compare
    console.log('\n🖱️  Testing navigation button click:');
    const nextButton = page.locator('[data-gallery-next]');
    if (await nextButton.count() > 0) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      const afterClick = await page.evaluate(() => {
        const mainImage = document.querySelector('[data-main-image]');
        return {
          mainImageSrc: mainImage ? mainImage.src.split('/').pop() : null
        };
      });
      
      console.log(`   Image after button click: ${afterClick.mainImageSrc}`);
      console.log(`   Button navigation works: ${afterClick.mainImageSrc !== initialState.mainImageSrc}`);
    } else {
      console.log('   No next button found');
    }
    
    // Check event listeners
    console.log('\n🎧 Event Listener Check:');
    const listenerInfo = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      if (!gallery) return { error: 'No gallery found' };
      
      // Check if event listeners are attached
      const hasKeydownListener = getEventListeners && getEventListeners(gallery).keydown;
      
      return {
        hasKeydownListener: !!hasKeydownListener,
        galleryMethods: Object.getOwnPropertyNames(gallery.__proto__).filter(name => 
          name.includes('handle') || name.includes('keyboard')
        ),
        isConnected: gallery.isConnected
      };
    });
    
    console.log(`   Gallery connected: ${listenerInfo.isConnected}`);
    console.log(`   Handler methods: ${listenerInfo.galleryMethods?.join(', ') || 'none'}`);
    
    // Final assessment
    console.log('\n🎯 Keyboard Navigation Assessment:');
    console.log('==================================');
    
    const navigationWorks = afterKeyboard.mainImageSrc !== initialState.mainImageSrc;
    const buttonWorks = afterKeyboard.mainImageSrc !== initialState.mainImageSrc; // From button test
    
    console.log(`✅ Gallery structure: ${initialState.galleryExists ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Focus management: ${afterFocus.isInsideGallery ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Keyboard navigation: ${navigationWorks ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Button navigation: ${buttonWorks ? 'PASS' : 'FAIL'}`);
    
    if (!navigationWorks) {
      console.log('\n⚠️  Keyboard navigation debugging info:');
      console.log(`   - Handler method exists: ${initialState.galleryHasHandlers}`);
      console.log(`   - Focus management works: ${afterFocus.isInsideGallery}`);
      console.log(`   - Console logs captured: ${keyboardLogs.length}`);
      console.log(`   - Image stayed same: ${afterKeyboard.mainImageSrc === initialState.mainImageSrc}`);
    }
    
  } catch (error) {
    console.error('❌ Keyboard debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugKeyboard();