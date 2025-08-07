/**
 * Product Gallery Performance Tests
 * Tests for Milestone 4: Performance optimization
 * - TC-09: Transition timing tests
 * - TC-10: Layout stability tests
 * - TC-11: Debouncing tests
 * - Lazy loading tests
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = process.env.working-url || 'http://127.0.0.1:9292';
const PRODUCT_URL = `${TEST_URL}/products/baum-stein-stick`;
const TRANSITION_DURATION = 300; // Expected transition time in ms
const DEBOUNCE_DELAY = 100; // Expected debounce delay in ms

test.describe('Product Gallery Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to product page
    await page.goto(PRODUCT_URL, { waitUntil: 'networkidle' });
    
    // Wait for gallery to initialize
    await page.waitForSelector('product-gallery-navigation', { state: 'attached' });
    await page.waitForTimeout(500); // Allow JS to initialize
  });

  test('TC-09: All transitions complete within 300ms', async ({ page }) => {
    // Collect performance samples
    const transitionSamples = [];
    
    // Test arrow navigation transitions
    for (let i = 0; i < 5; i++) {
      const startTime = await page.evaluate(() => performance.now());
      
      // Click next button
      await page.click('[data-gallery-next]');
      
      // Wait for transition to complete
      await page.waitForFunction(() => {
        const gallery = document.querySelector('product-gallery-navigation');
        return gallery && !gallery.classList.contains('is-transitioning');
      });
      
      const endTime = await page.evaluate(() => performance.now());
      const transitionTime = endTime - startTime;
      transitionSamples.push(transitionTime);
      
      // Verify transition time
      expect(transitionTime).toBeLessThan(TRANSITION_DURATION + 50); // Allow 50ms tolerance
    }
    
    // Calculate average transition time
    const avgTransitionTime = transitionSamples.reduce((a, b) => a + b, 0) / transitionSamples.length;
    console.log(`Average transition time: ${avgTransitionTime.toFixed(2)}ms`);
    
    // All transitions should be under 300ms
    expect(avgTransitionTime).toBeLessThan(TRANSITION_DURATION);
  });

  test('TC-10: No layout shift during navigation (CLS = 0)', async ({ page }) => {
    // Start measuring CLS
    await page.evaluate(() => {
      window.clsScore = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.clsScore += entry.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    });
    
    // Perform multiple navigations
    for (let i = 0; i < 3; i++) {
      await page.click('[data-gallery-next]');
      await page.waitForTimeout(400); // Wait for transition
    }
    
    // Get CLS score
    const clsScore = await page.evaluate(() => window.clsScore);
    console.log(`CLS Score: ${clsScore}`);
    
    // CLS should be 0 (no layout shift)
    expect(clsScore).toBe(0);
    
    // Also verify image dimensions don't change
    const dimensions = await page.evaluate(() => {
      const img = document.querySelector('[data-main-image]');
      return {
        width: img.offsetWidth,
        height: img.offsetHeight
      };
    });
    
    // Navigate and check dimensions remain stable
    await page.click('[data-gallery-prev]');
    await page.waitForTimeout(400);
    
    const newDimensions = await page.evaluate(() => {
      const img = document.querySelector('[data-main-image]');
      return {
        width: img.offsetWidth,
        height: img.offsetHeight
      };
    });
    
    expect(newDimensions.width).toBe(dimensions.width);
    expect(newDimensions.height).toBe(dimensions.height);
  });

  test('TC-11: Debouncing prevents rapid click issues', async ({ page }) => {
    // Monitor transition state
    const transitionStates = [];
    
    await page.evaluate(() => {
      window.transitionLog = [];
      const gallery = document.querySelector('product-gallery-navigation');
      const originalSetTransitioning = gallery.controllers.transitions.setTransitioning;
      
      gallery.controllers.transitions.setTransitioning = function(state) {
        window.transitionLog.push({ time: performance.now(), state });
        originalSetTransitioning.call(this, state);
      };
    });
    
    // Perform rapid clicks
    const clickCount = 10;
    const startTime = Date.now();
    
    for (let i = 0; i < clickCount; i++) {
      await page.click('[data-gallery-next]', { force: true });
      await page.waitForTimeout(20); // Very short delay between clicks
    }
    
    // Wait for all transitions to complete
    await page.waitForTimeout(1000);
    
    // Get transition log
    const transitionLog = await page.evaluate(() => window.transitionLog);
    
    // Count actual transitions (should be debounced)
    const actualTransitions = transitionLog.filter(log => log.state === true).length;
    console.log(`Rapid clicks: ${clickCount}, Actual transitions: ${actualTransitions}`);
    
    // Should have significantly fewer transitions than clicks due to debouncing
    expect(actualTransitions).toBeLessThan(clickCount);
    expect(actualTransitions).toBeGreaterThan(0);
    
    // Verify no overlapping transitions
    for (let i = 0; i < transitionLog.length - 1; i++) {
      if (transitionLog[i].state === true && transitionLog[i + 1].state === true) {
        const timeDiff = transitionLog[i + 1].time - transitionLog[i].time;
        expect(timeDiff).toBeGreaterThan(DEBOUNCE_DELAY);
      }
    }
  });

  test('Lazy loading: Off-screen images are deferred', async ({ page }) => {
    // Fresh page load to test lazy loading
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
    
    // Check initial image loading state
    const lazyLoadingStatus = await page.evaluate(() => {
      const alternateImages = document.querySelectorAll('.product-gallery__image--alternate');
      const status = {
        total: alternateImages.length,
        lazyMarked: 0,
        loaded: 0,
        observerActive: false
      };
      
      alternateImages.forEach(img => {
        if (img.dataset.lazyLoad === 'true') status.lazyMarked++;
        if (img.dataset.loaded === 'true') status.loaded++;
      });
      
      // Check if IntersectionObserver is active
      const gallery = document.querySelector('product-gallery-navigation');
      status.observerActive = gallery && gallery.imageObserver !== undefined;
      
      return status;
    });
    
    console.log('Lazy loading status:', lazyLoadingStatus);
    
    // Verify lazy loading is configured
    expect(lazyLoadingStatus.observerActive).toBe(true);
    expect(lazyLoadingStatus.lazyMarked).toBeGreaterThan(0);
    
    // Initially, not all images should be loaded
    expect(lazyLoadingStatus.loaded).toBeLessThan(lazyLoadingStatus.total);
  });

  test('Initial load performance: Fast page load', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    
    const response = await page.goto(PRODUCT_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    
    // Check response is successful
    expect(response.status()).toBe(200);
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('Performance metrics:', performanceMetrics);
    
    // Verify fast initial load
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2500); // FCP < 2.5s
    
    // Check resource hints are present
    const resourceHints = await page.evaluate(() => {
      const preconnects = document.querySelectorAll('link[rel="preconnect"]');
      const dnsPrefetch = document.querySelectorAll('link[rel="dns-prefetch"]');
      const preloads = document.querySelectorAll('link[rel="preload"]');
      
      return {
        preconnects: Array.from(preconnects).map(link => link.href),
        dnsPrefetch: Array.from(dnsPrefetch).map(link => link.href),
        preloads: preloads.length
      };
    });
    
    console.log('Resource hints:', resourceHints);
    
    // Verify resource hints are implemented
    expect(resourceHints.preconnects.length).toBeGreaterThan(0);
    expect(resourceHints.dnsPrefetch.length).toBeGreaterThan(0);
  });

  test('GPU acceleration: Smooth 60fps transitions', async ({ page }) => {
    // Check CSS properties for GPU acceleration
    const gpuOptimizations = await page.evaluate(() => {
      const mainImage = document.querySelector('[data-main-image]');
      const container = document.querySelector('.product-gallery__main-image-container');
      
      const imageStyles = window.getComputedStyle(mainImage);
      const containerStyles = window.getComputedStyle(container);
      
      return {
        image: {
          willChange: imageStyles.willChange,
          transform: imageStyles.transform,
          backfaceVisibility: imageStyles.backfaceVisibility
        },
        container: {
          willChange: containerStyles.willChange,
          transform: containerStyles.transform,
          backfaceVisibility: containerStyles.backfaceVisibility
        }
      };
    });
    
    console.log('GPU optimizations:', gpuOptimizations);
    
    // Verify GPU acceleration properties
    expect(gpuOptimizations.image.willChange).toContain('opacity');
    expect(gpuOptimizations.image.transform).not.toBe('none');
    expect(gpuOptimizations.image.backfaceVisibility).toBe('hidden');
    
    // Measure frame rate during transition (simplified check)
    let frameCount = 0;
    const measureFrames = async () => {
      await page.evaluate(() => {
        window.frameCount = 0;
        const countFrames = () => {
          window.frameCount++;
          if (window.frameCount < 60) {
            requestAnimationFrame(countFrames);
          }
        };
        requestAnimationFrame(countFrames);
      });
      
      // Trigger transition
      await page.click('[data-gallery-next]');
      
      // Wait for measurement to complete
      await page.waitForTimeout(1000);
      
      frameCount = await page.evaluate(() => window.frameCount);
    };
    
    await measureFrames();
    console.log(`Frame count during transition: ${frameCount}`);
    
    // Should achieve close to 60 frames in 1 second
    expect(frameCount).toBeGreaterThan(50);
  });

  test('Memory usage: No memory leaks during navigation', async ({ page }) => {
    // Skip if browser doesn't support memory API
    const hasMemoryAPI = await page.evaluate(() => 'memory' in performance);
    
    if (!hasMemoryAPI) {
      console.log('Memory API not available, skipping memory leak test');
      return;
    }
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);
    
    // Perform many navigations
    for (let i = 0; i < 20; i++) {
      await page.click('[data-gallery-next]');
      await page.waitForTimeout(350);
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) window.gc();
    });
    
    // Wait for cleanup
    await page.waitForTimeout(1000);
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => performance.memory.usedJSHeapSize);
    
    const memoryIncrease = finalMemory - initialMemory;
    const percentIncrease = (memoryIncrease / initialMemory) * 100;
    
    console.log(`Memory usage - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${percentIncrease.toFixed(2)}%)`);
    
    // Memory increase should be minimal (less than 50% increase)
    expect(percentIncrease).toBeLessThan(50);
  });
});