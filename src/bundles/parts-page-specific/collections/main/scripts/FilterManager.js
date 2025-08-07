/**
 * Optimized Filter Manager for Shopify native filtering with Search & Discovery app support
 * Handles efficient filter UI interactions and navigation
 */

export class FilterManager {
  static instance = null;
  
  constructor(errorHandler) {
    // Implement singleton pattern to prevent multiple instances
    if (FilterManager.instance) {
      if (window.logger) {
        window.logger.log('FilterManager singleton already exists, returning existing instance');
      }
      return FilterManager.instance;
    }
    
    this.errorHandler = errorHandler;
    this.elements = {};
    this.activeFilters = new Map(); // Currently applied filters from URL - now supports arrays
    this.pendingFilters = new Map(); // Filters selected but not yet applied - now supports arrays
    this.isApplying = false; // Prevent multiple simultaneous applications
    this.listenersAttached = false; // Prevent duplicate event listeners
    
    // Bind methods
    this.handleFilterToggle = this.handleFilterToggle.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleApplyClick = this.handleApplyClick.bind(this);
    this.handleFilterChangeEvent = this.handleFilterChangeEvent.bind(this);
    this.handleFilterToggleEvent = this.handleFilterToggleEvent.bind(this);
    
    // Set singleton instance
    FilterManager.instance = this;
    
    if (window.logger) {
      window.logger.log('FilterManager singleton instance created');
    }
  }

  /**
   * Initialize filter manager
   * @param {HTMLElement} section - Section element
   * @param {Object} elements - Cached DOM elements
   */
  initialize(section, elements) {
    this.section = section;
    this.elements = elements;
    this.attachEventListeners();
    
    // Initialize from URL parameters first
    this.initializeFromURL();
    
    // Initialize UI state to match current filters
    this.initializeFilterState();
    
    if (window.logger) {
      window.logger.log('Server-rendered Shopify filters detected and initialized');
    }
  }

  /**
   * Attach event listeners for Shopify native filters
   */
  attachEventListeners() {
    // Prevent duplicate event listeners
    if (this.listenersAttached) {
      if (window.logger) {
        window.logger.log('Event listeners already attached, skipping duplicate registration');
      }
      return;
    }

    // Handle filter toggle buttons (boolean filters like availability)
    document.addEventListener('click', this.handleFilterToggleEvent);

    // Handle checkbox/radio changes in filter drawer using document delegation
    document.addEventListener('change', this.handleFilterChangeEvent);

    // Handle apply filters button with debouncing
    document.addEventListener('click', this.handleApplyClick);

    // Handle drawer close events to reset pending filters
    document.addEventListener('drawer:closing', this.handleDrawerClosing.bind(this));

    this.listenersAttached = true;
    
    if (window.logger) {
      window.logger.log('Filter event listeners attached successfully');
    }
  }

  /**
   * Handle filter toggle click events with validation
   */
  handleFilterToggleEvent(e) {
    const filterToggle = e.target.closest('[data-filter-type="boolean"]');
    if (filterToggle) {
      // Don't prevent default for checkbox inputs - let them handle their own state
      if (filterToggle.type === 'checkbox') {
        // Handle checkbox toggle after the state change
        setTimeout(() => this.handleFilterToggle(filterToggle), 0);
      } else {
        e.preventDefault();
        this.handleFilterToggle(filterToggle);
      }
    }
  }

  /**
   * Handle filter change events with validation
   */
  handleFilterChangeEvent(e) {
    if (e.target.matches('[data-shopify-param]')) {
      this.handleFilterChange(e);
    }
  }

  /**
   * Handle apply button clicks with debouncing and validation
   */
  handleApplyClick(e) {
    const applyButton = e.target.closest('[data-apply-filters]');
    if (applyButton) {
      e.preventDefault();
      e.stopImmediatePropagation(); // Prevent other handlers from firing
      
      // Debounce rapid clicks
      if (this.isApplying) {
        if (window.logger) {
          window.logger.log('Filter application already in progress, ignoring duplicate click');
        }
        return;
      }
      
      this.applyFilters();
    }
  }

  /**
   * Handle drawer closing event to reset pending filters
   */
  handleDrawerClosing(e) {
    // Check if this is the filter drawer closing
    if (e.detail && e.detail.drawerId === 'multi-drawer') {
      // Check if there are pending filters that weren't applied
      const hasPendingChanges = this.checkForPendingChanges();
      
      if (window.logger) {
        window.logger.log('Drawer closing - checking for pending changes:', hasPendingChanges);
        window.logger.log('Active filters on close:', Object.fromEntries(this.activeFilters));
        window.logger.log('Pending filters on close:', Object.fromEntries(this.pendingFilters));
      }
      
      if (hasPendingChanges && window.showNotification) {
        // Show notification that filters weren't applied
        window.showNotification('Filters not applied. Press "Apply Filters" to save changes.', 'info');
      }
      
      // Reset pending filters to match active filters from URL
      // This effectively cancels any pending changes that weren't applied
      this.resetPendingFilters();
      
      if (window.logger) {
        window.logger.log('Filter drawer closing: reset pending filters to match URL');
      }
    }
  }

  /**
   * Check if there are pending changes that differ from active filters
   */
  checkForPendingChanges() {
    if (window.logger) {
      window.logger.log('checkForPendingChanges - Active:', Object.fromEntries(this.activeFilters));
      window.logger.log('checkForPendingChanges - Pending:', Object.fromEntries(this.pendingFilters));
    }
    
    // First, check for any parameters in active filters that aren't in pending filters
    for (const [param] of this.activeFilters) {
      if (!this.pendingFilters.has(param)) {
        if (window.logger) {
          window.logger.log(`Parameter ${param} in active but not in pending - changes detected`);
        }
        return true;
      }
    }
    
    // Then check each pending filter against active filters
    for (const [param, pendingValue] of this.pendingFilters) {
      const activeValue = this.activeFilters.get(param);
      
      // If parameter doesn't exist in active filters, there are changes
      if (!this.activeFilters.has(param)) {
        if (window.logger) {
          window.logger.log(`Parameter ${param} in pending but not in active - changes detected`);
        }
        return true;
      }
      
      // Normalize values to arrays for comparison
      const pendingArray = Array.isArray(pendingValue) ? pendingValue : [pendingValue];
      const activeArray = Array.isArray(activeValue) ? activeValue : [activeValue];
      
      // Sort arrays for consistent comparison
      const sortedPending = [...pendingArray].sort();
      const sortedActive = [...activeArray].sort();
      
      if (window.logger) {
        window.logger.log(`Comparing ${param}:`, {
          pending: sortedPending,
          active: sortedActive
        });
      }
      
      // Compare sorted arrays
      if (sortedPending.length !== sortedActive.length || 
          !sortedPending.every((v, i) => v === sortedActive[i])) {
        if (window.logger) {
          window.logger.log(`Values differ for ${param} - changes detected`);
        }
        return true;
      }
    }
    
    if (window.logger) {
      window.logger.log('No changes detected');
    }
    return false;
  }

  /**
   * Reset pending filters to match currently active filters from URL
   */
  resetPendingFilters() {
    if (window.logger) {
      window.logger.log('Before reset - Active filters:', Object.fromEntries(this.activeFilters));
      window.logger.log('Before reset - Pending filters:', Object.fromEntries(this.pendingFilters));
    }
    
    // Clear both maps before re-initializing from URL
    this.activeFilters.clear();
    this.pendingFilters.clear();
    
    // Re-initialize both from URL to ensure they match actual URL state
    this.initializeFromURL();
    
    if (window.logger) {
      window.logger.log('After URL re-init - Active filters:', Object.fromEntries(this.activeFilters));
      window.logger.log('After URL re-init - Pending filters:', Object.fromEntries(this.pendingFilters));
    }
    
    // Update UI to reflect the reset state
    this.updateFilterUI();
    this.syncCheckboxStates();
    this.closeInactiveDropdowns();
    
    if (window.logger) {
      window.logger.log('Pending filters reset to active URL filters');
    }
  }

  /**
   * Close dropdowns that have no checked checkboxes after reset
   */
  closeInactiveDropdowns() {
    // Find all filter dropdowns in the drawer
    const filterDropdowns = document.querySelectorAll('[data-filter-drawer-content] dropdown-feature');
    
    filterDropdowns.forEach(dropdown => {
      // Get the panel controlled by this dropdown
      const trigger = dropdown.querySelector('[data-dropdown-trigger]');
      if (!trigger) return;
      
      const panelId = trigger.getAttribute('aria-controls');
      if (!panelId) return;
      
      const panel = document.getElementById(panelId);
      if (!panel) return;
      
      // Check if this dropdown panel has any checked checkboxes
      const checkedInputs = panel.querySelectorAll('input[type="checkbox"]:checked');
      
      // If no checked checkboxes and dropdown is currently open, close it
      if (checkedInputs.length === 0 && this.isDropdownOpen(dropdown)) {
        this.closeDropdown(dropdown);
        
        if (window.logger) {
          window.logger.log(`Closed dropdown with no checked items: ${panelId}`);
        }
      }
    });
  }


  /**
   * Check if a dropdown is currently open
   */
  isDropdownOpen(dropdown) {
    const trigger = dropdown.querySelector('[data-dropdown-trigger]');
    return trigger && trigger.getAttribute('aria-expanded') === 'true';
  }

  /**
   * Close a dropdown programmatically
   */
  closeDropdown(dropdown) {
    // Call the close method if available
    if (dropdown.close && typeof dropdown.close === 'function') {
      dropdown.close();
    } else {
      // Fallback: manually trigger the close behavior
      const trigger = dropdown.querySelector('[data-dropdown-trigger]');
      if (trigger && trigger.getAttribute('aria-expanded') === 'true') {
        trigger.click();
      }
    }
  }

  /**
   * Sync checkbox states with pending filters
   */
  syncCheckboxStates() {
    // Reset all filter checkboxes first
    const allFilterInputs = document.querySelectorAll('[data-shopify-param]');
    allFilterInputs.forEach(input => {
      if (input.type === 'checkbox') {
        input.checked = false;
      }
    });
    
    // Set checkboxes based on pending filters (which now match active filters)
    for (const [param, value] of this.pendingFilters) {
      if (Array.isArray(value)) {
        // Handle multiple values - check each value in the array
        value.forEach(singleValue => {
          const checkbox = document.querySelector(`[data-shopify-param="${param}"][value="${singleValue}"]`);
          if (checkbox) {
            checkbox.checked = true;
            if (window.logger) {
              window.logger.log(`Checked multiple value: ${param} = ${singleValue}`);
            }
          }
        });
      } else {
        // Handle single value
        const checkbox = document.querySelector(`[data-shopify-param="${param}"][value="${value}"]`);
        if (checkbox) {
          checkbox.checked = true;
          if (window.logger) {
            window.logger.log(`Checked single value: ${param} = ${value}`);
          }
        }
        
        // Also handle boolean toggle switches
        const toggleSwitch = document.querySelector(`[data-filter-type="boolean"][data-shopify-param="${param}"]`);
        if (toggleSwitch && toggleSwitch.type === 'checkbox') {
          toggleSwitch.checked = true;
        }
      }
    }
    
    if (window.logger) {
      window.logger.log('Checkbox states synced with pending filters:', Object.fromEntries(this.pendingFilters));
    }
  }


  /**
   * Handle filter toggle button click
   * @param {HTMLElement} toggle - Toggle button or checkbox element
   */
  handleFilterToggle(toggle) {
    if (toggle.disabled) return;

    const param = toggle.dataset.shopifyParam;
    const value = toggle.dataset.filterValue;
    
    // Handle different toggle types
    let isActive;
    if (toggle.type === 'checkbox') {
      isActive = toggle.checked;
    } else {
      isActive = toggle.classList.contains('filter-toggle--active');
    }

    try {
      // Special handling for availability filter - use pending filters instead of immediate application
      if (param === 'filter.v.availability') {
        if (isActive) {
          // Add to pending filters - Shopify expects "on" value for availability
          this.pendingFilters.set(param, 'on');
        } else {
          // Remove from pending filters
          this.pendingFilters.delete(param);
        }
        
        // Update UI to show pending changes
        this.updateFilterUI();
      } else {
        // For other toggle filters, apply immediately (existing behavior)
        if (isActive) {
          this.activeFilters.set(param, value);
        } else {
          this.activeFilters.delete(param);
        }
        
        // Apply filters immediately for non-availability toggle buttons
        this.applyFilters();
      }
    } catch (error) {
      this.errorHandler.handleError('Filter toggle failed', error);
    }
  }

  /**
   * Handle filter input changes (checkboxes, radios) - deferred application
   * @param {Event} e - Change event
   */
  handleFilterChange(e) {
    const input = e.target;
    if (!input.matches('[data-shopify-param]')) return;

    const param = input.dataset.shopifyParam;
    const value = input.value;

    try {
      // Get current values for this parameter (supporting multiple values)
      let currentValues = this.pendingFilters.get(param) || [];
      if (!Array.isArray(currentValues)) {
        currentValues = currentValues ? [currentValues] : [];
      }

      // Create a deep copy to avoid reference issues
      currentValues = [...currentValues];

      if (input.checked) {
        // Add to pending filters array if not already present
        if (!currentValues.includes(value)) {
          currentValues.push(value);
        }
      } else {
        // Remove from pending filters array
        currentValues = currentValues.filter(v => v !== value);
      }
      
      // Update pending filters
      if (currentValues.length > 0) {
        this.pendingFilters.set(param, currentValues);
      } else {
        this.pendingFilters.delete(param);
      }
      
      // Update UI state for visual feedback
      this.updateFilterUI();
      
      if (window.logger) {
        window.logger.log('Filter selection pending:', { param, value, checked: input.checked, currentValues: [...currentValues] });
        window.logger.log('Updated pending filters:', Object.fromEntries(this.pendingFilters));
      }
    } catch (error) {
      this.errorHandler.handleError('Filter change failed', error);
    }
  }

  /**
   * Navigate to collection page with filter applied (deprecated - use applyFilters instead)
   * @param {string} param - Filter parameter
   * @param {string|null} value - Filter value (null to remove)
   * @deprecated Use applyFilters() method instead
   */
  navigateWithFilter(param, value) {
    if (value) {
      this.activeFilters.set(param, value);
    } else {
      this.activeFilters.delete(param);
    }
    
    this.applyFilters();
  }


  /**
   * Apply pending filters by navigating to new URL - deferred application
   */
  applyFilters() {
    // Set applying state to prevent race conditions
    this.isApplying = true;
    
    try {
      const url = new URL(window.location);
      
      // Clear existing filter parameters (including array notation)
      const keysToDelete = [];
      for (const [key] of url.searchParams) {
        if (key.startsWith('filter.')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => url.searchParams.delete(key));
      
      // Add all pending filters (from user selections)
      for (const [param, value] of this.pendingFilters) {
        if (param && value) {
          if (Array.isArray(value)) {
            // Handle multiple values for the same parameter
            // Shopify Search & Discovery expects multiple values as repeated parameters
            if (value.length > 0) {
              value.forEach(v => {
                url.searchParams.append(param, v);
              });
            }
          } else {
            // Single value
            url.searchParams.set(param, value);
          }
        }
      }
      
      // Remove page parameter when filtering
      url.searchParams.delete('page');
      
      // Validate and perform navigation
      const finalUrl = url.toString();
      if (finalUrl !== window.location.href) {
        if (window.logger) {
          window.logger.log('Applying pending filters:', Object.fromEntries(this.pendingFilters));
        }
        window.location.href = finalUrl;
      } else {
        this.isApplying = false;
      }
      
    } catch (error) {
      this.isApplying = false;
      this.errorHandler.handleError('Filter application failed', error);
    }
  }


  /**
   * Initialize from URL parameters (for page load)
   * @returns {Object} Current filter state
   */
  initializeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const filters = {};
    const hasUrlParams = urlParams.toString().length > 0;
    const filterParams = new Map(); // Track repeated parameters

    // Extract filter parameters and handle repeated parameters
    for (const [key, value] of urlParams) {
      if (key.startsWith('filter.')) {
        // Check if this parameter already exists (repeated parameter)
        if (filterParams.has(key)) {
          // Convert to array if not already
          const existingValue = filterParams.get(key);
          if (Array.isArray(existingValue)) {
            existingValue.push(value);
          } else {
            filterParams.set(key, [existingValue, value]);
          }
        } else {
          // Handle comma-separated values for backward compatibility
          const values = value.includes(',') ? value.split(',') : [value];
          filterParams.set(key, values.length > 1 ? values : value);
        }
      }
    }

    // Process all filter parameters
    for (const [key, value] of filterParams) {
      filters[key] = value;
      this.activeFilters.set(key, value);
      this.pendingFilters.set(key, value);
    }

    if (window.logger) {
      window.logger.log('Initialized from URL:', {
        filters,
        sort: urlParams.get('sort_by') || 'manual',
        hasUrlParams
      });
    }

    return { filters, hasUrlParams };
  }

  /**
   * Get current active filters for display
   * @returns {Array} Array of active filter objects
   */
  getActiveFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const activeFilters = [];
    
    for (const [key, value] of urlParams) {
      if (key.startsWith('filter.')) {
        activeFilters.push({
          param: key,
          value: value,
          label: this.getFilterLabel(key, value)
        });
      }
    }
    
    return activeFilters;
  }

  /**
   * Get human-readable label for filter
   * @param {string} param - Filter parameter
   * @param {string} value - Filter value
   * @returns {string} Human-readable label
   */
  getFilterLabel(param, value) {
    // Try to find the filter element to get its label
    const filterInput = document.querySelector(`[data-shopify-param="${param}"][value="${value}"]`);
    if (filterInput) {
      const label = filterInput.closest('label');
      if (label) {
        const labelText = label.querySelector('.filter-option__label');
        return labelText ? labelText.textContent.trim() : value;
      }
    }
    
    // Fallback to parameter-based label
    const filterType = param.replace('filter.v.option.', '').replace('filter.v.', '');
    return `${filterType}: ${value}`;
  }

  /**
   * Initialize filter state to match current URL and checkboxes
   */
  initializeFilterState() {
    // Sync checkbox states with URL parameters
    for (const [param, value] of this.activeFilters) {
      if (Array.isArray(value)) {
        // Handle multiple values
        value.forEach(singleValue => {
          const checkbox = document.querySelector(`[data-shopify-param="${param}"][value="${singleValue}"]`);
          if (checkbox) {
            checkbox.checked = true;
          }
        });
      } else {
        // Handle single value
        const checkbox = document.querySelector(`[data-shopify-param="${param}"][value="${value}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
        
        // Also handle boolean toggle switches
        const toggleSwitch = document.querySelector(`[data-filter-type="boolean"][data-shopify-param="${param}"]`);
        if (toggleSwitch && toggleSwitch.type === 'checkbox') {
          toggleSwitch.checked = true;
        }
      }
    }
    
    // Handle boolean switches that need to be initialized from URL
    const booleanSwitches = document.querySelectorAll('[data-filter-type="boolean"]');
    booleanSwitches.forEach(switchElement => {
      const param = switchElement.dataset.shopifyParam;
      const value = switchElement.dataset.filterValue;
      
      // Check if this filter is active in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlValue = urlParams.get(param);
      
      // Handle different possible values - check if the parameter exists in URL
      if (urlValue !== null && urlValue !== '') {
        switchElement.checked = true;
        this.activeFilters.set(param, urlValue);
        this.pendingFilters.set(param, urlValue);
      } else {
        switchElement.checked = false;
      }
    });
    
    // Update UI to reflect current state
    this.updateFilterUI();
    
    // Auto-expand dropdowns with active filters
    this.autoExpandActiveFilters();
  }

  /**
   * Auto-expand dropdowns that contain active filters
   */
  autoExpandActiveFilters() {
    // Get all filter dropdowns
    const dropdownTriggers = document.querySelectorAll('[data-dropdown-trigger]');
    
    dropdownTriggers.forEach(trigger => {
      const panelId = trigger.getAttribute('aria-controls');
      if (!panelId || !panelId.startsWith('filter-')) return;
      
      const panel = document.getElementById(panelId);
      if (!panel) return;
      
      // Check if this dropdown contains any checked filter options
      const checkedInputs = panel.querySelectorAll('input[data-shopify-param]:checked');
      
      if (checkedInputs.length > 0) {
        // Expand this dropdown
        trigger.setAttribute('aria-expanded', 'true');
        trigger.classList.add('is-open');
        panel.removeAttribute('hidden');
        panel.classList.add('dropdown-feature__panel--expanded');
        
        if (window.logger) {
          window.logger.log(`Auto-expanded dropdown with ${checkedInputs.length} active filters:`, panelId);
        }
      }
    });
  }

  /**
   * Update filter UI to provide visual feedback for pending selections
   */
  updateFilterUI() {
    // Update apply button state based on pending filters
    const applyButton = document.querySelector('[data-apply-filters]');
    if (applyButton) {
      const hasPendingChanges = this.pendingFilters.size > 0;
      if (hasPendingChanges) {
        applyButton.classList.add('has-pending-filters');
        applyButton.disabled = false;
      } else {
        applyButton.classList.remove('has-pending-filters');
      }
    }

    // Calculate total pending filter count (including multiple values)
    let totalPendingCount = 0;
    for (const [param, value] of this.pendingFilters) {
      if (Array.isArray(value)) {
        totalPendingCount += value.length;
      } else {
        totalPendingCount += 1;
      }
    }

    // Update filter count display if available
    const filterCountBadge = document.querySelector('[data-pending-filter-count]');
    if (filterCountBadge) {
      const countElement = filterCountBadge.querySelector('.count');
      if (countElement) {
        countElement.textContent = totalPendingCount;
      }
      filterCountBadge.style.display = totalPendingCount > 0 ? 'inline' : 'none';
    }
  }

  /**
   * Remove specific filter
   * @param {string} param - Filter parameter to remove
   */
  removeFilter(param) {
    this.pendingFilters.delete(param);
    this.applyFilters();
  }

  /**
   * Clear all active filters and navigate to clean URL
   */
  clearAllFilters() {
    try {
      const url = new URL(window.location);
      
      // Remove all filter parameters
      const keysToDelete = [];
      for (const [key] of url.searchParams) {
        if (key.startsWith('filter.')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => url.searchParams.delete(key));
      
      // Remove page parameter as well
      url.searchParams.delete('page');
      
      // Clear internal state
      this.activeFilters.clear();
      this.pendingFilters.clear();
      
      // Navigate to clean URL
      const finalUrl = url.toString();
      if (finalUrl !== window.location.href) {
        if (window.logger) {
          window.logger.log('Clearing all filters, navigating to:', finalUrl);
        }
        window.location.href = finalUrl;
      }
    } catch (error) {
      this.errorHandler.handleError('Clear all filters failed', error);
    }
  }

  /**
   * Get formatted active filters for display in the active filters component
   * @returns {Array} Array of filter objects with display information
   */
  getActiveFiltersForDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    const activeFilters = [];
    const processedParams = new Set();
    
    for (const [key, value] of urlParams) {
      if (key.startsWith('filter.') && !processedParams.has(key)) {
        // Get all values for this parameter (in case of multiple)
        const allValues = urlParams.getAll(key);
        processedParams.add(key);
        
        allValues.forEach(filterValue => {
          activeFilters.push({
            param: key,
            value: filterValue,
            label: this.getFilterLabel(key, filterValue),
            removeUrl: this.getRemoveFilterUrl(key, filterValue),
            displayType: this.getFilterDisplayType(key, filterValue)
          });
        });
      }
    }
    
    return activeFilters;
  }

  /**
   * Get URL for removing a specific filter value
   * @param {string} param - Filter parameter
   * @param {string} value - Filter value to remove
   * @returns {string} URL with the filter value removed
   */
  getRemoveFilterUrl(param, value) {
    const url = new URL(window.location);
    const allValues = url.searchParams.getAll(param);
    
    // Remove all instances of this parameter
    url.searchParams.delete(param);
    
    // Add back all values except the one we're removing
    allValues
      .filter(v => v !== value)
      .forEach(v => url.searchParams.append(param, v));
    
    // Remove page parameter when filtering
    url.searchParams.delete('page');
    
    return url.toString();
  }

  /**
   * Get display type for filter (used for styling)
   * @param {string} param - Filter parameter
   * @param {string} value - Filter value
   * @returns {string} Display type (color, price, etc.)
   */
  getFilterDisplayType(param, value) {
    if (param.includes('color') || param.includes('colour')) {
      return 'color';
    }
    if (param.includes('price')) {
      return 'price';
    }
    if (param.includes('vendor')) {
      return 'vendor';
    }
    if (param.includes('type')) {
      return 'type';
    }
    return 'default';
  }

  /**
   * Update active filters display in the UI
   */
  updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.querySelector('[data-active-filters]');
    if (!activeFiltersContainer) return;

    const activeFilters = this.getActiveFiltersForDisplay();
    
    if (activeFilters.length === 0) {
      activeFiltersContainer.style.display = 'none';
      return;
    }

    activeFiltersContainer.style.display = 'block';
    
    // Update filter count
    const countElement = activeFiltersContainer.querySelector('.active-filters__count');
    if (countElement) {
      countElement.textContent = activeFilters.length;
    }

    // Show notification if filters were applied
    if (window.showNotification && activeFilters.length > 0) {
      window.showNotification(`${activeFilters.length} filter${activeFilters.length > 1 ? 's' : ''} applied`, 'success');
    }
  }

  /**
   * Clean up resources and remove event listeners
   */
  destroy() {
    // Remove event listeners to prevent memory leaks
    if (this.listenersAttached) {
      document.removeEventListener('click', this.handleFilterToggleEvent);
      document.removeEventListener('change', this.handleFilterChangeEvent);
      document.removeEventListener('click', this.handleApplyClick);
      document.removeEventListener('drawer:closing', this.handleDrawerClosing.bind(this));
      this.listenersAttached = false;
    }
    
    // Clear state
    this.activeFilters.clear();
    this.pendingFilters.clear();
    this.isApplying = false;
    
    // Clear singleton instance
    FilterManager.instance = null;
    
    if (window.logger) {
      window.logger.log('FilterManager destroyed and cleaned up');
    }
  }
  
  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Debounce wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Static method to get or create singleton instance
   */
  static getInstance(errorHandler) {
    if (!FilterManager.instance) {
      new FilterManager(errorHandler);
    }
    return FilterManager.instance;
  }
}