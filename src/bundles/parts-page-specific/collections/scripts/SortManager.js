/**
 * Simplified Sort Manager for Shopify native sorting
 * Handles dropdown UI and navigation
 */

export class SortManager {
  constructor(accessibilityManager) {
    this.accessibilityManager = accessibilityManager;
    this.elements = {};
    
    // Bind methods
    this.handleDropdownToggle = this.handleDropdownToggle.bind(this);
    this.handleSortSelection = this.handleSortSelection.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * Initialize sort manager
   * @param {HTMLElement} section - Section element
   * @param {Object} elements - Cached DOM elements
   */
  initialize(section, elements) {
    this.section = section;
    this.elements = elements;
    this.attachEventListeners();
    this.setupDropdown();
    this.updateSelectedFromURL();
  }

  /**
   * Setup dropdown elements
   */
  setupDropdown() {
    if (!this.elements.sortSelect) return;

    // Find dropdown components
    const container = this.elements.sortSelect.closest('.collection-page__sort-container');
    if (container) {
      this.dropdownMenu = container.querySelector('[data-sort-dropdown-menu]');
      this.dropdownOptions = container.querySelectorAll('.collection-page__sort-option');
      
      // Setup option click handlers
      this.dropdownOptions.forEach(option => {
        option.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleSortSelection(option);
        });
      });
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('click', this.handleDropdownToggle);
      this.elements.sortSelect.addEventListener('keydown', this.handleKeydown);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.dropdownMenu && !e.target.closest('.collection-page__sort-container')) {
        this.closeDropdown();
      }
    });
  }

  /**
   * Handle dropdown toggle
   * @param {Event} e - Click event
   */
  handleDropdownToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (this.dropdownMenu) {
      const isOpen = this.dropdownMenu.classList.contains('is-open');
      if (isOpen) {
        this.closeDropdown();
      } else {
        this.openDropdown();
      }
    }
  }

  /**
   * Handle sort option selection
   * @param {HTMLElement} option - Selected option element
   */
  handleSortSelection(option) {
    const sortValue = option.dataset.sortValue;
    if (sortValue) {
      this.updateSelectedOption(sortValue);
      this.navigateWithSort(sortValue);
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleDropdownToggle(e);
    } else if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }

  /**
   * Open dropdown
   */
  openDropdown() {
    if (this.dropdownMenu) {
      this.dropdownMenu.classList.add('is-open');
      this.elements.sortSelect.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    if (this.dropdownMenu) {
      this.dropdownMenu.classList.remove('is-open');
      this.elements.sortSelect.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Navigate to collection page with sort applied
   * @param {string} sortValue - Sort value
   */
  navigateWithSort(sortValue) {
    const url = new URL(window.location);
    
    if (sortValue && sortValue !== 'manual') {
      url.searchParams.set('sort_by', sortValue);
    } else {
      url.searchParams.delete('sort_by');
    }
    
    // Remove page parameter when sorting
    url.searchParams.delete('page');
    
    if (window.logger) {
      window.logger.log('Sort changed to:', sortValue);
    }
    
    window.location.href = url.toString();
  }

  /**
   * Update selected option from URL parameter
   */
  updateSelectedFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentSort = urlParams.get('sort_by') || 'manual';
    this.updateSelectedOption(currentSort);
  }

  /**
   * Update dropdown display and selected state
   * @param {string} sortValue - Selected sort value
   */
  updateSelectedOption(sortValue) {
    if (!this.elements.sortSelect) return;

    // Find the display element
    const displayElement = this.elements.sortSelect.querySelector('.collection-page__sort-display');
    if (!displayElement) return;

    // Find the selected option
    const selectedOption = this.section.querySelector(`[data-sort-value="${sortValue}"]`);
    if (selectedOption) {
      // Update display text
      displayElement.textContent = selectedOption.textContent.trim();
      
      // Update aria-selected attributes
      this.dropdownOptions?.forEach(option => {
        const isSelected = option.dataset.sortValue === sortValue;
        option.setAttribute('aria-selected', isSelected.toString());
      });
      
      if (window.logger) {
        window.logger.log('Sort dropdown updated to:', sortValue);
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.closeDropdown();
  }
}