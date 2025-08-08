//  assets/product-variants-base.js
// --------------------------------------------------------------
// Base Class for Product Variant Controllers
// Provides shared functionality for both product cards and product pages
// Updated to use dynamic option names instead of hardcoded indices
// Version: 2.1 - Fixed variant selection to consider both color and size
// --------------------------------------------------------------

class ProductVariantControllerBase {
    /**
     * @param {HTMLElement} root - Container element
     * @param {Object} options - Configuration options
     */
    constructor(root, options = {}) {
        this.root = root;
        this.options = {
            context: 'base', // 'card' or 'page'
            ...options
        };
        
        // Parse product data from standardized script tag
        const productData = this.parseProductData();
        
        // Initialize from parsed data
        this.productId = productData.productId;
        this.currentVariantId = productData.initialVariantId;
        this.variants = productData.variants;
        this.colorTranslations = productData.colorTranslations || {};
        this.productOptions = productData.options || [];
        this.images = productData.images || [];
        this.optionMapping = productData.optionMapping || {};
        
        // Cache DOM elements
        this.colorSwatches = this.root.querySelector('[data-color-swatches]');
        this.sizePills = this.root.querySelector('[data-size-pills]');
        
        // Track current selections
        this.currentColor = null;
        this.currentSize = null;
        
        // Bind methods
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleSizeChange = this.handleSizeChange.bind(this);
    }

    /* ---------------------------------------------------------- */
    /* Lifecycle Methods                                          */
    /* ---------------------------------------------------------- */
    init() {
        // Listen for variant change events
        if (this.colorSwatches) {
            this.colorSwatches.addEventListener('click', this.handleColorClick.bind(this));
        }
        if (this.sizePills) {
            this.sizePills.addEventListener('click', this.handleSizeClick.bind(this));
        }
        
        // Initial sync and set current selections
        this.syncVariantState();
        this.initializeCurrentSelections();
    }

    destroy() {
        // Clean up event listeners
        if (this.colorSwatches) {
            this.colorSwatches.removeEventListener('click', this.handleColorClick.bind(this));
        }
        if (this.sizePills) {
            this.sizePills.removeEventListener('click', this.handleSizeClick.bind(this));
        }
    }

    /* ---------------------------------------------------------- */
    /* Initialize Current Selections                              */
    /* ---------------------------------------------------------- */
    initializeCurrentSelections() {
        // Don't set initial selections from variant on product page
        // to ensure no size is pre-selected
        if (this.options.context === 'page') {
            this.currentColor = null;
            this.currentSize = null;
            
            // Check for selected color in DOM
            const selectedColor = this.colorSwatches?.querySelector('.color-swatch.is-selected');
            if (selectedColor) {
                const variantId = parseInt(selectedColor.dataset.variantId);
                const variant = this.getVariantById(variantId);
                if (variant && variant.optionsByName.color) {
                    this.currentColor = variant.optionsByName.color;
                }
            }
            
            return;
        }
        
        // For cards, set initial color and size based on current variant
        const currentVariant = this.getVariantById(this.currentVariantId);
        if (currentVariant) {
            this.currentColor = currentVariant.optionsByName.color;
            this.currentSize = currentVariant.optionsByName.size;
        }
        
        // Also check for selected elements in DOM
        const selectedColor = this.colorSwatches?.querySelector('.color-swatch.is-selected');
        if (selectedColor) {
            const variantId = parseInt(selectedColor.dataset.variantId);
            const variant = this.getVariantById(variantId);
            if (variant && variant.optionsByName.color) {
                this.currentColor = variant.optionsByName.color;
            }
        }
        
        const selectedSize = this.sizePills?.querySelector('.size-pill.is-selected');
        if (selectedSize) {
            const sizeValue = selectedSize.dataset.sizeValue || 
                            selectedSize.dataset.size ||
                            selectedSize.querySelector('input')?.value ||
                            selectedSize.textContent?.trim();
            if (sizeValue) this.currentSize = sizeValue;
        }
    }

    /* ---------------------------------------------------------- */
    /* Data Parsing                                               */
    /* ---------------------------------------------------------- */
    parseProductData() {
        // Look for the standardized product data script tag within the root element
        const dataScript = this.root.querySelector('[data-product-data]');
        
        if (!dataScript) {
            console.error('Product data script tag not found');
            return {
                productId: null,
                initialVariantId: null,
                variants: [],
                colorTranslations: {},
                options: [],
                images: [],
                optionMapping: {}
            };
        }
        
        try {
            const data = JSON.parse(dataScript.textContent);
            
            // Ensure optionsByName exists for each variant if missing
            if (data.variants && Array.isArray(data.variants)) {
                data.variants = data.variants.map(variant => {
                    if (!variant.optionsByName) {
                        variant.optionsByName = {
                            size: variant.options?.[0] || null,
                            color: variant.options?.[1] || null
                        };
                    }
                    return variant;
                });
            }
            
            return data;
        } catch (e) {
            console.error('Failed to parse product data:', e);
            console.error('Product data content:', dataScript.textContent);
            return {
                productId: null,
                initialVariantId: null,
                variants: [],
                colorTranslations: {},
                options: [],
                images: [],
                optionMapping: {}
            };
        }
    }

    /* ---------------------------------------------------------- */
    /* Event Handlers                                             */
    /* ---------------------------------------------------------- */
    handleColorClick(e) {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch || swatch.classList.contains('is-disabled') || swatch.classList.contains('is-gallery-transitioning')) return;
        
        // Get variant ID from the swatch
        const swatchVariantId = parseInt(swatch.dataset.variantId);
        if (!swatchVariantId) {
            console.warn('No variant ID found on swatch', swatch);
            return;
        }
        
        // Get the variant to find its color value
        const swatchVariant = this.getVariantById(swatchVariantId);
        if (!swatchVariant) {
            console.warn('No variant found for ID:', swatchVariantId);
            return;
        }
        
        // Get color value from the variant
        const colorValue = swatchVariant.optionsByName.color;
        if (!colorValue) {
            console.warn('No color value found in variant', swatchVariant);
            return;
        }
        
        // Update current color
        this.currentColor = colorValue;
        
        // Find the correct variant based on new color and current size
        let variantId;
        if (this.currentSize) {
            // If size is selected, find variant with both color and size
            const variant = this.getVariantByOptions({
                color: colorValue,
                size: this.currentSize
            });
            variantId = variant ? variant.id : null;
        } else {
            // If no size selected, use the swatch's default variant ID
            variantId = swatchVariantId;
        }
        
        if (!variantId) {
            console.warn('No variant found for color:', colorValue, 'and size:', this.currentSize);
            return;
        }
        
        // Update visual state
        this.updateColorSelection(swatch);
        
        // Update current variant
        this.currentVariantId = variantId;
        
        // Handle color-specific updates
        this.handleColorChange(variantId, swatch);
        
        // Emit event
        this.root.dispatchEvent(new CustomEvent('colorSwatch:change', {
            bubbles: true,
            detail: { variantId, swatch, colorValue }
        }));
    }

    handleSizeClick(e) {
        const pill = e.target.closest('.size-pill');
        if (!pill || pill.disabled) return;
        
        // Try multiple ways to get size value
        const sizeValue = pill.dataset.sizeValue || 
                        pill.dataset.size ||
                        pill.querySelector('input')?.value ||
                        pill.textContent?.trim();
        
        if (!sizeValue) {
            console.warn('No size value found on pill', pill);
            return;
        }
        
        // Update current size
        this.currentSize = sizeValue;
        
        // Find the correct variant based on current color and new size
        let variantId;
        if (this.currentColor) {
            // If color is selected, find variant with both color and size
            const variant = this.getVariantByOptions({
                color: this.currentColor,
                size: sizeValue
            });
            variantId = variant ? variant.id : null;
        } else {
            // If no color selected, use the pill's variant ID
            variantId = parseInt(pill.dataset.variantId);
        }
        
        if (!variantId) {
            console.warn('No variant found for size:', sizeValue, 'and color:', this.currentColor);
            return;
        }
        
        // Update visual state
        this.updateSizeSelection(pill);
        
        // Update current variant
        this.currentVariantId = variantId;
        
        // Handle size-specific updates
        this.handleSizeChange(variantId, pill);
        
        // Emit event
        this.root.dispatchEvent(new CustomEvent('sizePill:change', {
            bubbles: true,
            detail: { variantId, pill, sizeValue }
        }));
    }

    /* ---------------------------------------------------------- */
    /* Visual State Updates                                       */
    /* ---------------------------------------------------------- */
    updateColorSelection(selectedSwatch) {
        this.colorSwatches.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.toggle('is-selected', swatch === selectedSwatch);
            if (swatch === selectedSwatch) {
                swatch.setAttribute('aria-current', 'true');
            } else {
                swatch.removeAttribute('aria-current');
            }
        });
    }

    updateSizeSelection(selectedPill) {
        this.sizePills.querySelectorAll('.size-pill').forEach(pill => {
            pill.classList.toggle('is-selected', pill === selectedPill);
            if (pill === selectedPill) {
                pill.setAttribute('aria-current', 'true');
            } else {
                pill.removeAttribute('aria-current');
            }
        });
    }

    /* ---------------------------------------------------------- */
    /* Variant State Management                                   */
    /* ---------------------------------------------------------- */
    syncVariantState() {
        if (!this.currentVariantId) return;
        
        const variant = this.getVariantById(this.currentVariantId);
        if (!variant) return;
        
        // Sync size pills availability based on current color
        this.updateSizePillsAvailability();
    }

    updateSizePillsAvailability() {
        if (!this.sizePills) return;
        
        // Use current color or get from current variant
        const currentColor = this.currentColor || 
                           (this.currentVariantId ? this.getVariantById(this.currentVariantId)?.optionsByName.color : null);
        
        if (!currentColor) return;
        
        this.sizePills.querySelectorAll('.size-pill').forEach(pill => {
            const sizeValue = pill.dataset.sizeValue || 
                            pill.dataset.size ||
                            pill.querySelector('input')?.value ||
                            pill.textContent?.trim();
            
            if (!sizeValue) return;
            
            // Find variant with this size and current color
            const matchingVariant = this.variants.find(v => 
                v.optionsByName.size === sizeValue && v.optionsByName.color === currentColor
            );
            
            if (matchingVariant) {
                pill.disabled = false;
                pill.dataset.variantId = matchingVariant.id;
                pill.classList.remove('is-disabled');
            } else {
                pill.disabled = true;
                pill.classList.add('is-disabled');
                delete pill.dataset.variantId;
            }
        });
    }

    /* ---------------------------------------------------------- */
    /* Price Updates                                              */
    /* ---------------------------------------------------------- */
    updatePrices(variantId) {
        const variant = this.getVariantById(variantId);
        if (!variant) return;
        
        const priceEl = this.root.querySelector('.price:not(.price--compare)');
        const compareEl = this.root.querySelector('.price--compare[data-compare-price]');
        const badgeEl = this.root.querySelector('.product-card__badge, .badge-sale');
        
        // Format prices using Shopify money format
        const formatMoney = (cents) => {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR'
            }).format(cents / 100);
        };
        
        // Update price
        if (priceEl && variant.price) {
            priceEl.innerHTML = formatMoney(variant.price);
            priceEl.classList.toggle('price--sale', variant.comparePrice && variant.comparePrice > variant.price);
        }
        
        // Update compare price
        if (compareEl) {
            const showCompare = variant.comparePrice && variant.comparePrice > variant.price;
            if (showCompare) {
                compareEl.innerHTML = formatMoney(variant.comparePrice);
                compareEl.hidden = false;
            } else {
                compareEl.hidden = true;
            }
        }
        
        // Update sale badge
        if (badgeEl) {
            const showBadge = variant.comparePrice && variant.comparePrice > variant.price;
            badgeEl.hidden = !showBadge;
            
            if (showBadge) {
                const salePct = Math.round(((variant.comparePrice - variant.price) / variant.comparePrice) * 100);
                const badgePctEl = badgeEl.querySelector('.badge-percentage');
                if (badgePctEl) badgePctEl.textContent = salePct;
            }
        }
    }

    /* ---------------------------------------------------------- */
    /* Helper Methods                                             */
    /* ---------------------------------------------------------- */
    getVariantById(variantId) {
        return this.variants.find(v => v.id == variantId);
    }

    getVariantByOptions(options) {
        return this.variants.find(v => {
            // Compare using optionsByName
            if (options.size && v.optionsByName.size !== options.size) return false;
            if (options.color && v.optionsByName.color !== options.color) return false;
            return true;
        });
    }

    /* ---------------------------------------------------------- */
    /* Option Helpers                                             */
    /* ---------------------------------------------------------- */
    hasColorOption() {
        return this.optionMapping.hasOwnProperty('color');
    }

    hasSizeOption() {
        return this.optionMapping.hasOwnProperty('size');
    }

    getOptionValue(variant, optionName) {
        return variant.optionsByName[optionName] || null;
    }

    /* ---------------------------------------------------------- */
    /* Public Methods for External Use                            */
    /* ---------------------------------------------------------- */
    getCurrentSize() {
        return this.currentSize;
    }

    getCurrentColor() {
        return this.currentColor;
    }

    hasSelectedSize() {
        return !!this.currentSize;
    }

    hasSelectedColor() {
        return !!this.currentColor;
    }

    /* ---------------------------------------------------------- */
    /* Abstract Methods (to be implemented by subclasses)         */
    /* ---------------------------------------------------------- */
    handleColorChange(variantId, swatch) {
        // Override in subclasses
        throw new Error('handleColorChange must be implemented by subclass');
    }

    handleSizeChange(variantId, pill) {
        // Override in subclasses
        throw new Error('handleSizeChange must be implemented by subclass');
    }
}

// Export for use in other files
window.ProductVariantControllerBase = ProductVariantControllerBase;

// Export as ES6 module
export default ProductVariantControllerBase;
