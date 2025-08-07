/**
 * Integration tests for notification system integration
 * Tests error handling and user feedback
 */

describe('Notification System Integration', () => {
  let collectionController;
  let mockNotificationSystem;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <section class="section-collection-page">
        <div data-product-grid></div>
        <button data-load-more>Load More</button>
        <button data-clear-filters>Clear Filters</button>
        <script type="application/json" data-collection-data>
          {
            "filterOptions": {},
            "products": []
          }
        </script>
      </section>
    `;

    // Mock notification system
    mockNotificationSystem = {
      show: jest.fn()
    };
    window.notificationSystem = mockNotificationSystem;

    // Mock logger
    window.logger = {
      log: jest.fn(),
      error: jest.fn()
    };

    // Mock fetch for testing network errors
    global.fetch = jest.fn();

    // Initialize controller
    const CollectionPageController = require('../../assets/section-collection-page.js');
    collectionController = new CollectionPageController();
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    delete window.notificationSystem;
    delete window.logger;
    delete global.fetch;
  });

  describe('Error Handling', () => {
    it('should show error notification on filter operation failure', () => {
      // Simulate an error in filter operation
      collectionController.state.originalProducts = null;
      collectionController.applyFilters();
      
      // The controller should handle this gracefully
      expect(window.logger.error).not.toHaveBeenCalled();
    });

    it('should show error notification on network failure during pagination', async () => {
      // Mock fetch to reject
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Try to load more from server
      await collectionController.loadMoreFromServer();
      
      expect(mockNotificationSystem.show).toHaveBeenCalledWith(
        'Failed to load more products. Please try again.',
        'error'
      );
    });

    it('should show error when collection data fails to load', () => {
      // Create a new controller with invalid JSON
      document.querySelector('[data-collection-data]').textContent = 'invalid json';
      
      const CollectionPageController = require('../../assets/section-collection-page.js');
      new CollectionPageController();
      
      expect(window.logger.error).toHaveBeenCalledWith(
        'Failed to load collection data',
        expect.any(Error)
      );
    });
  });

  describe('Success Messages', () => {
    it('should show success message when filters are cleared', () => {
      // Set some filters
      collectionController.state.filters = {
        type: ['T-Shirt'],
        size: ['M'],
        color: ['Black']
      };
      
      // Clear all filters
      const clearButton = document.querySelector('[data-clear-filters]');
      const event = new Event('click');
      event.preventDefault = jest.fn();
      
      collectionController.handleClearAllFilters(event);
      
      expect(window.logger.log).toHaveBeenCalledWith('All filters cleared');
    });

    it('should show info message when no more products to load', () => {
      // Set state to have no more products
      collectionController.state.filteredProducts = [];
      collectionController.state.originalProducts = [];
      
      const loadMoreButton = document.querySelector('[data-load-more]');
      loadMoreButton.click();
      
      expect(mockNotificationSystem.show).toHaveBeenCalledWith(
        'No more products to load',
        'info'
      );
    });
  });

  describe('Error Recovery', () => {
    it('should recover from failed server pagination', async () => {
      // First attempt fails
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await collectionController.loadMoreFromServer();
      
      expect(collectionController.state.isLoading).toBe(false);
      expect(mockNotificationSystem.show).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load'),
        'error'
      );
      
      // Second attempt succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<div data-product-grid-item>New Product</div>'
      });
      
      await collectionController.loadMoreFromServer();
      
      // Should not show error this time
      const errorCalls = mockNotificationSystem.show.mock.calls.filter(
        call => call[1] === 'error'
      );
      expect(errorCalls.length).toBe(1); // Only the first error
    });

    it('should handle empty filter results gracefully', () => {
      collectionController.state.originalProducts = [
        { id: 1, type: 'T-Shirt' },
        { id: 2, type: 'Hoodie' }
      ];
      
      // Apply filter that matches nothing
      collectionController.addFilter('type', 'Jeans');
      collectionController.applyFilters();
      
      // Should show no results state, not error
      const noResults = document.querySelector('[data-no-results]');
      expect(noResults.style.display).not.toBe('none');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during pagination', () => {
      const loadMoreButton = document.querySelector('[data-load-more]');
      
      // Start loading
      collectionController.state.isLoading = true;
      loadMoreButton.classList.add('is-loading');
      loadMoreButton.disabled = true;
      
      expect(loadMoreButton.classList.contains('is-loading')).toBe(true);
      expect(loadMoreButton.disabled).toBe(true);
    });

    it('should clear loading state after operation', async () => {
      const loadMoreButton = document.querySelector('[data-load-more]');
      
      // Mock successful response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '<div>No new products</div>'
      });
      
      await collectionController.loadMoreFromServer();
      
      expect(collectionController.state.isLoading).toBe(false);
      expect(loadMoreButton.classList.contains('is-loading')).toBe(false);
      expect(loadMoreButton.disabled).toBe(false);
    });
  });

  describe('Notification Fallback', () => {
    it('should fallback to console when notification system unavailable', () => {
      // Remove notification system
      delete window.notificationSystem;
      
      const consoleSpy = jest.spyOn(console, 'log');
      
      collectionController.showNotification('Test message', 'info');
      
      expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Test message');
      
      consoleSpy.mockRestore();
    });

    it('should handle notification system errors gracefully', () => {
      // Make notification system throw error
      mockNotificationSystem.show.mockImplementation(() => {
        throw new Error('Notification system error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error');
      const consoleLogSpy = jest.spyOn(console, 'log');
      
      collectionController.showNotification('Test message', 'error');
      
      expect(consoleSpy).toHaveBeenCalledWith('[NOTIFICATION-ERROR]', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('[ERROR]', 'Test message');
      
      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});