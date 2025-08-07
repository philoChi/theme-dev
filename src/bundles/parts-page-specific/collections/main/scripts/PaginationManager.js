/**
 * PaginationManager - Enhanced pagination interactions and accessibility
 * 
 * Features:
 * - Smooth loading states
 * - Keyboard navigation
 * - Accessibility improvements
 * - Subtle animations and interactions
 */

class PaginationManager {
  constructor() {
    this.pagination = null;
    this.init();
  }

  init() {
    this.pagination = document.querySelector('[data-pagination]');
    if (!this.pagination) return;

    this.setupEventListeners();
    this.setupKeyboardNavigation();
    this.setupAccessibility();
  }

  /**
   * Setup event listeners for pagination interactions
   */
  setupEventListeners() {
    // Add loading state on pagination clicks
    this.pagination.addEventListener('click', (e) => {
      const target = e.target.closest('.pagination__number, .pagination__nav');
      if (!target || target.classList.contains('pagination__nav--disabled')) return;

      this.showLoadingState();
    });

    // Handle hover effects for better UX
    this.setupHoverEffects();
  }

  /**
   * Setup keyboard navigation for accessibility
   */
  setupKeyboardNavigation() {
    this.pagination.addEventListener('keydown', (e) => {
      const focusableElements = this.pagination.querySelectorAll(
        '.pagination__number:not(.pagination__number--current), .pagination__nav:not(.pagination__nav--disabled)'
      );
      
      const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
      
      let nextIndex = currentIndex;
      
      switch (e.key) {
        case 'ArrowLeft':
          nextIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          nextIndex = Math.min(focusableElements.length - 1, currentIndex + 1);
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = focusableElements.length - 1;
          break;
        default:
          return;
      }
      
      e.preventDefault();
      focusableElements[nextIndex]?.focus();
    });
  }

  /**
   * Setup accessibility enhancements
   */
  setupAccessibility() {
    // Add ARIA labels for better screen reader support
    const numbers = this.pagination.querySelectorAll('.pagination__number');
    numbers.forEach((number) => {
      if (!number.getAttribute('aria-label')) {
        const pageNum = number.textContent.trim();
        number.setAttribute('aria-label', `Page ${pageNum}`);
      }
    });

    // Enhance current page announcement
    const currentPage = this.pagination.querySelector('.pagination__number--current');
    if (currentPage) {
      const pageNum = currentPage.textContent.trim();
      currentPage.setAttribute('aria-label', `Current page, page ${pageNum}`);
    }
  }

  /**
   * Setup subtle hover effects
   */
  setupHoverEffects() {
    const interactiveElements = this.pagination.querySelectorAll(
      '.pagination__number, .pagination__nav'
    );

    interactiveElements.forEach((element) => {
      element.addEventListener('mouseenter', () => {
        if (!element.classList.contains('pagination__nav--disabled')) {
          this.addHoverEffect(element);
        }
      });

      element.addEventListener('mouseleave', () => {
        this.removeHoverEffect(element);
      });
    });
  }

  /**
   * Add subtle hover animation
   */
  addHoverEffect(element) {
    element.style.transform = 'translateY(-1px)';
    element.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  }

  /**
   * Remove hover animation
   */
  removeHoverEffect(element) {
    element.style.transform = '';
    element.style.boxShadow = '';
  }

  /**
   * Show loading state during navigation
   */
  showLoadingState() {
    this.pagination.classList.add('pagination--loading');
    
    // Add loading indicator to pagination info
    const info = this.pagination.querySelector('.pagination__info-text');
    if (info) {
      info.textContent = 'Loading...';
    }

    // Show notification
    if (window.showNotification) {
      window.showNotification('Loading products...', 'info');
    }
  }

  /**
   * Hide loading state (called when page loads)
   */
  hideLoadingState() {
    this.pagination?.classList.remove('pagination--loading');
  }

  /**
   * Update pagination info with smooth transition
   */
  updatePaginationInfo(first, last, total) {
    const info = this.pagination?.querySelector('.pagination__info-text');
    if (!info) return;

    info.style.opacity = '0';
    
    setTimeout(() => {
      info.textContent = `${first}–${last} of ${total}`;
      info.style.opacity = '1';
    }, 150);
  }

  /**
   * Smooth scroll to top of collection after pagination
   */
  scrollToCollection() {
    const collection = document.querySelector('.collection-page__products');
    if (collection) {
      collection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }
}

// Initialize pagination manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PaginationManager();
});

// Re-initialize after AJAX navigation (if applicable)
document.addEventListener('shopify:section:load', () => {
  new PaginationManager();
});

export default PaginationManager;