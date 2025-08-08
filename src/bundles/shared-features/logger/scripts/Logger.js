/**
 * Debug logger for tab controller functionality
 */
class GeneralLogger {
    styles = {
        init: 'color: #2563eb; font-weight: bold;',
        state: 'color: #059669;',
        event: 'color: #7c3aed;',
        startup: 'color: #7c3aed;',
        error: 'color: #dc2626; font-weight: bold;'
      };

    constructor(enabled, prefix) {
        this.enabled = enabled;
        this.prefix = prefix;
    }
  
    init(message) {
      if (!this.enabled) return;
      console.log(`%c${this.prefix} Init: ${message}`, this.styles.init);
    }
  
    state(message) {
      if (!this.enabled) return;
      console.log(`%c${this.prefix} State: ${message}`, this.styles.state);
    }
  
    event(message) {
      if (!this.enabled) return;
      console.log(`%c${this.prefix} Event: ${message}`, this.styles.event);
    }
  
    error(message) {
      if (!this.enabled) return;
      console.error(`%c${this.prefix} Error: ${message}`, this.styles.error);
    }
    
    startup(message) {
      if (!this.enabled) return;
      console.error(`%c${this.prefix} Start-Up: ${message}`, this.styles.startup);
    }
}

// Create logger instances
const loggers = {
  StartUpLogger: new GeneralLogger(true, '[StartUp]'),
  TabLogger: new GeneralLogger(false, '[TabController]'),
  CarouselLogger: new GeneralLogger(false, '[CarouselController]'),
  ImageSliderLogger: new GeneralLogger(false, '[ImageSlider]'),
  DrawerLogger: new GeneralLogger(true, '[Drawer]'),
  CollectionPageLogger: new GeneralLogger(true, '[CollectionPage]')
};

// Create global logger interface
const globalLogger = {
  log: function(...args) {
    if (loggers.CollectionPageLogger.enabled) {
      console.log('%c[CollectionPage] Log:', 'color: #059669;', ...args);
    }
  },
  error: function(...args) {
    if (loggers.CollectionPageLogger.enabled) {
      console.error('%c[CollectionPage] Error:', 'color: #dc2626; font-weight: bold;', ...args);
    }
  }
};

export { GeneralLogger, loggers, globalLogger };