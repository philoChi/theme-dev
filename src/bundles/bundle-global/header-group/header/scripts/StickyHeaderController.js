export class StickyHeaderController {
  constructor(header) {
    this.header = header;
    this.HIDE_OFFSET = 100;
    this.SHOW_OFFSET = 500;
  }

  init() {
    if (!this.header) return;

    this.onScroll();
    this.bindEvents();
  }

  onScroll = () => {
    const y = window.scrollY;
    const classes = this.header.classList;

    if (y <= this.HIDE_OFFSET) {
      classes.remove("site-header--hidden", "is-fixed");
    } else if (y < this.SHOW_OFFSET) {
      classes.add("site-header--hidden");
      classes.remove("site-header--visible");
    } else {
      classes.add("is-fixed", "site-header--visible");
      classes.remove("site-header--hidden");
    }
  }

  static debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  bindEvents() {
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", StickyHeaderController.debounce(this.onScroll, 250));
  }
}