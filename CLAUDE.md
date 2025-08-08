# CLAUDE.md

Development guidance for Claude Code (claude.ai/code) when working with this shopify theme development repository using webpack.
github-repository: git@github.com:philoChi/theme-dev.git

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

### Source Management
- **Source directories**: `src/bundles/`, `src/localization-common/`, `src/theme-hyspex/`
- **Output directory**: `theme-hyspex/` (complete Shopify theme, git-ignored)
- **Build command**: `npm run build:dev` compiles everything
- **Never edit output**: All changes in source directories only
- **Automatic optimization**: Webpack handles bundling, minification, prefixing
- **Theme deployment**: Use generated `theme-hyspex/` folder with Shopify CLI

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

## Architecture
### Directory Structure
```
src/                                   # Source files for webpack compilation
├── bundles/                           # JS/SCSS bundles and component templates
│   ├── bundle-global/                 # Global theme bundles (→ global.js/css)
│   │   ├── icon-system/               # CSS-based icon system
│   │   │   ├── icons/                 # SVG source files
│   │   │   └── styles/                # Icon CSS definitions
│   │   ├── header-group/              # Header components
│   │   ├── drawer-group/              # Drawer components (cart, multi)
│   │   └── index.js/scss              # Global bundle entry points
│   ├── bundle-shared-features/        # Shared features (→ features-shared-all.js/css)
│   │   ├── dropdown-menu/
│   │   ├── product-card/
│   │   ├── notification-system/
│   │   └── index.js/scss              # Features bundle entry points
│   ├── parts-page-specific/           # Page-specific sections
│   │   ├── collections/               # → section-page-collections.js/css
│   │   ├── product/                   # → section-page-product.js/css
│   │   └── faq/                       # → section-page-faq.js/css
│   ├── parts-sections/                # Individual sections
│   │   ├── big-heading/               # → section-big-heading.js/css
│   │   ├── image-slider/              # → section-image-slider.js/css
│   │   └── showcase/                  # → section-showcase.js/css
│   ├── theme-main/                    # Main theme layout and core snippets
│   │   ├── layout/                    # theme.liquid and other layouts
│   │   └── snippets/                  # Core theme snippets
│   └── utils/                         # Utility snippets and helpers
├── config/                            # Product configuration files
│   ├── product-info.de.json           # Product metadata configuration
│   └── locale-metadata.json           # Locale metadata
└── theme-hyspex/                      # Theme-specific configurations
    ├── config/                        # settings_schema.json, settings_data.json
    ├── groups/                        # Section groups (JSON)
    ├── root/                          # Root theme files
    └── templates/                     # Page templates (JSON/liquid)

theme-hyspex/                          # Webpack generated output (git-ignored, Shopify CLI compliant, do not modify files here)
├── assets/                            # Webpack bundles + copied assets
├── config/                            # Theme configuration
├── layout/                            # Theme layouts
├── locales/                           # Merged locale files
├── sections/                          # Liquid sections with prefixes
├── snippets/                          # Liquid snippets with prefixes
└── templates/                         # Page templates

planning/                              # Development planning documents
```

### Webpack Build System
The build system compiles source files from three directories into a complete Shopify theme:

**Source → Output Mapping:**
1. **Bundle-Global**: `src/bundles/bundle-global/` → `theme-hyspex/assets/global.js` + `.css`
2. **Shared-Features**: `src/bundles/bundle-shared-features/` → `theme-hyspex/assets/features-shared-all.js` + `.css`
3. **Page-Specific**: `src/bundles/parts-page-specific/[page]/[name]/` → `theme-hyspex/assets/section-page-[page]-[name].js` + `.css`
4. **Sections**: `src/bundles/parts-sections/[name]/` → `theme-hyspex/assets/section-[name].js` + `.css`

**Build Process:**
- Webpack bundles JS/SCSS from `src/bundles/`
- Copies liquid templates with proper prefixes (section-, snippet-feature-, etc.)
- Merges distributed localization from individual bundles
- Merges product configuration from `src/config/`
- Copies theme config from `src/theme-hyspex/`
- Outputs complete Shopify theme to `theme-hyspex/` (git-ignored)

### Source Organization Guidelines
- **Never edit `theme-hyspex/`**: It's generated and git-ignored
- **Work in `src/` directories**: All development happens in source directories
- **Convention-based bundling**: Folder structure determines output bundle names
- **Automatic discovery**: Webpack finds and bundles all JS/SCSS files
- **Liquid template prefixes**: Automatically applied during build (section-, snippet-feature-, etc.)
- **Run build after changes**: `npm run build:dev` regenerates the theme

### Bundle Integration in Liquid Templates

```liquid
<!-- Note: All bundles are generated in theme-hyspex/assets/ -->
<!-- Source files in src/bundles/, output in theme-hyspex/ -->

<!-- Section bundles (sections/section-hero-banner.liquid) -->
{{ 'section-hero-banner.css' | asset_url | stylesheet_tag }}
{{ 'section-hero-banner.js' | asset_url | script_tag }}

<!-- Global bundles (layout/theme.liquid) -->
{{ 'features-shared-all.css' | asset_url | stylesheet_tag }}
{{ 'global.css' | asset_url | stylesheet_tag }}
{{ 'features-shared-all.js' | asset_url | script_tag }}
{{ 'global.js' | asset_url | script_tag }}
```

### Development Workflow Example

1. **Create new section**: `mkdir src/bundles/parts-sections/testimonials`
2. **Add source files**: 
   - `src/bundles/parts-sections/testimonials/index.js`
   - `src/bundles/parts-sections/testimonials/index.scss`
   - `src/bundles/parts-sections/testimonials/sections/testimonials.liquid`
3. **Build theme**: `npm run build:dev` (generates complete theme in `theme-hyspex/`)
4. **Start server**: `npm run theme:start` (uses `theme-hyspex/` directory)
5. **Generated output**: 
   - `theme-hyspex/assets/section-testimonials.js`
   - `theme-hyspex/assets/section-testimonials.css`
   - `theme-hyspex/sections/section-testimonials.liquid`

### Icon Implementation Guide
1. **Add SVG**: Place in `src/bundles/bundle-global/icon-system/icons/`
2. **Register CSS**: Add to `icon-manager.scss` with mask-image
3. **Use in Liquid**: `<span class="icon icon-name"></span>`
4. **Build**: `npm run build:dev` copies SVGs to `theme-hyspex/assets/`

### Notification
- For any user notification (e.g. info, error, warning) use the `NotificationSystem` from the features bundle and the global function `window.showNotification`

## Development Planning
```
planning/
├── <github-issue-nr-and-name>/        # Issue-specific documentation
│   └── architecture/                   # Architecture decisions
└── ...
```

## Important Workflow Notes
- **Build First**: Always run `npm run build:dev` after source changes
- **Generated Theme**: `theme-hyspex/` contains complete Shopify theme (git-ignored)
- **Source Control**: Only commit files in `src/` directories
- **Deployment**: Use `npm run deploy:dev` or `deploy:prod` for store deployment
- **Theme Commands**: All Shopify CLI commands use `theme-hyspex/` directory

## Essential Development Commands

```bash
# Build & Deployment (ALWAYS run build:dev after source changes)
npm run build:dev       # Build complete theme to theme-hyspex/
npm run build:clean     # Clean and rebuild theme-hyspex/

# Theme Development (all commands use generated theme-hyspex/ directory)
npm run theme:start     # Start dev server using theme-hyspex/
npm run theme:restart   # Rebuild theme and restart server
npm run theme:stop      # Stop all running servers
npm run theme:list      # List all running servers
npm run theme:status    # Show detailed server status
npm run theme:pull      # Pull settings_data.json from store

# Testing
npm run test            # Jest unit tests
npm run test:e2e        # Playwright E2E tests
npm run test:all        # Run all tests
npm run clean:captures  # Clean test screenshots/logs

# Bundle Analysis
npm run build:analyze   # Analyze bundle sizes

# Implementation Verification
# Use MCP Playwright for visual testing - ALWAYS analyze screenshots
# mcp__playwright__playwright_navigate       # Navigate to test pages
# mcp__playwright__playwright_screenshot     # Visual verification
# mcp__playwright__playwright_console_logs   # Error detection

# Shopify API Documentation
# mcp__shopify-dev__search_dev_docs         # Search with precise terms
# mcp__shopify-dev__introspect_admin_schema # GraphQL schema
```

## GitHub Issue Management

### Repository Information Commands
```bash
# Get current repository context
npm run git:info                               # Show owner, repo, branch, active issue
```

### Issue Development Workflow
1. **Get repository context**: `npm run git:info`
2. **List current issues**: `gh issue list --repo {REPO}`
3. **View issue details**: `gh issue view {NUMBER} --repo {REPO}`
4. **Update Isuue**: `gh issue edit {NUMBER} --repo {REPO} --body "New description text"` 

## Key Implementation Patterns

## Typical pitfalls to avoid

- **Never edit files in `theme-hyspex/`** - it's generated and git-ignored
- **Always work in source directories** - `src/bundles/`, `src/localization-common/`, `src/theme-hyspex/`
- **Run `npm run build:dev` after any changes** - rebuilds the complete theme
- **The `theme-hyspex/` folder is your complete Shopify theme** - use it with all Shopify CLI commands
- Load the `features-shared-all` bundle once in `theme.liquid` since features are shared
- Never include bundle tags directly in reusable liquid files 

## Liquid Patterns

### Component Structure
```liquid
{%- comment -%} src/bundles/bundle-shared-features/product-card/snippets/product-card.liquid {%- endcomment -%}
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

### Section Schema
```liquid
{% schema %}
{
  "name": "Hero Banner",
  "settings": [
    { "type": "image_picker", "id": "image", "label": "Background Image" }
  ],
  "blocks": [
    { "type": "slide", "name": "Slide", "settings": [
      { "type": "text", "id": "heading", "default": "Slide Heading" }
    ]}
  ],
  "presets": [{ "name": "Hero Banner", "blocks": [{ "type": "slide" }] }]
}
{% endschema %}
```

## JavaScript Patterns

### Custom Element Pattern (Recommended)
```javascript
// src/bundles/bundle-shared-features/product-gallery/scripts/product-gallery.js
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

## CSS Architecture

### BEM Component Structure
```scss
/* src/bundles/bundle-shared-features/product-card/styles/main.scss */
.product-card {
  --card-padding: var(--spacing-4);
  display: grid;
  padding: var(--card-padding);
  
  &__image { aspect-ratio: 1; }
  &__title { font-size: clamp(1rem, 2vw, 1.25rem); }
  &--featured { --card-padding: var(--spacing-6); }
  &:hover { transform: translateY(-2px); }
}
```

### CSS Custom Properties System
```scss
/* src/bundles/bundle-global/styles/utilities.scss */
:root {
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --color-primary: #000;
  --screen-sm: 640px;
  --screen-md: 768px;
}
```

## Performance & Accessibility Patterns

### Responsive Images
```liquid
<img
  src="{{ image | image_url: width: 300 }}"
  srcset="{{ image | image_url: width: 300 }} 300w,
          {{ image | image_url: width: 600 }} 600w,
          {{ image | image_url: width: 1200 }} 1200w"
  sizes="(min-width: 768px) 50vw, 100vw"
  loading="lazy"
  alt="{{ image.alt | escape }}"
>
```

### Critical CSS Inlining
```liquid
{%- comment -%} layout/theme.liquid {%- endcomment -%}
<style>
  :root { --color-primary: {{ settings.color_primary }}; }
  body { margin: 0; }
</style>
<link rel="preload" href="{{ 'global.css' | asset_url }}" as="style">
<link rel="stylesheet" href="{{ 'global.css' | asset_url }}" media="print" onload="this.media='all'">
```
