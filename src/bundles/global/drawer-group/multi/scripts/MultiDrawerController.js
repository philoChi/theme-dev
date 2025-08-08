/**
 * Multi Drawer Controller
 * 
 * Init script for the left‑hand "multi" drawer.
 * Handles navigation, search, categories, and filters.
 */

import DrawerBase from '../../base/scripts/DrawerBase.js';

function initMultiDrawer() {
  // Prevent duplicate initialization
  if (window.multiDrawerInitialized) {
    return;
  }
  window.multiDrawerInitialized = true;

  const multiDrawer = new DrawerBase({ drawerSelector: '#multi-drawer' });

  // Define common selectors
  const searchButtons = [
    '#search-button-drawer-id',
    '#search-button-drawer-id-mobile',
    '#search-button-drawer-id-desktop'
  ];

  /* global open/close handlers */
  multiDrawer.registerTrigger([
    ...searchButtons,
    '#hamburger-drawer-id',
  ]);

  /* individual content panels inside the drawer */
  multiDrawer.registerContent(
    '#drawer__content__search',
    '#drawer__header__search',
    searchButtons,
    '#drawer__footer__search'
  );

  multiDrawer.registerContent(
    '#drawer__content__category',
    '#drawer__header__category',
    ['#hamburger-drawer-id'],
    '#drawer__footer__category',
  );

  multiDrawer.registerContent(
    '#drawer__content__filter',
    '#drawer__header__filter',
    ['[data-drawer-trigger="filter"]'],
    '#drawer__footer__filter'
  );

  // Initialize search module when needed
  let searchModuleInitialized = false;

  function initializeSearchModule() {
    if (!searchModuleInitialized && window.Theme?.DrawerSearch) {
      const success = window.Theme.DrawerSearch.init();
      searchModuleInitialized = success;
    }
  }

  // Initialize search module when search buttons are clicked
  searchButtons.forEach(selector => {
    document.querySelector(selector)?.addEventListener('click', () => {
      setTimeout(initializeSearchModule, 150);
    });
  });

  // Store reference to multiDrawer for potential future use
  window.multiDrawer = multiDrawer;

  return multiDrawer;
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMultiDrawer);
} else {
  initMultiDrawer();
}

export default initMultiDrawer;