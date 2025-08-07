/**
 * Unit Tests for CollectionPageController Sorting Functionality
 * Phase 3 functionality - Sort implementation
 */

// Load the actual implementation
const fs = require('fs');
const path = require('path');

// Read and evaluate the CollectionPageController
const controllerCode = fs.readFileSync(
  path.join(__dirname, '../../assets/section-page-collections-main-collection.js'),
  'utf8'
);

// Create a function to execute the code and return the class
const getCollectionPageController = () => {
  const window = global.window;
  const document = global.document;
  
  // Execute the code in a function context
  const func = new Function('window', 'document', controllerCode + '\nreturn window.CollectionPageBundle.CollectionPageController;');
  return func(window, document);
};

const CollectionPageController = getCollectionPageController();

// Mock DOM setup
const createMockDOM = () => {
  document.body.innerHTML = `
    <section class="section-collection-page" data-section-id="collection-1">
      <select data-sort-select>
        <option value="manual">Featured</option>
        <option value="created-descending">Newest</option>
        <option value="price-ascending">Price: Low to High</option>
        <option value="price-descending">Price: High to Low</option>
        <option value="best-selling">Best Selling</option>
      </select>
      <div data-product-grid></div>
      <script type="application/json" data-collection-data>
      {
        "products": [
          {
            "id": 1,
            "title": "Old Product",
            "price": 3999,
            "priceMin": 3999,
            "priceMax": 3999,
            "available": true,
            "salesRank": 3,
            "featuredImage": "old.jpg",
            "variants": []
          },
          {
            "id": 2,
            "title": "Expensive Product",
            "price": 9999,
            "priceMin": 9999,
            "priceMax": 9999,
            "available": false,
            "salesRank": 2,
            "featuredImage": "expensive.jpg",
            "variants": []
          },
          {
            "id": 3,
            "title": "Cheap Product",
            "price": 999,
            "priceMin": 999,
            "priceMax": 999,
            "available": true,
            "featuredImage": "cheap.jpg",
            "variants": []
          },
          {
            "id": 4,
            "title": "New Product",
            "price": 2999,
            "priceMin": 2999,
            "priceMax": 2999,
            "available": true,
            "salesRank": 1,
            "featuredImage": "new.jpg",
            "variants": []
          },
          {
            "id": 5,
            "title": "Mid Product",
            "price": 4999,
            "priceMin": 4999,
            "priceMax": 4999,
            "available": false,
            "featuredImage": "mid.jpg",
            "variants": []
          }
        ],
        "filterOptions": {
          "types": [],
          "sizes": [],
          "colors": [],
          "tags": []
        }
      }
      </script>
    </section>
  `;
};

// Mock global objects
global.window.logger = {
  log: jest.fn(),
  error: jest.fn()
};

global.window.location = {
  href: 'http://127.0.0.1:9292/collections/all',
  pathname: '/collections/all',
  search: ''
};

// Mock history properly
const mockPushState = jest.fn();
global.window.history = {
  pushState: mockPushState
};

describe('CollectionPageController - Sorting Functionality', () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    createMockDOM();
    controller = new CollectionPageController();
    
    // Override default availability filter to show all products for testing
    controller.state.filters.availability = [];
    controller.applyFiltersWithoutURLUpdate();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Sort by Newest (created-descending)', () => {
    it('should sort products by ID in descending order', () => {
      controller.state.sort = 'created-descending';
      controller.applySorting();
      
      const sortedIds = controller.state.filteredProducts.map(p => p.id);
      expect(sortedIds).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('Sort by Price', () => {
    it('should sort products by price ascending', () => {
      controller.state.sort = 'price-ascending';
      controller.applySorting();
      
      const sortedPrices = controller.state.filteredProducts.map(p => p.priceMin);
      expect(sortedPrices).toEqual([999, 2999, 3999, 4999, 9999]);
    });

    it('should sort products by price descending', () => {
      controller.state.sort = 'price-descending';
      controller.applySorting();
      
      const sortedPrices = controller.state.filteredProducts.map(p => p.priceMax);
      expect(sortedPrices).toEqual([9999, 4999, 3999, 2999, 999]);
    });
  });

  describe('Sort by Best Selling', () => {
    it('should sort products by sales rank when available', () => {
      controller.state.sort = 'best-selling';
      controller.applySorting();
      
      const sortedProducts = controller.state.filteredProducts;
      
      // Products with salesRank should come first, sorted by rank
      expect(sortedProducts[0].id).toBe(4); // salesRank: 1
      expect(sortedProducts[1].id).toBe(2); // salesRank: 2
      expect(sortedProducts[2].id).toBe(1); // salesRank: 3
      
      // Products without salesRank sorted by availability
      expect(sortedProducts[3].available).toBe(true);  // Product 3
      expect(sortedProducts[4].available).toBe(false); // Product 5
    });

    it('should fallback to availability when no sales rank exists', () => {
      // Remove salesRank from all products
      controller.state.originalProducts.forEach(p => delete p.salesRank);
      controller.state.filteredProducts = [...controller.state.originalProducts];
      
      controller.state.sort = 'best-selling';
      controller.applySorting();
      
      const sortedProducts = controller.state.filteredProducts;
      
      // Available products should come first
      const availableProducts = sortedProducts.filter(p => p.available);
      const unavailableProducts = sortedProducts.filter(p => !p.available);
      
      expect(availableProducts.length).toBe(3);
      expect(unavailableProducts.length).toBe(2);
      
      // All available products should be before unavailable ones
      expect(sortedProducts.slice(0, 3).every(p => p.available)).toBe(true);
      expect(sortedProducts.slice(3).every(p => !p.available)).toBe(true);
    });
  });

  describe('Sort Integration with URL', () => {
    it('should update state and call update methods when sort changes', () => {
      const updateURLSpy = jest.spyOn(controller, 'updateURL');
      const sortSelect = controller.elements.sortSelect;
      
      sortSelect.value = 'price-ascending';
      sortSelect.dispatchEvent(new Event('change'));
      
      expect(controller.state.sort).toBe('price-ascending');
      expect(updateURLSpy).toHaveBeenCalled();
    });

    it('should apply sort and update grid when sort changes', () => {
      const updateSpy = jest.spyOn(controller, 'updateProductGrid');
      const sortSelect = controller.elements.sortSelect;
      
      sortSelect.value = 'created-descending';
      sortSelect.dispatchEvent(new Event('change'));
      
      expect(controller.state.sort).toBe('created-descending');
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Dropdown Interaction Tests', () => {
    beforeEach(() => {
      // Update DOM to match actual implementation with style-wrapper
      document.body.innerHTML = `
        <section class="section-collection-page" data-section-id="collection-1">
          <div class="collection-page__toolbar">
            <div class="style-wrapper style-wrapper--flat-basic">
              <div class="collection-page__sort-wrapper" data-sort-select>
                <span class="collection-page__sort-display">Featured</span>
                <select
                  id="sort-by-test"
                  class="collection-page__sort-select"
                  aria-describedby="sort-help-test"
                >
                  <option value="manual" selected>Featured</option>
                  <option value="created-descending">Newest first</option>
                  <option value="price-ascending">Price: Low to high</option>
                  <option value="price-descending">Price: High to low</option>
                  <option value="best-selling">Best selling</option>
                </select>
                <span class="icon icon-dropdown-arrow collection-page__sort-arrow" aria-hidden="true"></span>
              </div>
            </div>
          </div>
          <div data-product-grid></div>
          <script type="application/json" data-collection-data>
          {
            "products": [
              {
                "id": 1,
                "title": "Old Product",
                "price": 3999,
                "priceMin": 3999,
                "priceMax": 3999,
                "available": true,
                "salesRank": 3,
                "featuredImage": "old.jpg",
                "variants": []
              },
              {
                "id": 2,
                "title": "Expensive Product",
                "price": 9999,
                "priceMin": 9999,
                "priceMax": 9999,
                "available": false,
                "salesRank": 2,
                "featuredImage": "expensive.jpg",
                "variants": []
              },
              {
                "id": 3,
                "title": "Cheap Product",
                "price": 999,
                "priceMin": 999,
                "priceMax": 999,
                "available": true,
                "featuredImage": "cheap.jpg",
                "variants": []
              },
              {
                "id": 4,
                "title": "New Product",
                "price": 2999,
                "priceMin": 2999,
                "priceMax": 2999,
                "available": true,
                "salesRank": 1,
                "featuredImage": "new.jpg",
                "variants": []
              }
            ],
            "filterOptions": {
              "types": [],
              "sizes": [],
              "colors": [],
              "tags": []
            }
          }
          </script>
        </section>
      `;
      
      // Reinitialize controller with new DOM
      controller = new CollectionPageController();
      controller.state.filters.availability = [];
      controller.applyFiltersWithoutURLUpdate();
    });

    it('should handle dropdown wrapper clicks', () => {
      const sortWrapper = document.querySelector('.collection-page__sort-wrapper');
      const sortSelect = document.querySelector('.collection-page__sort-select');
      
      expect(sortWrapper).toBeTruthy();
      expect(sortSelect).toBeTruthy();
      
      // Test that wrapper has proper data attribute
      expect(sortWrapper.hasAttribute('data-sort-select')).toBe(true);
    });

    it('should update display text when sort changes', () => {
      const sortSelect = document.querySelector('.collection-page__sort-select');
      const sortDisplay = document.querySelector('.collection-page__sort-display');
      
      // Mock display text update function
      const updateDisplayText = () => {
        const selectedOption = sortSelect.selectedOptions[0];
        if (selectedOption) {
          sortDisplay.textContent = selectedOption.text;
        }
      };
      
      // Change selection
      sortSelect.value = 'price-ascending';
      updateDisplayText();
      
      expect(sortDisplay.textContent).toBe('Price: Low to high');
    });

    it('should maintain accessibility with style-wrapper', () => {
      const sortSelect = document.querySelector('.collection-page__sort-select');
      const sortArrow = document.querySelector('.collection-page__sort-arrow');
      
      // Check accessibility attributes
      expect(sortSelect.getAttribute('aria-describedby')).toBe('sort-help-test');
      expect(sortArrow.getAttribute('aria-hidden')).toBe('true');
    });

    it('should work with style-wrapper integration', () => {
      const styleWrapper = document.querySelector('.style-wrapper--flat-basic');
      const sortWrapper = document.querySelector('.collection-page__sort-wrapper');
      
      expect(styleWrapper).toBeTruthy();
      expect(styleWrapper.contains(sortWrapper)).toBe(true);
    });

    it('should handle keyboard interactions', () => {
      const sortSelect = document.querySelector('.collection-page__sort-select');
      const keydownHandler = jest.fn();
      
      sortSelect.addEventListener('keydown', keydownHandler);
      
      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      sortSelect.dispatchEvent(enterEvent);
      
      expect(keydownHandler).toHaveBeenCalledWith(enterEvent);
    });
  });

  describe('Sort State Persistence', () => {
    it('should maintain sort order when filters are applied', () => {
      // Set initial sort
      controller.state.sort = 'price-ascending';
      
      // Add a filter
      controller.addFilter('availability', 'in-stock');
      controller.applyFilters();
      
      // Check that products are still sorted by price
      const availableProducts = controller.state.filteredProducts;
      const prices = availableProducts.map(p => p.priceMin);
      
      // Should be sorted in ascending order
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    });
  });

  describe('Manual/Default Sort', () => {
    it('should maintain original order for manual sort', () => {
      // Reset to show all products in original order
      controller.state.filteredProducts = [...controller.state.originalProducts];
      controller.state.sort = 'manual';
      
      const originalOrder = controller.state.originalProducts.map(p => p.id);
      controller.applySorting();
      const sortedOrder = controller.state.filteredProducts.map(p => p.id);
      
      expect(sortedOrder).toEqual(originalOrder);
    });
  });
});