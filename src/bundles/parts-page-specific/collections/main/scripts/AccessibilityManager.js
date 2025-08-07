/**
 * Accessibility management for collection page
 * Handles screen reader announcements, focus management, and keyboard navigation
 */

import { DOMUtils, EventUtils } from './CollectionUtils.js';

export class AccessibilityManager {
  constructor() {
    this.elements = {};
    this.previouslyFocusedElement = null;

    // Bind methods
    this.handleEscapeKey = this.handleEscapeKey.bind(this);
    this.handleDrawerOpened = this.handleDrawerOpened.bind(this);
    this.handleDrawerClosed = this.handleDrawerClosed.bind(this);
  }

  /**
   * Initialize accessibility manager
   * @param {HTMLElement} section - Section element
   * @param {Object} elements - Cached DOM elements
   */
  initialize(section, elements) {
    this.section = section;
    this.elements = elements;
    this.createLiveRegion();
    this.attachEventListeners();
  }

  /**
   * Attach event listeners for accessibility features
   */
  attachEventListeners() {
    // Escape key handling
    document.addEventListener('keydown', this.handleEscapeKey);

    // Drawer events
    document.addEventListener('drawer:opened', this.handleDrawerOpened);
    document.addEventListener('drawer:closed', this.handleDrawerClosed);
  }

  /**
   * Create live region for screen reader announcements
   */
  createLiveRegion() {
    let liveRegion = document.getElementById('collection-announcements');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'collection-announcements';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'visually-hidden';
      liveRegion.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0,0,0,0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(liveRegion);
    }

    this.liveRegion = liveRegion;
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} urgency - Urgency level (polite, assertive)
   */
  announceToScreenReader(message, urgency = 'polite') {
    if (!this.liveRegion) {
      this.createLiveRegion();
    }

    // Update urgency if needed
    if (this.liveRegion.getAttribute('aria-live') !== urgency) {
      this.liveRegion.setAttribute('aria-live', urgency);
    }

    // Clear and set new message
    this.liveRegion.textContent = '';
    setTimeout(() => {
      this.liveRegion.textContent = message;
    }, 100);

    if (window.logger) {
      window.logger.log('Screen reader announcement:', message);
    }
  }

  /**
   * Handle escape key press
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleEscapeKey(event) {
    if (event.key === 'Escape') {
      // Close filter drawer if open
      if (window.drawerSystem && window.drawerSystem.isOpen) {
        window.drawerSystem.close();

        // Return focus to filter trigger button
        if (this.elements.filterTrigger) {
          this.elements.filterTrigger.focus();
        }
      }
    }
  }

  /**
   * Handle drawer opened event
   * @param {CustomEvent} event - Drawer opened event
   */
  handleDrawerOpened(event) {
    // Update aria-expanded state
    if (this.elements.filterTrigger) {
      this.elements.filterTrigger.setAttribute('aria-expanded', 'true');
    }

    // Store the element that was focused before drawer opened
    this.previouslyFocusedElement = document.activeElement;

    // Focus first interactive element in drawer
    setTimeout(() => {
      const firstFocusable = this.getFirstFocusableElement();
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);

    // Announce drawer opening
    this.announceToScreenReader('Filter options opened');
  }

  /**
   * Handle drawer closed event
   * @param {CustomEvent} event - Drawer closed event
   */
  handleDrawerClosed(event) {
    // Update aria-expanded state
    if (this.elements.filterTrigger) {
      this.elements.filterTrigger.setAttribute('aria-expanded', 'false');
    }

    // Return focus to previously focused element
    if (this.previouslyFocusedElement && this.previouslyFocusedElement.focus) {
      this.previouslyFocusedElement.focus();
    }

    // Announce drawer closing
    this.announceToScreenReader('Filter options closed');
  }

  /**
   * Get first focusable element in filter drawer
   * @returns {HTMLElement|null} First focusable element
   */
  getFirstFocusableElement() {
    if (!this.elements.filterDrawerContent) return null;

    const focusableElements = DOMUtils.getFocusableElements(this.elements.filterDrawerContent);
    return focusableElements[0] || null;
  }

  /**
   * Set up keyboard navigation for filter options
   * @param {HTMLElement} container - Container element
   */
  setupKeyboardNavigation(container) {
    if (!container) return;

    EventUtils.delegate(container, '[role="button"], button, input', 'keydown', (event) => {
      EventUtils.handleKeyboardNavigation(event, {
        'Enter': (e) => {
          e.preventDefault();
          e.target.click();
        },
        ' ': (e) => {
          if (e.target.tagName === 'BUTTON') {
            e.preventDefault();
            e.target.click();
          }
        },
        'ArrowDown': (e) => {
          e.preventDefault();
          this.focusNextElement(e.target);
        },
        'ArrowUp': (e) => {
          e.preventDefault();
          this.focusPreviousElement(e.target);
        }
      });
    });
  }

  /**
   * Focus next focusable element
   * @param {HTMLElement} currentElement - Current focused element
   */
  focusNextElement(currentElement) {
    const focusableElements = this.getFocusableElementsInContainer();
    const currentIndex = Array.from(focusableElements).indexOf(currentElement);

    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
  }

  /**
   * Focus previous focusable element
   * @param {HTMLElement} currentElement - Current focused element
   */
  focusPreviousElement(currentElement) {
    const focusableElements = this.getFocusableElementsInContainer();
    const currentIndex = Array.from(focusableElements).indexOf(currentElement);

    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    }
  }

  /**
   * Get all focusable elements in filter container
   * @returns {NodeList} Focusable elements
   */
  getFocusableElementsInContainer() {
    if (!this.elements.filterDrawerContent) return [];
    return DOMUtils.getFocusableElements(this.elements.filterDrawerContent);
  }

  /**
   * Manage focus trap for modal/drawer
   * @param {HTMLElement} container - Container to trap focus in
   * @param {boolean} enable - Whether to enable focus trap
   */
  manageFocusTrap(container, enable) {
    if (!container) return;

    if (enable) {
      this.enableFocusTrap(container);
    } else {
      this.disableFocusTrap(container);
    }
  }

  /**
   * Enable focus trap
   * @param {HTMLElement} container - Container element
   */
  enableFocusTrap(container) {
    const focusableElements = DOMUtils.getFocusableElements(container);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement) return;

    const handleTabKey = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container._focusTrapHandler = handleTabKey;

    // Focus first element
    firstElement.focus();
  }

  /**
   * Disable focus trap
   * @param {HTMLElement} container - Container element
   */
  disableFocusTrap(container) {
    if (container._focusTrapHandler) {
      container.removeEventListener('keydown', container._focusTrapHandler);
      delete container._focusTrapHandler;
    }
  }

  /**
   * Update element labels for screen readers
   * @param {HTMLElement} element - Element to update
   * @param {string} label - New label
   */
  updateElementLabel(element, label) {
    if (!element) return;

    element.setAttribute('aria-label', label);

    // Also update title for additional context
    element.setAttribute('title', label);
  }

  /**
   * Set element as busy/loading for screen readers
   * @param {HTMLElement} element - Element to update
   * @param {boolean} busy - Whether element is busy
   */
  setElementBusy(element, busy) {
    if (!element) return;

    if (busy) {
      element.setAttribute('aria-busy', 'true');
      element.setAttribute('aria-live', 'polite');
    } else {
      element.removeAttribute('aria-busy');
      element.removeAttribute('aria-live');
    }
  }

  /**
   * Update pagination info for screen readers
   * @param {number} currentCount - Current visible count
   * @param {number} totalCount - Total count
   */
  updatePaginationAria(currentCount, totalCount) {
    if (this.elements.paginationInfo) {
      const text = `Showing ${currentCount} of ${totalCount} products`;
      this.elements.paginationInfo.setAttribute('aria-label', `Pagination information: ${text}`);
    }
  }

  /**
   * Announce filter results with appropriate urgency
   * @param {number} resultCount - Number of results
   * @param {number} totalCount - Total available
   */
  announceFilterResults(resultCount, totalCount) {
    let message;
    let urgency = 'polite';

    if (resultCount === 0) {
      message = 'No products found matching your filters';
      urgency = 'assertive'; // More urgent for empty results
    } else if (resultCount === totalCount) {
      message = `Showing all ${totalCount} products`;
    } else {
      message = `Showing ${resultCount} of ${totalCount} products`;
    }

    this.announceToScreenReader(message, urgency);
  }

  /**
   * Announce sort change
   * @param {string} sortLabel - Sort option label
   */
  announceSortChange(sortLabel) {
    this.announceToScreenReader(`Products sorted by ${sortLabel}`);
  }

  /**
   * Announce loading states
   * @param {string} operation - Operation being performed
   * @param {boolean} isLoading - Whether currently loading
   */
  announceLoadingState(operation, isLoading) {
    if (isLoading) {
      this.announceToScreenReader(`Loading ${operation}...`, 'assertive');
    } else {
      this.announceToScreenReader(`${operation} loaded`, 'polite');
    }
  }

  /**
   * Set up accessibility for dynamic content
   * @param {HTMLElement} container - Container with dynamic content
   */
  setupDynamicContentAccessibility(container) {
    if (!container) return;

    // Mark as live region for updates
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');

    // Add accessible labels
    if (!container.getAttribute('aria-label') && !container.getAttribute('aria-labelledby')) {
      container.setAttribute('aria-label', 'Product results');
    }
  }

  /**
   * Clean up accessibility features
   */
  destroy() {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleEscapeKey);
    document.removeEventListener('drawer:opened', this.handleDrawerOpened);
    document.removeEventListener('drawer:closed', this.handleDrawerClosed);

    // Clean up live region
    DOMUtils.safeRemove(this.liveRegion);

    // Clean up focus traps
    if (this.elements.filterDrawerContent) {
      this.disableFocusTrap(this.elements.filterDrawerContent);
    }
  }
}