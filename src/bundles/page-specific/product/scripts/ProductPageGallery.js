/**
 * section-product-gallery-navigation.js
 * ------------------------------------
 * Enhanced product gallery with arrow navigation, color swatch integration, and mobile swipe support
 * Follows HTMLElement pattern and integrates with existing event system
 * Version: 1.0 - Foundation with state management and event bridge
 */

class ProductGalleryNavigation extends HTMLElement {
  constructor() {
    super();

    // Configuration
    this.config = {
      // Selectors
      galleryContainerSelector: '.product-main__gallery',
      thumbnailsSelector: '[data-gallery-thumbnails]',
      thumbnailItemSelector: '.product-gallery__thumbnail-item',
      mainImageContainerSelector: '[data-gallery-main-image-container]',
      mainImageSelector: '[data-main-image]',
      
      // Navigation selectors (will be added dynamically)
      prevButtonSelector: '[data-gallery-prev]',
      nextButtonSelector: '[data-gallery-next]',
      positionIndicatorSelector: '[data-gallery-position]',
      
      // Animation settings
      transitionDuration: 300,
      debounceDelay: 100,
      
      // Touch settings
      swipeThreshold: 50,
      touchThreshold: 10,
      
      // ARIA settings
      ariaLiveRegion: '[data-gallery-announcements]'
    };

    // State management
    this.state = {
      // Core state
      currentIndex: 0,
      totalImages: 0,
      images: [],
      isTransitioning: false,
      isInitialized: false,
      
      // Touch state
      touchStartX: 0,
      touchStartY: 0,
      touchDeltaX: 0,
      touchDeltaY: 0,
      touchStartTime: 0,
      isTouching: false,
      
      // External integration
      lastColorSwatchVariantId: null,
      
      // Error tracking
      hasErrors: false,
      lastError: null
    };

    // DOM references
    this.elements = {
      galleryContainer: null,
      thumbnails: null,
      thumbnailItems: [],
      mainImageContainer: null,
      mainImage: null,
      prevButton: null,
      nextButton: null,
      positionIndicator: null,
      ariaLiveRegion: null
    };

    // Controllers
    this.controllers = {
      transitions: null,
      eventBridge: null,
      errorHandler: null,
      accessibility: null
    };

    // Bind methods
    this.handleColorSwatchChange = this.handleColorSwatchChange.bind(this);
    this.handleThumbnailClick = this.handleThumbnailClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);

    // Debouncing for rapid navigation
    this.debouncedNavigateToIndex = this.debounce(this.navigateToIndex.bind(this), this.config.debounceDelay);
  }

  connectedCallback() {
    // Progressive Enhancement: Remove no-js class as soon as component connects
    this.classList.remove('no-js');
    
    // Initialize with feature detection
    this.init();
  }

  disconnectedCallback() {
    this.destroy();
  }

  /**
   * Initialize the gallery navigation system with progressive enhancement
   * @async
   * @returns {Promise<void>} Resolves when initialization is complete
   * @throws {Error} When critical initialization steps fail
   */
  async init() {
    try {
      if (this.state.isInitialized) return;

      // Step 1: Initialize error handling first
      this.initErrorHandler();

      // Step 2: Initialize DOM elements
      this.initElements();

      // Step 3: Initialize state management
      this.initState();
      
      // Progressive Enhancement: Hide alternate images when JS takes over
      this.hideAlternateImages();

      // Step 4: Initialize controllers
      this.initControllers();

      // Step 5: Initialize event bridge
      this.initEventBridge();

      // Step 6: Attach event listeners to pre-rendered navigation arrows
      this.attachNavigationArrows();
      
      // Step 6.5: Create position indicator
      this.createPositionIndicator();

      // Step 7: Attach event listeners
      this.attachEventListeners();

      // Step 8: Initialize lazy loading with IntersectionObserver
      this.initLazyLoading();

      // Step 9: Initial preloading
      this.preloadImages();

      // Step 10: Update initial thumbnail states and position
      this.updateThumbnailStates(this.state.currentIndex);
      
      // Step 11: Add touch support detection
      this.detectTouchSupport();
      
      // Step 12: Initialize enhanced accessibility features
      this.initAccessibilityEnhancements();
      
      // Step 13: Mark as initialized
      this.state.isInitialized = true;

      // Log successful initialization
      if (window.logger) {
        window.logger.log('ProductGalleryNavigation initialized successfully', {
          totalImages: this.state.totalImages,
          currentIndex: this.state.currentIndex
        });
      }

      // Emit initialization event
      this.dispatchEvent(new CustomEvent('gallery:initialized', {
        bubbles: true,
        detail: {
          totalImages: this.state.totalImages,
          currentIndex: this.state.currentIndex
        }
      }));

    } catch (error) {
      this.handleError('Gallery initialization failed', error);
    }
  }

  /**
   * Initialize error handling framework with logging and recovery capabilities
   * Creates error handler with log, warn, recover methods for graceful error management
   * @returns {void}
   */
  initErrorHandler() {
    this.controllers.errorHandler = {
      log: (message, error = null, context = {}) => {
        this.state.lastError = { message, error, context, timestamp: Date.now() };
        
        // Progressive Enhancement: Check for console support
        if (typeof console !== 'undefined' && console.error) {
          if (window.logger) {
            window.logger.error(`ProductGalleryNavigation: ${message}`, error, context);
          } else {
            console.error(`ProductGalleryNavigation: ${message}`, error, context);
          }
        }
      },

      warn: (message, context = {}) => {
        // Progressive Enhancement: Check for console support
        if (typeof console !== 'undefined' && console.warn) {
          if (window.logger) {
            window.logger.log(`ProductGalleryNavigation: ${message}`, context);
          } else {
            console.warn(`ProductGalleryNavigation: ${message}`, context);
          }
        }
      },

      recover: (fallbackAction) => {
        try {
          if (typeof fallbackAction === 'function') {
            fallbackAction();
          }
        } catch (recoveryError) {
          this.controllers.errorHandler.log('Recovery action failed', recoveryError);
        }
      },

      getLastError: () => this.state.lastError,

      hasErrors: () => this.state.hasErrors,

      clearErrors: () => {
        this.state.hasErrors = false;
        this.state.lastError = null;
      }
    };
  }

  /**
   * Initialize DOM elements and cache references for gallery components
   * Validates required elements exist and caches them for performance
   * @returns {void}
   * @throws {Error} When required gallery elements are not found
   */
  initElements() {
    try {
      // Find gallery container
      this.elements.galleryContainer = this.querySelector(this.config.galleryContainerSelector) ||
                                      this.closest(this.config.galleryContainerSelector);

      if (!this.elements.galleryContainer) {
        throw new Error('Gallery container not found');
      }

      // Cache core elements
      this.elements.thumbnails = this.elements.galleryContainer.querySelector(this.config.thumbnailsSelector);
      this.elements.mainImageContainer = this.elements.galleryContainer.querySelector(this.config.mainImageContainerSelector);
      this.elements.mainImage = this.elements.galleryContainer.querySelector(this.config.mainImageSelector);

      // Get thumbnail items
      if (this.elements.thumbnails) {
        this.elements.thumbnailItems = Array.from(
          this.elements.thumbnails.querySelectorAll(this.config.thumbnailItemSelector)
        );
      }

      // Validate required elements
      if (!this.elements.mainImage) {
        throw new Error('Main image element not found');
      }

      if (this.elements.thumbnailItems.length === 0) {
        this.controllers.errorHandler.warn('No thumbnail items found');
      }

    } catch (error) {
      throw new Error(`Element initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize state management and build images array from DOM
   * Extracts image data from thumbnails and sets up navigation state
   * @returns {void}
   * @throws {Error} When image data extraction fails or no images found
   */
  initState() {
    try {
      // Build images array from thumbnails
      this.state.images = this.elements.thumbnailItems.map((thumbnail, index) => {
        const img = thumbnail.querySelector('.product-gallery__thumbnail-image');
        if (!img) {
          throw new Error(`Thumbnail image not found at index ${index}`);
        }

        return {
          id: img.dataset.imageId || `image-${index}`,
          thumbnailSrc: img.src,
          mainSrc: img.dataset.mainImageSrc || img.src,
          mainSrcset: img.dataset.mainImageSrcset || '',
          alt: img.alt || '',
          thumbnail: thumbnail,
          index: index
        };
      });

      // Set state
      this.state.totalImages = this.state.images.length;
      this.state.currentIndex = this.findCurrentIndex();

      // Validate state
      if (this.state.totalImages === 0) {
        throw new Error('No images found in gallery');
      }

      if (this.state.currentIndex < 0 || this.state.currentIndex >= this.state.totalImages) {
        this.controllers.errorHandler.warn('Invalid current index, defaulting to 0');
        this.state.currentIndex = 0;
      }

    } catch (error) {
      throw new Error(`State initialization failed: ${error.message}`);
    }
  }

  /**
   * Progressive Enhancement: Hide alternate images when JavaScript is active
   * This enables single-image view mode when JS enhances the gallery
   * @returns {void}
   */
  hideAlternateImages() {
    try {
      // Find all alternate images and hide them
      const alternateImages = this.elements.mainImageContainer?.querySelectorAll('.product-gallery__image--alternate');
      
      if (alternateImages && alternateImages.length > 0) {
        alternateImages.forEach(img => {
          img.style.display = 'none';
          img.setAttribute('aria-hidden', 'true');
        });
        
        if (window.logger) {
          window.logger.log('Progressive Enhancement: Hidden alternate images', {
            count: alternateImages.length
          });
        }
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Failed to hide alternate images', { error });
    }
  }
  
  /**
   * Initialize enhanced accessibility features for WCAG 2.1 AA compliance
   * Sets up ARIA labels, focus management, and screen reader support
   * @returns {void}
   */
  initAccessibilityEnhancements() {
    try {
      // Set up gallery container ARIA
      this.controllers.accessibility.updateGalleryAria();
      
      // Set up focus management
      this.controllers.accessibility.manageFocus.updateFocusIndicators();
      
      // Initialize navigation button ARIA
      if (this.elements.prevButton) {
        this.controllers.accessibility.updateNavigationAria('prev');
      }
      if (this.elements.nextButton) {
        this.controllers.accessibility.updateNavigationAria('next');
      }
      
      // Set up initial ARIA state
      this.controllers.accessibility.updateImageAria(this.state.currentIndex);
      this.controllers.accessibility.updateThumbnailAria(this.state.currentIndex);
      
      if (window.logger) {
        window.logger.log('Enhanced accessibility features initialized');
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Failed to initialize accessibility enhancements', { error });
    }
  }
  
  /**
   * Handle focus in events for enhanced accessibility feedback
   * Adds visual focus indicators and screen reader announcements
   * @param {FocusEvent} event - The focus event object
   * @returns {void}
   */
  handleFocusIn(event) {
    try {
      const element = event.target;
      
      // Add visual focus indicator
      element.classList.add('has-focus');
      
      // Announce focus for screen readers if it's a gallery control
      if (element.closest('.product-gallery-navigation')) {
        const elementType = element.getAttribute('role') || 'element';
        const elementLabel = element.getAttribute('aria-label') || element.textContent || '';
        
        // Only announce for navigation elements, not all focuses
        if (element.classList.contains('product-gallery__navigation') || 
            element.classList.contains('product-gallery__thumbnail-item')) {
          this.controllers.accessibility.announce(
            `Focused on ${elementType}: ${elementLabel}`, 'assertive'
          );
        }
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Focus in handler failed', { error });
    }
  }
  
  /**
   * Handle focus out events and remove visual focus indicators
   * @param {FocusEvent} event - The focus event object
   * @returns {void}
   */
  handleFocusOut(event) {
    try {
      const element = event.target;
      
      // Remove visual focus indicator
      element.classList.remove('has-focus');
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Focus out handler failed', { error });
    }
  }
  
  /**
   * Handle focus trap for keyboard navigation within gallery
   * Ensures focus stays within gallery controls when activated
   * @param {KeyboardEvent} event - The keyboard event object
   * @returns {void}
   */
  handleFocusTrap(event) {
    try {
      // Basic focus trap - keep focus within gallery when activated
      if (!this.contains(event.target)) {
        return;
      }
      
      const focusableElements = this.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            event.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            event.preventDefault();
          }
        }
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Focus trap handler failed', { error });
    }
  }

  /**
   * Find the currently active thumbnail index based on CSS classes or ARIA state
   * @returns {number} The index of the currently active thumbnail (0-based)
   */
  findCurrentIndex() {
    const activeThumbnail = this.elements.thumbnailItems.find(item =>
      item.classList.contains('is-active') || item.getAttribute('aria-selected') === 'true'
    );

    if (activeThumbnail) {
      return this.elements.thumbnailItems.indexOf(activeThumbnail);
    }

    return 0; // Default to first image
  }

  /**
   * Initialize sub-controllers for transitions, accessibility, and event handling
   * Creates modular controllers for different aspects of gallery functionality
   * @returns {void}
   */
  initControllers() {
    // Initialize enhanced transition controller with CSS transitions
    this.controllers.transitions = {
      fadeOut: () => {
        return new Promise(resolve => {
          if (!this.elements.mainImage) {
            resolve();
            return;
          }

          // Ensure transition property is set
          this.elements.mainImage.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
          
          // Force a reflow to ensure transition applies
          this.elements.mainImage.offsetHeight;
          
          // Start fade out
          this.elements.mainImage.style.opacity = '0';
          
          // Listen for transition end event for precise timing
          const handleTransitionEnd = (event) => {
            if (event.target === this.elements.mainImage && event.propertyName === 'opacity') {
              this.elements.mainImage.removeEventListener('transitionend', handleTransitionEnd);
              resolve();
            }
          };
          
          this.elements.mainImage.addEventListener('transitionend', handleTransitionEnd);
          
          // Fallback timeout in case transitionend doesn't fire
          setTimeout(() => {
            this.elements.mainImage.removeEventListener('transitionend', handleTransitionEnd);
            resolve();
          }, this.config.transitionDuration + 50);
        });
      },

      fadeIn: () => {
        return new Promise(resolve => {
          if (!this.elements.mainImage) {
            resolve();
            return;
          }

          // Ensure transition property is set
          this.elements.mainImage.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
          
          // Force a reflow to ensure transition applies
          this.elements.mainImage.offsetHeight;
          
          // Start fade in
          this.elements.mainImage.style.opacity = '1';
          
          // Listen for transition end event for precise timing
          const handleTransitionEnd = (event) => {
            if (event.target === this.elements.mainImage && event.propertyName === 'opacity') {
              this.elements.mainImage.removeEventListener('transitionend', handleTransitionEnd);
              resolve();
            }
          };
          
          this.elements.mainImage.addEventListener('transitionend', handleTransitionEnd);
          
          // Fallback timeout in case transitionend doesn't fire
          setTimeout(() => {
            this.elements.mainImage.removeEventListener('transitionend', handleTransitionEnd);
            resolve();
          }, this.config.transitionDuration + 50);
        });
      },

      setTransitioning: (isTransitioning) => {
        this.state.isTransitioning = isTransitioning;
        
        if (this.elements.galleryContainer) {
          this.elements.galleryContainer.classList.toggle('is-transitioning', isTransitioning);
        }
        
        // Enhanced loading state management for accessibility
        if (this.elements.mainImageContainer) {
          this.elements.mainImageContainer.setAttribute('aria-busy', isTransitioning);
        }
        
        if (this.elements.mainImage) {
          this.elements.mainImage.classList.toggle('is-loading', isTransitioning);
        }
        
        // Update navigation buttons state with ARIA
        if (this.elements.prevButton) {
          this.elements.prevButton.disabled = isTransitioning;
          this.elements.prevButton.setAttribute('aria-disabled', isTransitioning);
        }
        if (this.elements.nextButton) {
          this.elements.nextButton.disabled = isTransitioning;
          this.elements.nextButton.setAttribute('aria-disabled', isTransitioning);
        }
        
        // Update thumbnails during loading
        this.elements.thumbnailItems.forEach(thumbnail => {
          if (isTransitioning) {
            thumbnail.setAttribute('aria-disabled', 'true');
          } else {
            thumbnail.removeAttribute('aria-disabled');
          }
        });
        
        // Update color swatches during loading to prevent rapid clicks
        const colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach(swatch => {
          if (isTransitioning) {
            // For gallery transitions, don't use disabled attribute (affects opacity)
            // Instead use ARIA and class for accessibility and behavior
            swatch.setAttribute('aria-disabled', 'true');
            swatch.classList.add('is-gallery-transitioning');
          } else {
            swatch.removeAttribute('aria-disabled');
            swatch.classList.remove('is-gallery-transitioning');
          }
        });
      },
      
      // Enhanced loading state for individual elements
      setElementLoading: (element, isLoading, loadingText = 'Loading...') => {
        if (!element) return;
        
        element.classList.toggle('is-loading', isLoading);
        
        if (isLoading) {
          element.setAttribute('aria-busy', 'true');
          element.setAttribute('aria-label', 
            `${element.getAttribute('aria-label') || ''} - ${loadingText}`);
        } else {
          element.setAttribute('aria-busy', 'false');
          // Remove loading text from aria-label
          const currentLabel = element.getAttribute('aria-label') || '';
          const cleanLabel = currentLabel.replace(/ - Loading\.\.\.$/, '');
          element.setAttribute('aria-label', cleanLabel);
        }
      },

      // Enhanced transition manager methods
      crossFade: (newImageSrc, newImageSrcset = '') => {
        return new Promise(resolve => {
          if (!this.elements.mainImage) {
            resolve();
            return;
          }

          // Create new image element for preloading
          const tempImage = new Image();
          
          tempImage.onload = async () => {
            try {
              // Fade out current image
              await this.controllers.transitions.fadeOut();
              
              // Update image source (no layout shift as dimensions are preserved)
              this.elements.mainImage.src = newImageSrc;
              if (newImageSrcset) {
                this.elements.mainImage.srcset = newImageSrcset;
              }
              
              // Fade in new image
              await this.controllers.transitions.fadeIn();
              
              resolve();
            } catch (error) {
              resolve(); // Continue even if transition fails
            }
          };
          
          tempImage.onerror = () => {
            // If preload fails, fallback to direct update
            this.elements.mainImage.src = newImageSrc;
            if (newImageSrcset) {
              this.elements.mainImage.srcset = newImageSrcset;
            }
            resolve();
          };
          
          // Start preloading
          tempImage.src = newImageSrc;
        });
      }
    };

    // Initialize enhanced accessibility controller for WCAG 2.1 AA compliance
    this.controllers.accessibility = {
      // Enhanced announcement system with priority levels
      announce: (message, priority = 'polite') => {
        // Create or update live region with appropriate priority
        const regionKey = `ariaLiveRegion_${priority}`;
        if (!this.elements[regionKey]) {
          this.elements[regionKey] = document.createElement('div');
          this.elements[regionKey].setAttribute('aria-live', priority);
          this.elements[regionKey].setAttribute('aria-atomic', 'true');
          this.elements[regionKey].className = 'product-gallery__announcements';
          this.elements[regionKey].setAttribute('aria-label', 'Gallery status announcements');
          this.elements.galleryContainer.appendChild(this.elements[regionKey]);
        }

        // Clear previous announcement and set new one
        this.elements[regionKey].textContent = '';
        // Use setTimeout to ensure screen readers catch the change
        setTimeout(() => {
          this.elements[regionKey].textContent = message;
        }, 100);
      },

      // Enhanced navigation announcements
      announceNavigation: (currentIndex, totalImages, source = 'navigation') => {
        const position = `${currentIndex + 1} of ${totalImages}`;
        let message;
        
        switch (source) {
          case 'arrow':
            message = `Navigated to image ${position}`;
            break;
          case 'thumbnail':
            message = `Selected image ${position} from thumbnails`;
            break;
          case 'color':
            const image = this.state.images[currentIndex];
            const colorInfo = this.getColorVariantInfo ? this.getColorVariantInfo() : '';
            message = `Changed to ${colorInfo ? colorInfo + ' variant, ' : ''}image ${position}`;
            break;
          case 'swipe':
            message = `Swiped to image ${position}`;
            break;
          case 'keyboard':
            message = `Used keyboard to navigate to image ${position}`;
            break;
          default:
            message = `Showing image ${position}`;
        }
        
        this.controllers.accessibility.announce(message);
      },

      // Loading state announcements
      announceLoading: (isLoading) => {
        if (isLoading) {
          this.controllers.accessibility.announce('Loading next image', 'assertive');
        } else {
          this.controllers.accessibility.announce('Image loaded successfully');
        }
      },

      // Error announcements
      announceError: (error) => {
        this.controllers.accessibility.announce(`Gallery error: ${error}`, 'assertive');
      },

      // Enhanced ARIA updates for main image
      updateImageAria: (index) => {
        if (!this.elements.mainImage || !this.state.images[index]) return;

        const image = this.state.images[index];
        const position = `${index + 1} of ${this.state.totalImages}`;
        
        // Enhanced aria-label with more context
        const ariaLabel = `${image.alt || 'Product image'} - Image ${position}`;
        this.elements.mainImage.setAttribute('aria-label', ariaLabel);
        
        // Add describedby for additional context
        if (this.elements.positionIndicator) {
          this.elements.positionIndicator.id = `gallery-position-${this.state.currentIndex}`;
          this.elements.mainImage.setAttribute('aria-describedby', 
            `gallery-position-${this.state.currentIndex}`);
        }
        
        // Update role and state
        this.elements.mainImage.setAttribute('role', 'img');
        this.elements.mainImage.setAttribute('aria-current', 'true');
      },

      // Enhanced gallery container ARIA
      updateGalleryAria: () => {
        if (!this.elements.galleryContainer) return;
        
        // Set gallery container attributes
        this.setAttribute('role', 'region');
        this.setAttribute('aria-label', 
          `Product image gallery with ${this.state.totalImages} images`);
        this.setAttribute('aria-roledescription', 'image gallery');
        
        // Add navigation instructions
        if (this.state.totalImages > 1) {
          this.elements.galleryContainer.setAttribute('aria-describedby', 'gallery-instructions');
          
          // Create instructions element if it doesn't exist
          if (!this.elements.instructionsElement) {
            this.elements.instructionsElement = document.createElement('div');
            this.elements.instructionsElement.id = 'gallery-instructions';
            this.elements.instructionsElement.className = 'product-gallery__announcements';
            this.elements.instructionsElement.textContent = 
              'Use arrow keys or thumbnails to navigate through product images';
            this.elements.galleryContainer.appendChild(this.elements.instructionsElement);
          }
        }
      },

      // Enhanced navigation button ARIA
      updateNavigationAria: (buttonType, isDisabled = false) => {
        const button = this.elements[buttonType + 'Button'];
        if (!button) return;
        
        const direction = buttonType === 'prev' ? 'previous' : 'next';
        const currentIndex = this.state.currentIndex;
        const totalImages = this.state.totalImages;
        
        // Enhanced aria-label with context
        let ariaLabel = `${direction.charAt(0).toUpperCase() + direction.slice(1)} image`;
        
        if (buttonType === 'prev' && currentIndex > 0) {
          ariaLabel += ` (${currentIndex} of ${totalImages})`;
        } else if (buttonType === 'next' && currentIndex < totalImages - 1) {
          ariaLabel += ` (${currentIndex + 2} of ${totalImages})`;
        } else {
          // Loop navigation
          const targetIndex = buttonType === 'prev' ? totalImages : 1;
          ariaLabel += ` (${targetIndex} of ${totalImages})`;
        }
        
        button.setAttribute('aria-label', ariaLabel);
        button.setAttribute('aria-disabled', isDisabled);
        
        // Add keyboard shortcut hint
        const shortcut = buttonType === 'prev' ? 'Left arrow key' : 'Right arrow key';
        button.setAttribute('title', `${ariaLabel}. Keyboard shortcut: ${shortcut}`);
      },

      // Enhanced thumbnail ARIA updates
      updateThumbnailAria: (index) => {
        this.elements.thumbnailItems.forEach((thumbnail, i) => {
          const isActive = i === index;
          const imageData = this.state.images[i];
          
          // Enhanced aria attributes
          thumbnail.setAttribute('aria-selected', isActive);
          thumbnail.setAttribute('tabindex', isActive ? '0' : '-1');
          
          // Enhanced aria-label with more context
          const position = `${i + 1} of ${this.state.totalImages}`;
          const imageDescription = imageData?.alt || `Product image ${i + 1}`;
          thumbnail.setAttribute('aria-label', 
            `${imageDescription} thumbnail - Image ${position}${isActive ? ' (currently selected)' : ''}`);
          
          // Add state information
          if (isActive) {
            thumbnail.setAttribute('aria-current', 'true');
          } else {
            thumbnail.removeAttribute('aria-current');
          }
          
          // Add keyboard shortcut hints
          thumbnail.setAttribute('title', 
            `Select image ${position}. ${isActive ? 'Currently selected. ' : ''}Use arrow keys to navigate.`);
        });
      },

      // Focus management enhancements
      manageFocus: {
        // Set focus on specific element with announcement
        setFocus: (element, announceChange = true) => {
          if (!element) return;
          
          try {
            element.focus();
            
            if (announceChange) {
              const elementType = element.getAttribute('role') || element.tagName.toLowerCase();
              const elementLabel = element.getAttribute('aria-label') || element.textContent || 'element';
              this.controllers.accessibility.announce(`Focused on ${elementType}: ${elementLabel}`);
            }
          } catch (error) {
            this.controllers.errorHandler?.warn('Focus management failed', { error, element });
          }
        },
        
        // Manage focus indicators
        updateFocusIndicators: () => {
          // Ensure all interactive elements have proper focus styles
          const interactiveElements = [
            ...this.elements.thumbnailItems,
            this.elements.prevButton,
            this.elements.nextButton
          ].filter(Boolean);
          
          interactiveElements.forEach(element => {
            element.addEventListener('focus', this.handleFocusIn.bind(this));
            element.addEventListener('blur', this.handleFocusOut.bind(this));
          });
        },
        
        // Trap focus within gallery if needed
        trapFocus: (enable = true) => {
          if (enable) {
            document.addEventListener('keydown', this.handleFocusTrap.bind(this));
          } else {
            document.removeEventListener('keydown', this.handleFocusTrap.bind(this));
          }
        }
      }
    };
    
    // Focus event handlers
    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.handleFocusOut = this.handleFocusOut.bind(this);
    this.handleFocusTrap = this.handleFocusTrap.bind(this);
  }

  /**
   * Initialize lazy loading with IntersectionObserver for performance optimization
   * Sets up observers for off-screen images and adjacent image preloading
   * Falls back to immediate loading if IntersectionObserver is not supported
   * @returns {void}
   */
  initLazyLoading() {
    try {
      // Check if IntersectionObserver is supported
      if (!this.isFeatureSupported('intersectionObserver')) {
        // Fallback: Load all images immediately
        this.loadAllImages();
        return;
      }

      // Create IntersectionObserver for lazy loading images
      const imageObserverOptions = {
        root: this.elements.mainImageContainer,
        rootMargin: '50px', // Preload images 50px before they come into view
        threshold: 0.01
      };

      this.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            
            // Skip if already loaded
            if (img.dataset.loaded === 'true') return;
            
            // Load the image
            this.loadImage(img);
            
            // Unobserve after loading
            this.imageObserver.unobserve(img);
          }
        });
      }, imageObserverOptions);

      // Observe all alternate images (not the main image which is already visible)
      const alternateImages = this.elements.mainImageContainer?.querySelectorAll('.product-gallery__image--alternate');
      if (alternateImages) {
        alternateImages.forEach(img => {
          // Mark as lazy loadable
          img.dataset.lazyLoad = 'true';
          
          // Set a low-quality placeholder if available
          if (img.dataset.placeholder) {
            img.src = img.dataset.placeholder;
          }
          
          // Start observing
          this.imageObserver.observe(img);
        });
      }

      // Create IntersectionObserver for preloading adjacent images
      const preloadObserverOptions = {
        root: null,
        rootMargin: '200px', // Preload images 200px before viewport
        threshold: 0
      };

      this.preloadObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Preload adjacent images when gallery comes into view
            this.preloadAdjacentImages();
            
            // Only need to do this once
            this.preloadObserver.disconnect();
          }
        });
      }, preloadObserverOptions);

      // Observe the gallery container
      if (this.elements.galleryContainer) {
        this.preloadObserver.observe(this.elements.galleryContainer);
      }

      if (window.logger) {
        window.logger.log('Lazy loading initialized with IntersectionObserver');
      }

    } catch (error) {
      this.controllers.errorHandler?.warn('Lazy loading initialization failed', { error });
      // Fallback: Load all images
      this.loadAllImages();
    }
  }

  /**
   * Load a specific image with proper error handling and loading states
   * @param {HTMLImageElement} img - The image element to load
   * @returns {void}
   */
  loadImage(img) {
    try {
      if (!img || img.dataset.loaded === 'true') return;

      const actualSrc = img.dataset.src || img.getAttribute('data-lazy-src');
      const actualSrcset = img.dataset.srcset || img.getAttribute('data-lazy-srcset');

      if (actualSrc) {
        // Create a new image to preload
        const tempImg = new Image();
        
        tempImg.onload = () => {
          // Update the actual image
          img.src = actualSrc;
          if (actualSrcset) {
            img.srcset = actualSrcset;
          }
          
          // Mark as loaded
          img.dataset.loaded = 'true';
          img.classList.add('is-loaded');
          
          // Remove loading class if present
          img.classList.remove('is-loading');
        };

        tempImg.onerror = () => {
          img.dataset.loaded = 'error';
          img.classList.add('has-error');
          this.controllers.errorHandler?.warn('Image failed to load', { src: actualSrc });
        };

        // Start loading
        img.classList.add('is-loading');
        tempImg.src = actualSrc;
      }

    } catch (error) {
      this.controllers.errorHandler?.warn('Image loading failed', { error });
    }
  }

  /**
   * Fallback: Load all images immediately when IntersectionObserver not supported
   * @returns {void}
   */
  loadAllImages() {
    try {
      const allImages = this.elements.mainImageContainer?.querySelectorAll('.product-gallery__image');
      if (allImages) {
        allImages.forEach(img => this.loadImage(img));
      }
    } catch (error) {
      this.controllers.errorHandler?.warn('Load all images failed', { error });
    }
  }

  /**
   * Preload adjacent images for smoother navigation transitions
   * Preloads next and previous images to reduce loading delays
   * @returns {void}
   */
  preloadAdjacentImages() {
    try {
      const currentIndex = this.state.currentIndex;
      const nextIndex = this.getNextIndex();
      const prevIndex = this.getPreviousIndex();

      // Preload next and previous images
      [prevIndex, nextIndex].forEach(index => {
        if (index !== currentIndex && this.state.images[index]) {
          const image = this.state.images[index];
          
          // Preload the full-size image
          const img = new Image();
          img.src = image.mainSrc;
          
          // Also trigger lazy loading if using IntersectionObserver
          const galleryImg = this.elements.mainImageContainer?.querySelector(
            `.product-gallery__image[data-image-index="${index}"]`
          );
          if (galleryImg && galleryImg.dataset.lazyLoad === 'true') {
            this.loadImage(galleryImg);
          }
        }
      });

    } catch (error) {
      this.controllers.errorHandler?.warn('Adjacent image preloading failed', { error });
    }
  }

  /**
   * Create position indicator element showing current image position ("X of Y")
   * @returns {void}
   */
  createPositionIndicator() {
    try {
      // Check if position indicator already exists
      const existingIndicator = this.elements.galleryContainer.querySelector('[data-gallery-position]');
      
      if (existingIndicator) {
        this.elements.positionIndicator = existingIndicator;
        return;
      }
      
      // Create position indicator
      const indicator = document.createElement('div');
      indicator.className = 'product-gallery__position';
      indicator.setAttribute('data-gallery-position', '');
      indicator.setAttribute('aria-live', 'polite');
      indicator.setAttribute('aria-atomic', 'true');
      
      // Add to main image container
      const container = this.elements.mainImageContainer || this.elements.galleryContainer;
      if (container) {
        container.appendChild(indicator);
        this.elements.positionIndicator = indicator;
        
        if (window.logger) {
          window.logger.log('Position indicator created successfully');
        }
      }
      
    } catch (error) {
      this.handleError('Failed to create position indicator', error);
    }
  }
  
  /**
   * Update position indicator text with current image position
   * @param {number} currentIndex - The current image index (0-based)
   * @returns {void}
   */
  updatePositionIndicator(currentIndex) {
    if (this.elements.positionIndicator && this.state.totalImages > 1) {
      const position = `${currentIndex + 1} of ${this.state.totalImages}`;
      this.elements.positionIndicator.textContent = position;
      
      // Show indicator during navigation
      this.elements.positionIndicator.style.opacity = '1';
      this.elements.positionIndicator.style.visibility = 'visible';
      
      // Auto-hide after a delay
      clearTimeout(this.positionIndicatorTimeout);
      this.positionIndicatorTimeout = setTimeout(() => {
        if (this.elements.positionIndicator) {
          this.elements.positionIndicator.style.opacity = '0';
          this.elements.positionIndicator.style.visibility = 'hidden';
        }
      }, 2000);
    }
  }
  
  /**
   * Scroll thumbnail into view with smooth behavior for better UX
   * @param {number} targetIndex - The thumbnail index to scroll into view
   * @returns {void}
   */
  scrollThumbnailIntoView(targetIndex) {
    try {
      if (!this.elements.thumbnails || !this.elements.thumbnailItems[targetIndex]) {
        return;
      }
      
      const targetThumbnail = this.elements.thumbnailItems[targetIndex];
      const thumbnailsContainer = this.elements.thumbnails;
      
      // Check if thumbnail is already in view
      const containerRect = thumbnailsContainer.getBoundingClientRect();
      const thumbnailRect = targetThumbnail.getBoundingClientRect();
      
      const isInView = (
        thumbnailRect.top >= containerRect.top &&
        thumbnailRect.bottom <= containerRect.bottom &&
        thumbnailRect.left >= containerRect.left &&
        thumbnailRect.right <= containerRect.right
      );
      
      if (!isInView) {
        // Use smooth scrolling if supported
        if ('scrollIntoView' in targetThumbnail) {
          targetThumbnail.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        } else {
          // Fallback for older browsers
          targetThumbnail.scrollIntoView();
        }
        
        if (window.logger) {
          window.logger.log('Scrolled thumbnail into view', { targetIndex });
        }
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Thumbnail scroll failed', { error, targetIndex });
    }
  }

  /**
   * Attach event listeners to existing navigation arrows (rendered server-side)
   * Finds pre-rendered arrows and connects them to the gallery navigation system
   * @returns {void}
   */
  attachNavigationArrows() {
    try {
      // Only attach if we have multiple images
      if (this.state.totalImages <= 1) {
        return;
      }

      // Find navigation container
      const navContainer = this.elements.mainImageContainer || this.elements.galleryContainer;
      if (!navContainer) {
        this.controllers.errorHandler.warn('No container found for navigation arrows');
        return;
      }

      // Look for existing arrows in DOM (rendered by unified component)
      const existingPrev = navContainer.querySelector('[data-gallery-prev]');
      const existingNext = navContainer.querySelector('[data-gallery-next]');
      
      if (existingPrev || existingNext) {
        if (window.logger) {
          window.logger.log('Navigation arrows already exist in DOM, re-attaching event listeners');
        }
        
        // Re-use existing buttons and attach event listeners
        this.elements.prevButton = existingPrev;
        this.elements.nextButton = existingNext;
        
        // Add event listeners for arrow buttons
        if (this.elements.prevButton) {
          this.elements.prevButton.addEventListener('click', this.handlePrevClick.bind(this));
        }
        if (this.elements.nextButton) {
          this.elements.nextButton.addEventListener('click', this.handleNextClick.bind(this));
        }
        
        if (window.logger) {
          window.logger.log('Event listeners re-attached to existing navigation arrows');
        }
        return;
      }

      // If no pre-rendered arrows found, log warning
      this.controllers.errorHandler.warn('No pre-rendered navigation arrows found in DOM');

    } catch (error) {
      this.handleError('Failed to attach navigation arrows', error);
    }
  }


  /**
   * Handle previous button click with enhanced accessibility and error handling
   * @param {MouseEvent} event - The click event object
   * @returns {void}
   */
  handlePrevClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const prevIndex = this.getPreviousIndex();
      this.navigateToIndex(prevIndex, 'arrow');
      
      if (window.logger) {
        window.logger.log('Previous arrow clicked', { 
          currentIndex: this.state.currentIndex, 
          targetIndex: prevIndex 
        });
      }
    } catch (error) {
      this.handleError('Previous navigation failed', error);
    }
  }

  /**
   * Handle next button click with enhanced accessibility and error handling
   * @param {MouseEvent} event - The click event object
   * @returns {void}
   */
  handleNextClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const nextIndex = this.getNextIndex();
      this.navigateToIndex(nextIndex, 'arrow');
      
      if (window.logger) {
        window.logger.log('Next arrow clicked', { 
          currentIndex: this.state.currentIndex, 
          targetIndex: nextIndex 
        });
      }
    } catch (error) {
      this.handleError('Next navigation failed', error);
    }
  }

  /**
   * Get previous image index with loop functionality (last → first)
   * @returns {number} The previous image index (0-based)
   */
  getPreviousIndex() {
    if (this.state.totalImages <= 1) return 0;
    
    return this.state.currentIndex === 0 
      ? this.state.totalImages - 1 
      : this.state.currentIndex - 1;
  }

  /**
   * Get next image index with loop functionality (first → last)
   * @returns {number} The next image index (0-based)
   */
  getNextIndex() {
    if (this.state.totalImages <= 1) return 0;
    
    return this.state.currentIndex === this.state.totalImages - 1 
      ? 0 
      : this.state.currentIndex + 1;
  }

  /**
   * Debounce utility function to prevent rapid navigation and improve performance
   * @param {Function} func - The function to debounce
   * @param {number} wait - The delay in milliseconds
   * @returns {Function} The debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Preload adjacent images for performance optimization
   * Preloads next and previous images to reduce navigation delays
   * @returns {void}
   */
  preloadImages() {
    try {
      if (this.state.totalImages <= 1) return;

      const currentIndex = this.state.currentIndex;
      const nextIndex = this.getNextIndex();
      const prevIndex = this.getPreviousIndex();

      // Preload next and previous images
      const imagesToPreload = [nextIndex, prevIndex].filter((index, i, arr) => 
        index !== currentIndex && arr.indexOf(index) === i // Remove duplicates and current
      );

      imagesToPreload.forEach(index => {
        if (this.state.images[index]) {
          const image = this.state.images[index];
          const img = new Image();
          img.src = image.mainSrc;
          // Preload doesn't need onload handling, browser handles caching
        }
      });

      if (window.logger) {
        window.logger.log('Preloaded images', { 
          current: currentIndex, 
          preloaded: imagesToPreload 
        });
      }

    } catch (error) {
      this.controllers.errorHandler?.warn('Image preloading failed', { error });
    }
  }

  /**
   * Navigate to previous image (public API method)
   * @returns {Promise<void>} Resolves when navigation is complete
   */
  navigatePrevious() {
    const prevIndex = this.getPreviousIndex();
    return this.navigateToIndex(prevIndex);
  }

  /**
   * Navigate to next image (public API method)
   * @returns {Promise<void>} Resolves when navigation is complete
   */
  navigateNext() {
    const nextIndex = this.getNextIndex();
    return this.navigateToIndex(nextIndex);
  }

  /**
   * Initialize event bridge for external events (color swatches, variant changes)
   * Sets up handlers for integrating with other components in the theme
   * @returns {void}
   */
  initEventBridge() {
    this.controllers.eventBridge = {
      // Enhanced color swatch event handling
      handleColorSwatchChange: (event) => {
        try {
          const { variantId, swatch, colorValue } = event.detail || {};
          
          if (!variantId) {
            this.controllers.errorHandler.warn('No variant ID in colorSwatch:change event', { detail: event.detail });
            return;
          }

          if (window.logger) {
            window.logger.log('Color swatch change detected', {
              variantId,
              colorValue,
              currentGalleryIndex: this.state.currentIndex
            });
          }

          // Find corresponding gallery image for this variant
          const targetIndex = this.findImageByVariant(variantId);
          
          if (targetIndex !== -1 && targetIndex !== this.state.currentIndex) {
            // Navigate to the variant's featured image with color source
            this.navigateToIndex(targetIndex, 'color');
            this.state.lastColorSwatchVariantId = variantId;
            
            // Announce the change for accessibility
            this.controllers.accessibility.announce(
              `Switched to ${colorValue || 'variant'} image: ${targetIndex + 1} of ${this.state.totalImages}`
            );
            
            if (window.logger) {
              window.logger.log('Gallery updated from color swatch', {
                variantId,
                colorValue,
                previousIndex: this.state.currentIndex,
                newIndex: targetIndex
              });
            }
          } else if (targetIndex === -1) {
            this.controllers.errorHandler.warn('No gallery image found for color variant', { 
              variantId, 
              colorValue 
            });
          } else {
            // Already on the correct image
            if (window.logger) {
              window.logger.log('Gallery already showing correct image for variant', { 
                variantId, 
                currentIndex: this.state.currentIndex 
              });
            }
          }

        } catch (error) {
          this.handleError('Color swatch change handling failed', error);
        }
      },

      // Clean up event listeners
      destroy: () => {
        document.removeEventListener('colorSwatch:change', this.handleColorSwatchChange);
        if (this.elements.galleryContainer) {
          this.elements.galleryContainer.removeEventListener('colorSwatch:change', this.handleColorSwatchChange);
        }
      }
    };
  }

  /**
   * Find image index by variant ID using featured media mapping
   * Maps color variant selections to corresponding gallery images
   * @param {string|number} variantId - The variant ID to find image for
   * @returns {number} The image index (-1 if not found)
   */
  findImageByVariant(variantId) {
    try {
      if (!variantId) {
        this.controllers.errorHandler?.warn('No variant ID provided for image lookup');
        return -1;
      }

      // Find the color swatch with matching variant ID to get featured media ID
      const colorSwatchContainer = document.querySelector('[data-color-swatches]');
      if (!colorSwatchContainer) {
        this.controllers.errorHandler?.warn('No color swatches found for variant mapping');
        return -1;
      }

      const variantSwatch = colorSwatchContainer.querySelector(`[data-variant-id="${variantId}"]`);
      if (!variantSwatch) {
        this.controllers.errorHandler?.warn('No swatch found for variant ID', { variantId });
        return -1;
      }

      const featuredMediaId = variantSwatch.dataset.mediaId;
      const featuredMediaUrl = variantSwatch.dataset.mediaUrl;
      
      if (!featuredMediaId && !featuredMediaUrl) {
        this.controllers.errorHandler?.warn('No featured media ID or URL found on variant swatch', { variantId });
        return -1;
      }

      // Find gallery image with matching media ID or URL pattern
      const matchingIndex = this.state.images.findIndex(image => {
        // First try direct ID matching
        if (featuredMediaId && (
          image.id === featuredMediaId || 
          image.id === featuredMediaId.toString() ||
          image.id.includes(featuredMediaId.toString())
        )) {
          return true;
        }
        
        // If ID matching fails, try URL pattern matching
        if (featuredMediaUrl && image.mainSrc) {
          // Extract filename from both URLs (without query parameters)
          const getImageFilename = (url) => {
            if (!url) return '';
            const pathname = url.split('?')[0]; // Remove query parameters
            return pathname.split('/').pop(); // Get filename
          };
          
          const swatchFilename = getImageFilename(featuredMediaUrl);
          const galleryFilename = getImageFilename(image.mainSrc);
          
          // Match if filenames are the same (ignoring width/height parameters)
          if (swatchFilename && galleryFilename && swatchFilename === galleryFilename) {
            return true;
          }
          
          // Fallback: check if the core image identifier is the same
          const getCoreImageId = (url) => {
            if (!url) return '';
            const filename = getImageFilename(url);
            // Extract the main part before any size/variant suffixes
            return filename.split('.')[0].split('_')[0];
          };
          
          const swatchCoreId = getCoreImageId(featuredMediaUrl);
          const galleryCoreId = getCoreImageId(image.mainSrc);
          
          if (swatchCoreId && galleryCoreId && swatchCoreId === galleryCoreId) {
            return true;
          }
        }
        
        return false;
      });

      if (matchingIndex === -1) {
        this.controllers.errorHandler?.warn('No gallery image found for variant', { 
          variantId, 
          featuredMediaId,
          featuredMediaUrl,
          availableImageIds: this.state.images.map(img => img.id),
          availableImageSrcs: this.state.images.map(img => img.mainSrc)
        });
        return -1;
      }

      if (window.logger) {
        window.logger.log('Successfully mapped variant to gallery image', {
          variantId,
          featuredMediaId,
          featuredMediaUrl,
          galleryIndex: matchingIndex,
          imageId: this.state.images[matchingIndex].id,
          imageSrc: this.state.images[matchingIndex].mainSrc
        });
      }

      return matchingIndex;

    } catch (error) {
      this.handleError('Failed to find image by variant', error);
      return -1;
    }
  }

  /**
   * Navigate to specific index with enhanced transitions, preloading and accessibility
   * Core navigation method that handles state updates, transitions, and announcements
   * @async
   * @param {number} targetIndex - The target image index (0-based)
   * @param {string} [source='navigation'] - The navigation source ('arrow', 'thumbnail', 'color', 'swipe', 'keyboard')
   * @returns {Promise<void>} Resolves when navigation and transition complete
   * @throws {Error} When navigation fails or invalid index provided
   */
  async navigateToIndex(targetIndex, source = 'navigation') {
    try {
      if (targetIndex < 0 || targetIndex >= this.state.totalImages) {
        throw new Error(`Invalid target index: ${targetIndex}`);
      }

      if (targetIndex === this.state.currentIndex) {
        return; // Already at target
      }

      if (this.state.isTransitioning) {
        return; // Prevent concurrent navigation
      }

      // Start transition with enhanced loading state
      this.controllers.transitions.setTransitioning(true);
      this.controllers.accessibility.announceLoading(true);
      
      // Set loading state on target thumbnail
      if (this.elements.thumbnailItems[targetIndex]) {
        this.controllers.transitions.setElementLoading(
          this.elements.thumbnailItems[targetIndex], 
          true, 
          'Loading image'
        );
      }

      const targetImage = this.state.images[targetIndex];
      const previousIndex = this.state.currentIndex;

      // Use enhanced cross-fade transition with preloading
      await this.controllers.transitions.crossFade(
        targetImage.mainSrc,
        targetImage.mainSrcset
      );

      // Update state
      this.state.currentIndex = targetIndex;

      // Update thumbnail states
      this.updateThumbnailStates(targetIndex);

      // Enhanced accessibility updates
      this.controllers.accessibility.updateImageAria(targetIndex);
      this.controllers.accessibility.updateThumbnailAria(targetIndex);
      this.controllers.accessibility.updateNavigationAria('prev');
      this.controllers.accessibility.updateNavigationAria('next');

      // Update alt text for screen readers
      if (this.elements.mainImage) {
        this.elements.mainImage.alt = targetImage.alt;
      }

      // End transition with loading complete announcement
      this.controllers.transitions.setTransitioning(false);
      this.controllers.accessibility.announceLoading(false);
      
      // Clear loading state from all thumbnails
      this.elements.thumbnailItems.forEach(thumbnail => {
        this.controllers.transitions.setElementLoading(thumbnail, false);
      });

      // Trigger preloading for adjacent images
      this.preloadImages();

      // Enhanced navigation announcement with source context
      this.controllers.accessibility.announceNavigation(targetIndex, this.state.totalImages, source);

      // Emit navigation event
      this.dispatchEvent(new CustomEvent('gallery:imageChanged', {
        bubbles: true,
        detail: {
          previousIndex: previousIndex,
          currentIndex: targetIndex,
          image: targetImage,
          source: source
        }
      }));

    } catch (error) {
      this.controllers.transitions.setTransitioning(false);
      this.controllers.accessibility.announceError('Failed to navigate to image');
      this.handleError('Navigation failed', error);
    }
  }


  /**
   * Update thumbnail visual states with enhanced ARIA integration
   * Updates CSS classes, ARIA attributes, and scrolls active thumbnail into view
   * @param {number} activeIndex - The currently active image index
   * @returns {void}
   */
  updateThumbnailStates(activeIndex) {
    this.elements.thumbnailItems.forEach((thumbnail, index) => {
      const isActive = index === activeIndex;
      thumbnail.classList.toggle('is-active', isActive);
      
      // Update ARIA attributes for accessibility
      thumbnail.setAttribute('aria-selected', isActive);
      thumbnail.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    
    // Update position indicator
    this.updatePositionIndicator(activeIndex);
    
    // Ensure active thumbnail is in view
    this.scrollThumbnailIntoView(activeIndex);
  }

  /**
   * Attach event listeners for all gallery interactions
   * Sets up color swatch, thumbnail, keyboard, touch, and resize event handling
   * @returns {void}
   */
  attachEventListeners() {
    try {
      // Listen for color swatch changes with proper event binding
      document.addEventListener('colorSwatch:change', this.handleColorSwatchChange);
      
      // Also listen on the gallery container for bubbled events
      if (this.elements.galleryContainer) {
        this.elements.galleryContainer.addEventListener('colorSwatch:change', this.handleColorSwatchChange);
      }

      // Listen for thumbnail clicks (existing functionality)
      if (this.elements.thumbnails) {
        this.elements.thumbnails.addEventListener('click', this.handleThumbnailClick);
      }

      // Listen for keyboard navigation
      this.addEventListener('keydown', this.handleKeydown);

      // Listen for touch events (foundation for swipe)
      this.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.addEventListener('touchend', this.handleTouchEnd, { passive: true });

      // Listen for resize (for responsive behavior)
      window.addEventListener('resize', this.handleResize);

    } catch (error) {
      this.handleError('Event listener attachment failed', error);
    }
  }

  /**
   * Handle color swatch change events from external components
   * @param {CustomEvent} event - The colorSwatch:change event
   * @returns {void}
   */
  handleColorSwatchChange(event) {
    if (this.controllers.eventBridge) {
      this.controllers.eventBridge.handleColorSwatchChange(event);
    }
  }

  /**
   * Handle thumbnail clicks with enhanced accessibility and focus management
   * @param {MouseEvent} event - The click event object
   * @returns {void}
   */
  handleThumbnailClick(event) {
    const thumbnail = event.target.closest(this.config.thumbnailItemSelector);
    if (!thumbnail) return;

    event.preventDefault();
    event.stopPropagation();

    const index = this.elements.thumbnailItems.indexOf(thumbnail);
    if (index !== -1 && index !== this.state.currentIndex) {
      // Navigate to selected thumbnail with source context
      this.navigateToIndex(index, 'thumbnail');
      
      // Focus the thumbnail for keyboard accessibility
      thumbnail.focus();
      
      if (window.logger) {
        window.logger.log('Thumbnail clicked', { 
          fromIndex: this.state.currentIndex, 
          toIndex: index 
        });
      }
    }
  }

  /**
   * Handle keyboard navigation with arrow keys, Home, and End
   * Provides full keyboard accessibility for gallery navigation
   * @async
   * @param {KeyboardEvent} event - The keyboard event object
   * @returns {Promise<void>} Resolves when keyboard navigation completes
   */
  async handleKeydown(event) {
    // Only handle if gallery has focus or contains the active element
    if (!this.contains(document.activeElement) && document.activeElement !== this) {
      return;
    }

    // Only handle arrow keys for gallery navigation
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return;
    }

    try {
      let targetIndex = this.state.currentIndex;
      let handled = false;

      switch (event.key) {
        case 'ArrowLeft':
          // Navigate to previous image
          targetIndex = this.getPreviousIndex();
          handled = true;
          break;

        case 'ArrowRight':
          // Navigate to next image
          targetIndex = this.getNextIndex();
          handled = true;
          break;

        case 'Home':
          // Navigate to first image
          targetIndex = 0;
          handled = true;
          break;

        case 'End':
          // Navigate to last image
          targetIndex = this.state.totalImages - 1;
          handled = true;
          break;
      }

      if (handled) {
        // Prevent default behavior and page scrolling
        event.preventDefault();
        event.stopPropagation();

        // Navigate to target index with keyboard source
        await this.navigateToIndex(targetIndex, 'keyboard');

        // Log keyboard navigation
        if (window.logger) {
          window.logger.log('Keyboard navigation', {
            key: event.key,
            fromIndex: this.state.currentIndex,
            toIndex: targetIndex
          });
        }
      }

    } catch (error) {
      this.handleError('Keyboard navigation failed', error);
    }
  }

  /**
   * Handle touch start for swipe gesture detection
   * Initializes touch tracking for horizontal swipe navigation
   * @param {TouchEvent} event - The touch start event
   * @returns {void}
   */
  handleTouchStart(event) {
    try {
      // Only handle single touch (not multi-touch gestures)
      if (event.touches.length !== 1) return;

      // Get touch position
      const touch = event.touches[0];
      
      // Store initial touch position
      this.state.touchStartX = touch.clientX;
      this.state.touchStartY = touch.clientY;
      this.state.isTouching = true;
      
      // Reset swipe tracking
      this.state.touchDeltaX = 0;
      this.state.touchDeltaY = 0;
      this.state.touchStartTime = Date.now();
      
      if (window.logger) {
        window.logger.log('Touch start detected', {
          startX: this.state.touchStartX,
          startY: this.state.touchStartY
        });
      }
      
    } catch (error) {
      this.handleError('Touch start handling failed', error);
    }
  }

  /**
   * Handle touch move for swipe gesture tracking and conflict resolution
   * Tracks horizontal swipes while preserving vertical scroll behavior
   * @param {TouchEvent} event - The touch move event
   * @returns {void}
   */
  handleTouchMove(event) {
    try {
      // Exit if not tracking a touch or multi-touch
      if (!this.state.isTouching || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - this.state.touchStartX;
      const deltaY = touch.clientY - this.state.touchStartY;
      
      // Store deltas for gesture calculation
      this.state.touchDeltaX = deltaX;
      this.state.touchDeltaY = deltaY;
      
      // Calculate absolute values for comparison
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Determine if this is primarily a horizontal swipe
      const isHorizontalSwipe = absDeltaX > absDeltaY && absDeltaX > this.config.touchThreshold;
      
      // If horizontal swipe detected, prevent vertical scrolling
      if (isHorizontalSwipe) {
        event.preventDefault();
        
        // Add swiping class and visual feedback
        this.classList.add('is-swiping');
        
        if (this.elements.mainImageContainer) {
          this.elements.mainImageContainer.style.transform = `translateX(${deltaX * 0.2}px)`;
        }
      }
      
    } catch (error) {
      this.handleError('Touch move handling failed', error);
    }
  }

  /**
   * Handle touch end for swipe gesture completion and navigation
   * Evaluates swipe distance and velocity to trigger navigation
   * @param {TouchEvent} event - The touch end event
   * @returns {void}
   */
  handleTouchEnd(event) {
    try {
      // Exit if not tracking a touch
      if (!this.state.isTouching) return;

      const deltaX = this.state.touchDeltaX || 0;
      const deltaY = this.state.touchDeltaY || 0;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Calculate swipe duration for velocity
      const swipeDuration = Date.now() - this.state.touchStartTime;
      const swipeVelocity = absDeltaX / swipeDuration;
      
      // Remove visual feedback and swiping class
      this.classList.remove('is-swiping');
      
      if (this.elements.mainImageContainer) {
        this.elements.mainImageContainer.style.transform = '';
      }
      
      // Determine if this is a valid horizontal swipe
      const isHorizontalSwipe = (
        absDeltaX > this.config.swipeThreshold && 
        absDeltaX > absDeltaY &&
        (swipeVelocity > 0.1 || absDeltaX > this.config.swipeThreshold * 2)
      );
      
      if (isHorizontalSwipe && !this.state.isTransitioning) {
        // Determine swipe direction and navigate
        if (deltaX < 0) {
          // Swipe left - navigate to next image
          const nextIndex = this.getNextIndex();
          this.navigateToIndex(nextIndex, 'swipe');
          
          if (window.logger) {
            window.logger.log('Swipe left detected - navigating to next', {
              deltaX,
              swipeVelocity,
              targetIndex: nextIndex
            });
          }
          
          // Announce for accessibility
          this.controllers.accessibility.announce('Swiped to next image');
          
        } else if (deltaX > 0) {
          // Swipe right - navigate to previous image
          const prevIndex = this.getPreviousIndex();
          this.navigateToIndex(prevIndex, 'swipe');
          
          if (window.logger) {
            window.logger.log('Swipe right detected - navigating to previous', {
              deltaX,
              swipeVelocity,
              targetIndex: prevIndex
            });
          }
          
          // Announce for accessibility
          this.controllers.accessibility.announce('Swiped to previous image');
        }
        
        // Emit swipe event
        this.dispatchEvent(new CustomEvent('gallery:swipe', {
          bubbles: true,
          detail: {
            direction: deltaX < 0 ? 'left' : 'right',
            deltaX,
            deltaY,
            velocity: swipeVelocity
          }
        }));
      }
      
      // Reset touch state
      this.state.isTouching = false;
      this.state.touchDeltaX = 0;
      this.state.touchDeltaY = 0;
      
    } catch (error) {
      this.handleError('Touch end handling failed', error);
      // Reset state on error
      this.state.isTouching = false;
    }
  }

  /**
   * Detect touch support and add appropriate classes for mobile optimization
   * Shows swipe hints for first-time mobile users
   * @returns {void}
   */
  detectTouchSupport() {
    try {
      // Check for touch support
      const hasTouch = ('ontouchstart' in window) || 
                      (navigator.maxTouchPoints > 0) || 
                      (navigator.msMaxTouchPoints > 0);
      
      if (hasTouch) {
        this.classList.add('supports-touch');
        
        // Show swipe hint on first visit for mobile users
        const hasSeenSwipeHint = this.isFeatureSupported('localStorage') ? localStorage.getItem('gallery-swipe-hint-seen') : null;
        if (!hasSeenSwipeHint && this.state.totalImages > 1) {
          this.classList.add('show-swipe-hint');
          
          // Hide hint after animation and remember
          setTimeout(() => {
            this.classList.remove('show-swipe-hint');
            if (this.isFeatureSupported('localStorage')) {
              localStorage.setItem('gallery-swipe-hint-seen', 'true');
            }
          }, 3000);
        }
        
        if (window.logger) {
          window.logger.log('Touch support detected and configured');
        }
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Touch detection failed', { error });
    }
  }

  /**
   * Handle window resize events for responsive behavior
   * @returns {void}
   */
  handleResize() {
    // Update touch targets on resize for responsive behavior
    this.updateTouchTargets();
  }
  
  /**
   * Update touch targets based on viewport size for mobile optimization
   * @returns {void}
   */
  updateTouchTargets() {
    try {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      
      if (isMobile && this.elements.galleryContainer) {
        // Ensure proper touch handling on mobile
        this.elements.galleryContainer.style.touchAction = 'pan-y pinch-zoom';
      }
      
    } catch (error) {
      this.controllers.errorHandler?.warn('Touch target update failed', { error });
    }
  }

  /**
   * Remove all event listeners for cleanup
   * @returns {void}
   */
  removeEventListeners() {
    try {
      document.removeEventListener('colorSwatch:change', this.handleColorSwatchChange);
      
      if (this.elements.galleryContainer) {
        this.elements.galleryContainer.removeEventListener('colorSwatch:change', this.handleColorSwatchChange);
      }
      
      if (this.elements.thumbnails) {
        this.elements.thumbnails.removeEventListener('click', this.handleThumbnailClick);
      }

      // Remove arrow button event listeners
      if (this.elements.prevButton) {
        this.elements.prevButton.removeEventListener('click', this.handlePrevClick);
      }
      
      if (this.elements.nextButton) {
        this.elements.nextButton.removeEventListener('click', this.handleNextClick);
      }

      this.removeEventListener('keydown', this.handleKeydown);
      this.removeEventListener('touchstart', this.handleTouchStart);
      this.removeEventListener('touchmove', this.handleTouchMove);
      this.removeEventListener('touchend', this.handleTouchEnd);
      
      window.removeEventListener('resize', this.handleResize);

      if (this.controllers.eventBridge) {
        this.controllers.eventBridge.destroy();
      }

    } catch (error) {
      this.controllers.errorHandler?.log('Event listener removal failed', error);
    }
  }

  /**
   * Handle errors with graceful fallbacks and user notification
   * @param {string} message - Error message description
   * @param {Error} error - The error object
   * @returns {void}
   */
  handleError(message, error) {
    this.state.hasErrors = true;
    
    if (this.controllers.errorHandler) {
      this.controllers.errorHandler.log(message, error);
    } else {
      console.error(`ProductGalleryNavigation: ${message}`, error);
    }

    // Emit error event
    this.dispatchEvent(new CustomEvent('gallery:error', {
      bubbles: true,
      detail: { message, error }
    }));

    // Graceful fallback: try to maintain basic functionality
    this.controllers.errorHandler?.recover(() => {
      this.state.isTransitioning = false;
      if (this.elements.galleryContainer) {
        this.elements.galleryContainer.classList.remove('is-transitioning');
      }
    });
  }

  /**
   * Destroy the gallery and clean up all resources
   * Removes event listeners, DOM elements, and clears state
   * @returns {void}
   */
  destroy() {
    try {
      this.removeEventListeners();
      
      // Disconnect IntersectionObservers
      if (this.imageObserver) {
        this.imageObserver.disconnect();
        this.imageObserver = null;
      }
      
      if (this.preloadObserver) {
        this.preloadObserver.disconnect();
        this.preloadObserver = null;
      }
      
      // Remove arrow buttons from DOM
      if (this.elements.prevButton && this.elements.prevButton.parentNode) {
        this.elements.prevButton.parentNode.removeChild(this.elements.prevButton);
      }
      
      if (this.elements.nextButton && this.elements.nextButton.parentNode) {
        this.elements.nextButton.parentNode.removeChild(this.elements.nextButton);
      }
      
      // Remove ARIA live region if created
      if (this.elements.ariaLiveRegion && this.elements.ariaLiveRegion.parentNode) {
        this.elements.ariaLiveRegion.parentNode.removeChild(this.elements.ariaLiveRegion);
      }
      
      // Remove position indicator if created
      if (this.elements.positionIndicator && this.elements.positionIndicator.parentNode) {
        this.elements.positionIndicator.parentNode.removeChild(this.elements.positionIndicator);
      }
      
      // Clear position indicator timeout
      if (this.positionIndicatorTimeout) {
        clearTimeout(this.positionIndicatorTimeout);
      }
      
      // Clear state
      this.state.isInitialized = false;
      this.state.hasErrors = false;
      this.state.lastError = null;

      // Clear DOM references
      Object.keys(this.elements).forEach(key => {
        this.elements[key] = null;
      });

      // Clear controllers
      Object.keys(this.controllers).forEach(key => {
        this.controllers[key] = null;
      });

      if (window.logger) {
        window.logger.log('ProductGalleryNavigation destroyed');
      }

    } catch (error) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('ProductGalleryNavigation destruction failed:', error);
      }
    }
  }
  
  /**
   * Progressive Enhancement: Safe touch detection with multiple methods
   * @returns {boolean} True if touch is supported, false otherwise
   */
  isTouchSupported() {
    try {
      return ('ontouchstart' in window) || 
             (window.navigator && window.navigator.maxTouchPoints > 0) || 
             (window.navigator && window.navigator.msMaxTouchPoints > 0) ||
             (window.matchMedia && window.matchMedia('(hover: none)').matches);
    } catch (e) {
      // If detection fails, assume no touch support
      return false;
    }
  }
  
  /**
   * Progressive Enhancement: Check if browser feature is supported
   * @param {string} feature - Feature name to check ('customElements', 'intersectionObserver', 'matchMedia', 'localStorage')
   * @returns {boolean} True if feature is supported, false otherwise
   */
  isFeatureSupported(feature) {
    try {
      switch (feature) {
        case 'customElements':
          return 'customElements' in window;
        case 'intersectionObserver':
          return 'IntersectionObserver' in window;
        case 'matchMedia':
          return 'matchMedia' in window;
        case 'localStorage':
          try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
          } catch (e) {
            return false;
          }
        default:
          return false;
      }
    } catch (e) {
      return false;
    }
  }

  /**
   * Public API: Get current state information
   * @returns {Object} Object containing currentIndex, totalImages, isTransitioning, hasErrors
   */
  getCurrentState() {
    return {
      currentIndex: this.state.currentIndex,
      totalImages: this.state.totalImages,
      isTransitioning: this.state.isTransitioning,
      hasErrors: this.state.hasErrors
    };
  }

  /**
   * Public API: Get current image data object
   * @returns {Object|null} Current image object or null if not found
   */
  getCurrentImage() {
    return this.state.images[this.state.currentIndex] || null;
  }

  /**
   * Public API: Check if gallery has multiple images
   * @returns {boolean} True if gallery has more than one image
   */
  hasMultipleImages() {
    return this.state.totalImages > 1;
  }

  /**
   * Public API: Get last error information for debugging
   * @returns {Object|null} Last error object or null if no errors
   */
  getLastError() {
    return this.controllers.errorHandler?.getLastError() || null;
  }
}

// Progressive Enhancement: Safe custom element registration
if ('customElements' in window) {
  customElements.define('product-gallery-navigation', ProductGalleryNavigation);
} else {
  // Fallback for browsers that don't support custom elements
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('ProductGalleryNavigation: Custom Elements not supported, gallery will use fallback behavior');
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.ProductGalleryNavigation = ProductGalleryNavigation;
}