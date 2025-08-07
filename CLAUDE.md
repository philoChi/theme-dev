# CLAUDE.md

Development guidance for Claude Code (claude.ai/code) when working with this Shopify theme repository.
github-repository: git@github.com:philoChi/hyspex-theme.git

## Core Principles

- **KISS**: Keep It Simple, Stupid - robust, simple, comprehensible solutions
- **Mobile-First**: Design for mobile, enhance for larger screens
- **Accessibility-First**: WCAG 2.1 AA compliance. Never use RTL awareness (Arabic, Hebrew, Persian, Urdu, etc.).
- **Performance**: Optimize for Core Web Vitals
- **CSS-First**: Prefer CSS over JavaScript when feasible
- **Motion & Polish**: Thoughtful animations, smooth transitions, and refined interactions that feel responsive and delightful

## Core Development Principles

- Progressive Enhancement: Build with HTML first, enhance with CSS/JS
- Liquid-First: Leverage Shopify's templating for server-side rendering
- Performance Budget: Minimize JavaScript, optimize critical rendering path
- Theme Inspector Ready: Write code that performs well in Shopify's metrics
- Graceful Degradation: Ensure functionality without JavaScript enabled

### Architecture Guidelines
- Organize files by feature within theme structure constraints
- Separate concerns using snippets for reusable components
- Create modular section groups for better organization
- Implement BEM methodology for CSS architecture
- Maintain clear separation between theme settings and hardcoded values
- Document Liquid logic with clear comments

### Liquid Template Strategy
- Create atomic snippets for reusable components
- Use section groups for complex layout compositions
- Implement dynamic sections with flexible schema
- Leverage Liquid's built-in filters for data transformation
- Create custom Liquid tags for repeated patterns
- Use render tag over include for better performance
- Implement proper variable scoping with assign

### Theme Customization
- Design flexible section schemas with intuitive settings
- Create preset configurations for common use cases
- Implement dynamic block types for maximum flexibility
- Use metafields for extended customization options
- Build responsive flex and grid systems using CSS Grid/Flexbox
- Create setting dependencies for better UX
- Implement live preview support for all customizations

### JavaScript Development
- Use vanilla ES6+ with proper polyfills
- Implement module pattern for code organization
- Create custom elements for complex components
- Use event delegation for dynamic content
- Implement lazy loading for non-critical features
- Avoid global namespace pollution
- Create lightweight state management solutions

### CSS Architecture
- Implement utility-first approach with custom properties
- Use CSS Grid and Flexbox for layouts
- Create component-based stylesheets
- Implement CSS custom properties for theming
- Use @layer for cascade management
- Minimize specificity issues with BEM
- Implement critical CSS inlining strategy
- Use ARIA attributes for accessibility and as CSS selectors for styling to automatically keep visual and semantic state in sync.

### Performance Optimization
- Minimize Liquid processing with efficient loops
- Implement responsive images with Shopify filters
- Use loading="lazy" for below-fold images
- Defer non-critical JavaScript execution
- Implement resource hints (preconnect, prefetch)
- Optimize web fonts with font-display
- Monitor Shopify Web Performance dashboard

### Asset Management
- Source files organized in `src/` directory by component type
- Webpack handles bundling and optimization automatically
- Convention-based naming creates predictable bundle outputs
- Use Shopify's asset_url filters for generated bundles
- Optimize images before upload to theme
- Implement SVG sprite systems
- Let webpack handle JS/CSS optimization and minification

### Accessibility Implementation
- Ensure semantic HTML structure
- Implement proper ARIA labels and roles
- Create keyboard navigation support
- Test with screen readers
- Ensure color contrast compliance
- Create skip navigation links
- Do **not** support rtl languages

### Responsive Design Strategy
- Mobile-first CSS architecture
- Use CSS custom properties for breakpoints
- Implement fluid typography with clamp()
- Create responsive spacing systems
- Use picture element for art direction
- Implement touch-friendly interactions
- Test across Shopify's mobile app

### JavaScript Patterns
#### Event Handling
- Use addEventListener over inline handlers
- Implement debounce/throttle for performance
- Create custom events for component communication
- Handle touch and mouse events appropriately
- Implement proper event cleanup
- Use passive listeners where appropriate

#### Component Architecture
- Create self-contained Web Components when needed
- Implement publish-subscribe for loose coupling
- Use data attributes for component configuration
- Create lifecycle methods for initialization
- Implement error boundaries in JavaScript
- Build progressive enhancement layers
- Use function description comment headers for javascript and explanatory comments
- Use classes rather then long scripts 

#### API Integration
- Use Fetch API with proper error handling
- Implement AJAX cart functionality
- Create abstraction layers for Shopify APIs
- Handle rate limiting gracefully
- Implement optimistic UI updates
- Cache API responses appropriately

### CSS Methodology
#### Utility System
- Create utility classes for common patterns
- Use explanatory comments
- Use CSS custom properties for design tokens
- Implement responsive utilities with media queries
- Build animation utilities for micro-interactions
- Create spacing and typography scales
- Implement color system with semantic naming

#### Component Styles
- Use BEM naming convention consistently
- Create component modifier classes
- Implement state classes for interactivity
- Build layout components separately
- Use CSS Grid for complex layouts
- Implement Flexbox for component layouts

#### Performance Patterns
- Prefer CSS over Javascript when possible
- Inline critical CSS in theme.liquid
- Load non-critical CSS asynchronously
- Use CSS containment for performance
- Implement efficient selectors
- Avoid excessive CSS nesting
- Use CSS transforms for animations

## Theme Development Workflow
- Use Jest for Unit tests and Playwright for E2E tests
- Throughout the implementation, verify your results by using the MCP Playwright server tools:
  - **Screenshots**: Visual verification with mobile/desktop views using `mcp__playwright__playwright_screenshot`
  - **Console logs**: Error detection and performance analysis using `mcp__playwright__playwright_console_logs`
  - **DOM analysis**: HTML structure and component verification using `mcp__playwright__playwright_get_visible_html`
  - **Navigation**: Page navigation and interaction testing using `mcp__playwright__playwright_navigate`
  - **Whenever needed**: Always analyze captured screenshots and logs to ensure implementation correctness
  - **Precise verification**: Analyze the content of the page precisely. To achieve this, use class selectors in playwright, for example to analyze a specific part of the website that has been changed
  - **Invoke subagents**: Capture different screenshots (e.g. of selectors), logs and HTML of the same page in parallel by invoking subagents
  - **Working with Screenshots**: Screenshots taking by playwright are meant to be read and analyzed by YOU, **not** just captured for documentation

## Subagent Usage Guidelines

### When to Use Subagents (Task Tool)
- **Complex multi-file searches**: When searching for patterns across multiple directories or file types
- **Codebase exploration**: Understanding unfamiliar codebases or analyzing architectural patterns
- **Broad keyword searches**: When looking for concepts like "config", "logger", "authentication" across the project
- **Research tasks**: Gathering information before implementation (existing patterns, similar components)
- **Large-scale refactoring analysis**: Understanding dependencies and impact before making changes

### Best Practices for Subagent Delegation
- **Be specific**: Provide clear, detailed task descriptions with expected deliverables
- **Concurrent execution**: Launch multiple subagents simultaneously for parallel research (3-8)
- **Result integration**: Summarize and act on subagent findings without showing raw results to user
- **Scope definition**: Clearly define what information the subagent should return
- **Stateless operations**: Each subagent invocation is independent - provide complete context

<important> Check working url with `npm run theme:list`. If no available start one with `npm run theme:start`</important>

## Architecture
### Directory Structure
```
src/                                    # Source files for webpack (convention-based auto-discovery)
├── bundle-global                       # Global theme files bundled together (→ global.js/css)
│   ├── icon-system                      # CSS-based icon system
│   │   ├── icons/                       # SVG source files
│   │   │   ├── icon-cart.svg
│   │   │   ├── icon-search.svg
│   │   │   └── ...
│   │   └── styles/
│   │       └── icon-manager.scss        # CSS icon definitions
│   ├── header-group
│   │   ├── announcement-bar
│   │   │   ├── scripts
│   │   │   └── styles
│   │   ├── drawer
│   │   │   ├── base
│   │   │   │   ├── scripts
│   │   │   │   └── styles
│   │   │   ├── cart ...
│   │   │   ├── multi ...
│   │   │   ├── index.js                 # Internal middle-step-bundling (for complex sub-directories only)
│   │   │   └── index.scss               
│   │   ├── index.js                     # Internal middle-step-bundling for group
│   │   └── index.scss
│   ├── footer-group
│   ├── ...
│   ├── index.js                         # Global bundling for theme globals
│   └── index.scss
├── bundle-shared-features               # Shared features files bundled together (→ features-shared-all.js/css)
│   ├── dropdown-menu
│   │   ├── scripts
│   │   │   └── DropdownFeature.js
│   │   └── styles
│   │       └── dropdown.scss
│   ├── product-card
│   │   ├── index.js                    # Internal middle-step-bundling (for complex sub-directories only)
│   │   ├── index.scss
│   │   ├── scripts
│   │   │   ├── ProductCardVariantController.js
│   │   │   ├── ProductVariantControllerBase.js
│   │   │   └── config.js
│   │   └── styles
│   │       ├── badges.scss
│   │       ├── color-swatches.scss
│   │       ├── info-variants.scss
│   │       ├── main.scss
│   │       ├── price-display.scss
│   │       ├── size-pills.scss
│   │       └── star-rating.scss
│   ├── ...
│   ├── index.js                        # Global bundling for shared features
│   └── index.scss
├── parts-page-specific                 # Section-specific JS/CSS bundled separatly (→ section-page-[name].js/css) for specific pages only
│   ├── collections
│   │   └── main-collection
│   │       ├── index.js                # Separate bundling for page specific sections
│   │       ├── index.scss
│   │       ├── scripts ...
│   │       └── styles ...
│   ├── faq ...
│   └── ...
└── parts-sections                      # Section-specific JS/CSS bundled separatly (→ section-[name].js/css)
    ├── big-heading
    │   ├── index.js                    # Separate bundling for sections
    │   ├── index.scss
    │   ├── scripts ...
    │   └── styles ...
    ├── image-slider
    │   └── ...
    └── ...

# Please use `tree` to see the current repository structure `$ tree src/`

/sections/    # Theme sections (.liquid files)
/snippets/    # Reusable components (.liquid files)
/assets/      # Webpack bundle output (auto-generated, do not edit directly)
/templates/   # Shopify Page templates (JSON format)
/planning/    # Development planning documents
```

### Webpack Convention Rules
The build system uses pure convention-based auto-discovery:

1. **Parts-Sections**: `src/parts-sections/[name]/` → `assets/section-[name].js` + `assets/section-[name].css`
2. **Parts-Page-Specific**: `src/parts-page-specific/[page]/[name]/` → `assets/section-page-[name].js` + `assets/section-page-[name].css`
3. **Bundle-Shared-Features**: `src/bundle-shared-features/**/*` → `assets/features-shared-all.js` + `assets/features-shared-all.css`
4. **Bundle-Global**: `src/bundle-global/` → `assets/global.js` + `assets/theme.css`

Each folder can contain multiple JS/SCSS files - webpack automatically bundles them together.

### Source Organization Guidelines
- **One folder per component**: Each section/snippet gets its own folder in appropriate `src/` subdirectory
- **Multiple files allowed**: Split complex components into multiple JS/SCSS files
- **Automatic imports**: All `.js` and `.scss` files in a folder are bundled together
- **Bundle-shared-features**: All shared features bundled into single `features-shared-all` bundle
- **Bundle-global**: Global theme components bundled into single `theme` bundle
- **Parts-sections**: Individual section components get separate bundles
- **Parts-page-specific**: Page-specific components get separate bundles with page prefix

### Bundle Integration in Liquid Templates

#### Section Implementation (one-time used section)
```liquid
<!-- sections/hero-banner.liquid -->
{{ 'section-hero-banner.css' | asset_url | stylesheet_tag }}

<section data-section-type="hero-banner" class="hero-banner">
  <!-- section content -->
</section>

{{ 'section-hero-banner.js' | asset_url | script_tag }}
```

#### Global Features/Snippets/Sections (rendered several times -> load once in theme.liquid)
```liquid
<!-- layout/theme.liquid -->
{{ 'features-shared-all.css' | asset_url | stylesheet_tag }}
{{ 'theme.css' | asset_url | stylesheet_tag }}
</head>
<body>
  <!-- body content -->
  {{ 'features-shared-all.js' | asset_url | script_tag }}
  {{ 'global.js' | asset_url | script_tag }}
</body>
```

### Development Workflow Example

1. **Create new section**: `mkdir src/parts-sections/testimonials`
2. **Add source files**: 
   - `src/parts-sections/testimonials/index.js`
   - `src/parts-sections/testimonials/index.scss`
   - `src/parts-sections/testimonials/scripts/testimonials.js` (optional)
   - `src/parts-sections/testimonials/styles/testimonials.scss` (optional)
3. **Build**: `npm run build:dev` or `npm run theme:restart` (wait a few seconds until the server started)
4. **Generated bundles**: 
   - `assets/section-testimonials.js`
   - `assets/section-testimonials.css`
5. **Load bundles**: Add the generated bundles to `snippets/conditional-section-assets.liquid` and `snippets/conditional-section-scripts.liquid`
6. **Include in liquid**: Use generated bundles in `sections/testimonials.liquid`

### Icon Implementation Guide
1. **Add SVG file**: Place the SVG file in `src/bundle-global/icon-system/icons/` (e.g., `icon-name.svg`)
   - Ensure the SVG uses `stroke="currentColor"` or `fill="currentColor"` for color inheritance
   - Remove any hardcoded colors from the SVG (except for branded logos, flags, etc.)

2. **Register in CSS**: Add to `src/bundle-global/icon-system/styles/icon-manager.scss`:
   ```scss
   :root {
     --icon-name: url('/assets/icon-name.svg');
   }
   
   .icon-name {
     -webkit-mask-image: var(--icon-name);
     mask-image: var(--icon-name);
     width: 24px;  /* Adjust as needed */
     height: 24px; /* Adjust as needed */
   }
   ```

3. **Use in Liquid**: Use with CSS spans:
   ```liquid
   <span class="icon icon-name"></span>
   ```

4. **Build**: Run `npm run build:dev` to copy SVGs to assets and rebuild CSS

**Special Cases**:
- **Branded logos** (DHL, flags): Use `background-image` instead of masks to preserve original colors
- **Multi-colored icons**: Place variants in separate files (e.g., `icon-feature-chips-simple.svg`)

**Benefits**:
- Icons inherit text color and change on hover
- No server-side rendering required
- Better performance with CSS masks
- Centralized icon management in one directory

### Notification
- For any user notification (e.g. info, error, warning) use the `NotificationSystem` from the features bundle and the global function `window.showNotification`

## Development Planning

```
planning/
├── <github issue nr and name> /                    # separate container for all issues
│   └── architecture/                               # documents for architecture
├── <github issue nr and name> /                    # separate container for all issues
│   └── architecture/                               # documents for architecture  
...

```

## Essential Development Commands

```bash
# Launch local Shopify theme server (auto-assigns port or use -- PORT for specific port)
npm run theme:start          # Start on auto-assigned port
npm run theme:start -- 4343  # Start on specific port

# Generate repository overview
repomix --include "assets/**,config/**,layout/**,locales/**,sections/**,snippets/**,templates/**"

# Testing
npm run test            # Jest unit tests
npm run test:coverage   # Tests with coverage
npm run test:e2e        # E2E tests
npm run test:all        # E2E tests and Unit tests
npm run clean:captures  # Deletes all captured screenshots, html- and console- logs from the cache

# Theme Server Management 
npm run theme:stop      # Stop all running servers
npm run theme:stop -- 4343  # Stop specific port
npm run theme:restart   # Restart theme server (current port)
npm run theme:restart -- 4343  # Restart specific port
npm run theme:list      # List all running servers
npm run theme:status    # Show detailed status
npm run theme:logs      # Show logs for servers
npm run theme:logs -- 4343  # Show logs for specific port

# Webpack Build Commands (run after changes in src/)
npm run build:dev       # Compiles webpack bundles
npm run clean           # Remove generated bundles from assets/

# Bundle Analysis
npm run build:analyze   # Opens webpack-bundle-analyzer

# Implementation Verification (Use MCP Playwright Server)
# - Important: Always analyze captured screenshots and logs to ensure implementation correctness
# - Important: Screenshots are meant to be read and analyzed by YOU, **not** just captured for documentation

# Available MCP Playwright verification tools:
# - mcp__playwright__playwright_navigate: Navigate to pages for testing
# - mcp__playwright__playwright_screenshot: Capture screenshots for visual verification
# - mcp__playwright__playwright_console_logs: Capture console logs for error detection
# - mcp__playwright__playwright_get_visible_html: Get DOM structure for analysis
# - mcp__playwright__playwright_get_visible_text: Get visible text content

# Examples for verification workflow:
# When you want to navigate the page by clicking on buttons or similar, first always search the respective liquid or javascript files for the ids 
# 1. Navigate to page: mcp__playwright__playwright_navigate with URL
# 2. Take screenshot: mcp__playwright__playwright_screenshot for visual verification. Read and verify the screenshot after taking it **always**.
# 3. Check console: mcp__playwright__playwright_console_logs for errors
# 4. Analyze DOM: mcp__playwright__playwright_get_visible_html for structure

# Common verification URLs:
# - Product page: e.g. http://127.0.0.1:9292/products/baum-stein-stick
# - Collection page: e.g. http://127.0.0.1:9292/collections/all

# When working with Shopify APIs or need documentation, use the integrated Shopify Dev MCP server:
# **Use precise search terms** in `search_dev_docs` to avoid token limits
#   - ✅ Good: "productCreate mutation"
#   - ❌ Avoid: "product management system"
# mcp__shopify-dev__get_started        // Initialize API context (admin, functions, hydrogen, storefront-web-components)
# mcp__shopify-dev__introspect_admin_schema  // GraphQL schema introspection
# mcp__shopify-dev__search_dev_docs    // Search documentation (use precise terms)
# mcp__shopify-dev__fetch_docs_by_path // Fetch specific documentation
```

# Example Pattern and Code Snippets for reference

## Typical pitfalls to avoid

- Never include bundle tags directly in reusable liquid files that might be rendered multiple times
- Load section/snippet bundles only where they're used, not globally
- Load the `features-shared-all` bundle once in `theme.liquid` since features are shared
- Use webpack's auto-discovery - don't manually manage entry points
- Keep source files in `src/`, never edit files in `assets/` directly 

## Liquid Patterns

### Atomic Snippet Structure
```liquid
{%- comment -%} snippets/product-card.liquid {%- endcomment -%}
{%- liquid
  assign image = product.featured_image | default: settings.placeholder_image
  assign price = product.price | money
-%}

<article class="product-card" data-product-id="{{ product.id }}">
  {{ image | image_url: width: 300 | image_tag: loading: 'lazy' }}
  <h3>{{ product.title | truncate: 50 }}</h3>
  <span class="product-card__price">{{ price }}</span>
</article>
```

### Dynamic Section Schema
```liquid
{% schema %}
{
  "name": "Hero Banner",
  "settings": [
    {
      "type": "image_picker",
      "id": "image",
      "label": "Background Image"
    }
  ],
  "blocks": [
    {
      "type": "slide",
      "name": "Slide",
      "settings": [
        {
          "type": "text",
          "id": "heading",
          "default": "Slide Heading"
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Hero Banner",
      "blocks": [
        { "type": "slide" }
      ]
    }
  ]
}
{% endschema %}
```

## JavaScript Patterns

### Module Pattern with Namespace
```javascript
// src/bundle-shared-features/cart/scripts/cart.js
window.Theme = window.Theme || {};

Theme.Cart = (function() {
  const selectors = {
    form: '[data-cart-form]',
    qty: '[data-qty-input]'
  };

  function init() {
    document.querySelectorAll(selectors.form)
      .forEach(form => form.addEventListener('submit', handleSubmit));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Implementation
  }

  return { init };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', Theme.Cart.init);
```

### Custom Element Pattern
```javascript
// src/bundle-shared-features/product-gallery/scripts/product-gallery.js
class ProductGallery extends HTMLElement {
  constructor() {
    super();
    this.mainImage = this.querySelector('[data-main-image]');
    this.thumbs = this.querySelectorAll('[data-thumb]');
  }

  connectedCallback() {
    this.thumbs.forEach(thumb => 
      thumb.addEventListener('click', this.handleThumbClick.bind(this))
    );
  }

  handleThumbClick(e) {
    const newSrc = e.currentTarget.dataset.fullsize;
    this.mainImage.src = newSrc;
  }
}

customElements.define('product-gallery', ProductGallery);
```

### Debounced Search
```javascript
Theme.Search = {
  init() {
    this.input = document.querySelector('[data-search-input]');
    this.results = document.querySelector('[data-search-results]');
    
    this.input?.addEventListener('input', 
      this.debounce(this.handleSearch.bind(this), 300)
    );
  },

  debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  async handleSearch(e) {
    const query = e.target.value;
    // Fetch implementation
  }
};
```

## CSS Architecture

### BEM Component Structure
```css
/* src/bundle-shared-features/product-card/styles/main.scss */
.product-card {
  --card-padding: var(--spacing-4);
  --card-radius: var(--radius-md);
  
  display: grid;
  padding: var(--card-padding);
  border-radius: var(--card-radius);
}

.product-card__image {
  aspect-ratio: 1;
  object-fit: cover;
}

.product-card__title {
  font-size: clamp(1rem, 2vw, 1.25rem);
}

/* Modifiers */
.product-card--featured {
  --card-padding: var(--spacing-6);
}

/* States */
.product-card:hover {
  transform: translateY(-2px);
}
```

### Utility System with Custom Properties
```css
/* src/bundle-global/styles/utilities.scss */
:root {
  /* Spacing */
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  
  /* Colors */
  --color-primary: #000;
  --color-surface: #fff;
  
  /* Breakpoints */
  --screen-sm: 640px;
  --screen-md: 768px;
}

/* Utility Classes */
.u-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
}

.u-container {
  width: min(100% - 2rem, var(--container-max, 1200px));
  margin-inline: auto;
}
```

### Responsive Grid System
```css
/* src/bundle-shared-features/layouts/styles/grid.scss */
.grid {
  display: grid;
  gap: var(--grid-gap, 1rem);
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
}

@media (min-width: 768px) {
  .grid--2-col-md {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## Performance Patterns

### Critical CSS Inlining
```liquid
{%- comment -%} layout/theme.liquid {%- endcomment -%}
<style>
  /* Critical CSS */
  :root { 
    --color-primary: {{ settings.color_primary }};
  }
  body { margin: 0; }
  .u-visually-hidden { /* ... */ }
</style>

{%- comment -%} Non-critical CSS {%- endcomment -%}
<link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style">
<link rel="stylesheet" href="{{ 'theme.css' | asset_url }}" media="print" onload="this.media='all'">
```

### Lazy Loading Images
```liquid
{%- liquid
  assign loading = loading | default: 'lazy'
  assign sizes = sizes | default: '100vw'
-%}

<img
  src="{{ image | image_url: width: 300 }}"
  srcset="{{ image | image_url: width: 300 }} 300w,
          {{ image | image_url: width: 600 }} 600w,
          {{ image | image_url: width: 1200 }} 1200w"
  sizes="{{ sizes }}"
  loading="{{ loading }}"
  width="{{ image.width }}"
  height="{{ image.height }}"
  alt="{{ image.alt | escape }}"
>
```

## Accessibility Patterns

### Accessible Modal
```javascript
class Modal {
  constructor(el) {
    this.modal = el;
    this.focusTrap = this.createFocusTrap();
  }

  open() {
    this.modal.setAttribute('open', '');
    this.previousFocus = document.activeElement;
    this.modal.focus();
    document.addEventListener('keydown', this.handleKeydown);
  }

  close() {
    this.modal.removeAttribute('open');
    this.previousFocus?.focus();
    document.removeEventListener('keydown', this.handleKeydown);
  }

  handleKeydown = (e) => {
    if (e.key === 'Escape') this.close();
    if (e.key === 'Tab') this.trapFocus(e);
  }
}
```

## Theme Settings Integration

### Responsive Image with Art Direction
```liquid
<picture>
  <source media="(min-width: 768px)" 
          srcset="{{ section.settings.image_desktop | image_url: width: 1920 }}">
  <img src="{{ section.settings.image_mobile | image_url: width: 768 }}"
       alt="{{ section.settings.image_alt | escape }}"
       loading="lazy">
</picture>
```
