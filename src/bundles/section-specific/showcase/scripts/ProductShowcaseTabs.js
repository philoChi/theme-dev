// Import logger from features bundle
const { loggers } = window.SharedFeaturesBundle?.utils || { loggers: {
  StartUpLogger: { init: () => {}, warn: () => {}, error: () => {} },
  TabLogger: { init: () => {}, warn: () => {}, error: () => {} }
}};
const { TabLogger, StartUpLogger } = loggers;

/**
 * @class TabController
 * @description Controls tab functionality for product showcase section
 */
class TabController {
  constructor(container, logger) {
    this.container = container;
    this.logger = logger;
    this.tabList = container.querySelector('[role="tablist"]');

    if (!this.tabList) {
      this.logger.error('No tablist element found in container');
      return;
    }

    this.tabs = Array.from(this.tabList.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
    this.viewAllButtons = Array.from(container.querySelectorAll('.feature-button[data-panel]'));

    // Verify ARIA relationships during initialization
    if (!this.verifyAriaRelationships()) {
      this.logger.error('Invalid ARIA relationships detected');
      return;
    }

    this.logger.init(`Initialized with ${this.tabs.length} tabs and ${this.panels.length} panels`);

    // Store initial state
    this.activeTabIndex = this.tabs.findIndex(
      (tab) => tab.getAttribute('aria-selected') === 'true'
    );
    this.logger.state(`Initial active tab index: ${this.activeTabIndex}`);

    // Bind event handlers
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleViewAllVisibility = this.handleViewAllVisibility.bind(this);

    this.init();
  }

  /**
   * Verifies proper ARIA relationships between tabs and panels
   * @returns {boolean} Whether all relationships are valid
   */
  verifyAriaRelationships() {
    return this.tabs.every((tab, index) => {
      const tabId = tab.id;
      const controlsId = tab.getAttribute('aria-controls');
      const panel = this.panels[index];

      if (!tabId || !controlsId || !panel) {
        this.logger.error(`Missing required attributes for tab ${index}`);
        return false;
      }

      if (panel.id !== controlsId) {
        this.logger.error(`Mismatched aria-controls for tab ${index}`);
        return false;
      }

      if (panel.getAttribute('aria-labelledby') !== tabId) {
        this.logger.error(`Mismatched aria-labelledby for panel ${index}`);
        return false;
      }

      return true;
    });
  }

  init() {
    // Ensure tablist has proper role and label
    if (!this.tabList.getAttribute('aria-label')) {
      this.tabList.setAttribute('aria-label', 'Product categories');
      this.logger.init('Added missing aria-label to tablist');
    }

    // Set up click handler using event delegation
    this.tabList.addEventListener('click', this.handleClick);
    this.logger.init('Click handler bound to tablist');

    // Set up keyboard navigation
    this.tabList.addEventListener('keydown', this.handleKeydown);
    this.logger.init('Keydown handler bound to tablist');

    // Setup focus management
    this.setupFocusManagement();

    // Ensure at least one tab is active
    if (this.activeTabIndex === -1) {
      this.logger.state('No active tab found, activating first tab');
      this.activateTab(0);
    } else {
      // Set initial ARIA states and view-all visibility
      this.updateAriaStates();
      // Ensure initial view-all button is visible
      this.handleViewAllVisibility(this.activeTabIndex);
    }
  }

    /**
   * Handles visibility of "View All" buttons
   * @param {number} activeIndex - Index of the active tab
   * @private
   */
    handleViewAllVisibility(activeIndex) {
      if (!this.viewAllButtons.length) return;
  
      const activePanel = this.panels[activeIndex];
      if (!activePanel) return;
  
      const activePanelId = activePanel.id;
  
      this.viewAllButtons.forEach(button => {
        const buttonPanelId = button.getAttribute('data-panel');
        button.style.display = buttonPanelId === activePanelId ? 'inline-flex' : 'none';
      });
  
      this.logger.state(`Updated "View All" button visibility for panel: ${activePanelId}`);
    }
  

  /**
   * Updates ARIA states and visibility
   * @private
   */
  updateAriaStates() {
    this.tabs.forEach((tab, index) => {
      const isActive = index === this.activeTabIndex;
      const panel = this.panels[index];

      // Update tab attributes
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;

      // Update panel attributes and classes
      if (panel) {
        panel.setAttribute('tabindex', isActive ? '0' : '-1');

        if (isActive) {
          panel.classList.remove('transitioning-out');
          panel.classList.add('transitioning-in');
          panel.hidden = false;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              panel.classList.remove('transitioning-in');
              panel.classList.add('active');
              // Update "View All" button visibility
              this.handleViewAllVisibility(index);
              // Dispatch event for announcing new panel is active
              this.container.dispatchEvent(new CustomEvent('panelchange'));
            });
          });
        } else {
          if (panel.classList.contains('active')) {
            panel.classList.add('transitioning-out');
            panel.classList.remove('active');

            setTimeout(() => {
              if (!panel.classList.contains('active')) {
                panel.classList.remove('transitioning-out');
                panel.hidden = true;
              }
            }, 800);
          } else {
            panel.hidden = true;
          }
        }

        panel.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      }
    });

    this.logger.state('Updated ARIA states and panel visibility');
  }

  handleClick(event) {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !this.tabList.contains(tab)) return;

    event.preventDefault();
    const newIndex = this.tabs.indexOf(tab);

    // Only activate if it's a new tab
    if (newIndex !== this.activeTabIndex) {
      this.logger.event(`Tab clicked: ${tab.textContent.trim()} (index: ${newIndex})`);
      this.activateTab(newIndex);
    }
  }

  handleKeydown(event) {
    const tab = event.target.closest('[role="tab"]');
    if (!tab || !this.tabList.contains(tab)) return;

    let targetTab;
    let shouldActivate = false;

    switch (event.key) {
      case 'ArrowLeft':
        targetTab = this.getPreviousTab();
        this.logger.event('ArrowLeft key pressed - moving to previous tab');
        break;
      case 'ArrowRight':
        targetTab = this.getNextTab();
        this.logger.event('ArrowRight key pressed - moving to next tab');
        break;
      case 'Home':
        targetTab = this.tabs[0];
        this.logger.event('Home key pressed - moving to first tab');
        break;
      case 'End':
        targetTab = this.tabs[this.tabs.length - 1];
        this.logger.event('End key pressed - moving to last tab');
        break;
      case 'Enter':
      case ' ':
        targetTab = this.tabs[this.activeTabIndex];
        shouldActivate = true;
        this.logger.event(`${event.key} key pressed - activating current tab`);
        break;
      case 'Tab':
        // Let the native tab behavior work, but update our focus management
        const currentIndex = this.tabs.indexOf(tab);
        setTimeout(() => this.handleTabNavigation(currentIndex, event.shiftKey), 0);
        return;
      default:
        return;
    }

    event.preventDefault();

    if (shouldActivate) {
      // For Enter/Space, activate the current tab without moving focus
      const newIndex = this.tabs.indexOf(targetTab);
      this.activateTab(newIndex, true); // 'true' indicates it's a direct activation
    } else if (targetTab) {
      // For arrow keys, move focus and activate
      const newIndex = this.tabs.indexOf(targetTab);
      this.focusTab(newIndex);
      this.activateTab(newIndex);
    }
  }

  /**
   * Handles focus management for tab key navigation
   * @param {number} currentIndex The current tab index
   * @param {boolean} isShiftKey Whether shift key is pressed
   */
  handleTabNavigation(currentIndex, isShiftKey) {
    const direction = isShiftKey ? -1 : 1;
    const nextIndex = currentIndex + direction;

    if (nextIndex >= 0 && nextIndex < this.tabs.length) {
      // Update tabindex for the next focusable tab
      this.tabs[nextIndex].tabIndex = 0;
      // Set all other tabs to -1
      this.tabs.forEach((tab, i) => {
        if (i !== nextIndex) tab.tabIndex = -1;
      });
    }

    this.logger.event(`Tab navigation: ${isShiftKey ? 'backward' : 'forward'} from index ${currentIndex}`);
  }

  /**
   * Manages keyboard focus order for the tab group
   */
  setupFocusManagement() {
    // Set initial tabindex values
    this.tabs.forEach((tab, index) => {
      tab.tabIndex = index === this.activeTabIndex ? 0 : -1;
    });

    // Handle focus events to maintain proper tab order
    this.tabList.addEventListener('focusin', (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (!tab || !this.tabList.contains(tab)) return;

      // Update tabindex values when focus moves
      this.tabs.forEach((t) => {
        t.tabIndex = t === tab ? 0 : -1;
      });
    });

    this.logger.init('Focus management initialized');
  }

  /**
   * Focuses a specific tab and updates tab order
   * @param {number} index The index of the tab to focus
   */
  focusTab(index) {
    if (index >= 0 && index < this.tabs.length) {
      const tab = this.tabs[index];
      tab.tabIndex = 0;
      tab.focus();

      // Update other tabs' tabindex
      this.tabs.forEach((t, i) => {
        if (i !== index) t.tabIndex = -1;
      });

      this.logger.state(`Set focus to tab index: ${index}`);
    }
  }

  getPreviousTab() {
    const index = this.activeTabIndex === 0 ? this.tabs.length - 1 : this.activeTabIndex - 1;
    return this.tabs[index];
  }

  getNextTab() {
    const index = this.activeTabIndex === this.tabs.length - 1 ? 0 : this.activeTabIndex + 1;
    return this.tabs[index];
  }

  /**
   * Activates a tab by its index and updates the URL without causing a jump.
   * @param {number} index - The index of the tab to activate.
   * @param {boolean} immediate - If true, do not focus new tab (used for Enter/Space).
   */
  activateTab(index, immediate = false) {
    this.logger.state(`Activating tab index: ${index} ${immediate ? '(immediate)' : ''}`);

    if (index === this.activeTabIndex && !immediate) {
      this.logger.state('Tab already active, no change needed');
      return;
    }

    if (index < 0 || index >= this.tabs.length) {
      this.logger.error(`Invalid tab index: ${index}. Must be between 0 and ${this.tabs.length - 1}`);
      return;
    }

    // Update active tab index
    this.activeTabIndex = index;

    // Update ARIA states and visibility
    this.updateAriaStates();

    // For keyboard activation, ensure proper focus handling
    if (immediate) {
      const activeTab = this.tabs[index];
      if (document.activeElement !== activeTab) {
        activeTab.focus();
      }
    }
  }

  /**
   * Clean up event listeners
   * @public
   */
  destroy() {
    this.logger.state('Destroying tab controller instance');
    this.tabList.removeEventListener('click', this.handleClick);
    this.tabList.removeEventListener('keydown', this.handleKeydown);
    this.tabList.removeEventListener('focusin', this.handleFocusIn);
  }
}

// Register with Shopify's section handler
if (typeof window.Shopify === 'undefined') {
  window.Shopify = {};
}

Shopify.ProductShowcase = {
  instances: new Map(),

  register(container) {
    const sectionId = container.getAttribute('data-section-id');
    if (this.instances.has(sectionId)) {
      StartUpLogger.error(`Tab controller already exists for section ${sectionId}`);
      return;
    }

    StartUpLogger.init(`Registering new instance for section ${sectionId}`);
    const controller = new TabController(container, TabLogger);
    this.instances.set(sectionId, controller);
  },

  unregister(container) {
    const sectionId = container.getAttribute('data-section-id');
    const controller = this.instances.get(sectionId);

    if (controller) {
      StartUpLogger.state(`Unregistering instance for section ${sectionId}`);
      controller.destroy();
      this.instances.delete(sectionId);
    }
  }
};

// Initialize immediately and on section load
function initializeProductShowcase() {
  const sections = document.querySelectorAll('[data-section-type="showcase-tab"]');
  sections.forEach((section) => {
    StartUpLogger.init(`Initializing showcase-tab section ${section.getAttribute('data-section-id')}`);
    Shopify.ProductShowcase.register(section);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeProductShowcase);
} else {
  initializeProductShowcase();
}

// Initialize on section load
document.addEventListener('shopify:section:load', (event) => {
  if (event.target.getAttribute('data-section-type') === 'showcase-tab') {
    StartUpLogger.init(`Section loaded: ${event.target.getAttribute('data-section-id')}`);
    Shopify.ProductShowcase.register(event.target);
  }
});

// Cleanup on section unload
document.addEventListener('shopify:section:unload', (event) => {
  if (event.target.getAttribute('data-section-type') === 'showcase-tab') {
    StartUpLogger.state(`Section unloaded: ${event.target.getAttribute('data-section-id')}`);
    Shopify.ProductShowcase.unregister(event.target);
  }
});

/**
 * @class ProductShowcaseTabs
 * @extends HTMLElement
 * @description Custom element for product showcase tabs functionality
 */
class ProductShowcaseTabs extends HTMLElement {
  constructor() {
    super();
    this.controller = null;
  }

  connectedCallback() {
    // Initialize the tab controller when element is connected
    this.controller = new TabController(this, TabLogger);
  }

  disconnectedCallback() {
    // Clean up when element is disconnected
    if (this.controller && typeof this.controller.destroy === 'function') {
      this.controller.destroy();
    }
  }
}

// Register the custom element (defensive registration)
if (typeof ProductShowcaseTabs === 'function' && !customElements.get('product-showcase-tabs')) {
  try {
    customElements.define('product-showcase-tabs', ProductShowcaseTabs);
    console.log('[ProductShowcaseTabs] Custom element registered successfully');
  } catch (error) {
    console.error('[ProductShowcaseTabs] Failed to register custom element:', error);
  }
} else {
  console.warn('[ProductShowcaseTabs] Class not defined or custom element already registered');
}

// Export the class for custom element registration
export default ProductShowcaseTabs;