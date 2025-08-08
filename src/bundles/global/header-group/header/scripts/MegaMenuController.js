export class MegaMenuController {
  constructor() {
    this.navLinks = [];
    this.megaMenuContainer = document.querySelector(".mega-menu-container");
    this.closeTimer = null;
  }

  init() {
    if (!this.megaMenuContainer) return;
    
    this.navLinks = Array.from(document.querySelectorAll("[data-menu]"));
    if (!this.navLinks.length) return;

    this.bindEvents();
    this.bindResizeHandler();
  }

  clearCloseTimer() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  setAriaStates(expanded, activeLink = null) {
    this.navLinks.forEach(l => l.setAttribute("aria-expanded", "false"));
    if (expanded && activeLink) {
      activeLink.setAttribute("aria-expanded", "true");
    }
  }

  getActiveContent() {
    return this.megaMenuContainer.querySelector('.mega-menu-content[aria-hidden="false"]');
  }

  closeMenu() {
    this.closeTimer = setTimeout(() => {
      this.setAriaStates(false);
      this.megaMenuContainer.setAttribute("aria-expanded", "false");
      
      const activeContent = this.getActiveContent();
      if (activeContent) {
        activeContent.setAttribute("aria-hidden", "true");
      }
      
      this.megaMenuContainer.style.height = "0";
    }, 100);
  }

  openMenu(contentEl, navLink = null) {
    if (!contentEl) return;

    this.setAriaStates(true, navLink);
    this.clearCloseTimer();
    
    this.megaMenuContainer.setAttribute("aria-expanded", "true");
    
    const currentlyActive = this.getActiveContent();
    if (currentlyActive && currentlyActive !== contentEl) {
      currentlyActive.setAttribute("aria-hidden", "true");
    }
    
    contentEl.setAttribute("aria-hidden", "false");
    this.megaMenuContainer.style.height = contentEl.scrollHeight + "px";
    
    this.announceMenuOpening(navLink);
  }

  announceMenuOpening(navLink) {
    const announcement = document.getElementById("navigation-announcements");
    if (announcement && navLink) {
      announcement.textContent = `${navLink.textContent} menu opened`;
      setTimeout(() => announcement.textContent = "", 1000);
    }
  }

  useHover() {
    return window.innerWidth > 991;
  }

  bindNavEvents() {
    // Clean existing event listeners
    this.navLinks.forEach(link => {
      const clean = link.cloneNode(true);
      link.parentNode.replaceChild(clean, link);
    });

    // Refresh navLinks reference after DOM replacement
    this.navLinks = Array.from(document.querySelectorAll("[data-menu]"));
    
    // Bind navigation events
    this.navLinks.forEach(link => {
      const contentEl = document.getElementById(link.dataset.menu);
      if (!contentEl) return;

      if (this.useHover()) {
        link.addEventListener("mouseenter", () => this.openMenu(contentEl, link));
      } else {
        link.addEventListener("click", e => {
          e.preventDefault();
          const isExpanded = link.getAttribute("aria-expanded") === "true";
          isExpanded ? this.closeMenu() : this.openMenu(contentEl, link);
        });
      }
    });

    // Simple links close mega menus on hover
    if (this.useHover()) {
      document.querySelectorAll(".site-header__nav .feature-button")
        .forEach(link => {
          link.addEventListener("mouseenter", () => {
            this.clearCloseTimer();
            this.closeMenu();
          });
        });
    }
  }

  bindEvents() {
    // Mega menu container event listeners
    this.megaMenuContainer.addEventListener("mouseenter", () => this.clearCloseTimer());
    this.megaMenuContainer.addEventListener("mouseleave", () => {
      if (this.useHover()) this.closeMenu();
    });

    this.bindNavEvents();
  }

  static debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  bindResizeHandler() {
    window.addEventListener("resize", MegaMenuController.debounce(() => {
      this.closeMenu();
      this.bindNavEvents();
    }, 400));
  }
}