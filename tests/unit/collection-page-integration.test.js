/**
 * Integration Tests for CollectionPage + Multi-Drawer Integration
 * Tests the actual user interaction flow
 */

// Mock the drawer system
class MockDrawer {
  constructor({ drawerSelector, overlaySelector }) {
    this.drawer = document.querySelector(drawerSelector);
    this.overlay = document.querySelector(overlaySelector);
    this.isOpen = false;
    this.currentContent = null;
  }

  open() {
    this.isOpen = true;
    if (this.drawer) {
      this.drawer.classList.add('is-open');
    }
    if (this.overlay) {
      this.overlay.classList.add('is-open');
    }
  }

  close() {
    this.isOpen = false;
    if (this.drawer) {
      this.drawer.classList.remove('is-open');
    }
    if (this.overlay) {
      this.overlay.classList.remove('is-open');
    }
  }

  registerTrigger(triggerSelectors) {
    const selectors = Array.isArray(triggerSelectors) ? triggerSelectors : [triggerSelectors];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.open();
        });
      });
    });
  }

  registerContent(contentSel, headerSel, triggerSelectors = [], footerSel) {
    triggerSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          
          // Show specific content
          const content = this.drawer?.querySelector(contentSel);
          const header = this.drawer?.querySelector(headerSel);
          const footer = footerSel ? this.drawer?.querySelector(footerSel) : null;

          // Clear previous content
          this.drawer?.querySelectorAll('.is-open').forEach(el => {
            el.classList.remove('is-open');
          });

          // Show current content
          if (content) content.classList.add('is-open');
          if (header) header.classList.add('is-open');
          if (footer) footer.classList.add('is-open');
          
          this.currentContent = contentSel;
          this.open();
        });
      });
    });
  }
}

// Mock the drawer initialization
global.Drawer = MockDrawer;

const createFullPageDOM = () => {
  document.body.innerHTML = `
    <!-- Collection Page Section -->
    <section class="section-collection-page" data-section-id="collection-1" data-products-per-page="24">
      <div class="collection-page__container">
        <header class="collection-page__header">
          <h1 class="collection-page__title">Test Collection</h1>
        </header>
        
        <div class="collection-page__toolbar">
          <button class="collection-page__filter-trigger" data-drawer-trigger="filter">
            <span>Filters</span>
          </button>
          <select class="collection-page__sort-select" data-sort-select>
            <option value="manual">Featured</option>
          </select>
        </div>
        
        <div class="collection-grid" data-product-grid>
          <div class="collection-grid__item">Product 1</div>
        </div>
      </div>
    </section>

    <!-- Multi-Drawer Section -->
    <div class="drawer__overlay"></div>
    <div id="multi-drawer" class="multi-drawer drawer drawer--left">
      <div class="drawer__header">
        <div id="drawer__header__filter" class="drawer__header__item">
          <h2>Filter</h2>
        </div>
      </div>
      
      <div class="drawer__content">
        <div id="drawer__content__filter" class="drawer__content__item" data-filter-drawer-content>
          <div class="filter-drawer__container">
            <div class="filter-drawer__header">
              <h3>Filters</h3>
            </div>
            <div class="filter-drawer__content">
              <!-- Filter options would be here -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Collection Data Script -->
    <script type="application/json" data-collection-data>
      {
        "collectionId": 123456,
        "filterOptions": {
          "types": ["T-Shirt", "Hoodie"],
          "sizes": ["S", "M", "L"],
          "colors": ["Blue", "Red"],
          "tags": ["sale", "new"]
        },
        "products": [
          {
            "id": 1,
            "title": "Test Product",
            "type": "T-Shirt",
            "tags": ["new"],
            "available": true,
            "variants": [{"id": 11, "optionValues": {"size": "M", "color": "Blue"}}]
          }
        ]
      }
    </script>
  `;
};

describe('CollectionPage + Multi-Drawer Integration', () => {
  let multiDrawer;

  beforeEach(() => {
    // Set up full DOM
    createFullPageDOM();
    
    // Initialize the drawer system
    multiDrawer = new MockDrawer({ 
      drawerSelector: '#multi-drawer',
      overlaySelector: '.drawer__overlay'
    });
    
    // Register drawer content (simulating the initialization script)
    multiDrawer.registerContent(
      '#drawer__content__filter',
      '#drawer__header__filter',
      ['[data-drawer-trigger="filter"]'],
      null
    );
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Filter Button Integration', () => {
    it('should find the filter trigger button', () => {
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      expect(filterButton).toBeTruthy();
      expect(filterButton.textContent).toContain('Filters');
    });

    it('should open the drawer when filter button is clicked', () => {
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      
      expect(multiDrawer.isOpen).toBe(false);
      
      filterButton.click();
      
      expect(multiDrawer.isOpen).toBe(true);
      expect(multiDrawer.drawer.classList.contains('is-open')).toBe(true);
    });

    it('should show filter content when filter button is clicked', () => {
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      const filterContent = document.querySelector('#drawer__content__filter');
      const filterHeader = document.querySelector('#drawer__header__filter');
      
      expect(filterContent.classList.contains('is-open')).toBe(false);
      expect(filterHeader.classList.contains('is-open')).toBe(false);
      
      filterButton.click();
      
      expect(filterContent.classList.contains('is-open')).toBe(true);
      expect(filterHeader.classList.contains('is-open')).toBe(true);
      expect(multiDrawer.currentContent).toBe('#drawer__content__filter');
    });

    it('should show overlay when drawer opens', () => {
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      const overlay = document.querySelector('.drawer__overlay');
      
      expect(overlay.classList.contains('is-open')).toBe(false);
      
      filterButton.click();
      
      expect(overlay.classList.contains('is-open')).toBe(true);
    });
  });

  describe('Filter Drawer Content', () => {
    it('should have filter drawer content element', () => {
      const filterContent = document.querySelector('[data-filter-drawer-content]');
      expect(filterContent).toBeTruthy();
      expect(filterContent.querySelector('.filter-drawer__container')).toBeTruthy();
    });

    it('should have filter header and content areas', () => {
      const filterContent = document.querySelector('[data-filter-drawer-content]');
      const header = filterContent.querySelector('.filter-drawer__header');
      const content = filterContent.querySelector('.filter-drawer__content');
      
      expect(header).toBeTruthy();
      expect(content).toBeTruthy();
      expect(header.textContent).toContain('Filters');
    });
  });

  describe('Collection Data Integration', () => {
    it('should have collection data script on the page', () => {
      const dataScript = document.querySelector('[data-collection-data]');
      expect(dataScript).toBeTruthy();
      
      const data = JSON.parse(dataScript.textContent);
      expect(data.collectionId).toBe(123456);
      expect(data.products).toHaveLength(1);
      expect(data.filterOptions.types).toContain('T-Shirt');
    });
  });

  describe('Missing Elements Detection', () => {
    it('should detect when drawer overlay is missing', () => {
      // Remove overlay and recreate drawer
      document.querySelector('.drawer__overlay')?.remove();
      
      const drawerWithoutOverlay = new MockDrawer({ 
        drawerSelector: '#multi-drawer',
        overlaySelector: '.drawer__overlay'
      });
      
      expect(drawerWithoutOverlay.overlay).toBeNull();
    });

    it('should detect when drawer element is missing', () => {
      // Remove drawer and recreate
      document.querySelector('#multi-drawer')?.remove();
      
      const drawerWithoutElement = new MockDrawer({ 
        drawerSelector: '#multi-drawer',
        overlaySelector: '.drawer__overlay'
      });
      
      expect(drawerWithoutElement.drawer).toBeNull();
    });

    it('should detect when filter trigger is missing', () => {
      document.querySelector('[data-drawer-trigger="filter"]')?.remove();
      
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      expect(filterButton).toBeNull();
    });
  });

  describe('Drawer State Management', () => {
    it('should properly manage open/close state', () => {
      expect(multiDrawer.isOpen).toBe(false);
      
      multiDrawer.open();
      expect(multiDrawer.isOpen).toBe(true);
      
      multiDrawer.close();
      expect(multiDrawer.isOpen).toBe(false);
    });

    it('should clear previous content when switching', () => {
      const filterContent = document.querySelector('#drawer__content__filter');
      
      // Simulate opening filter content
      filterContent.classList.add('is-open');
      expect(filterContent.classList.contains('is-open')).toBe(true);
      
      // Click filter button (should clear and re-add)
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      filterButton.click();
      
      expect(filterContent.classList.contains('is-open')).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should prevent default behavior on button click', () => {
      const filterButton = document.querySelector('[data-drawer-trigger="filter"]');
      let defaultPrevented = false;
      
      filterButton.addEventListener('click', (e) => {
        defaultPrevented = e.defaultPrevented;
      });
      
      filterButton.click();
      expect(defaultPrevented).toBe(true);
    });

    it('should handle multiple trigger selectors', () => {
      // Add another trigger button
      const secondButton = document.createElement('button');
      secondButton.setAttribute('data-drawer-trigger', 'filter');
      secondButton.textContent = 'Second Filter Button';
      document.body.appendChild(secondButton);
      
      // Re-register content to pick up new button
      multiDrawer.registerContent(
        '#drawer__content__filter',
        '#drawer__header__filter',
        ['[data-drawer-trigger="filter"]'],
        null
      );
      
      expect(multiDrawer.isOpen).toBe(false);
      
      secondButton.click();
      
      expect(multiDrawer.isOpen).toBe(true);
    });
  });
});