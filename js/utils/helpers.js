/**
 * Helper Utilities
 * Common utility functions used throughout the application
 */

import { CURRENCY, ANIMATIONS, DEBOUNCE_DELAYS, BREAKPOINTS } from './constants.js';

/**
 * Currency formatting utilities
 */
export const CurrencyHelper = {
  /**
   * Format number as Indonesian Rupiah
   * @param {number} amount - The amount to format
   * @param {boolean} showSymbol - Whether to show currency symbol
   * @returns {string} Formatted currency string
   */
  format(amount, showSymbol = true) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return showSymbol ? `${CURRENCY.symbol} 0` : '0';
    }

    const formatted = new Intl.NumberFormat(CURRENCY.locale, {
      minimumFractionDigits: CURRENCY.minimumFractionDigits,
      maximumFractionDigits: CURRENCY.maximumFractionDigits
    }).format(Math.abs(amount));

    const sign = amount < 0 ? '-' : '';
    return showSymbol ? `${sign}${CURRENCY.symbol} ${formatted}` : `${sign}${formatted}`;
  },

  /**
   * Parse formatted currency string to number
   * @param {string} value - The formatted currency string
   * @returns {number} Parsed number
   */
  parse(value) {
    if (typeof value !== 'string') return 0;
    
    // Remove currency symbol, spaces, and thousand separators
    const cleaned = value
      .replace(new RegExp(CURRENCY.symbol, 'g'), '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Validate if a value is a valid currency amount
   * @param {any} value - Value to validate
   * @returns {boolean} True if valid
   */
  isValid(value) {
    const num = typeof value === 'string' ? this.parse(value) : value;
    return typeof num === 'number' && !isNaN(num) && num >= 0;
  }
};

/**
 * Number utilities
 */
export const NumberHelper = {
  /**
   * Round number to specified decimal places
   * @param {number} num - Number to round
   * @param {number} decimals - Number of decimal places
   * @returns {number} Rounded number
   */
  round(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  },

  /**
   * Check if a number is within a range
   * @param {number} num - Number to check
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} True if within range
   */
  inRange(num, min, max) {
    return num >= min && num <= max;
  },

  /**
   * Clamp a number between min and max values
   * @param {number} num - Number to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped number
   */
  clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  },

  /**
   * Calculate percentage
   * @param {number} value - Part value
   * @param {number} total - Total value
   * @returns {number} Percentage
   */
  percentage(value, total) {
    if (total === 0) return 0;
    return this.round((value / total) * 100, 1);
  },

  /**
   * Generate random number between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number
   */
  random(min, max) {
    return Math.random() * (max - min) + min;
  }
};

/**
 * DOM manipulation utilities
 */
export const DOMHelper = {
  /**
   * Query selector with error handling
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (default: document)
   * @returns {Element|null} Found element or null
   */
  $(selector, parent = document) {
    try {
      return parent.querySelector(selector);
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return null;
    }
  },

  /**
   * Query all selectors with error handling
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (default: document)
   * @returns {NodeList|Array} Found elements
   */
  $$(selector, parent = document) {
    try {
      return parent.querySelectorAll(selector);
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return [];
    }
  },

  /**
   * Create element with attributes and content
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {string|Element} content - Element content
   * @returns {Element} Created element
   */
  create(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        element.setAttribute(key, value);
      }
    });

    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof Element) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (child instanceof Element) {
          element.appendChild(child);
        }
      });
    }

    return element;
  },

  /**
   * Add CSS classes to element
   * @param {Element} element - Target element
   * @param {...string} classes - Classes to add
   */
  addClass(element, ...classes) {
    if (element && element.classList) {
      element.classList.add(...classes);
    }
  },

  /**
   * Remove CSS classes from element
   * @param {Element} element - Target element
   * @param {...string} classes - Classes to remove
   */
  removeClass(element, ...classes) {
    if (element && element.classList) {
      element.classList.remove(...classes);
    }
  },

  /**
   * Toggle CSS classes on element
   * @param {Element} element - Target element
   * @param {string} className - Class to toggle
   * @returns {boolean} True if class was added
   */
  toggleClass(element, className) {
    if (element && element.classList) {
      return element.classList.toggle(className);
    }
    return false;
  },

  /**
   * Check if element has CSS class
   * @param {Element} element - Target element
   * @param {string} className - Class to check
   * @returns {boolean} True if element has class
   */
  hasClass(element, className) {
    return element && element.classList && element.classList.contains(className);
  },

  /**
   * Get element's offset position
   * @param {Element} element - Target element
   * @returns {Object} Position object {top, left, width, height}
   */
  getOffset(element) {
    if (!element) return { top: 0, left: 0, width: 0, height: 0 };
    
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    };
  },

  /**
   * Check if element is visible in viewport
   * @param {Element} element - Target element
   * @returns {boolean} True if visible
   */
  isInViewport(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
};

/**
 * Animation utilities
 */
export const AnimationHelper = {
  /**
   * Animate element with CSS transitions
   * @param {Element} element - Element to animate
   * @param {Object} styles - CSS styles to apply
   * @param {number} duration - Animation duration in ms
   * @returns {Promise} Promise that resolves when animation completes
   */
  animate(element, styles, duration = ANIMATIONS.normal) {
    return new Promise((resolve) => {
      if (!element) {
        resolve();
        return;
      }

      const originalTransition = element.style.transition;
      element.style.transition = `all ${duration}ms ease`;

      Object.entries(styles).forEach(([property, value]) => {
        element.style[property] = value;
      });

      setTimeout(() => {
        element.style.transition = originalTransition;
        resolve();
      }, duration);
    });
  },

  /**
   * Fade in element
   * @param {Element} element - Element to fade in
   * @param {number} duration - Animation duration
   * @returns {Promise} Animation promise
   */
  fadeIn(element, duration = ANIMATIONS.normal) {
    if (!element) return Promise.resolve();
    
    element.style.opacity = '0';
    element.style.display = 'block';
    
    return this.animate(element, { opacity: '1' }, duration);
  },

  /**
   * Fade out element
   * @param {Element} element - Element to fade out
   * @param {number} duration - Animation duration
   * @returns {Promise} Animation promise
   */
  fadeOut(element, duration = ANIMATIONS.normal) {
    if (!element) return Promise.resolve();
    
    return this.animate(element, { opacity: '0' }, duration).then(() => {
      element.style.display = 'none';
    });
  },

  /**
   * Slide down element
   * @param {Element} element - Element to slide down
   * @param {number} duration - Animation duration
   * @returns {Promise} Animation promise
   */
  slideDown(element, duration = ANIMATIONS.normal) {
    if (!element) return Promise.resolve();
    
    const height = element.scrollHeight;
    element.style.height = '0';
    element.style.overflow = 'hidden';
    element.style.display = 'block';
    
    return this.animate(element, { height: `${height}px` }, duration).then(() => {
      element.style.height = '';
      element.style.overflow = '';
    });
  },

  /**
   * Slide up element
   * @param {Element} element - Element to slide up
   * @param {number} duration - Animation duration
   * @returns {Promise} Animation promise
   */
  slideUp(element, duration = ANIMATIONS.normal) {
    if (!element) return Promise.resolve();
    
    element.style.overflow = 'hidden';
    
    return this.animate(element, { height: '0' }, duration).then(() => {
      element.style.display = 'none';
      element.style.height = '';
      element.style.overflow = '';
    });
  }
};

/**
 * Event utilities
 */
export const EventHelper = {
  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay = DEBOUNCE_DELAYS.input) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit = DEBOUNCE_DELAYS.input) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Add event listener with cleanup
   * @param {Element} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   * @returns {Function} Cleanup function
   */
  on(element, event, handler, options = {}) {
    if (!element || !event || typeof handler !== 'function') {
      return () => {};
    }

    element.addEventListener(event, handler, options);
    
    return () => {
      element.removeEventListener(event, handler, options);
    };
  },

  /**
   * Trigger custom event
   * @param {Element} element - Target element
   * @param {string} eventName - Event name
   * @param {any} detail - Event detail data
   */
  trigger(element, eventName, detail = null) {
    if (!element || !eventName) return;

    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    
    element.dispatchEvent(event);
  }
};

/**
 * Device and browser utilities
 */
export const DeviceHelper = {
  /**
   * Check if device is mobile
   * @returns {boolean} True if mobile device
   */
  isMobile() {
    return window.innerWidth < BREAKPOINTS.md;
  },

  /**
   * Check if device is tablet
   * @returns {boolean} True if tablet device
   */
  isTablet() {
    return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
  },

  /**
   * Check if device is desktop
   * @returns {boolean} True if desktop device
   */
  isDesktop() {
    return window.innerWidth >= BREAKPOINTS.lg;
  },

  /**
   * Get current breakpoint
   * @returns {string} Current breakpoint name
   */
  getBreakpoint() {
    const width = window.innerWidth;
    if (width < BREAKPOINTS.sm) return 'xs';
    if (width < BREAKPOINTS.md) return 'sm';
    if (width < BREAKPOINTS.lg) return 'md';
    if (width < BREAKPOINTS.xl) return 'lg';
    if (width < BREAKPOINTS['2xl']) return 'xl';
    return '2xl';
  },

  /**
   * Check if browser supports a feature
   * @param {string} feature - Feature to check
   * @returns {boolean} True if supported
   */
  supports(feature) {
    const features = {
      localStorage: () => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      },
      customProperties: () => window.CSS && CSS.supports('color', 'var(--test)'),
      grid: () => window.CSS && CSS.supports('display', 'grid'),
      flexbox: () => window.CSS && CSS.supports('display', 'flex'),
      webWorkers: () => typeof Worker !== 'undefined',
      serviceWorkers: () => 'serviceWorker' in navigator,
      notifications: () => 'Notification' in window,
      geolocation: () => 'geolocation' in navigator
    };

    return features[feature] ? features[feature]() : false;
  }
};

/**
 * URL and routing utilities
 */
export const URLHelper = {
  /**
   * Get URL parameter value
   * @param {string} name - Parameter name
   * @returns {string|null} Parameter value
   */
  getParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },

  /**
   * Set URL parameter
   * @param {string} name - Parameter name
   * @param {string} value - Parameter value
   */
  setParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.replaceState({}, '', url);
  },

  /**
   * Remove URL parameter
   * @param {string} name - Parameter name
   */
  removeParam(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url);
  }
};

/**
 * Date and time utilities
 */
export const DateHelper = {
  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @param {string} locale - Locale string
   * @returns {string} Formatted date
   */
  format(date = new Date(), locale = 'id-ID') {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  /**
   * Get relative time string
   * @param {Date} date - Date to compare
   * @returns {string} Relative time string
   */
  getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    
    return this.format(date);
  }
};

/**
 * Performance utilities
 */
export const PerformanceHelper = {
  /**
   * Measure function execution time
   * @param {Function} func - Function to measure
   * @param {string} label - Performance label
   * @returns {any} Function result
   */
  measure(func, label = 'operation') {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`${label} took ${end - start} milliseconds`);
    return result;
  },

  /**
   * Create performance marker
   * @param {string} name - Marker name
   */
  mark(name) {
    if ('mark' in performance) {
      performance.mark(name);
    }
  },

  /**
   * Measure performance between two markers
   * @param {string} name - Measure name
   * @param {string} startMark - Start marker
   * @param {string} endMark - End marker
   */
  measureBetween(name, startMark, endMark) {
    if ('measure' in performance) {
      performance.measure(name, startMark, endMark);
    }
  }
};