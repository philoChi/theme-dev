/**
 * Integration tests for feature component integration
 * Tests color swatches and size pills within filter drawer
 */

describe('Feature Component Integration', () => {
  let collectionController;

  beforeEach(() => {
    // Set up DOM with feature components
    document.body.innerHTML = `
      <section class="section-collection-page">
        <div data-filter-drawer-content>
          <div class="filter-options filter-options--swatches" data-filter-options="color"></div>
          <div class="filter-options filter-options--pills" data-filter-options="size"></div>
        </div>
        <div data-product-grid>
          <div data-product-grid-item>
            <div data-product-id="1">
              <div class="product-showcase-card">
                <div class="color-swatches">
                  <button class="color-swatch" data-color="black">Black</button>
                  <button class="color-swatch" data-color="white">White</button>
                </div>
                <div class="size-pills">
                  <button class="size-pill" data-size="S">S</button>
                  <button class="size-pill" data-size="M">M</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <script type="application/json" data-collection-data>
          {
            "filterOptions": {
              "colors": ["Black", "White", "Blue"],
              "sizes": ["XS", "S", "M", "L", "XL"]
            },
            "products": [{
              "id": 1,
              "title": "Test Product",
              "variants": [
                {
                  "id": 101,
                  "optionValues": { "color": "Black", "size": "S" }
                },
                {
                  "id": 102,
                  "optionValues": { "color": "White", "size": "M" }
                }
              ]
            }]
          }
        </script>
      </section>
    `;

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
    delete window.logger;
  });

  describe('Color Swatches Integration', () => {
    it('should populate color swatches in filter drawer', () => {
      collectionController.populateFilterGroup('color', ['Black', 'White', 'Blue'], 'swatches');
      
      const colorSwatches = document.querySelectorAll('[data-filter-options="color"] .color-swatch');
      expect(colorSwatches.length).toBe(3);
      
      const colors = Array.from(colorSwatches).map(swatch => swatch.dataset.filterValue);
      expect(colors).toEqual(['Black', 'White', 'Blue']);
    });

    it('should handle color swatch selection', () => {
      collectionController.populateFilterGroup('color', ['Black', 'White'], 'swatches');
      
      const blackSwatch = document.querySelector('[data-filter-value="Black"]');
      blackSwatch.click();
      
      expect(blackSwatch.classList.contains('is-selected')).toBe(true);
      expect(collectionController.state.filters.color).toContain('Black');
    });

    it('should toggle color swatch selection', () => {
      collectionController.populateFilterGroup('color', ['Black'], 'swatches');
      
      const swatch = document.querySelector('[data-filter-value="Black"]');
      
      // First click - select
      swatch.click();
      expect(swatch.classList.contains('is-selected')).toBe(true);
      
      // Second click - deselect
      swatch.click();
      expect(swatch.classList.contains('is-selected')).toBe(false);
      expect(collectionController.state.filters.color).not.toContain('Black');
    });

    it('should display correct color values', () => {
      const colorHtml = collectionController.createColorSwatchOption('Navy', 5);
      
      expect(colorHtml).toContain('data-filter-value="Navy"');
      expect(colorHtml).toContain('background-color: #000080');
      expect(colorHtml).toContain('(5)');
    });
  });

  describe('Size Pills Integration', () => {
    it('should populate size pills in filter drawer', () => {
      collectionController.populateFilterGroup('size', ['S', 'M', 'L'], 'pills');
      
      const sizePills = document.querySelectorAll('[data-filter-options="size"] .size-pill');
      expect(sizePills.length).toBe(3);
      
      const sizes = Array.from(sizePills).map(pill => pill.dataset.filterValue);
      expect(sizes).toEqual(['S', 'M', 'L']);
    });

    it('should handle size pill selection', () => {
      collectionController.populateFilterGroup('size', ['S', 'M', 'L'], 'pills');
      
      const mediumPill = document.querySelector('[data-filter-value="M"]');
      mediumPill.click();
      
      expect(mediumPill.classList.contains('is-selected')).toBe(true);
      expect(collectionController.state.filters.size).toContain('M');
    });

    it('should allow multiple size selection', () => {
      collectionController.populateFilterGroup('size', ['S', 'M', 'L'], 'pills');
      
      const smallPill = document.querySelector('[data-filter-value="S"]');
      const mediumPill = document.querySelector('[data-filter-value="M"]');
      
      smallPill.click();
      mediumPill.click();
      
      expect(collectionController.state.filters.size).toContain('S');
      expect(collectionController.state.filters.size).toContain('M');
      expect(collectionController.state.filters.size.length).toBe(2);
    });
  });

  describe('Consistency with Product Cards', () => {
    it('should filter products based on embedded color swatches', () => {
      collectionController.state.originalProducts = [{
        id: 1,
        variants: [
          { optionValues: { color: 'Black' } },
          { optionValues: { color: 'White' } }
        ]
      }, {
        id: 2,
        variants: [
          { optionValues: { color: 'Blue' } }
        ]
      }];

      collectionController.addFilter('color', 'Black');
      collectionController.applyFilters();
      
      expect(collectionController.state.filteredProducts.length).toBe(1);
      expect(collectionController.state.filteredProducts[0].id).toBe(1);
    });

    it('should filter products based on embedded size pills', () => {
      collectionController.state.originalProducts = [{
        id: 1,
        variants: [
          { optionValues: { size: 'S' } },
          { optionValues: { size: 'M' } }
        ]
      }, {
        id: 2,
        variants: [
          { optionValues: { size: 'L' } }
        ]
      }];

      collectionController.addFilter('size', 'S');
      collectionController.addFilter('size', 'M');
      collectionController.applyFilters();
      
      expect(collectionController.state.filteredProducts.length).toBe(1);
      expect(collectionController.state.filteredProducts[0].id).toBe(1);
    });
  });

  describe('Event Communication', () => {
    it('should handle color/size change events from product cards', () => {
      const colorChangeEvent = new CustomEvent('variant:color-change', {
        detail: { color: 'Blue' }
      });
      
      document.dispatchEvent(colorChangeEvent);
      
      // The actual implementation might handle this differently
      // This is a placeholder for the expected behavior
    });

    it('should update filter counts when selections change', () => {
      collectionController.state.originalProducts = [
        { id: 1, variants: [{ optionValues: { color: 'Black' } }] },
        { id: 2, variants: [{ optionValues: { color: 'Black' } }] },
        { id: 3, variants: [{ optionValues: { color: 'White' } }] }
      ];

      const blackCount = collectionController.getOptionCount('color', 'Black');
      expect(blackCount).toBe(2);
      
      const whiteCount = collectionController.getOptionCount('color', 'White');
      expect(whiteCount).toBe(1);
    });
  });
});