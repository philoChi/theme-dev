/**
 * Unit Tests for CollectionPageController URL State Synchronization
 * Phase 3 functionality - URL parameter management
 */

// Load the actual implementation
const fs = require('fs');
const path = require('path');

// Read and evaluate the CollectionPageController
const controllerCode = fs.readFileSync(
  path.join(__dirname, '../../assets/section-collection-page.js'),
  'utf8'
);

// Create a function to execute the code and return the class
const getCollectionPageController = () => {
  const window = global.window;
  const document = global.document;
  
  // Execute the code in a function context
  const func = new Function('window', 'document', controllerCode + '\nreturn CollectionPageController;');
  return func(window, document);
};

const CollectionPageController = getCollectionPageController();

// Mock window location and history
const mockLocation = {
  href: 'http://127.0.0.1:9292/collections/all',
  pathname: '/collections/all',
  search: '',
  toString: function() { return this.href; }
};

const mockHistory = {
  pushState: jest.fn(),
  replaceState: jest.fn()
};

// Mock DOM setup
const createMockDOM = () => {
  document.body.innerHTML = `
    <section class="section-collection-page" data-section-id="collection-1" data-products-per-page="24">
      <div class="collection-page__toolbar">
        <select class="collection-page__sort-select" data-sort-select>
          <option value="manual">Featured</option>
          <option value="created-descending">Newest</option>
          <option value="price-ascending">Price: Low to High</option>
          <option value="price-descending">Price: High to Low</option>
          <option value="best-selling">Best Selling</option>
        </select>
      </div>
      
      <div class="collection-grid" data-product-grid></div>
      
      <script type="application/json" data-collection-data>
      {
        "products": [
          {
            "id": 1,
            "title": "Test Product 1",
            "type": "t-shirt",
            "tags": ["men", "new"],
            "available": true,
            "price": 2999,
            "priceMin": 2999,
            "priceMax": 2999,
            "featuredImage": "test1.jpg",
            "variants": [
              {
                "id": 101,
                "optionValues": { "size": "M", "color": "blue" }
              }
            ]
          },
          {
            "id": 2,
            "title": "Test Product 2",
            "type": "hoodie",
            "tags": ["women", "sale"],
            "available": false,
            "price": 4999,
            "priceMin": 4999,
            "priceMax": 4999,
            "featuredImage": "test2.jpg",
            "variants": [
              {
                "id": 201,
                "optionValues": { "size": "L", "color": "red" }
              }
            ]
          }
        ],
        "filterOptions": {
          "types": ["t-shirt", "hoodie"],
          "sizes": ["M", "L"],
          "colors": ["blue", "red"],
          "tags": ["men", "women", "new", "sale"]
        }
      }
      </script>
      
      <div data-filter-drawer-content>
        <div data-filter-options="type"></div>
        <div data-filter-options="size"></div>
        <div data-filter-options="color"></div>
      </div>
    </section>
  `;
};

// Mock global objects
global.window.logger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Helper to create controller with mocked location
const createController = (searchParams = '') => {
  mockLocation.search = searchParams;
  mockLocation.href = `http://127.0.0.1:9292/collections/all${searchParams}`;
  
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true
  });
  
  Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true,
    configurable: true
  });
  
  return new CollectionPageController();
};

describe('CollectionPageController - URL State Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMockDOM();
    mockHistory.pushState.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('URL State Initialization', () => {
    it('should initialize with no URL parameters', () => {
      const controller = createController();
      
      expect(controller.state.sort).toBe('manual');
      expect(controller.state.filters).toEqual({
        type: [],
        size: [],
        color: [],
        gender: [],
        tags: [],
        availability: ['in-stock']
      });
    });

    it('should initialize sort from URL parameter', () => {
      const controller = createController('?sort_by=price-ascending');
      
      expect(controller.state.sort).toBe('price-ascending');
      expect(controller.elements.sortSelect.value).toBe('price-ascending');
    });

    it('should initialize single filter from URL', () => {
      const controller = createController('?filter.type=t-shirt');
      
      expect(controller.state.filters.type).toEqual(['t-shirt']);
    });

    it('should initialize multiple filters from URL', () => {
      const controller = createController('?filter.type=t-shirt&filter.type=hoodie&filter.color=blue');
      
      expect(controller.state.filters.type).toEqual(['t-shirt', 'hoodie']);
      expect(controller.state.filters.color).toEqual(['blue']);
    });

    it('should initialize sort and filters together', () => {
      const controller = createController('?sort_by=price-descending&filter.size=M&filter.size=L');
      
      expect(controller.state.sort).toBe('price-descending');
      expect(controller.state.filters.size).toEqual(['M', 'L']);
    });

    it('should handle malformed URL parameters gracefully', () => {
      const controller = createController('?invalid=parameter&filter.=empty');
      
      expect(controller.state.filters).toEqual({
        type: [],
        size: [],
        color: [],
        gender: [],
        tags: [],
        availability: ['in-stock']
      });
      expect(window.logger.error).not.toHaveBeenCalled();
    });
  });

  describe('URL State Updates', () => {
    it('should update URL when filters are applied', () => {
      const controller = createController();
      
      // Add a filter
      controller.addFilter('type', 't-shirt');
      controller.applyFilters();
      
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ type: ['t-shirt'] }),
          sort: 'manual'
        }),
        '',
        '/collections/all?filter.type=t-shirt'
      );
    });

    it('should update URL when sort is changed', () => {
      const controller = createController();
      
      // Change sort
      controller.elements.sortSelect.value = 'price-ascending';
      controller.elements.sortSelect.dispatchEvent(new Event('change'));
      
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'price-ascending'
        }),
        '',
        '/collections/all?sort_by=price-ascending'
      );
    });

    it('should combine multiple filters in URL', () => {
      const controller = createController();
      
      // Add multiple filters
      controller.addFilter('type', 't-shirt');
      controller.addFilter('type', 'hoodie');
      controller.addFilter('color', 'blue');
      controller.applyFilters();
      
      const lastCall = mockHistory.pushState.mock.calls[mockHistory.pushState.mock.calls.length - 1];
      const url = lastCall[2];
      
      expect(url).toContain('filter.type=t-shirt');
      expect(url).toContain('filter.type=hoodie');
      expect(url).toContain('filter.color=blue');
    });

    it('should not include default availability filter in URL', () => {
      const controller = createController();
      
      // Default state should not update URL
      controller.applyFilters();
      
      // Should not be called since only default availability is set
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('should include non-default availability filter in URL', () => {
      const controller = createController();
      
      // Add out-of-stock to availability
      controller.addFilter('availability', 'out-of-stock');
      controller.applyFilters();
      
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        expect.stringContaining('filter.availability=in-stock')
      );
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        expect.stringContaining('filter.availability=out-of-stock')
      );
    });

    it('should not update URL if state has not changed', () => {
      const controller = createController('?filter.type=t-shirt');
      
      // Apply filters without changing anything
      controller.applyFilters();
      
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });
  });

  describe('Browser Navigation', () => {
    it('should handle browser back/forward navigation', () => {
      const controller = createController('?filter.type=t-shirt');
      
      // Clear initial calls
      jest.clearAllMocks();
      
      // Simulate browser back with different URL
      mockLocation.search = '?filter.type=hoodie';
      
      const popstateEvent = new PopStateEvent('popstate', {
        state: { filters: { type: ['hoodie'] }, sort: 'manual' }
      });
      
      window.dispatchEvent(popstateEvent);
      
      expect(window.logger.log).toHaveBeenCalledWith(
        'Browser navigation detected',
        expect.any(Object)
      );
    });

    it('should re-initialize from URL on popstate', () => {
      const controller = createController();
      
      // Add filter
      controller.addFilter('type', 't-shirt');
      controller.applyFilters();
      
      // Clear mocks
      jest.clearAllMocks();
      
      // Simulate browser back to no filters
      mockLocation.search = '';
      window.dispatchEvent(new PopStateEvent('popstate'));
      
      // Should log re-initialization - check if it was called with the right pattern
      const calls = window.logger.log.mock.calls;
      const hasInitCall = calls.some(call => 
        call[0] && call[0].includes('Initialized from URL')
      );
      expect(hasInitCall).toBe(true);
    });
  });

  describe('URL Encoding/Decoding', () => {
    it('should handle special characters in filter values', () => {
      const controller = createController();
      
      // Add filter with special characters
      controller.addFilter('tags', 'new & featured');
      controller.applyFilters();
      
      const lastCall = mockHistory.pushState.mock.calls[mockHistory.pushState.mock.calls.length - 1];
      const url = lastCall[2];
      
      // Should be properly encoded - URLSearchParams uses + for spaces
      expect(url).toContain('filter.tags=new+%26+featured');
    });

    it('should decode special characters from URL', () => {
      const controller = createController('?filter.tags=new%20%26%20featured');
      
      expect(controller.state.filters.tags).toEqual(['new & featured']);
    });
  });

  describe('Clear Filters', () => {
    it('should remove all filters from URL when cleared', () => {
      const controller = createController('?filter.type=t-shirt&filter.color=blue&sort_by=price-ascending');
      
      // Clear all filters
      controller.handleClearAllFilters(new Event('click'));
      
      // Should keep sort but remove filters
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        '/collections/all?sort_by=price-ascending'
      );
    });

    it('should remove URL parameters completely when no sort is set', () => {
      const controller = createController('?filter.type=t-shirt');
      
      // Clear all filters
      controller.handleClearAllFilters(new Event('click'));
      
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        expect.any(Object),
        '',
        '/collections/all'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle URL update errors gracefully', () => {
      const controller = createController();
      
      // Mock pushState to throw error
      mockHistory.pushState.mockImplementationOnce(() => {
        throw new Error('History API error');
      });
      
      // Should not throw when applying filters
      expect(() => {
        controller.addFilter('type', 't-shirt');
        controller.applyFilters();
      }).not.toThrow();
      
      expect(window.logger.error).toHaveBeenCalledWith(
        'Failed to update URL',
        expect.any(Error)
      );
    });

    it('should handle initialization errors gracefully', () => {
      // Mock URLSearchParams to throw
      const originalURLSearchParams = global.URLSearchParams;
      global.URLSearchParams = jest.fn(() => {
        throw new Error('URLSearchParams error');
      });
      
      const controller = createController('?filter.type=t-shirt');
      
      expect(window.logger.error).toHaveBeenCalledWith(
        'Failed to initialize from URL',
        expect.any(Error)
      );
      
      // Restore
      global.URLSearchParams = originalURLSearchParams;
    });
  });
});