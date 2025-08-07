/**
 * section-drawer-multi-tabs.js
 * ----------------------------
 * Handles pill/tab clicks in the category drawer:
 * - Applies active state to clicked tab.
 * - Shows/hides accordion groups based on data-tab-content attributes.
 * - Follows external link if tab has data-tab-link.
 * - Sets initial content visibility based on the initially active tab.
 */

class DrawerTabs extends HTMLElement {
  constructor() {
    super();
    
    // Configuration
    this.config = {
      tabButtonSelector: '[data-tab-button]',
      tabContentSelector: '[data-tab-content]',
      activeClass: 'is-active',
      animationDuration: 200,
      debounceDelay: 150
    };
    
    // State
    this.state = {
      activeTab: null,
      tabs: new Map(),
      contents: new Map()
    };
    
    // Bind methods
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }
  
  connectedCallback() {
    this.init();
  }
  
  disconnectedCallback() {
    this.destroy();
  }
  
  init() {
    try {
      this.cacheElements();
      this.attachEventListeners();
      this.initializeActiveTab();
      
      if (window.logger) {
        window.logger.log('DrawerTabs initialized');
      }
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }
  
  cacheElements() {
    // Cache tab buttons
    const tabButtons = this.querySelectorAll(this.config.tabButtonSelector);
    tabButtons.forEach(button => {
      const handle = button.getAttribute('data-tab-button');
      if (handle) {
        this.state.tabs.set(handle, button);
      }
    });
    
    // Cache tab contents
    const tabContents = document.querySelectorAll(this.config.tabContentSelector);
    tabContents.forEach(content => {
      const handle = content.getAttribute('data-tab-content');
      if (handle) {
        this.state.contents.set(handle, content);
      }
    });
    
    if (this.state.tabs.size === 0) {
      throw new Error('No tab buttons found');
    }
  }
  
  attachEventListeners() {
    // Tab button click listeners
    this.state.tabs.forEach(button => {
      button.addEventListener('click', this.handleTabClick);
      button.addEventListener('keydown', this.handleKeydown);
      
      // Set ARIA attributes
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
    });
    
    // Re-initialize on drawer open if needed
    document.addEventListener('drawer:opened', this.handleDrawerOpen.bind(this));
  }
  
  removeEventListeners() {
    this.state.tabs.forEach(button => {
      button.removeEventListener('click', this.handleTabClick);
      button.removeEventListener('keydown', this.handleKeydown);
    });
    
    document.removeEventListener('drawer:opened', this.handleDrawerOpen);
  }
  
  initializeActiveTab() {
    // Find initially active tab
    let activeTab = null;
    let activeHandle = null;
    
    this.state.tabs.forEach((button, handle) => {
      if (button.classList.contains(this.config.activeClass) || 
          button.getAttribute('aria-selected') === 'true') {
        activeTab = button;
        activeHandle = handle;
      }
    });
    
    // If no active tab, optionally activate the first one
    if (!activeTab && this.state.tabs.size > 0) {
      const firstEntry = this.state.tabs.entries().next().value;
      if (firstEntry) {
        activeHandle = firstEntry[0];
        activeTab = firstEntry[1];
      }
    }
    
    if (activeTab && activeHandle) {
      this.activateTab(activeHandle, activeTab, false);
    } else {
      // If no active tab, show content for 'all' by default
      this.showTabContent('all');
    }
  }
  
  handleTabClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const handle = button.getAttribute('data-tab-button');
    
    if (handle) {
      this.activateTab(handle, button);
    }
  }
  
  handleKeydown(event) {
    const button = event.currentTarget;
    let nextButton = null;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextButton = this.getPreviousTab(button);
        break;
        
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextButton = this.getNextTab(button);
        break;
        
      case 'Home':
        event.preventDefault();
        nextButton = this.getFirstTab();
        break;
        
      case 'End':
        event.preventDefault();
        nextButton = this.getLastTab();
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        button.click();
        break;
    }
    
    if (nextButton) {
      nextButton.focus();
      const handle = nextButton.getAttribute('data-tab-button');
      if (handle) {
        this.activateTab(handle, nextButton);
      }
    }
  }
  
  getPreviousTab(currentButton) {
    const buttons = Array.from(this.state.tabs.values());
    const currentIndex = buttons.indexOf(currentButton);
    const previousIndex = currentIndex - 1;
    
    return previousIndex >= 0 ? buttons[previousIndex] : buttons[buttons.length - 1];
  }
  
  getNextTab(currentButton) {
    const buttons = Array.from(this.state.tabs.values());
    const currentIndex = buttons.indexOf(currentButton);
    const nextIndex = currentIndex + 1;
    
    return nextIndex < buttons.length ? buttons[nextIndex] : buttons[0];
  }
  
  getFirstTab() {
    const buttons = Array.from(this.state.tabs.values());
    return buttons[0];
  }
  
  getLastTab() {
    const buttons = Array.from(this.state.tabs.values());
    return buttons[buttons.length - 1];
  }
  
  activateTab(handle, button, dispatchEvent = true) {
    // Check for external link
    const link = button.getAttribute('data-tab-link');
    if (link) {
      window.location.href = link;
      return;
    }
    
    // Update active state
    this.state.activeTab = handle;
    
    // Update all tabs
    this.state.tabs.forEach((tabButton, tabHandle) => {
      const isActive = tabHandle === handle;
      
      tabButton.classList.toggle(this.config.activeClass, isActive);
      tabButton.setAttribute('aria-selected', String(isActive));
      tabButton.tabIndex = isActive ? 0 : -1;
    });
    
    // Show/hide content
    this.showTabContent(handle);
    
    // Ensure dropdowns are initialized after content becomes visible
    setTimeout(() => {
      if (window.initializeDropdowns) {
        window.initializeDropdowns();
      }
    }, 50);
    
    // Dispatch custom event
    if (dispatchEvent) {
      this.dispatchChangeEvent(handle, button);
    }
  }
  
  showTabContent(activeHandle) {
    this.state.contents.forEach((content, handle) => {
      const isVisible = handle === activeHandle;
      
      // Use hidden attribute for better accessibility
      content.hidden = !isVisible;
      content.setAttribute('aria-hidden', String(!isVisible));
      
      // Add animation class if needed
      if (isVisible) {
        content.classList.add('is-visible');
        content.classList.remove('is-hidden');
      } else {
        content.classList.remove('is-visible');
        content.classList.add('is-hidden');
      }
    });
    
    // Also handle .drawer-category elements within drawer dropdowns
    const drawerCategories = document.querySelectorAll('.drawer-category[data-tab-content]');
    drawerCategories.forEach(category => {
      const categoryHandle = category.getAttribute('data-tab-content');
      const isVisible = categoryHandle === activeHandle;
      
      if (isVisible) {
        category.classList.add('is-visible');
        category.style.display = 'block';
        
        // Ensure dropdown custom elements within this category are initialized
        const dropdownElements = category.querySelectorAll('dropdown-feature');
        dropdownElements.forEach(dropdown => {
          if (dropdown.connectedCallback && !dropdown._initialized) {
            dropdown._initialized = true;
            dropdown.connectedCallback();
          }
        });
      } else {
        category.classList.remove('is-visible');
        category.style.display = 'none';
      }
    });
  }
  
  handleDrawerOpen(event) {
    // Re-initialize if this drawer was opened
    const drawerElement = document.getElementById('multi-drawer');
    if (drawerElement && this.contains(drawerElement)) {
      this.cacheElements();
      this.initializeActiveTab();
      
      // Ensure dropdowns are initialized
      setTimeout(() => {
        if (window.initializeDropdowns) {
          window.initializeDropdowns();
        }
      }, 100);
    }
  }
  
  dispatchChangeEvent(handle, button) {
    this.dispatchEvent(new CustomEvent('drawertabs:change', {
      bubbles: true,
      composed: true,
      detail: {
        activeTab: handle,
        tabButton: button,
        previousTab: this.state.activeTab
      }
    }));
  }
  
  handleError(message, error) {
    if (window.logger) {
      window.logger.error(`DrawerTabs: ${message}`, error);
    }
  }
  
  destroy() {
    this.removeEventListeners();
    this.state.tabs.clear();
    this.state.contents.clear();
    this.state = null;
  }
}

// Register custom element
customElements.define('drawer-tabs-controller', DrawerTabs);

// Initialize drawer tabs
function initDrawerTabs() {
  // Find drawer content area
  const drawerContent = document.querySelector('.drawer__content__item#drawer__content__category');
  
  if (!drawerContent) {
    return;
  }
  
  // Check if already initialized
  if (drawerContent.querySelector('drawer-tabs-controller')) {
    return;
  }
  
  // Convert to custom element
  const drawerTabs = document.createElement('drawer-tabs-controller');
  
  // Move existing content into custom element
  while (drawerContent.firstChild) {
    drawerTabs.appendChild(drawerContent.firstChild);
  }
  
  drawerContent.appendChild(drawerTabs);
}

// Run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDrawerTabs);
} else {
  initDrawerTabs();
}

// Re-initialize on drawer open
document.addEventListener('drawer:opened', function(event) {
  const drawerElement = document.getElementById('multi-drawer');
  if (drawerElement && event.target && event.target.contains(drawerElement)) {
    initDrawerTabs();
  }
});