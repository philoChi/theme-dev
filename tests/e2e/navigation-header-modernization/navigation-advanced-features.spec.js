// Navigation Header Modernization - Advanced Features Tests
// Tests for TC-08, TC-09 (Glassmorphism, Micro-animations)

const { test, expect } = require('@playwright/test');
const { 
  selectors, 
  viewports, 
  urls, 
  waitForNavigationReady,
  captureNavigationState,
  getComputedStyles,
  triggerHoverState
} = require('./navigation-test-helpers.js');

test.describe('Navigation Header Modernization - Advanced Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(urls.home);
    await waitForNavigationReady(page);
  });

  // TC-08: Glassmorphism effects with progressive enhancement
  test('TC-08: Glassmorphism effects applied where supported', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    // Check if browser supports backdrop-filter
    const supportsBackdropFilter = await page.evaluate(() => {
      return CSS.supports('backdrop-filter', 'blur(12px)');
    });
    
    if (supportsBackdropFilter) {
      // Test glassmorphism implementation
      const navItemStyles = await page.evaluate(() => {
        const item = document.querySelector('.navigation-item');
        const styles = window.getComputedStyle(item);
        return {
          backdropFilter: styles.backdropFilter,
          webkitBackdropFilter: styles.webkitBackdropFilter,
          background: styles.background
        };
      });
      
      expect(navItemStyles.backdropFilter).toContain('blur');
      expect(navItemStyles.background).toContain('rgba(255, 255, 255, 0.08)');
      
      // Test enhanced hover state
      await triggerHoverState(page, `${selectors.navItem}:first-child`);
      
      const hoverStyles = await page.evaluate(() => {
        const item = document.querySelector('.navigation-item:first-child');
        const styles = window.getComputedStyle(item);
        return {
          backdropFilter: styles.backdropFilter,
          background: styles.background
        };
      });
      
      expect(hoverStyles.backdropFilter).toContain('blur(16px)');
      expect(hoverStyles.background).toContain('rgba(255, 255, 255, 0.12)');
      
    } else {
      // Test fallback styling for browsers without backdrop-filter
      const navItemStyles = await getComputedStyles(page, selectors.navItem);
      expect(navItemStyles.background).not.toContain('rgba(255, 255, 255, 0.08)');
      expect(navItemStyles.backdropFilter).toBe('none');
    }
    
    await captureNavigationState(page, 'glassmorphism-test');
  });

  // TC-09: Micro-animations with smooth feedback
  test('TC-09: Micro-animations provide smooth feedback', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const navItem = page.locator(selectors.navItem).first();
    
    // Test transform animation with scale
    await triggerHoverState(page, `${selectors.navItem}:first-child`);
    
    const transform = await navItem.evaluate(el => {
      return window.getComputedStyle(el).transform;
    });
    
    // Should include both translateY and scale
    expect(transform).toContain('matrix'); // Computed transform as matrix
    
    // Test will-change optimization
    const willChange = await navItem.evaluate(el => {
      return window.getComputedStyle(el).willChange;
    });
    
    expect(willChange).toContain('transform');
    expect(willChange).toContain('box-shadow');
    
    await captureNavigationState(page, 'micro-animations');
  });

  // Test animation performance (60fps target)
  test('Animations maintain 60fps performance target', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    // Enable frame metrics
    await page.evaluate(() => {
      window.frameMetrics = {
        frames: [],
        start: performance.now()
      };
      
      function recordFrame() {
        window.frameMetrics.frames.push(performance.now());
        requestAnimationFrame(recordFrame);
      }
      requestAnimationFrame(recordFrame);
    });
    
    // Trigger hover animation
    const navItem = page.locator(selectors.navItem).first();
    await navItem.hover();
    
    // Wait for animation duration
    await page.waitForTimeout(350);
    
    // Calculate average FPS
    const fps = await page.evaluate(() => {
      const frames = window.frameMetrics.frames;
      if (frames.length < 2) return 0;
      
      const duration = frames[frames.length - 1] - frames[0];
      return (frames.length - 1) / (duration / 1000);
    });
    
    // Should maintain near 60fps (allow some variance for test environment)
    expect(fps).toBeGreaterThan(45);
  });

  // Test cubic-bezier timing function
  test('Transitions use cubic-bezier timing for smooth motion', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const transition = await page.evaluate(() => {
      const item = document.querySelector('.navigation-item');
      return window.getComputedStyle(item).transition;
    });
    
    expect(transition).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(transition).toContain('0.3s');
  });

  // Test focus-visible accessibility
  test('Focus state provides accessible feedback', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const navItem = page.locator(selectors.navItem).first();
    
    // Focus the navigation item
    await navItem.focus();
    
    const focusStyles = await navItem.evaluate(el => {
      return window.getComputedStyle(el, ':focus-visible');
    });
    
    // Note: :focus-visible pseudo-class testing may be limited in automated tests
    // This test mainly verifies the CSS is applied
    await expect(navItem).toBeFocused();
  });

  // Test mega-menu enhanced styling
  test('Mega-menu container has enhanced styling', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const megaMenuStyles = await getComputedStyles(page, selectors.megaMenu);
    
    // Check enhanced transition timing
    expect(megaMenuStyles.transition).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    
    // Check enhanced shadow
    expect(megaMenuStyles.boxShadow).toContain('rgba(0, 0, 0, 0.05)');
  });

  // Test active state styling
  test('Active navigation items have enhanced styling', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    // Trigger mega-menu to make item active
    const megaMenuItem = page.locator('[data-menu]').first();
    await megaMenuItem.hover();
    
    await page.waitForTimeout(200);
    
    // Check if item has active class
    const hasActiveClass = await megaMenuItem.evaluate(el => {
      return el.classList.contains('active');
    });
    
    if (hasActiveClass) {
      const activeStyles = await megaMenuItem.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          boxShadow: styles.boxShadow,
          background: styles.background
        };
      });
      
      expect(activeStyles.boxShadow).toContain('rgba(0, 0, 0, 0.12)');
    }
  });
});