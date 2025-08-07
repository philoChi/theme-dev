/**
 * Base Drawer Class
 * 
 * A minimal, reusable Drawer controller class for Shopify themes.
 * Handles opening, closing, and managing drawer content visibility.
 */

class DrawerBase {
  constructor({ drawerSelector, overlaySelector = '.drawer__overlay' }) {
    this.drawer = document.querySelector(drawerSelector);
    this.overlay = document.querySelector(overlaySelector);

    if (!this.drawer || !this.overlay) {
      if (window.logger) {
        window.logger.warn(`[Drawer] Element(s) not found: ${drawerSelector}`);
      }
      return;
    }
    this._bindCloseButtons();
    this._bindGlobalKeyEvents();
  }

  /* ---------- Public API ---------- */
  open() {
    DrawerBase.#disableScrolling();
    this.drawer.classList.add('is-open');
    this.overlay.classList.add('is-open');
  }

  close() {
    /* prevent double‑trigger while an animation is already running */
    if (!this.drawer.classList.contains('is-open') ||
      this.drawer.classList.contains('is-closing')) return;

    /* Dispatch drawer closing event for cleanup */
    document.dispatchEvent(new CustomEvent('drawer:closing', {
      detail: { drawerId: this.drawer.id }
    }));

    /* 1 – start the slide‑out animation (keep .is-open so inner items stay visible) */
    this.drawer.classList.add('is-closing');
    this.overlay.classList.remove('is-open');          // stop accepting clicks
    this.overlay.classList.add('is-closing');       // trigger fade‑out

    /* 2 – define tidy‑up routine */
    const finish = () => {
      this.drawer.classList.remove('is-open', 'is-closing');
      this._removeOpenFromAll();                       // clear nested .is-open
      DrawerBase.#enableScrolling();
      this.overlay.classList.remove('is-closing');
      this.drawer.removeEventListener('animationend', finish);

      /* Dispatch drawer closed event after cleanup complete */
      document.dispatchEvent(new CustomEvent('drawer:closed', {
        detail: { drawerId: this.drawer.id }
      }));
      /* tidy overlay after its own transition */
    };

    /* 3 – call tidy‑up either on animation end or immediately for reduced‑motion users */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(finish);                   // no animation → finish next paint
    } else {
      this.drawer.addEventListener('animationend', finish, { once: true });
    }
  }

  /** Attach click‑to‑open behaviour to any trigger(s).  
   * @param {string|string[]} triggerSelector */
  registerTrigger(triggerSelector) {
    (Array.isArray(triggerSelector) ? triggerSelector : [triggerSelector])
      .forEach(sel =>
        document.querySelectorAll(sel).forEach(btn =>
          btn.addEventListener('click', e => {
            e.preventDefault();
            this.open();
          }),
        ),
      );
  }

  /** Show one specific content area + header (and optionally footer). */
  registerContent(contentSel, headerSel, triggerSelectors = [], footerSel) {
    triggerSelectors.forEach(sel =>
      document.querySelectorAll(sel).forEach(btn =>
        btn.addEventListener('click', e => {
          e.preventDefault();

          /* Clear any previously open content */
          this._removeOpenFromAll();

          /* always query *now*, never cache the node */
          const content = this.drawer.querySelector(contentSel);
          const header = this.drawer.querySelector(headerSel);
          const footer = footerSel ? this.drawer.querySelector(footerSel) : null;

          if (content) content.classList.add('is-open');
          if (header) header.classList.add('is-open');
          if (footer) footer.classList.add('is-open');

          /* Actually open the drawer */
          this.open();

          const input = header?.querySelector('[mpe="search-input"]');
          if (input) setTimeout(() => input.focus(), 50);
        }),
      ),
    );
  }

  /* ---------- Private helpers ---------- */
  _removeOpenFromAll() {
    // Remove the class from the drawer itself (only during close, not content switch)
    // this.drawer.classList.remove('is-open'); // Removed - was causing drawer to close

    // Remove 'is-open' from all drawer content items, headers, and footers
    const drawerStructuralElements = this.drawer.querySelectorAll('.drawer__header__item.is-open, .drawer__content__item.is-open, .drawer__footer__item.is-open');

    // Remove the class from each structural element
    drawerStructuralElements.forEach(el => {
      el.classList.remove('is-open');
    });
  }

  _bindCloseButtons() {
    const closeButtons = this.drawer.querySelectorAll('[mpe="drawer-close"], .drawer__close');
    closeButtons.forEach(btn => btn.addEventListener('click', () => this.close()));
    this.overlay.addEventListener('click', () => this.close());
  }

  _bindGlobalKeyEvents() {
    this._handleGlobalKeydown = (event) => {
      // Close drawer on Escape key if this drawer is open
      if (event.key === 'Escape' && this.drawer.classList.contains('is-open')) {
        event.preventDefault();
        this.close();
      }
    };

    document.addEventListener('keydown', this._handleGlobalKeydown);
  }

  static #setScrolling(enabled) {
    const root = document.documentElement;
    if (root.classList.contains('scroll-locked')) return;
    document.body.style.overflow = enabled ? 'auto' : 'hidden';
  }

  static #disableScrolling() {
    this.#setScrolling(false);
  }

  static #enableScrolling() {
    this.#setScrolling(true);
  }
}

export default DrawerBase;
