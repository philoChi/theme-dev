// HeaderController.js - Class-based header management
// v2025-08-01 – Refactored to class-based architecture
// Smooth sticky header animation and mega menu functionality

import { MegaMenuController } from './MegaMenuController.js';
import { StickyHeaderController } from './StickyHeaderController.js';

class HeaderController {
  static debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  constructor() {
    this.header = document.querySelector(".site-header");
    this.megaMenuController = new MegaMenuController();
    this.stickyHeaderController = new StickyHeaderController(this.header);
    
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.megaMenuController.init();
        this.stickyHeaderController.init();
      });
    } else {
      this.megaMenuController.init();
      this.stickyHeaderController.init();
    }
  }
}

// Initialize when DOM is ready
new HeaderController();