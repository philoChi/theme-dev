/**
 * section-product-page-main.js
 * ---------------------------
 * Handles product variant selection, quantity controls, add-to-cart, and feature chips
 * Version: 4.0 - Refactored to class-based architecture
 */

class ProductPageMain extends HTMLElement {
  constructor() {
    super();

    // Configuration
    this.config = {
      qtyInputSelector: '[data-qty-input]',
      qtyMinusSelector: '[data-qty-minus]',
      qtyPlusSelector: '[data-qty-plus]',
      addToCartSelector: '[data-add-to-cart]',
      productDataSelector: '[data-product-data]',
      sizePillsSelector: '[data-size-pills]',
      sizeLabelSelector: '[data-dynamic-size-label]',
      featureChipGroupSelector: '.feature-chip-group',
      featureChipSelector: '.feature-chip',
      highlightDuration: 1000,
      notificationDuration: {
        success: 2000,
        error: 4000
      }
    };

    // State
    this.state = {
      productData: null,
      currentVariantId: null,
      quantity: 1,
      controllers: {
        quantity: null,
        variant: null,
        cart: null,
        featureChips: null
      }
    };

    // Bind methods
    this.handleQuantityMinus = this.handleQuantityMinus.bind(this);
    this.handleQuantityPlus = this.handleQuantityPlus.bind(this);
    this.handleAddToCart = this.handleAddToCart.bind(this);
    this.handleColorSwatchChange = this.handleColorSwatchChange.bind(this);
    this.handleSizePillChange = this.handleSizePillChange.bind(this);
  }

  connectedCallback() {
    this.init();
  }

  disconnectedCallback() {
    this.destroy();
  }

  init() {
    try {
      this.loadProductData();
      this.initQuantityControls();
      this.initVariantControls();
      this.initAddToCartControls();
      this.initFeatureChips();
      this.attachEventListeners();

      if (window.logger) {
        window.logger.log('ProductPageMain initialized');
      }
    } catch (error) {
      this.handleError('Initialization failed', error);
    }
  }

  loadProductData() {
    const productDataElement = this.querySelector(this.config.productDataSelector);
    if (!productDataElement) {
      throw new Error('Product data element not found');
    }

    try {
      this.state.productData = JSON.parse(productDataElement.textContent);
      this.state.currentVariantId = this.state.productData.initialVariantId;
    } catch (error) {
      throw new Error('Failed to parse product data: ' + error.message);
    }
  }

  initQuantityControls() {
    const elements = {
      input: this.querySelector(this.config.qtyInputSelector),
      minus: this.querySelector(this.config.qtyMinusSelector),
      plus: this.querySelector(this.config.qtyPlusSelector)
    };

    if (!elements.input) return;

    // Create quantity controller
    this.state.controllers.quantity = {
      elements,
      getQuantity: () => parseInt(elements.input.value, 10) || 1,
      setQuantity: (qty) => {
        elements.input.value = Math.max(1, qty);
        this.state.quantity = parseInt(elements.input.value, 10);
      },
      increment: () => {
        elements.input.stepUp();
        this.state.quantity = parseInt(elements.input.value, 10);
      },
      decrement: () => {
        if (elements.input.value > 1) {
          elements.input.stepDown();
          this.state.quantity = parseInt(elements.input.value, 10);
        }
      }
    };

    // Set initial quantity
    this.state.quantity = this.state.controllers.quantity.getQuantity();
  }

  initVariantControls() {
    // Check if the variant controller is available
    if (!window.Shopify?.ProductPageVariants) {
      if (window.logger) {
        window.logger.error('ProductPageVariants controller not loaded');
      }
      return;
    }

    // Register with the variant controller
    this.state.controllers.variant = window.Shopify.ProductPageVariants.register(
      this,
      this.state.productData
    );
  }

  initAddToCartControls() {
    const addToCartButton = this.querySelector(this.config.addToCartSelector);

    if (!addToCartButton) return;

    this.state.controllers.cart = {
      button: addToCartButton,
      addToCart: this.handleAddToCart
    };
  }

  initFeatureChips() {
    const groups = this.querySelectorAll(this.config.featureChipGroupSelector);

    if (groups.length === 0) return;

    this.state.controllers.featureChips = {
      groups: Array.from(groups),
      chips: new Map(),
      initGroup: (group) => this.initFeatureChipGroup(group),
      reinitialize: () => {
        const allGroups = this.querySelectorAll(this.config.featureChipGroupSelector);
        allGroups.forEach(group => this.initFeatureChipGroup(group));
      }
    };

    // Initialize all groups
    groups.forEach(group => this.initFeatureChipGroup(group));
  }

  initFeatureChipGroup(group) {
    const chips = Array.from(group.querySelectorAll(this.config.featureChipSelector));
    const newChips = [];

    chips.forEach(chip => {
      // Remove existing listeners to prevent duplicates
      const newChip = chip.cloneNode(true);
      chip.parentNode.replaceChild(newChip, chip);
      newChips.push(newChip);

      // Store reference
      this.state.controllers.featureChips.chips.set(newChip, group);
    });

    // Add listeners with updated chip references
    newChips.forEach(newChip => {
      newChip.addEventListener('click', () => this.handleFeatureChipClick(newChip, newChips));
    });
  }

  handleFeatureChipClick(clickedChip, groupChips) {
    const isExpanded = clickedChip.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      // Collapse the clicked chip and show all chips
      clickedChip.setAttribute('aria-expanded', 'false');
      groupChips.forEach(chip => {
        chip.classList.remove('is-hidden');
      });
    } else {
      // Expand the clicked chip and hide others
      groupChips.forEach(chip => {
        if (chip === clickedChip) {
          chip.setAttribute('aria-expanded', 'true');
          chip.classList.remove('is-hidden');
        } else {
          chip.setAttribute('aria-expanded', 'false');
          chip.classList.add('is-hidden');
        }
      });
    }
  }

  attachEventListeners() {
    // Quantity controls
    if (this.state.controllers.quantity) {
      const { elements } = this.state.controllers.quantity;

      if (elements.minus) {
        elements.minus.addEventListener('click', this.handleQuantityMinus);
      }

      if (elements.plus) {
        elements.plus.addEventListener('click', this.handleQuantityPlus);
      }

      if (elements.input) {
        elements.input.addEventListener('change', () => {
          this.state.quantity = parseInt(elements.input.value, 10) || 1;
        });
      }
    }

    // Add to cart
    if (this.state.controllers.cart) {
      this.state.controllers.cart.button.addEventListener('click', this.handleAddToCart);
    }

    // Variant change events
    this.addEventListener('colorSwatch:change', this.handleColorSwatchChange);
    this.addEventListener('sizePill:change', this.handleSizePillChange);

    // Shopify section events
    document.addEventListener('shopify:section:load', this.handleSectionLoad.bind(this));

    // Window resize for gallery height management
    window.addEventListener('resize', this.handleResize);
  }

  removeEventListeners() {
    // Quantity controls
    if (this.state.controllers.quantity) {
      const { elements } = this.state.controllers.quantity;

      if (elements.minus) {
        elements.minus.removeEventListener('click', this.handleQuantityMinus);
      }

      if (elements.plus) {
        elements.plus.removeEventListener('click', this.handleQuantityPlus);
      }
    }

    // Add to cart
    if (this.state.controllers.cart) {
      this.state.controllers.cart.button.removeEventListener('click', this.handleAddToCart);
    }

    // Variant change events
    this.removeEventListener('colorSwatch:change', this.handleColorSwatchChange);
    this.removeEventListener('sizePill:change', this.handleSizePillChange);

    document.removeEventListener('shopify:section:load', this.handleSectionLoad);
    window.removeEventListener('resize', this.handleResize);
  }

  handleQuantityMinus() {
    if (this.state.controllers.quantity) {
      this.state.controllers.quantity.decrement();
      this.dispatchQuantityChangeEvent();
    }
  }

  handleQuantityPlus() {
    if (this.state.controllers.quantity) {
      this.state.controllers.quantity.increment();
      this.dispatchQuantityChangeEvent();
    }
  }

  handleAddToCart(event) {
    event.preventDefault();

    // Check if size is selected
    const sizeSelected = this.state.controllers.variant?.hasSelectedSize() || false;

    if (!sizeSelected) {
      this.showSizeSelectionError();
      return;
    }

    // Get current variant ID
    const variantId = this.state.controllers.variant?.getCurrentVariantId() ||
      this.state.currentVariantId;

    if (!variantId) {
      this.showAddToCartError();
      return;
    }

    // Add to cart
    if (typeof window.addItemToCart === 'function') {
      window.addItemToCart(variantId, this.state.quantity);
    } else {
      this.showAddToCartError();
    }
  }

  handleColorSwatchChange(event) {
    if (event.detail?.variantId && this.state.controllers.variant) {
      this.state.currentVariantId = event.detail.variantId;
      this.state.controllers.variant.updateLabelsFromVariant(event.detail.variantId, true, false);
    }
  }

  handleSizePillChange(event) {
    if (event.detail?.variantId && this.state.controllers.variant) {
      this.state.currentVariantId = event.detail.variantId;
      this.state.controllers.variant.updateLabelsFromVariant(event.detail.variantId, false, true);
    }
  }

  handleSectionLoad(event) {
    const section = event.target;
    if (section === this || this.contains(section)) {
      this.reinitialize();
    }
  }

  showSizeSelectionError() {
    // Get size label text
    const sizeLabel = this.querySelector(this.config.sizeLabelSelector);
    const sizeLabelText = sizeLabel ?
      sizeLabel.textContent.split(':')[0].trim() :
      'Size';

    // Create error message
    let message = this.state.productData?.translations?.selectSizeError ||
      'Please select a {{ size_label }} before adding to cart';
    message = message.replace('{{ size_label }}', sizeLabelText.toLowerCase());

    // Show notification
    this.showNotification(message, 'error');

    // Highlight size pills
    const sizePillsContainer = this.querySelector(this.config.sizePillsSelector);
    if (sizePillsContainer) {
      sizePillsContainer.classList.add('size-pills--highlight');
      setTimeout(() => {
        sizePillsContainer.classList.remove('size-pills--highlight');
      }, this.config.highlightDuration);
    }
  }

  showAddToCartSuccess() {
    const message = this.state.productData?.translations?.addedToCart || 'Added to cart!';
    this.showNotification(message, 'success');
  }

  showAddToCartError() {
    const message = this.state.productData?.translations?.addToCartError ||
      'Error: Could not add item to cart.';
    this.showNotification(message, 'error');

    if (window.logger) {
      window.logger.warn('addItemToCart function not available or variant ID missing');
    }
  }

  showNotification(message, type = 'info') {
    if (window.showNotification) {
      const duration = this.config.notificationDuration[type] || 3000;
      window.showNotification(message, type, duration);
    }
  }

  dispatchQuantityChangeEvent() {
    this.dispatchEvent(new CustomEvent('quantity:change', {
      bubbles: true,
      composed: true,
      detail: {
        quantity: this.state.quantity,
        productId: this.state.productData?.id
      }
    }));
  }

  reinitialize() {
    // Re-initialize controllers
    if (this.state.controllers.featureChips) {
      this.state.controllers.featureChips.reinitialize();
    }

    // Re-initialize gallery height management
    if (this.state.controllers.galleryHeight) {
      this.initGalleryHeightManagement();
    }

    // Re-load product data if needed
    try {
      this.loadProductData();
    } catch (error) {
      this.handleError('Failed to reload product data', error);
    }
  }

  handleError(message, error) {
    if (window.logger) {
      window.logger.error(`ProductPageMain: ${message}`, error);
    }
  }

  destroy() {
    this.removeEventListeners();

    // Clear controllers
    Object.keys(this.state.controllers).forEach(key => {
      this.state.controllers[key] = null;
    });

    this.state = null;
  }
}

// Register custom element
customElements.define('product-page-main', ProductPageMain);

// Legacy compatibility function
window.initProductPageMain = function (sectionId) {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);

  if (!section) {
    if (window.logger) {
      window.logger.warn(`Product page section with ID "${sectionId}" not found`);
    }
    return null;
  }

  // Check if already initialized
  if (section.tagName.toLowerCase() === 'product-page-main') {
    return section;
  }

  // Convert to custom element
  const productPageMain = document.createElement('product-page-main');
  productPageMain.innerHTML = section.innerHTML;

  // Copy attributes
  Array.from(section.attributes).forEach(attr => {
    productPageMain.setAttribute(attr.name, attr.value);
  });

  section.parentNode.replaceChild(productPageMain, section);

  return productPageMain;
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const autoInitSections = document.querySelectorAll('[data-section-type="product-main"][data-auto-init]');
  autoInitSections.forEach(section => {
    const sectionId = section.getAttribute('data-section-id');
    if (sectionId) {
      window.initProductPageMain(sectionId);
    }
  });
});

// Re-initialize on Shopify section load
document.addEventListener('shopify:section:load', event => {
  const section = event.target;
  if (section.getAttribute('data-section-type') === 'product-main') {
    const sectionId = section.getAttribute('data-section-id');
    if (sectionId) {
      window.initProductPageMain(sectionId);
    }
  }
});