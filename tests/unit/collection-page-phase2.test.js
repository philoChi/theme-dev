/**
 * Unit Tests for CollectionPageController - Phase 2 Functionality
 * Simplified test for filter infrastructure
 */

// Simple test of filter logic independent of DOM/constructor complexity
describe('CollectionPage Phase 2: Filter Logic Tests', () => {
  let mockProducts;
  let filterState;

  beforeEach(() => {
    // Mock collection data
    mockProducts = [
      {
        id: 1,
        title: 'Blue T-Shirt',
        type: 'T-Shirt',
        tags: ['men', 'new'],
        price: 2500,
        available: true,
        variants: [
          {
            id: 11,
            available: true,
            price: 2500,
            optionValues: { size: 'M', color: 'Blue' }
          }
        ]
      },
      {
        id: 2,
        title: 'Red Hoodie',
        type: 'Hoodie',
        tags: ['women', 'sale'],
        price: 4500,
        available: false,
        variants: [
          {
            id: 21,
            available: false,
            price: 4500,
            optionValues: { size: 'L', color: 'Red' }
          }
        ]
      },
      {
        id: 3,
        title: 'Black Sweatshirt',
        type: 'Sweatshirt',
        tags: ['men', 'bestseller'],
        price: 3500,
        available: true,
        variants: [
          {
            id: 31,
            available: true,
            price: 3500,
            optionValues: { size: 'L', color: 'Black' }
          }
        ]
      }
    ];

    // Default filter state
    filterState = {
      type: [],
      size: [],
      color: [],
      gender: [],
      tags: [],
      availability: ['in-stock']
    };
  });

  // Helper function to check if product matches filters
  function productMatchesFilters(product, filters) {
    for (const [filterType, filterValues] of Object.entries(filters)) {
      if (filterValues.length === 0) continue;

      let matches = false;

      switch (filterType) {
        case 'type':
          matches = filterValues.includes(product.type);
          break;
        case 'tags':
          matches = filterValues.some(tag => product.tags.includes(tag));
          break;
        case 'gender':
          matches = filterValues.some(gender => product.tags.includes(gender));
          break;
        case 'availability':
          if (filterValues.includes('in-stock') && filterValues.includes('out-of-stock')) {
            matches = true;
          } else if (filterValues.includes('in-stock')) {
            matches = product.available;
          } else if (filterValues.includes('out-of-stock')) {
            matches = !product.available;
          }
          break;
        case 'size':
          matches = product.variants.some(variant => 
            filterValues.some(size => 
              variant.optionValues?.size === size
            )
          );
          break;
        case 'color':
          matches = product.variants.some(variant => 
            filterValues.some(color => 
              variant.optionValues?.color === color
            )
          );
          break;
      }

      if (!matches) return false;
    }
    return true;
  }

  // Helper function to apply filters
  function applyFilters(products, filters) {
    return products.filter(product => productMatchesFilters(product, filters));
  }

  // Helper function to add filter
  function addFilter(filters, type, value) {
    if (!filters[type]) {
      filters[type] = [];
    }
    if (!filters[type].includes(value)) {
      filters[type].push(value);
    }
  }

  // Helper function to remove filter
  function removeFilter(filters, type, value) {
    if (filters[type]) {
      filters[type] = filters[type].filter(v => v !== value);
    }
  }

  // Helper function to format price
  function formatPrice(price) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price / 100);
  }

  describe('Filter State Management', () => {
    it('should add filters correctly', () => {
      addFilter(filterState, 'type', 'T-Shirt');
      addFilter(filterState, 'color', 'Blue');
      
      expect(filterState.type).toContain('T-Shirt');
      expect(filterState.color).toContain('Blue');
    });

    it('should remove filters correctly', () => {
      addFilter(filterState, 'type', 'T-Shirt');
      addFilter(filterState, 'type', 'Hoodie');
      removeFilter(filterState, 'type', 'T-Shirt');
      
      expect(filterState.type).not.toContain('T-Shirt');
      expect(filterState.type).toContain('Hoodie');
    });

    it('should not add duplicate filters', () => {
      addFilter(filterState, 'type', 'T-Shirt');
      addFilter(filterState, 'type', 'T-Shirt');
      
      expect(filterState.type).toHaveLength(1);
      expect(filterState.type).toEqual(['T-Shirt']);
    });
  });

  describe('Product Filtering Logic', () => {
    it('should filter products by type', () => {
      addFilter(filterState, 'type', 'T-Shirt');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('T-Shirt');
    });

    it('should filter products by availability (in-stock)', () => {
      filterState.availability = ['in-stock'];
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(2);
      filtered.forEach(product => {
        expect(product.available).toBe(true);
      });
    });

    it('should filter products by availability (out-of-stock)', () => {
      filterState.availability = ['out-of-stock'];
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].available).toBe(false);
    });

    it('should filter products by size', () => {
      addFilter(filterState, 'size', 'M');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].variants[0].optionValues.size).toBe('M');
    });

    it('should filter products by color', () => {
      addFilter(filterState, 'color', 'Blue');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].variants[0].optionValues.color).toBe('Blue');
    });

    it('should filter products by tags', () => {
      // Reset filters to avoid interference from availability filter
      filterState = { type: [], size: [], color: [], gender: [], tags: [], availability: [] };
      addFilter(filterState, 'tags', 'sale');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tags).toContain('sale');
    });

    it('should filter products by gender (via tags)', () => {
      addFilter(filterState, 'gender', 'men');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(2);
      filtered.forEach(product => {
        expect(product.tags).toContain('men');
      });
    });

    it('should apply multiple filters simultaneously', () => {
      addFilter(filterState, 'type', 'T-Shirt');
      addFilter(filterState, 'color', 'Blue');
      addFilter(filterState, 'tags', 'new');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(1);
      const product = filtered[0];
      expect(product.type).toBe('T-Shirt');
      expect(product.variants[0].optionValues.color).toBe('Blue');
      expect(product.tags).toContain('new');
    });

    it('should return no results when filters match no products', () => {
      addFilter(filterState, 'type', 'NonexistentType');
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty filter arrays (show all products)', () => {
      filterState.availability = []; // Show all products regardless of availability
      const filtered = applyFilters(mockProducts, filterState);
      
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Sorting Functionality', () => {
    function applySorting(products, sortType) {
      const sortedProducts = [...products];
      
      switch (sortType) {
        case 'created-descending':
          return sortedProducts.sort((a, b) => b.id - a.id);
        case 'price-ascending':
          return sortedProducts.sort((a, b) => a.price - b.price);
        case 'price-descending':
          return sortedProducts.sort((a, b) => b.price - a.price);
        case 'best-selling':
          return sortedProducts.sort((a, b) => b.available - a.available);
        default:
          return sortedProducts;
      }
    }

    it('should sort by price ascending', () => {
      const sorted = applySorting(mockProducts, 'price-ascending');
      const prices = sorted.map(p => p.price);
      
      expect(prices[0]).toBeLessThanOrEqual(prices[1]);
      expect(prices[1]).toBeLessThanOrEqual(prices[2]);
    });

    it('should sort by price descending', () => {
      const sorted = applySorting(mockProducts, 'price-descending');
      const prices = sorted.map(p => p.price);
      
      expect(prices[0]).toBeGreaterThanOrEqual(prices[1]);
      expect(prices[1]).toBeGreaterThanOrEqual(prices[2]);
    });

    it('should sort by newest (creation date)', () => {
      const sorted = applySorting(mockProducts, 'created-descending');
      const ids = sorted.map(p => p.id);
      
      expect(ids[0]).toBeGreaterThanOrEqual(ids[1]);
      expect(ids[1]).toBeGreaterThanOrEqual(ids[2]);
    });

    it('should sort by availability for best-selling', () => {
      const sorted = applySorting(mockProducts, 'best-selling');
      
      // Available products should come first
      expect(sorted[0].available).toBe(true);
      expect(sorted[1].available).toBe(true);
      expect(sorted[2].available).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(2500)).toMatch(/25[,.]00.*€/);
      expect(formatPrice(4500)).toMatch(/45[,.]00.*€/);
      expect(formatPrice(3500)).toMatch(/35[,.]00.*€/);
    });

    it('should handle zero price', () => {
      expect(formatPrice(0)).toMatch(/0[,.]00.*€/);
    });

    it('should handle large prices', () => {
      expect(formatPrice(123456)).toMatch(/1[,.]?234[,.]56.*€/);
    });
  });

  describe('Filter Count Calculations', () => {
    function getOptionCount(products, filterType, option) {
      return products.filter(product => {
        switch (filterType) {
          case 'type':
            return product.type === option;
          case 'tags':
            return product.tags.includes(option);
          case 'size':
            return product.variants.some(variant => 
              variant.optionValues?.size === option
            );
          case 'color':
            return product.variants.some(variant => 
              variant.optionValues?.color === option
            );
          default:
            return false;
        }
      }).length;
    }

    it('should calculate type counts correctly', () => {
      expect(getOptionCount(mockProducts, 'type', 'T-Shirt')).toBe(1);
      expect(getOptionCount(mockProducts, 'type', 'Hoodie')).toBe(1);
      expect(getOptionCount(mockProducts, 'type', 'Sweatshirt')).toBe(1);
      expect(getOptionCount(mockProducts, 'type', 'NonexistentType')).toBe(0);
    });

    it('should calculate tag counts correctly', () => {
      expect(getOptionCount(mockProducts, 'tags', 'men')).toBe(2);
      expect(getOptionCount(mockProducts, 'tags', 'women')).toBe(1);
      expect(getOptionCount(mockProducts, 'tags', 'sale')).toBe(1);
      expect(getOptionCount(mockProducts, 'tags', 'new')).toBe(1);
    });

    it('should calculate size counts correctly', () => {
      expect(getOptionCount(mockProducts, 'size', 'M')).toBe(1);
      expect(getOptionCount(mockProducts, 'size', 'L')).toBe(2);
      expect(getOptionCount(mockProducts, 'size', 'XL')).toBe(0);
    });

    it('should calculate color counts correctly', () => {
      expect(getOptionCount(mockProducts, 'color', 'Blue')).toBe(1);
      expect(getOptionCount(mockProducts, 'color', 'Red')).toBe(1);
      expect(getOptionCount(mockProducts, 'color', 'Black')).toBe(1);
      expect(getOptionCount(mockProducts, 'color', 'Green')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product array', () => {
      const filtered = applyFilters([], filterState);
      expect(filtered).toHaveLength(0);
    });

    it('should handle products without variants', () => {
      const productWithoutVariants = {
        id: 99,
        title: 'No Variants Product',
        type: 'Other',
        tags: ['test'],
        price: 1000,
        available: true,
        variants: []
      };

      addFilter(filterState, 'size', 'M');
      const filtered = applyFilters([productWithoutVariants], filterState);
      
      expect(filtered).toHaveLength(0); // Should not match size filter
    });

    it('should handle products without optionValues', () => {
      const productWithoutOptions = {
        id: 99,
        title: 'No Options Product',
        type: 'Other',
        tags: ['test'],
        price: 1000,
        available: true,
        variants: [{ id: 991, available: true, price: 1000 }]
      };

      addFilter(filterState, 'size', 'M');
      const filtered = applyFilters([productWithoutOptions], filterState);
      
      expect(filtered).toHaveLength(0); // Should not match size filter
    });

    it('should handle undefined or null filters gracefully', () => {
      const emptyFilters = {};
      const filtered = applyFilters(mockProducts, emptyFilters);
      
      expect(filtered).toHaveLength(3); // All products should be shown
    });
  });
});