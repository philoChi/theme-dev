/**
 * product-gallery-controller.test.js
 * Unit tests for ProductGalleryNavigation controller
 * Testing Milestone 1: Gallery Controller Foundation
 */

// Mock environment setup
global.customElements = {
  define: jest.fn(),
  get: jest.fn()
};

global.HTMLElement = class HTMLElement {
  constructor() {
    this.children = [];
    this.classList = {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn()
    };
    this.setAttribute = jest.fn();
    this.getAttribute = jest.fn();
    this.removeAttribute = jest.fn();
    this.querySelector = jest.fn();
    this.querySelectorAll = jest.fn(() => []);
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.dispatchEvent = jest.fn();
    this.appendChild = jest.fn();
    this.closest = jest.fn();
    this.contains = jest.fn();
  }

  connectedCallback() {}
  disconnectedCallback() {}
};

global.document = {
  createElement: jest.fn(() => new HTMLElement()),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.window = {
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail || {};
    this.bubbles = options.bubbles || false;
    this.composed = options.composed || false;
  }
};

// Import the component
require('../../assets/section-product-gallery-navigation.js');

describe('ProductGalleryNavigation Controller', () => {
  let galleryComponent;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a fresh instance
    galleryComponent = new window.ProductGalleryNavigation();
    
    // Mock DOM structure
    const mockGalleryContainer = new HTMLElement();
    const mockThumbnails = new HTMLElement();
    const mockMainImage = new HTMLElement();
    const mockMainImageContainer = new HTMLElement();
    
    // Setup mock thumbnails
    const mockThumbnailItems = [
      { 
        classList: { contains: jest.fn(() => true), add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
        querySelector: jest.fn(() => ({ 
          dataset: { 
            imageId: '1', 
            mainImageSrc: '/image1.jpg', 
            mainImageSrcset: '/image1.jpg 400w' 
          },
          src: '/thumb1.jpg',
          alt: 'Image 1'
        })),
        getAttribute: jest.fn(),
        setAttribute: jest.fn()
      },
      { 
        classList: { contains: jest.fn(() => false), add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
        querySelector: jest.fn(() => ({ 
          dataset: { 
            imageId: '2', 
            mainImageSrc: '/image2.jpg', 
            mainImageSrcset: '/image2.jpg 400w' 
          },
          src: '/thumb2.jpg',
          alt: 'Image 2'
        })),
        getAttribute: jest.fn(),
        setAttribute: jest.fn()
      }
    ];

    // Setup mock selectors
    galleryComponent.querySelector = jest.fn((selector) => {
      if (selector === '.product-main__gallery') return mockGalleryContainer;
      return null;
    });

    mockGalleryContainer.querySelector = jest.fn((selector) => {
      if (selector === '[data-gallery-thumbnails]') return mockThumbnails;
      if (selector === '[data-gallery-main-image-container]') return mockMainImageContainer;
      if (selector === '[data-main-image]') return mockMainImage;
      return null;
    });

    mockThumbnails.querySelectorAll = jest.fn(() => mockThumbnailItems);
    
    galleryComponent.closest = jest.fn(() => mockGalleryContainer);
  });

  describe('Constructor', () => {
    test('should initialize with correct default configuration', () => {
      expect(galleryComponent.config).toBeDefined();
      expect(galleryComponent.config.transitionDuration).toBe(300);
      expect(galleryComponent.config.debounceDelay).toBe(100);
      expect(galleryComponent.config.swipeThreshold).toBe(50);
    });

    test('should initialize with correct default state', () => {
      expect(galleryComponent.state).toBeDefined();
      expect(galleryComponent.state.currentIndex).toBe(0);
      expect(galleryComponent.state.totalImages).toBe(0);
      expect(galleryComponent.state.images).toEqual([]);
      expect(galleryComponent.state.isTransitioning).toBe(false);
      expect(galleryComponent.state.isInitialized).toBe(false);
    });

    test('should initialize empty DOM element references', () => {
      expect(galleryComponent.elements).toBeDefined();
      expect(galleryComponent.elements.galleryContainer).toBeNull();
      expect(galleryComponent.elements.mainImage).toBeNull();
      expect(galleryComponent.elements.thumbnailItems).toEqual([]);
    });

    test('should initialize empty controllers', () => {
      expect(galleryComponent.controllers).toBeDefined();
      expect(galleryComponent.controllers.transitions).toBeNull();
      expect(galleryComponent.controllers.eventBridge).toBeNull();
      expect(galleryComponent.controllers.errorHandler).toBeNull();
    });
  });

  describe('Error Handler Initialization', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
    });

    test('should create error handler with log method', () => {
      expect(galleryComponent.controllers.errorHandler).toBeDefined();
      expect(galleryComponent.controllers.errorHandler.log).toBeInstanceOf(Function);
    });

    test('should log errors correctly', () => {
      const testError = new Error('Test error');
      galleryComponent.controllers.errorHandler.log('Test message', testError);
      
      expect(galleryComponent.state.lastError).toBeDefined();
      expect(galleryComponent.state.lastError.message).toBe('Test message');
      expect(galleryComponent.state.lastError.error).toBe(testError);
      expect(window.logger.error).toHaveBeenCalledWith(
        'ProductGalleryNavigation: Test message',
        testError,
        {}
      );
    });

    test('should have warn method', () => {
      expect(galleryComponent.controllers.errorHandler.warn).toBeInstanceOf(Function);
      
      galleryComponent.controllers.errorHandler.warn('Test warning');
      expect(window.logger.warn).toHaveBeenCalledWith(
        'ProductGalleryNavigation: Test warning',
        {}
      );
    });

    test('should have recovery method', () => {
      expect(galleryComponent.controllers.errorHandler.recover).toBeInstanceOf(Function);
      
      const mockRecovery = jest.fn();
      galleryComponent.controllers.errorHandler.recover(mockRecovery);
      expect(mockRecovery).toHaveBeenCalled();
    });

    test('should track error state', () => {
      expect(galleryComponent.controllers.errorHandler.hasErrors()).toBe(false);
      
      galleryComponent.controllers.errorHandler.log('Error');
      expect(galleryComponent.controllers.errorHandler.hasErrors()).toBe(true);
      
      galleryComponent.controllers.errorHandler.clearErrors();
      expect(galleryComponent.controllers.errorHandler.hasErrors()).toBe(false);
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
      galleryComponent.initElements();
    });

    test('should build images array from thumbnails', () => {
      galleryComponent.initState();
      
      expect(galleryComponent.state.images).toHaveLength(2);
      expect(galleryComponent.state.totalImages).toBe(2);
      expect(galleryComponent.state.images[0]).toEqual({
        id: '1',
        thumbnailSrc: '/thumb1.jpg',
        mainSrc: '/image1.jpg',
        mainSrcset: '/image1.jpg 400w',
        alt: 'Image 1',
        thumbnail: expect.any(Object),
        index: 0
      });
    });

    test('should find current index from active thumbnail', () => {
      galleryComponent.initState();
      
      expect(galleryComponent.state.currentIndex).toBe(0);
    });

    test('should default to index 0 if no active thumbnail found', () => {
      // Mock no active thumbnails
      galleryComponent.elements.thumbnailItems.forEach(item => {
        item.classList.contains = jest.fn(() => false);
        item.getAttribute = jest.fn(() => 'false');
      });
      
      galleryComponent.initState();
      expect(galleryComponent.state.currentIndex).toBe(0);
    });
  });

  describe('Controllers Initialization', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
      galleryComponent.initElements();
      galleryComponent.initState();
      galleryComponent.initControllers();
    });

    test('should initialize transition controller', () => {
      expect(galleryComponent.controllers.transitions).toBeDefined();
      expect(galleryComponent.controllers.transitions.fadeOut).toBeInstanceOf(Function);
      expect(galleryComponent.controllers.transitions.fadeIn).toBeInstanceOf(Function);
      expect(galleryComponent.controllers.transitions.setTransitioning).toBeInstanceOf(Function);
    });

    test('should initialize accessibility controller', () => {
      expect(galleryComponent.controllers.accessibility).toBeDefined();
      expect(galleryComponent.controllers.accessibility.announce).toBeInstanceOf(Function);
      expect(galleryComponent.controllers.accessibility.updateImageAria).toBeInstanceOf(Function);
      expect(galleryComponent.controllers.accessibility.updateThumbnailAria).toBeInstanceOf(Function);
    });

    test('should set transitioning state correctly', () => {
      galleryComponent.controllers.transitions.setTransitioning(true);
      expect(galleryComponent.state.isTransitioning).toBe(true);
      
      galleryComponent.controllers.transitions.setTransitioning(false);
      expect(galleryComponent.state.isTransitioning).toBe(false);
    });
  });

  describe('Event Bridge', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
      galleryComponent.initEventBridge();
    });

    test('should initialize event bridge controller', () => {
      expect(galleryComponent.controllers.eventBridge).toBeDefined();
      expect(galleryComponent.controllers.eventBridge.handleColorSwatchChange).toBeInstanceOf(Function);
      expect(galleryComponent.controllers.eventBridge.destroy).toBeInstanceOf(Function);
    });

    test('should handle color swatch change events', () => {
      const mockEvent = {
        detail: {
          variantId: 123,
          swatch: {},
          colorValue: 'red'
        }
      };

      // Mock findImageByVariant to return valid index
      galleryComponent.findImageByVariant = jest.fn(() => 1);
      galleryComponent.navigateToIndex = jest.fn();

      galleryComponent.controllers.eventBridge.handleColorSwatchChange(mockEvent);

      expect(galleryComponent.findImageByVariant).toHaveBeenCalledWith(123);
      expect(galleryComponent.navigateToIndex).toHaveBeenCalledWith(1);
    });

    test('should handle missing variant ID in color swatch event', () => {
      const mockEvent = {
        detail: {
          swatch: {},
          colorValue: 'red'
        }
      };

      galleryComponent.controllers.eventBridge.handleColorSwatchChange(mockEvent);
      expect(galleryComponent.controllers.errorHandler.warn).toHaveBeenCalledWith(
        'No variant ID in colorSwatch:change event'
      );
    });
  });

  describe('Navigation Methods', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
      galleryComponent.initElements();
      galleryComponent.initState();
      galleryComponent.initControllers();
    });

    test('should navigate to valid index', async () => {
      galleryComponent.updateMainImage = jest.fn();
      galleryComponent.updateThumbnailStates = jest.fn();
      
      await galleryComponent.navigateToIndex(1);
      
      expect(galleryComponent.state.currentIndex).toBe(1);
      expect(galleryComponent.updateMainImage).toHaveBeenCalledWith(1);
      expect(galleryComponent.updateThumbnailStates).toHaveBeenCalledWith(1);
    });

    test('should reject invalid index', async () => {
      galleryComponent.handleError = jest.fn();
      
      await galleryComponent.navigateToIndex(5);
      
      expect(galleryComponent.handleError).toHaveBeenCalledWith(
        'Navigation failed',
        expect.any(Error)
      );
    });

    test('should prevent concurrent navigation', async () => {
      galleryComponent.state.isTransitioning = true;
      galleryComponent.updateMainImage = jest.fn();
      
      await galleryComponent.navigateToIndex(1);
      
      expect(galleryComponent.updateMainImage).not.toHaveBeenCalled();
    });
  });

  describe('Public API', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
      galleryComponent.initElements();
      galleryComponent.initState();
    });

    test('should return current state', () => {
      const state = galleryComponent.getCurrentState();
      
      expect(state).toEqual({
        currentIndex: 0,
        totalImages: 2,
        isTransitioning: false,
        hasErrors: false
      });
    });

    test('should return current image', () => {
      const image = galleryComponent.getCurrentImage();
      expect(image).toEqual(galleryComponent.state.images[0]);
    });

    test('should check if has multiple images', () => {
      expect(galleryComponent.hasMultipleImages()).toBe(true);
      
      galleryComponent.state.totalImages = 1;
      expect(galleryComponent.hasMultipleImages()).toBe(false);
    });

    test('should return last error', () => {
      expect(galleryComponent.getLastError()).toBeNull();
      
      galleryComponent.controllers.errorHandler.log('Test error');
      const error = galleryComponent.getLastError();
      expect(error.message).toBe('Test error');
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
      galleryComponent.initElements();
      galleryComponent.initState();
      galleryComponent.initControllers();
      galleryComponent.initEventBridge();
    });

    test('should clean up event listeners on destroy', () => {
      galleryComponent.removeEventListeners = jest.fn();
      
      galleryComponent.destroy();
      
      expect(galleryComponent.removeEventListeners).toHaveBeenCalled();
      expect(galleryComponent.state.isInitialized).toBe(false);
    });

    test('should clear all references on destroy', () => {
      galleryComponent.destroy();
      
      expect(galleryComponent.elements.galleryContainer).toBeNull();
      expect(galleryComponent.controllers.transitions).toBeNull();
      expect(galleryComponent.controllers.eventBridge).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      galleryComponent.initErrorHandler();
    });

    test('should handle errors gracefully', () => {
      galleryComponent.dispatchEvent = jest.fn();
      
      const error = new Error('Test error');
      galleryComponent.handleError('Test message', error);
      
      expect(galleryComponent.state.hasErrors).toBe(true);
      expect(galleryComponent.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gallery:error',
          detail: { message: 'Test message', error }
        })
      );
    });

    test('should recover from errors', () => {
      galleryComponent.handleError('Test error', new Error());
      
      expect(galleryComponent.state.isTransitioning).toBe(false);
    });
  });
});