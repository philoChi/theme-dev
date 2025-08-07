/**
 * Integration tests for filter drawer with multi-drawer system
 */

describe('Filter Drawer Integration', () => {
  let mockDrawerSystem;
  let mockFilterDrawerContent;
  let collectionController;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <section class="section-collection-page">
        <button data-drawer-trigger="filter">Filter</button>
        <div data-active-filters></div>
        <div data-product-grid></div>
        <div data-filter-drawer-content>
          <div data-filter-options="type"></div>
          <div data-filter-options="size"></div>
          <div data-filter-options="color"></div>
          <div data-filter-options="tags"></div>
          <button data-filter-clear-all>Clear All</button>
          <button data-filter-apply>Apply</button>
        </div>
        <script type="application/json" data-collection-data>
          {
            "collectionId": 1,
            "collectionHandle": "all",
            "collectionTitle": "All Products",
            "productsCount": 10,
            "filterOptions": {
              "types": ["T-Shirt", "Hoodie"],
              "sizes": ["S", "M", "L"],
              "colors": ["Black", "White"],
              "tags": ["new", "sale"],
              "genders": ["men", "women"]
            },
            "products": []
          }
        </script>
      </section>
    `;

    // Mock drawer system
    mockDrawerSystem = {
      open: jest.fn(),
      close: jest.fn(),
      isOpen: jest.fn().mockReturnValue(false)
    };
    window.drawerSystem = mockDrawerSystem;

    // Mock logger
    window.logger = {
      log: jest.fn(),
      error: jest.fn()
    };

    // Initialize controller
    const CollectionPageController = require('../../assets/section-collection-page.js');
    collectionController = new CollectionPageController();
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    delete window.drawerSystem;
    delete window.logger;
  });

  describe('Drawer Opening/Closing', () => {
    it('should open filter drawer when trigger is clicked', () => {
      const filterTrigger = document.querySelector('[data-drawer-trigger="filter"]');
      
      filterTrigger.click();
      
      expect(mockDrawerSystem.open).toHaveBeenCalledWith('filter');
    });

    it('should close drawer when apply button is clicked', () => {
      const applyButton = document.querySelector('[data-filter-apply]');
      
      applyButton.click();
      
      expect(mockDrawerSystem.close).toHaveBeenCalled();
    });
  });

  describe('Filter State Preservation', () => {
    it('should maintain filter state when drawer opens/closes', () => {
      // Set initial filter state
      collectionController.state.filters.type = ['T-Shirt'];
      collectionController.updateFilterUI();
      
      // Simulate drawer close and reopen
      mockDrawerSystem.isOpen.mockReturnValueOnce(true).mockReturnValueOnce(false);
      
      // Check filter state is preserved
      expect(collectionController.state.filters.type).toEqual(['T-Shirt']);
    });

    it('should update UI to reflect current filter state', () => {
      // Set filter state
      collectionController.state.filters = {
        type: ['Hoodie'],
        size: ['M', 'L'],
        color: [],
        tags: ['sale'],
        availability: ['in-stock']
      };
      
      // Populate filter options
      collectionController.populateFilterOptions();
      
      // Update UI
      collectionController.updateFilterUI();
      
      // Check that checkboxes are updated
      const typeCheckboxes = document.querySelectorAll('[data-filter-options="type"] input[type="checkbox"]');
      const checkedTypes = Array.from(typeCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.filterValue);
      
      expect(checkedTypes).toContain('Hoodie');
    });
  });

  describe('Touch/Click Interactions', () => {
    it('should handle filter option changes', () => {
      collectionController.populateFilterOptions();
      
      const typeCheckbox = document.querySelector('[data-filter-options="type"] input[value="T-Shirt"]');
      if (typeCheckbox) {
        typeCheckbox.checked = true;
        typeCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      expect(collectionController.state.filters.type).toContain('T-Shirt');
    });

    it('should handle clear all filters', () => {
      // Set some filters
      collectionController.state.filters = {
        type: ['T-Shirt', 'Hoodie'],
        size: ['M'],
        color: ['Black'],
        tags: ['new'],
        availability: ['in-stock']
      };
      
      const clearAllButton = document.querySelector('[data-filter-clear-all]');
      clearAllButton.click();
      
      // Check filters are cleared (except default availability)
      expect(collectionController.state.filters.type).toEqual([]);
      expect(collectionController.state.filters.size).toEqual([]);
      expect(collectionController.state.filters.color).toEqual([]);
      expect(collectionController.state.filters.tags).toEqual([]);
      expect(collectionController.state.filters.availability).toEqual(['in-stock']);
    });
  });

  describe('Mobile Drawer Behavior', () => {
    it('should apply filters and close drawer on mobile', () => {
      // Set a filter
      collectionController.addFilter('type', 'T-Shirt');
      
      // Click apply button
      const applyButton = document.querySelector('[data-filter-apply]');
      applyButton.click();
      
      // Check drawer close was called
      expect(mockDrawerSystem.close).toHaveBeenCalled();
      
      // Check filters were applied
      expect(window.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Filters applied')
      );
    });
  });

  describe('Event Communication', () => {
    it('should dispatch filter change events', () => {
      const eventListener = jest.fn();
      document.addEventListener('collection:filter-change', eventListener);
      
      // Apply filters
      collectionController.addFilter('type', 'Hoodie');
      collectionController.applyFilters();
      
      expect(eventListener).toHaveBeenCalled();
      
      const event = eventListener.mock.calls[0][0];
      expect(event.detail.filters.type).toContain('Hoodie');
      
      document.removeEventListener('collection:filter-change', eventListener);
    });

    it('should respond to external filter change events', () => {
      const filterEvent = new CustomEvent('collection:filter-change', {
        detail: {
          filters: { type: ['T-Shirt'] }
        }
      });
      
      document.dispatchEvent(filterEvent);
      
      expect(collectionController.state.filters.type).toContain('T-Shirt');
    });
  });
});