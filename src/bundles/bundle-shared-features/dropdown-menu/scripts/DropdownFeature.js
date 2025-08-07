/**
 * feature-dropdown.js
 * ------------------
 * Handles simple accordion/dropdown functionality.
 * - Toggles 'is-open' class on the trigger button.
 * - Toggles 'hidden' attribute on the target panel.
 * - Updates 'aria-expanded' attribute on the trigger button.
 */

class DropdownFeature extends HTMLElement {
  constructor() {
    super();

    // Configuration
    this.config = {
      triggerSelector: '[data-dropdown-trigger]',
      panelAttribute: 'aria-controls',
      expandedClass: 'is-open',
      animationDuration: 300
    };

    // State
    this.state = {
      isExpanded: false
    };

    // Bind methods
    this.handleTriggerClick = this.handleTriggerClick.bind(this);
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
      this.syncInitialState();
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  cacheElements() {
    this.elements = {
      trigger: this.querySelector(this.config.triggerSelector),
      panel: null
    };

    if (!this.elements.trigger) {
      throw new Error('Dropdown trigger not found');
    }

    const targetId = this.elements.trigger.getAttribute(this.config.panelAttribute);
    if (!targetId) {
      throw new Error('Dropdown panel ID not specified');
    }

    this.elements.panel = document.getElementById(targetId);
    if (!this.elements.panel) {
      throw new Error(`Dropdown panel with ID "${targetId}" not found`);
    }
  }

  attachEventListeners() {
    this.elements.trigger.addEventListener('click', this.handleTriggerClick);

    // Keyboard accessibility
    this.elements.trigger.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  removeEventListeners() {
    if (this.elements.trigger) {
      this.elements.trigger.removeEventListener('click', this.handleTriggerClick);
      this.elements.trigger.removeEventListener('keydown', this.handleKeydown);
    }
  }

  syncInitialState() {
    const isExpanded = this.elements.trigger.getAttribute('aria-expanded') === 'true';
    this.state.isExpanded = isExpanded;

    // If panel has the expanded class, it's already visible via CSS
    if (this.elements.panel.classList.contains('dropdown-feature__panel--expanded')) {
      // Remove the expanded class to allow normal behavior
      this.elements.panel.classList.remove('dropdown-feature__panel--expanded');
      // Ensure hidden attribute is properly set
      this.elements.panel.hidden = false;
    } else {
      this.elements.panel.hidden = !isExpanded;
    }

    this.elements.trigger.classList.toggle(this.config.expandedClass, isExpanded);
  }

  handleTriggerClick(event) {
    event.preventDefault();
    this.toggle();
  }

  handleKeydown(event) {
    // Handle Enter and Space keys
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }

    // Handle Escape key to close
    if (event.key === 'Escape' && this.state.isExpanded) {
      this.close();
    }
  }

  toggle() {
    this.state.isExpanded = !this.state.isExpanded;
    this.updateUI();
    this.dispatchChangeEvent();
  }

  open() {
    if (!this.state.isExpanded) {
      this.state.isExpanded = true;
      this.updateUI();
      this.dispatchChangeEvent();
    }
  }

  close() {
    if (this.state.isExpanded) {
      this.state.isExpanded = false;
      this.updateUI();
      this.dispatchChangeEvent();
    }
  }

  updateUI() {
    const { trigger, panel } = this.elements;
    const { isExpanded } = this.state;

    trigger.setAttribute('aria-expanded', String(isExpanded));
    trigger.classList.toggle(this.config.expandedClass, isExpanded);

    // Add animation class when showing (but not on initial load)
    if (isExpanded && panel.hidden) {
      panel.hidden = false;
      // Force reflow to ensure animation plays
      panel.offsetHeight;
      panel.classList.add('dropdown-feature__panel--animating');
    } else if (!isExpanded && !panel.hidden) {
      panel.hidden = true;
      panel.classList.remove('dropdown-feature__panel--animating');
    }

    // Focus management for accessibility
    if (isExpanded) {
      panel.focus();
    }
  }

  dispatchChangeEvent() {
    this.dispatchEvent(new CustomEvent('dropdown:change', {
      bubbles: true,
      composed: true,
      detail: {
        isExpanded: this.state.isExpanded,
        trigger: this.elements.trigger,
        panel: this.elements.panel
      }
    }));
  }

  handleError(message, error) {
    if (window.logger) {
      window.logger.error(`DropdownFeature: ${message}`, error);
    }
  }

  destroy() {
    this.removeEventListeners();
    this.elements = null;
    this.state = null;
  }
}

// Initialize all dropdown wrappers on page
function initializeDropdowns() {
  const dropdownWrappers = document.querySelectorAll('dropdown-feature[dropdown-content]');

  dropdownWrappers.forEach((element, index) => {
    // Force re-initialization if needed
    if (element.init && typeof element.init === 'function') {
      try {
        element.init();
      } catch (error) {
        if (window.logger) {
          window.logger.error(`Failed to initialize dropdown ${index + 1}:`, error);
        }
      }
    }
  });
}

export { DropdownFeature, initializeDropdowns };