/**
 * Cart Drawer Controller
 * 
 * Cart drawer controller built on Drawer base class.
 * Handles cart operations, quantity updates, and checkout functionality.
 */

import DrawerBase from '../../base/scripts/DrawerBase.js';

class CartDrawerController extends DrawerBase {
  constructor({ drawerSelector, triggerSelector = '#cart-drawer-trigger' }) {
    super({ drawerSelector });                 // mounts .open / .close
    this.sectionId = window.cartDrawerSectionId;
    this.triggerSel = triggerSelector;

    // Register open/close on icon click
    this.cart_content = this.drawer.querySelector('#drawer__content__cart'); // used for `add item to cart open`
    this.cart_header = this.drawer.querySelector('#drawer__header__cart'); // used for `add item to cart open`
    this.cart_footer = this.drawer.querySelector('#drawer__footer__cart'); // used for `add item to cart open`
    this.registerTrigger(this.triggerSel);     // open on icon click
    this.registerContent(
      '#drawer__content__cart',
      '#drawer__header__cart',
      ['#cart-drawer-trigger'],
      '#drawer__footer__cart'
    );     // open on icon click

    this._wireGlobalAddToCart();
    this._refreshAndBind();                    // initial hydrate
  }

  /* ----------  cart‑API helpers  ---------- */
  _updateLine(line, quantity) {
    const fd = new FormData();
    fd.append('line', line);
    fd.append('quantity', quantity);
    return fetch('/cart/change.js', { method: 'POST', body: fd })
      .then(() => this._refreshAndBind());
  }

  _fetchCartData() {
    return fetch('/cart.js?_=' + Date.now()).then(r => r.json());
  }

  _fetchSectionHTML() {
    const url = `/?sections=${this.sectionId}&_=${Date.now()}`;
    return fetch(url).then(r => r.json()).then(j => j[this.sectionId]);
  }

  /* ----------  DOM & event binding  ---------- */
  _refreshAndBind() {
    this._fetchSectionHTML()
      .then(html => {
        const tmp = new DOMParser().parseFromString(html, 'text/html');

        /* Refresh ONLY the cart drawer’s own nodes to avoid clobbering siblings */
        ['#drawer__content__cart', '#drawer__footer__cart'].forEach(sel => {
          const target = this.drawer.querySelector(sel);
          const fresh = tmp.querySelector(sel);
          if (target && fresh) target.innerHTML = fresh.innerHTML;
        });
        /* Ensure the freshly‑injected markup remains visible only if cart drawer is active */
        if (this.cart_content && this.cart_content.classList.contains('is-open')) {
          this._openCartContent();
        }

        this._updateCartCountBadge();
        this._bindQuantityButtons();
        this._bindRemoveButtons();
        this._bindQuantityInputs();
        this._bindFormsAddToCart();
        return this._fetchCartData();
      })
      .then(c => this._toggleCheckoutButton(c.item_count))
      .catch(error => {
        if (window.logger) {
          window.logger.error('Error refreshing cart drawer', error);
        }
      });
  }

  _bindQuantityButtons() {
    this.drawer.querySelectorAll('.quantity-button').forEach(btn => {
      btn.onclick = () => {
        const line = btn.dataset.line;
        const input = this.drawer.querySelector(`input.quantity-input[data-line="${line}"]`);
        let quantity = parseInt(input.value, 10);
        quantity += btn.classList.contains('quantity-button--plus') ? 1 : -1;
        if (quantity < 1) return;
        this._updateLine(line, quantity);
      };
    });
  }

  _bindRemoveButtons() {
    this.drawer.querySelectorAll('.cart-drawer__item-remove')
      .forEach(btn => btn.onclick = () => this._updateLine(btn.dataset.line, 0));
  }

  _bindQuantityInputs() {
    this.drawer.querySelectorAll('input.quantity-input').forEach(inp => {
      inp.onchange = () => {
        let q = parseInt(inp.value, 10);
        if (isNaN(q) || q < 1) q = 1;
        this._updateLine(inp.dataset.line, q);
      };
    });
  }

  _addToCart(body) {
    return fetch('/cart/add.js', { method: 'POST', body })
      .then(() => this._refreshAndBind())
      .then(() => this.open())
      .catch(error => {
        if (window.logger) {
          window.logger.error('Error adding product to cart', error);
        }
      });
  }

  _bindFormsAddToCart() {
    document.querySelectorAll('form[action^="/cart/add"]')
      .forEach(f => f.onsubmit = e => {
        e.preventDefault();
        this._addToCart(new FormData(f));
      });
  }

  /* ----------  misc UI helpers  ---------- */
  _updateCartCountBadge() {
    this._fetchCartData().then(c => {
      // Update cart count containers (both header and drawer)
      document.querySelectorAll('.cart-count-container').forEach(box => {
        box.style.display = c.item_count ? 'block' : 'none';
        box.querySelectorAll('.cart-count').forEach(el => el.textContent = c.item_count);
      });

      // Update standalone cart-count elements (fallback for any missed elements)
      document.querySelectorAll('.cart-count:not(.cart-count-container .cart-count)').forEach(el => {
        el.textContent = c.item_count;
        // Show/hide parent if it has cart button styling
        const parent = el.closest('.icon-button--cart, .cart-count-badge');
        if (parent) {
          el.style.display = c.item_count ? 'block' : 'none';
        }
      });

      // Update ARIA labels for accessibility
      document.querySelectorAll('#cart-status').forEach(el => {
        el.textContent = c.item_count > 0 
          ? (window.cartStatusMessages?.hasItems || `${c.item_count} items in cart`)
          : (window.cartStatusMessages?.empty || 'Cart is empty');
      });

      // Update button aria-expanded state based on cart contents
      document.querySelectorAll('button[aria-describedby="cart-status"]').forEach(btn => {
        if (c.item_count > 0) {
          btn.setAttribute('aria-expanded', 'false');
          btn.setAttribute('aria-haspopup', 'dialog');
        } else {
          btn.removeAttribute('aria-expanded');
          btn.removeAttribute('aria-haspopup');
        }
      });
    }).catch(error => {
      if (window.logger) {
        window.logger.error('Error updating cart count badge', error);
      }
    });
  }

  _toggleCheckoutButton(itemCount) {
    const btn = this.drawer.querySelector('#cart-checkout-button');
    if (!btn) return;
    
    const isDisabled = itemCount === 0;
    
    // Handle both button and link elements
    if (btn.tagName === 'A') {
      // For link elements, set aria-disabled and prevent clicks
      btn.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
      btn.setAttribute('tabindex', isDisabled ? '-1' : '0');
      
      // Remove existing click handlers to prevent memory leaks
      btn.removeEventListener('click', this._preventDisabledClick);
      
      if (isDisabled) {
        // Add click prevention for disabled state
        btn.addEventListener('click', this._preventDisabledClick);
      }
    } else {
      // For button elements, use the disabled attribute
      btn.disabled = isDisabled;
      btn.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }
  }

  _preventDisabledClick(event) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  _openCartContent() {
    this.cart_content.classList.add('is-open');
    this.cart_header.classList.add('is-open');
    this.cart_footer.classList.add('is-open');
  }

  /* ----------  public helpers ---------- */
  _wireGlobalAddToCart() {
    let isAddingToCart = false;
    const addToCartTimeout = 1000; // 1 second timeout

    window.addItemToCart = (id, qty = 1) => {
      if (isAddingToCart) {
        if (window.logger) {
          window.logger.log('Add to cart request ignored - still processing previous request');
        }
        return Promise.resolve();
      }

      isAddingToCart = true;

      const body = JSON.stringify({ id, quantity: qty });
      const headers = { 'Content-Type': 'application/json' };

      return fetch('/cart/add.js', { method: 'POST', headers, body })
        .then(() => this._refreshAndBind())
        .then(() => this.open())
        .then(() => this._openCartContent())
        .catch(error => {
          if (window.logger) {
            window.logger.error('Error updating product price', error);
          }
        })
        .finally(() => {
          setTimeout(() => {
            isAddingToCart = false;
          }, addToCartTimeout);
        });
    };
  }
}

function initCartDrawer() {
  if (window.cartDrawerInitialized) {
    return;
  }
  window.cartDrawerInitialized = true;

  return new CartDrawerController({ drawerSelector: '#cart-drawer' });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCartDrawer);
} else {
  initCartDrawer();
}

export { CartDrawerController, initCartDrawer };
export default initCartDrawer;
