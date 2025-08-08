/*  assets/product-variants-card.js
--------------------------------------------------------------
Product Card Variant Controller
Extends base controller for product card specific behavior
- Updates main image on color change
- Updates prices on variant change
- Adds to cart immediately on size selection
--------------------------------------------------------------*/

import ProductVariantControllerBase from './ProductVariantControllerBase.js';

class ProductCardVariantController extends ProductVariantControllerBase {
    constructor(root) {
        super(root, { context: 'card' });
        
        // Additional card-specific properties
        this.mainImage = this.root.querySelector('[data-main-image]');
        this.loadedImages = new Map();
        
        // Preload images on init
        this.preloadVariantImages();
    }

    /* ---------------------------------------------------------- */
    /* Override Abstract Methods                                  */
    /* ---------------------------------------------------------- */
    handleColorChange(variantId, swatch) {
        // Update product image
        const mediaUrl = swatch.dataset.mediaUrl;
        if (mediaUrl && this.mainImage) {
            this.switchVariantImage(mediaUrl);
        }
        
        // Update prices
        this.updatePrices(variantId);
        
        // Update size pills availability
        this.updateSizePillsAvailability();
    }

    handleSizeChange(variantId, pill) {
        // For product cards, immediately add to cart
        if (typeof window.addItemToCart === 'function') {
            window.addItemToCart(variantId, 1);
        } else {
            console.warn('addItemToCart function not available');
        }
    }

    /* ---------------------------------------------------------- */
    /* Image Handling                                             */
    /* ---------------------------------------------------------- */
    async switchVariantImage(imageUrl) {
        if (!this.mainImage) return;

        try {
            const absolute = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl;
            const base = absolute.replace(/width=\d+/, 'width={width}');
            const widths = [200, 400, 600];
            const srcset = widths.map(w => `${base.replace('{width}', w)} ${w}w`).join(', ');

            // Ensure image is loaded before switching
            await this.ensureImageLoaded(absolute);

            // Fade transition
            this.mainImage.style.opacity = '0';
            await new Promise(r => setTimeout(r, 200));
            this.mainImage.src = absolute;
            this.mainImage.srcset = srcset;
            this.mainImage.style.opacity = '1';
        } catch (error) {
            console.error('Error switching variant image:', error);
        }
    }

    async preloadVariantImages() {
        const links = this.root.querySelectorAll('link[rel="preload"][as="image"]');
        await Promise.all(Array.from(links).map(l => this.ensureImageLoaded(l.href)));
    }

    async ensureImageLoaded(url) {
        if (this.loadedImages.has(url)) return this.loadedImages.get(url);

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
        
        this.loadedImages.set(url, promise);
        return promise;
    }
}

/* -------------------------------------------------------------- */
/* Shopify Registry for Product Cards                            */
/* -------------------------------------------------------------- */
if (typeof window.Shopify === 'undefined') window.Shopify = {};

Shopify.ProductCardVariants = {
    _instances: new WeakMap(),

    register(root) {
        if (!root) return;
        // Avoid double-registering
        if (this._instances.has(root)) this.unregister(root);
        
        const instance = new ProductCardVariantController(root);
        instance.init();
        this._instances.set(root, instance);
    },

    unregister(root) {
        const instance = this._instances.get(root);
        if (instance) {
            instance.destroy();
            this._instances.delete(root);
        }
    }
};

/* Auto-initialize on DOM ready */
const initProductCardVariants = (scope = document) => {
    // Only initialize for product cards (not product pages)
    scope.querySelectorAll('.product-card[data-product-id]').forEach(card => {
        Shopify.ProductCardVariants.register(card);
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initProductCardVariants());
} else {
    initProductCardVariants();
}

/* Re-initialize on Shopify section lifecycle */
document.addEventListener('shopify:section:load', e => initProductCardVariants(e.target));
document.addEventListener('shopify:section:unload', e => {
    e.target.querySelectorAll('.product-card[data-product-id]')
        .forEach(card => Shopify.ProductCardVariants.unregister(card));
});

/* Export for module imports */
export default ProductCardVariantController;