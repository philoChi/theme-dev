/**
 * Integration tests for pagination with server-side fallback
 */

describe('Pagination Integration', () => {
  let collectionController;
  let mockFetch;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <section class="section-collection-page" data-products-per-page="24">
        <div data-product-grid>
          ${Array(24).fill().map((_, i) => `
            <div data-product-grid-item>
              <div data-product-id="${i + 1}">Product ${i + 1}</div>
            </div>
          `).join('')}
        </div>
        <button data-load-more>Load More</button>
        <p data-pagination-info>Showing 24 of 100 products</p>
        <script type="application/json" data-collection-data>
          {
            "products": ${JSON.stringify(Array(48).fill().map((_, i) => ({
              id: i + 1,
              title: `Product ${i + 1}`,
              handle: `product-${i + 1}`,
              type: i % 3 === 0 ? 'T-Shirt' : 'Hoodie',
              available: true,
              priceMin: 1000 + (i * 100),
              featuredImage: `/image-${i + 1}.jpg`,
              variants: []
            })))},
            "filterOptions": {}
          }
        </script>
      </section>
    `;

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;

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
    delete global.fetch;
    delete window.logger;
  });

  describe('Client-side Pagination', () => {
    it('should handle first 48 products client-side', () => {
      expect(collectionController.state.originalProducts.length).toBe(48);
      expect(collectionController.state.filteredProducts.length).toBe(48);
    });

    it('should show next page of products from client-side data', () => {
      // Initially showing 24 products
      const visibleBefore = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])');
      expect(visibleBefore.length).toBe(24);
      
      // Click load more
      const loadMoreButton = document.querySelector('[data-load-more]');
      loadMoreButton.click();
      
      // Should now show 48 products
      const visibleAfter = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])');
      expect(visibleAfter.length).toBe(48);
      
      // Pagination info should update
      const paginationInfo = document.querySelector('[data-pagination-info]');
      expect(paginationInfo.textContent).toContain('48 of 48');
    });

    it('should create missing product elements when showing page 2', () => {
      // Click load more
      const loadMoreButton = document.querySelector('[data-load-more]');
      loadMoreButton.click();
      
      // Check that new elements were created
      const allGridItems = document.querySelectorAll('[data-product-grid-item]');
      expect(allGridItems.length).toBeGreaterThanOrEqual(48);
      
      // Check that product 25-48 are visible
      const product25 = document.querySelector('[data-product-id="25"]');
      expect(product25).toBeTruthy();
      expect(product25.closest('[data-product-grid-item]').style.display).not.toBe('none');
    });
  });

  describe('Server-side Pagination', () => {
    it('should attempt server load when client-side products exhausted', async () => {
      // Show all 48 client-side products first
      collectionController.state.currentPage = 2;
      collectionController.updateProductGrid();
      
      // Mock server response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <div data-product-grid-item>
            <div data-product-id="49">Product 49</div>
          </div>
          <div data-product-grid-item>
            <div data-product-id="50">Product 50</div>
          </div>
        `
      });
      
      // Try to load more
      await collectionController.loadMoreFromServer();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page='),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest'
          })
        })
      );
    });

    it('should handle server pagination errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      await collectionController.loadMoreFromServer();
      
      expect(collectionController.state.isLoading).toBe(false);
      expect(window.logger.error).toHaveBeenCalledWith(
        'Failed to load more products',
        expect.any(Error)
      );
    });

    it('should append server-loaded products to grid', async () => {
      const initialCount = document.querySelectorAll('[data-product-grid-item]').length;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <div data-product-grid-item>
            <div data-product-id="49">Product 49</div>
          </div>
        `
      });
      
      await collectionController.loadMoreFromServer();
      
      const finalCount = document.querySelectorAll('[data-product-grid-item]').length;
      expect(finalCount).toBe(initialCount + 1);
      
      const newProduct = document.querySelector('[data-product-id="49"]');
      expect(newProduct).toBeTruthy();
    });
  });

  describe('Hybrid Pagination Transition', () => {
    it('should seamlessly transition from client to server pagination', async () => {
      // First load more - client side
      const loadMoreButton = document.querySelector('[data-load-more]');
      loadMoreButton.click();
      
      expect(collectionController.state.currentPage).toBe(2);
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Second load more - should try server
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<div>No more products</div>'
      });
      
      loadMoreButton.click();
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle filtered results with pagination', () => {
      // Apply filter
      collectionController.addFilter('type', 'T-Shirt');
      collectionController.applyFilters();
      
      // Check filtered count
      const tshirtCount = collectionController.state.filteredProducts.filter(
        p => p.type === 'T-Shirt'
      ).length;
      expect(tshirtCount).toBeGreaterThan(0);
      
      // Load more should work with filtered results
      const loadMoreButton = document.querySelector('[data-load-more]');
      loadMoreButton.click();
      
      // All T-shirts should be visible
      const visibleTshirts = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])');
      expect(visibleTshirts.length).toBe(tshirtCount);
    });
  });

  describe('Performance Optimization', () => {
    it('should implement lazy loading for images', () => {
      collectionController.initLazyLoading();
      
      const lazyImages = document.querySelectorAll('img[loading="lazy"]');
      expect(lazyImages.length).toBeGreaterThan(0);
      
      // Check IntersectionObserver is used
      expect(window.IntersectionObserver).toBeDefined();
    });

    it('should debounce filter operations', () => {
      jest.useFakeTimers();
      
      // Rapid filter changes
      collectionController.handleFilterChange({ detail: { filters: { type: ['T-Shirt'] } } });
      collectionController.handleFilterChange({ detail: { filters: { type: ['Hoodie'] } } });
      collectionController.handleFilterChange({ detail: { filters: { type: ['T-Shirt'] } } });
      
      // applyFilters should only be called once after debounce
      expect(window.logger.log).not.toHaveBeenCalledWith(
        expect.stringContaining('Filters applied')
      );
      
      // Fast forward debounce timer
      jest.advanceTimersByTime(300);
      
      expect(window.logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Filters applied')
      );
      
      jest.useRealTimers();
    });

    it('should limit products per page to 24', () => {
      expect(collectionController.config.productsPerPage).toBe(24);
      
      // Initial render should show only 24
      const visibleProducts = document.querySelectorAll('[data-product-grid-item]:not([style*="display: none"])');
      expect(visibleProducts.length).toBe(24);
    });
  });

  describe('Load More Button States', () => {
    it('should update button text based on remaining products', () => {
      const loadMoreButton = document.querySelector('[data-load-more]');
      
      collectionController.updateLoadMoreButton();
      
      // Should show remaining count
      expect(loadMoreButton.textContent).toContain('24 products');
    });

    it('should hide button when no more products', () => {
      const loadMoreButton = document.querySelector('[data-load-more]');
      
      // Show all products
      collectionController.state.currentPage = 2;
      collectionController.updateProductGrid();
      
      expect(loadMoreButton.style.display).toBe('none');
    });

    it('should disable button during loading', async () => {
      const loadMoreButton = document.querySelector('[data-load-more]');
      
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const loadPromise = collectionController.loadMoreFromServer();
      
      expect(loadMoreButton.disabled).toBe(true);
      expect(loadMoreButton.classList.contains('is-loading')).toBe(true);
      
      await loadPromise;
    });
  });
});