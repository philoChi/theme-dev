/**
 * debug-accessibility.js
 * Debug test to identify accessibility implementation issues
 */

import { chromium } from 'playwright';

const url = 'http://127.0.0.1:9292/products/baum-stein-stick';

console.log('🔍 Debugging Accessibility Implementation');
console.log('======================================\n');

async function debugAccessibility() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(3000); // Wait for JS to fully initialize
    
    console.log('📱 Testing Gallery Initialization');
    console.log('--------------------------------');
    
    // Check if gallery exists and is initialized
    const galleryExists = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return {
        exists: !!gallery,
        hasClass: gallery ? gallery.className : null,
        hasRole: gallery ? gallery.getAttribute('role') : null,
        hasAriaLabel: gallery ? gallery.getAttribute('aria-label') : null
      };
    });
    
    console.log(`✅ Gallery exists: ${galleryExists.exists}`);
    console.log(`🏷️  Gallery classes: ${galleryExists.hasClass}`);
    console.log(`🎭 Gallery role: ${galleryExists.hasRole}`);
    console.log(`🔊 Gallery ARIA label: ${galleryExists.hasAriaLabel}`);
    
    // Check main image ARIA
    const mainImageAria = await page.evaluate(() => {
      const img = document.querySelector('[data-main-image]');
      return {
        exists: !!img,
        ariaLabel: img ? img.getAttribute('aria-label') : null,
        role: img ? img.getAttribute('role') : null,
        ariaCurrent: img ? img.getAttribute('aria-current') : null,
        alt: img ? img.getAttribute('alt') : null
      };
    });
    
    console.log(`\n🖼️  Main Image ARIA:`);
    console.log(`   Exists: ${mainImageAria.exists}`);
    console.log(`   ARIA Label: ${mainImageAria.ariaLabel}`);
    console.log(`   Role: ${mainImageAria.role}`);
    console.log(`   ARIA Current: ${mainImageAria.ariaCurrent}`);
    console.log(`   Alt Text: ${mainImageAria.alt}`);
    
    // Check thumbnails ARIA
    const thumbnailsAria = await page.evaluate(() => {
      const thumbnails = document.querySelectorAll('.product-gallery__thumbnail-item');
      const container = document.querySelector('[data-gallery-thumbnails]');
      
      return {
        count: thumbnails.length,
        containerRole: container ? container.getAttribute('role') : null,
        containerAriaLabel: container ? container.getAttribute('aria-label') : null,
        firstThumbnail: thumbnails[0] ? {
          role: thumbnails[0].getAttribute('role'),
          ariaSelected: thumbnails[0].getAttribute('aria-selected'),
          ariaLabel: thumbnails[0].getAttribute('aria-label'),
          tabindex: thumbnails[0].getAttribute('tabindex')
        } : null
      };
    });
    
    console.log(`\n📎 Thumbnails ARIA:`);
    console.log(`   Count: ${thumbnailsAria.count}`);
    console.log(`   Container Role: ${thumbnailsAria.containerRole}`);
    console.log(`   Container ARIA Label: ${thumbnailsAria.containerAriaLabel}`);
    console.log(`   First Thumbnail:`);
    console.log(`     Role: ${thumbnailsAria.firstThumbnail?.role}`);
    console.log(`     ARIA Selected: ${thumbnailsAria.firstThumbnail?.ariaSelected}`);
    console.log(`     ARIA Label: ${thumbnailsAria.firstThumbnail?.ariaLabel}`);
    console.log(`     Tabindex: ${thumbnailsAria.firstThumbnail?.tabindex}`);
    
    // Check navigation buttons
    const navigationAria = await page.evaluate(() => {
      const prevBtn = document.querySelector('[data-gallery-prev]');
      const nextBtn = document.querySelector('[data-gallery-next]');
      
      return {
        prevExists: !!prevBtn,
        nextExists: !!nextBtn,
        prevAria: prevBtn ? {
          ariaLabel: prevBtn.getAttribute('aria-label'),
          disabled: prevBtn.disabled,
          ariaDisabled: prevBtn.getAttribute('aria-disabled')
        } : null,
        nextAria: nextBtn ? {
          ariaLabel: nextBtn.getAttribute('aria-label'),
          disabled: nextBtn.disabled,
          ariaDisabled: nextBtn.getAttribute('aria-disabled')
        } : null
      };
    });
    
    console.log(`\n🔄 Navigation Buttons:`);
    console.log(`   Previous exists: ${navigationAria.prevExists}`);
    console.log(`   Next exists: ${navigationAria.nextExists}`);
    if (navigationAria.prevAria) {
      console.log(`   Previous ARIA Label: ${navigationAria.prevAria.ariaLabel}`);
      console.log(`   Previous Disabled: ${navigationAria.prevAria.disabled}`);
    }
    if (navigationAria.nextAria) {
      console.log(`   Next ARIA Label: ${navigationAria.nextAria.ariaLabel}`);
      console.log(`   Next Disabled: ${navigationAria.nextAria.disabled}`);
    }
    
    // Check live regions
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live]');
      return Array.from(regions).map(region => ({
        tagName: region.tagName,
        ariaLive: region.getAttribute('aria-live'),
        className: region.className,
        hasContent: !!region.textContent.trim()
      }));
    });
    
    console.log(`\n📢 ARIA Live Regions:`);
    console.log(`   Count: ${liveRegions.length}`);
    liveRegions.forEach((region, i) => {
      console.log(`   Region ${i + 1}: ${region.tagName}.${region.className}`);
      console.log(`     ARIA Live: ${region.ariaLive}`);
      console.log(`     Has Content: ${region.hasContent}`);
    });
    
    // Test keyboard navigation
    console.log(`\n⌨️  Testing Keyboard Navigation:`);
    
    const firstThumbnail = page.locator('.product-gallery__thumbnail-item').first();
    await firstThumbnail.focus();
    
    const initialImage = await page.locator('[data-main-image]').getAttribute('src');
    console.log(`   Initial image: ${initialImage?.split('/').pop()}`);
    
    // Try arrow key navigation
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);
    
    const newImage = await page.locator('[data-main-image]').getAttribute('src');
    console.log(`   After ArrowRight: ${newImage?.split('/').pop()}`);
    console.log(`   Navigation worked: ${newImage !== initialImage}`);
    
    // Check announcements after navigation
    const announcements = await page.evaluate(() => {
      const regions = document.querySelectorAll('[aria-live]');
      return Array.from(regions).map(region => ({
        content: region.textContent.trim(),
        ariaLive: region.getAttribute('aria-live')
      })).filter(r => r.content);
    });
    
    console.log(`   Active announcements: ${announcements.length}`);
    announcements.forEach((announcement, i) => {
      console.log(`     ${i + 1}: "${announcement.content}" (${announcement.ariaLive})`);
    });
    
    // Test error handling
    console.log(`\n🚨 Testing Error Handling:`);
    
    const errorTest = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      if (gallery && gallery.controllers && gallery.controllers.accessibility) {
        gallery.controllers.accessibility.announceError('Test error message');
        return 'Error announced via accessibility controller';
      } else if (gallery && gallery.handleError) {
        gallery.handleError('Test error', new Error('Test'));
        return 'Error handled via error handler';
      }
      return 'No error handling methods found';
    });
    
    console.log(`   Error handling: ${errorTest}`);
    
    // Final assessment
    console.log(`\n🎯 Accessibility Assessment:`);
    console.log(`================================`);
    
    const hasBasicAria = galleryExists.hasRole && mainImageAria.ariaLabel && thumbnailsAria.containerRole;
    const hasNavigation = navigationAria.prevExists && navigationAria.nextExists;
    const hasLiveRegions = liveRegions.length > 0;
    
    console.log(`✅ Basic ARIA structure: ${hasBasicAria ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Navigation buttons: ${hasNavigation ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Live regions: ${hasLiveRegions ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Keyboard navigation: ${newImage !== initialImage ? 'PASS' : 'FAIL'}`);
    
    const overallScore = [hasBasicAria, hasNavigation, hasLiveRegions, newImage !== initialImage].filter(Boolean).length;
    console.log(`\n📊 Overall accessibility score: ${overallScore}/4 (${Math.round(overallScore/4*100)}%)`);
    
    if (overallScore < 4) {
      console.log(`\n⚠️  Issues to fix:`);
      if (!hasBasicAria) console.log(`   - Missing basic ARIA structure`);
      if (!hasNavigation) console.log(`   - Navigation buttons not found or not accessible`);
      if (!hasLiveRegions) console.log(`   - No ARIA live regions for announcements`);
      if (newImage === initialImage) console.log(`   - Keyboard navigation not working`);
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  } finally {
    await browser.close();
  }
}

debugAccessibility();