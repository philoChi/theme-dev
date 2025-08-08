/*  assets/product-variants-page.js
--------------------------------------------------------------
Product Page Variant Controller
Extends base controller for product page specific behavior (case b)
- Updates color/size labels on variant change
- Updates prices on variant change
- Does NOT add to cart on size selection
- Does NOT update images on color change
Version: 3.1 - Updated to use improved variant selection logic and remove disabled button state
--------------------------------------------------------------*/

// ProductVariantControllerBase is available globally from features-shared-all bundle
// Ensure features-shared-all.js is loaded before this bundle in theme.liquid

// Factory function to create the class after base is available
function createProductPageVariantController() {
    if (!window.ProductVariantControllerBase) {
        throw new Error('ProductVariantControllerBase not available. Ensure features-shared-all.js is loaded first.');
    }
    
    class ProductPageVariantController extends window.ProductVariantControllerBase {
        constructor(root) {
            super(root, { context: 'page' });

            // Cache label elements
            this.colorLabel = this.root.querySelector('[data-selected-color-name]');
            this.sizeLabel = this.root.querySelector('[data-selected-size-name]');
            this.addToCartButton = this.root.querySelector('[data-add-to-cart]');
        }

        /* ---------------------------------------------------------- */
        /* Initialize with current variant                            */
        /* ---------------------------------------------------------- */
        init() {
            super.init();

            // Remove disabled state - button is always clickable now
            if (this.addToCartButton) {
                this.addToCartButton.classList.remove('button--disabled');
                this.addToCartButton.removeAttribute('disabled');
                this.addToCartButton.setAttribute('aria-disabled', 'false');
            }

            // Set initial labels if we have a current variant
            if (this.currentVariantId) {
                this.updateLabelsFromVariant(this.currentVariantId);
            }
        }

        /* -------------------------------------------------- */
        /* Helper - Removed updateAddToCartState             */
        /* -------------------------------------------------- */
        // updateAddToCartState method has been removed as button is always enabled

        /* ---------------------------------------------------------- */
        /* Override Abstract Methods                                  */
        /* ---------------------------------------------------------- */
        handleColorChange(variantId, swatch) {
            const variant = this.getVariantById(variantId);
            if (!variant) return;

            // Update color label using dynamic option access
            const colorValue = this.getOptionValue(variant, 'color');
            if (colorValue) {
                this.updateColorLabel(colorValue);
            }

            // Update prices
            this.updatePrices(variantId);

            // Update size pills availability
            this.updateSizePillsAvailability();

            // Do NOT update images for product page for now
        }

        handleSizeChange(variantId, pill) {
            const variant = this.getVariantById(variantId);
            if (!variant) return;

            // Update size label using dynamic option access
            const sizeValue = this.getOptionValue(variant, 'size');
            if (sizeValue) {
                this.updateSizeLabel(sizeValue);
            }

            // Do NOT add to cart - wait for CTA button
            // Button remains enabled - validation happens on click
        }

        /* ---------------------------------------------------------- */
        /* Label Updates                                              */
        /* ---------------------------------------------------------- */
        updateColorLabel(colorValue) {
            if (!this.colorLabel || !colorValue) return;

            // Use translation if available from base class colorTranslations
            const translatedColor = this.colorTranslations[colorValue] || colorValue;
            this.colorLabel.textContent = translatedColor;
        }

        updateSizeLabel(sizeValue) {
            if (!this.sizeLabel || !sizeValue) return;
            this.sizeLabel.textContent = sizeValue;
        }

        /* ---------------------------------------------------------- */
        /* Public Methods for External Use                            */
        /* ---------------------------------------------------------- */
        getCurrentVariantId() {
            return this.currentVariantId;
        }

        updateLabelsFromVariant(variantId, onlyColor = false, onlySize = false) {
            const variant = this.getVariantById(variantId);
            if (!variant) return;

            // Update color label if needed and color option exists
            if (!onlySize && this.hasColorOption()) {
                const colorValue = this.getOptionValue(variant, 'color');
                if (colorValue) {
                    this.updateColorLabel(colorValue);
                }
            }

            // Update size label if needed and size option exists
            if (!onlyColor && this.hasSizeOption()) {
                const sizeValue = this.getOptionValue(variant, 'size');
                if (sizeValue) {
                    this.updateSizeLabel(sizeValue);
                }
            }
        }
    }
    
    return ProductPageVariantController;
}

/* -------------------------------------------------------------- */
/* Shopify Registry for Product Pages                            */
/* -------------------------------------------------------------- */
if (typeof window.Shopify === 'undefined') window.Shopify = {};

Shopify.ProductPageVariants = {
    _instances: new WeakMap(),
    _ProductPageVariantController: null,

    register(root) {
        if (!root) return;
        // Avoid double-registering
        if (this._instances.has(root)) this.unregister(root);

        // Create the class if not yet created
        if (!this._ProductPageVariantController) {
            this._ProductPageVariantController = createProductPageVariantController();
        }

        const instance = new this._ProductPageVariantController(root);
        instance.init();
        this._instances.set(root, instance);

        return instance; // Return instance for external use
    },

    unregister(root) {
        const instance = this._instances.get(root);
        if (instance) {
            instance.destroy();
            this._instances.delete(root);
        }
    },

    getInstance(root) {
        return this._instances.get(root);
    }
};

/* Export factory function for use in product page main JS */
window.createProductPageVariantController = createProductPageVariantController;

export default createProductPageVariantController;
