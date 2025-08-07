// Navigation Header Modernization - Visual Regression Tests
// Tests for TC-01, TC-02, TC-07, TC-10

const { test, expect } = require('@playwright/test');
const { 
  selectors, 
  viewports, 
  urls, 
  waitForNavigationReady,
  captureNavigationState,
  getComputedStyles,
  triggerHoverState,
  validateAlignment
} = require('./navigation-test-helpers.js');

test.describe('Navigation Header Modernization - Visual Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(urls.home);
    await waitForNavigationReady(page);
  });

  // TC-02: Left-aligned navigation positioning
  test('TC-02: Navigation items are left-aligned with appropriate logo margin', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const alignment = await validateAlignment(page);
    
    // Verify left alignment (no center transform)
    expect(alignment.isLeftAligned).toBe(true);
    
    // Verify position includes logo width + margin
    expect(alignment.leftPosition).toContain('calc');
    expect(alignment.leftPosition).toContain('60px'); // var(--logo-size)
    
    // Visual regression screenshot
    await captureNavigationState(page, 'left-aligned-desktop');
  });

  // TC-07: Modern button-like styling
  test('TC-07: Navigation items have modern button-like appearance', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const navItemStyles = await getComputedStyles(page, selectors.navItem);
    
    // Verify modern button styling
    expect(navItemStyles.padding).toBe('8px 16px');
    expect(navItemStyles.borderRadius).toBe('8px');
    expect(navItemStyles.boxShadow).toContain('rgba(0, 0, 0, 0.08)');
    
    // Check for border
    const borderStyle = await page.evaluate(() => {
      const item = document.querySelector('.navigation-item');
      return window.getComputedStyle(item).border;
    });
    expect(borderStyle).toContain('1px solid');
    
    await captureNavigationState(page, 'button-styling');
  });

  // TC-01: Modern hover background treatment
  test('TC-01: Hover state shows modern background with smooth animation', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const navItem = page.locator(selectors.navItem).first();
    
    // Get initial state
    const initialStyles = await getComputedStyles(page, `${selectors.navItem}:first-child`);
    
    // Trigger hover
    await triggerHoverState(page, `${selectors.navItem}:first-child`);
    
    // Get hover state
    const hoverStyles = await getComputedStyles(page, `${selectors.navItem}:first-child`);
    
    // Verify transform animation
    expect(hoverStyles.transform).toContain('translateY(-2px)');
    
    // Verify enhanced shadow
    expect(hoverStyles.boxShadow).toContain('rgba(0, 0, 0, 0.12)');
    
    // Verify transition timing (≤300ms)
    expect(hoverStyles.transition).toContain('0.3s');
    expect(hoverStyles.transition).toContain('cubic-bezier');
    
    await captureNavigationState(page, 'hover-state');
  });

  // TC-10: Logo and navigation spacing
  test('TC-10: Logo positioning creates visual hierarchy', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    const logo = await page.locator(selectors.logo).boundingBox();
    const nav = await page.locator(selectors.nav).boundingBox();
    
    // Verify spacing creates hierarchy
    expect(nav.x).toBeGreaterThan(logo.x + logo.width);
    
    // Verify consistent gap
    const gap = nav.x - (logo.x + logo.width);
    expect(gap).toBeGreaterThan(30);
    expect(gap).toBeLessThan(50);
    
    await captureNavigationState(page, 'visual-hierarchy');
  });

  // Visual regression across viewports
  test('Visual consistency across desktop viewports', async ({ page }) => {
    const desktopSizes = [
      { width: 1920, height: 1080, name: 'full-hd' },
      { width: 1440, height: 900, name: 'laptop' },
      { width: 1024, height: 768, name: 'tablet-landscape' }
    ];

    for (const size of desktopSizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await waitForNavigationReady(page);
      
      const alignment = await validateAlignment(page);
      expect(alignment.isLeftAligned).toBe(true);
      
      await captureNavigationState(page, `desktop-${size.name}`);
    }
  });

  // Hover animation timing test
  test('Hover animations complete within 300ms', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    
    // Measure animation timing
    const animationDuration = await page.evaluate(async () => {
      const item = document.querySelector('.navigation-item');
      const startTime = performance.now();
      
      // Trigger hover
      item.dispatchEvent(new MouseEvent('mouseenter'));
      
      // Wait for transition to complete
      await new Promise(resolve => {
        item.addEventListener('transitionend', resolve, { once: true });
      });
      
      return performance.now() - startTime;
    });
    
    // Verify animation completes within 300ms (with small buffer)
    expect(animationDuration).toBeLessThanOrEqual(350);
  });
});