/**
 * Quick performance test to verify optimizations
 */

import { chromium } from 'playwright';

const TEST_URL = process.env.working-url || 'http://127.0.0.1:9292';
const PRODUCT_URL = `${TEST_URL}/products/baum-stein-stick`;

async function runPerformanceCheck() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log(`\n🚀 Testing gallery performance optimizations at ${PRODUCT_URL}\n`);
  
  try {
    // Navigate to product page
    await page.goto(PRODUCT_URL, { waitUntil: 'networkidle' });
    console.log('✓ Page loaded');
    
    // Check if gallery is initialized
    const galleryExists = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return gallery && gallery.state?.isInitialized;
    });
    console.log(`✓ Gallery initialized: ${galleryExists}`);
    
    // Check lazy loading implementation
    const lazyLoadingCheck = await page.evaluate(() => {
      const gallery = document.querySelector('product-gallery-navigation');
      return {
        hasIntersectionObserver: gallery?.imageObserver !== undefined,
        hasPreloadObserver: gallery?.preloadObserver !== undefined,
        lazyImages: document.querySelectorAll('[data-lazy-load="true"]').length
      };
    });
    console.log('\n📸 Lazy Loading Status:');
    console.log(`  - IntersectionObserver active: ${lazyLoadingCheck.hasIntersectionObserver}`);
    console.log(`  - Preload observer active: ${lazyLoadingCheck.hasPreloadObserver}`);
    console.log(`  - Lazy-loadable images: ${lazyLoadingCheck.lazyImages}`);
    
    // Check GPU acceleration CSS
    const gpuCheck = await page.evaluate(() => {
      const mainImage = document.querySelector('[data-main-image]');
      const container = document.querySelector('.product-gallery__main-image-container');
      
      if (!mainImage || !container) return null;
      
      const imageStyles = window.getComputedStyle(mainImage);
      const containerStyles = window.getComputedStyle(container);
      
      return {
        imageWillChange: imageStyles.willChange,
        containerWillChange: containerStyles.willChange,
        imageTransform: imageStyles.transform,
        containerTransform: containerStyles.transform
      };
    });
    console.log('\n🎮 GPU Acceleration:');
    console.log(`  - Image will-change: ${gpuCheck?.imageWillChange}`);
    console.log(`  - Container will-change: ${gpuCheck?.containerWillChange}`);
    console.log(`  - GPU layers active: ${gpuCheck?.imageTransform !== 'none'}`);
    
    // Check resource hints
    const resourceHints = await page.evaluate(() => {
      const preconnects = document.querySelectorAll('link[rel="preconnect"]');
      const dnsPrefetch = document.querySelectorAll('link[rel="dns-prefetch"]');
      const preloads = document.querySelectorAll('link[rel="preload"][as="image"]');
      
      return {
        preconnects: Array.from(preconnects).map(link => link.href),
        dnsPrefetch: Array.from(dnsPrefetch).map(link => link.href),
        imagePreloads: preloads.length
      };
    });
    console.log('\n🌐 Resource Hints:');
    console.log(`  - Preconnect domains: ${resourceHints.preconnects.length}`);
    console.log(`  - DNS prefetch: ${resourceHints.dnsPrefetch.length}`);
    console.log(`  - Image preloads: ${resourceHints.imagePreloads}`);
    
    // Test transition performance
    console.log('\n⏱️  Testing transition performance...');
    
    // Click next button and measure transition
    const transitionTime = await page.evaluate(async () => {
      const gallery = document.querySelector('product-gallery-navigation');
      const nextButton = document.querySelector('[data-gallery-next]');
      
      if (!gallery || !nextButton) return null;
      
      const startTime = performance.now();
      nextButton.click();
      
      // Wait for transition to complete
      await new Promise(resolve => {
        const checkTransition = setInterval(() => {
          if (!gallery.classList.contains('is-transitioning')) {
            clearInterval(checkTransition);
            resolve();
          }
        }, 10);
      });
      
      return performance.now() - startTime;
    });
    
    if (transitionTime) {
      console.log(`  - Transition completed in: ${transitionTime.toFixed(2)}ms`);
      console.log(`  - Target: < 300ms ${transitionTime < 300 ? '✓' : '✗'}`);
    }
    
    // Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate again to check for errors
    await page.click('[data-gallery-prev]');
    await page.waitForTimeout(500);
    
    console.log(`\n❌ Console errors: ${consoleErrors.length || 'None'}`);
    
    console.log('\n✅ Performance optimization check complete!\n');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

runPerformanceCheck();