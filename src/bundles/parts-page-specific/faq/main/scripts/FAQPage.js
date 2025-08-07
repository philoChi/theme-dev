/**
 * FAQ Page Section
 * Handles search functionality, dropdown behavior, and direct links
 */
class FAQSection extends HTMLElement {
  constructor() {
    super();
    
    this.config = {
      singleDropdown: this.dataset.singleDropdown === 'true',
      enableDirectLinks: this.dataset.enableDirectLinks === 'true',
      debounceDelay: 100
    };
    
    // Get translation strings from data attributes
    this.i18n = {
      noResults: this.dataset.i18nNoResults || 'No results found for "{{ query }}"',
      resultsOne: this.dataset.i18nResultsOne || '1 result found',
      resultsOther: this.dataset.i18nResultsOther || '{{ count }} results found'
    };
    
    this.elements = {};
    this.searchTimeout = null;
    
    console.log('[FAQSection] Initializing with config:', this.config);
  }
  
  connectedCallback() {
    this.init();
  }
  
  init() {
    try {
      this.cacheElements();
      this.attachEventListeners();
      this.handleDirectLink();
      
      console.log('[FAQSection] Successfully initialized');
    } catch (error) {
      console.error('[FAQSection] Initialization failed:', error);
    }
  }
  
  cacheElements() {
    this.elements = {
      searchInput: this.querySelector('[data-faq-search-input]'),
      searchResults: this.querySelector('[data-faq-search-results]'),
      faqList: this.querySelector('[data-faq-list]'),
      faqItems: this.querySelectorAll('[data-faq-item]'),
      dropdowns: this.querySelectorAll('[data-dropdown]')
    };
  }
  
  attachEventListeners() {
    // Search functionality
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', this.handleSearch.bind(this));
    }
    
    // Single dropdown behavior
    if (this.config.singleDropdown) {
      this.elements.dropdowns.forEach(dropdown => {
        dropdown.addEventListener('dropdown:open', this.handleDropdownOpen.bind(this));
      });
    }
  }
  
  handleSearch(event) {
    clearTimeout(this.searchTimeout);
    
    this.searchTimeout = setTimeout(() => {
      const query = event.target.value.toLowerCase().trim();
      this.filterFAQs(query);
    }, this.config.debounceDelay);
  }
  
  filterFAQs(query) {
    let visibleCount = 0;
    
    this.elements.faqItems.forEach(item => {
      const question = item.textContent.toLowerCase();
      const isVisible = !query || question.includes(query);
      
      item.style.display = isVisible ? '' : 'none';
      item.setAttribute('data-hidden', !isVisible);
      
      if (isVisible) visibleCount++;
    });
    
    this.updateSearchResults(query, visibleCount);
  }
  
  updateSearchResults(query, count) {
    if (!this.elements.searchResults) return;
    
    if (query) {
      let text;
      if (count === 0) {
        text = this.i18n.noResults.replace('{{ query }}', query);
      } else if (count === 1) {
        text = this.i18n.resultsOne;
      } else {
        text = this.i18n.resultsOther.replace('{{ count }}', count);
      }
      
      this.elements.searchResults.textContent = text;
      this.elements.searchResults.style.display = 'block';
    } else {
      this.elements.searchResults.style.display = 'none';
    }
  }
  
  handleDropdownOpen(event) {
    if (!this.config.singleDropdown) return;
    
    const openedDropdown = event.target;
    
    this.elements.dropdowns.forEach(dropdown => {
      if (dropdown !== openedDropdown && dropdown.classList.contains('is-open')) {
        dropdown.querySelector('[data-dropdown-toggle]')?.click();
      }
    });
  }
  
  handleDirectLink() {
    if (!this.config.enableDirectLinks) return;
    
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#question-')) return;
    
    const targetFAQ = this.querySelector(hash);
    if (!targetFAQ) return;
    
    // Wait for page load then expand and scroll
    setTimeout(() => {
      const dropdown = targetFAQ.querySelector('[data-dropdown-toggle]');
      if (dropdown && !dropdown.parentElement.classList.contains('is-open')) {
        dropdown.click();
      }
      
      targetFAQ.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// Define custom element
customElements.define('faq-section', FAQSection);