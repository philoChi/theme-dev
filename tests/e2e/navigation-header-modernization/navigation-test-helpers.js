// Navigation Test Helpers
// Shared utilities for navigation header modernization tests

const selectors = {
  header: '.site-header',
  nav: '.site-header__nav',
  navItem: '.navigation-item',
  megaMenu: '.mega-menu-container',
  logo: '.site-header__logo',
  mobileMenu: '#hamburger-drawer-id',
  searchButton: '#search-button-drawer-id'
};

const viewports = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  smallMobile: { width: 320, height: 568 }
};

const breakpoints = {
  mobileMax: 991,
  smallMobileMax: 767
};

const urls = {
  home: 'http://127.0.0.1:42431',
  product: 'http://127.0.0.1:42431/products/baum-stein-stick',
  collection: 'http://127.0.0.1:42431/collections/all'
};

async function waitForNavigationReady(page) {
  // Wait for navigation to be fully loaded
  await page.waitForSelector(selectors.nav, { state: 'visible' });
  await page.waitForTimeout(500); // Allow animations to settle
}

async function captureNavigationState(page, name) {
  return await page.locator(selectors.header).screenshot({
    path: `tests/e2e/screenshots/nav-${name}-${Date.now()}.png`
  });
}

async function getComputedStyles(page, selector) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    
    const styles = window.getComputedStyle(element);
    return {
      position: styles.position,
      left: styles.left,
      transform: styles.transform,
      padding: styles.padding,
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow,
      backgroundColor: styles.backgroundColor,
      transition: styles.transition
    };
  }, selector);
}

async function triggerHoverState(page, selector) {
  await page.hover(selector);
  await page.waitForTimeout(350); // Wait for 300ms transition + buffer
}

async function validateAlignment(page) {
  const navStyles = await getComputedStyles(page, selectors.nav);
  const logoStyles = await page.locator(selectors.logo).boundingBox();
  
  return {
    isLeftAligned: navStyles.transform === 'none',
    leftPosition: navStyles.left,
    logoWidth: logoStyles?.width || 0
  };
}

module.exports = {
  selectors,
  viewports,
  breakpoints,
  urls,
  waitForNavigationReady,
  captureNavigationState,
  getComputedStyles,
  triggerHoverState,
  validateAlignment
};