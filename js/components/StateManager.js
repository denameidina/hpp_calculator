/**
 * State Manager
 * Centralized state management with local storage integration
 */

import { DEFAULTS, STORAGE_KEYS } from '../utils/constants.js';
import { EventHelper } from '../utils/helpers.js';
import { defaultStorageManager } from '../utils/storage.js';

/**
 * State change event
 */
export class StateChangeEvent {
  constructor(path, oldValue, newValue, source = 'unknown') {
    this.path = path;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.source = source;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * State Manager Class
 */
export class StateManager {
  constructor(initialState = {}) {
    this.state = { ...this.getDefaultState(), ...initialState };
    this.subscribers = new Map();
    this.history = [];
    this.maxHistoryLength = 50;
    this.isLoading = false;

    this.init();
  }

  /**
   * Initialize state manager
   */
  async init() {
    try {
      this.isLoading = true;
      await this.loadFromStorage();
      this.setupAutoSave();
      this.isLoading = false;
      
      this.emit('state:initialized', this.state);
    } catch (error) {
      console.error('State initialization error:', error);
      this.isLoading = false;
    }
  }

  /**
   * Get default application state
   */
  getDefaultState() {
    return {
      // UI State
      ui: {
        theme: DEFAULTS.theme,
        language: DEFAULTS.language,
        sidebarOpen: false,
        activeSection: 'calculator',
        showTooltips: true,
        showAnimations: true,
        isCalculating: false,
        hasResults: false
      },

      // Form State
      form: {
        directMaterials: DEFAULTS.directMaterials,
        directLabor: DEFAULTS.directLabor,
        manufacturingOverhead: DEFAULTS.manufacturingOverhead,
        otherCosts: DEFAULTS.otherCosts,
        totalUnits: DEFAULTS.totalUnits,
        isValid: false,
        isDirty: false,
        errors: {},
        touched: {}
      },

      // Calculation State
      calculation: {
        current: null,
        isCalculating: false,
        lastCalculated: null,
        error: null
      },

      // History State
      history: {
        calculations: [],
        maxItems: DEFAULTS.maxHistoryItems,
        currentIndex: -1
      },

      // Settings State
      settings: {
        autoSave: true,
        autoCalculate: true,
        showCurrency: true,
        decimalPlaces: 2,
        exportFormat: 'pdf',
        notifications: true
      },

      // Application State
      app: {
        version: '1.0.0',
        initialized: false,
        lastSaved: null,
        hasUnsavedChanges: false
      }
    };
  }

  /**
   * Get current state or state at path
   */
  getState(path = null) {
    if (!path) {
      return { ...this.state };
    }

    return this.getValueAtPath(this.state, path);
  }

  /**
   * Set state at path
   */
  setState(path, value, source = 'manual') {
    const oldValue = this.getValueAtPath(this.state, path);
    
    if (this.deepEqual(oldValue, value)) {
      return; // No change
    }

    // Create state change event
    const changeEvent = new StateChangeEvent(path, oldValue, value, source);

    // Update state
    this.setValueAtPath(this.state, path, value);

    // Add to history
    this.addToHistory(changeEvent);

    // Mark as dirty
    this.setState('app.hasUnsavedChanges', true, 'system');

    // Emit change event
    this.emit('state:changed', changeEvent);
    this.emit(`state:changed:${path}`, changeEvent);

    // Auto-save if enabled
    if (this.state.settings.autoSave && !this.isLoading) {
      this.saveToStorage();
    }
  }

  /**
   * Update multiple state paths
   */
  updateState(updates, source = 'manual') {
    const changes = [];

    Object.entries(updates).forEach(([path, value]) => {
      const oldValue = this.getValueAtPath(this.state, path);
      
      if (!this.deepEqual(oldValue, value)) {
        const changeEvent = new StateChangeEvent(path, oldValue, value, source);
        changes.push(changeEvent);
        this.setValueAtPath(this.state, path, value);
      }
    });

    if (changes.length === 0) return;

    // Add to history
    changes.forEach(change => this.addToHistory(change));

    // Mark as dirty
    this.setState('app.hasUnsavedChanges', true, 'system');

    // Emit events
    this.emit('state:batch-changed', changes);
    changes.forEach(change => {
      this.emit('state:changed', change);
      this.emit(`state:changed:${change.path}`, change);
    });

    // Auto-save if enabled
    if (this.state.settings.autoSave && !this.isLoading) {
      this.saveToStorage();
    }
  }

  /**
   * Reset state to default
   */
  resetState(preserveSettings = true) {
    const currentSettings = preserveSettings ? { ...this.state.settings } : {};
    const defaultState = this.getDefaultState();
    
    if (preserveSettings) {
      defaultState.settings = currentSettings;
    }

    this.state = defaultState;
    this.history = [];

    this.emit('state:reset', this.state);
    this.saveToStorage();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(path, callback, options = {}) {
    const {
      immediate = false,
      deep = false
    } = options;

    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, []);
    }

    const subscription = {
      callback,
      options,
      id: Date.now() + Math.random()
    };

    this.subscribers.get(path).push(subscription);

    // Call immediately if requested
    if (immediate) {
      const currentValue = this.getValueAtPath(this.state, path);
      callback(currentValue, null, { path, source: 'immediate' });
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(path);
      if (subscribers) {
        const index = subscribers.findIndex(sub => sub.id === subscription.id);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Unsubscribe from path
   */
  unsubscribe(path, callback = null) {
    if (!this.subscribers.has(path)) return;

    if (callback) {
      const subscribers = this.subscribers.get(path);
      const index = subscribers.findIndex(sub => sub.callback === callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    } else {
      this.subscribers.delete(path);
    }
  }

  /**
   * Emit event to subscribers
   */
  emit(eventPath, data) {
    // Emit to specific path subscribers
    if (this.subscribers.has(eventPath)) {
      this.subscribers.get(eventPath).forEach(subscription => {
        try {
          subscription.callback(data);
        } catch (error) {
          console.error(`Subscription callback error for ${eventPath}:`, error);
        }
      });
    }

    // Emit to wildcard subscribers (*)
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(subscription => {
        try {
          subscription.callback(eventPath, data);
        } catch (error) {
          console.error(`Wildcard subscription callback error:`, error);
        }
      });
    }

    // Emit global event
    EventHelper.trigger(document, eventPath.replace(':', '-'), data);
  }

  /**
   * Load state from storage
   */
  async loadFromStorage() {
    try {
      // Load preferences
      const prefsResult = defaultStorageManager.preferences.getPreferences();
      if (prefsResult.success) {
        this.updateState({
          'ui.theme': prefsResult.data.theme || DEFAULTS.theme,
          'ui.language': prefsResult.data.language || DEFAULTS.language,
          'ui.showTooltips': prefsResult.data.showTooltips !== false,
          'ui.showAnimations': prefsResult.data.showAnimations !== false,
          'settings.autoSave': prefsResult.data.autoSave !== false,
          'settings.autoCalculate': prefsResult.data.autoCalculate !== false,
          'settings.notifications': prefsResult.data.notifications !== false
        }, 'storage');
      }

      // Load calculation history
      const historyResult = defaultStorageManager.calculations.getAllCalculations();
      if (historyResult.success) {
        this.setState('history.calculations', historyResult.data, 'storage');
      }

      this.setState('app.lastSaved', new Date().toISOString(), 'system');
      this.setState('app.hasUnsavedChanges', false, 'system');

    } catch (error) {
      console.error('Error loading state from storage:', error);
    }
  }

  /**
   * Save state to storage
   */
  async saveToStorage() {
    try {
      // Save preferences
      const preferences = {
        theme: this.state.ui.theme,
        language: this.state.ui.language,
        showTooltips: this.state.ui.showTooltips,
        showAnimations: this.state.ui.showAnimations,
        autoSave: this.state.settings.autoSave,
        autoCalculate: this.state.settings.autoCalculate,
        notifications: this.state.settings.notifications
      };

      await defaultStorageManager.preferences.savePreferences(preferences);

      this.setState('app.lastSaved', new Date().toISOString(), 'system');
      this.setState('app.hasUnsavedChanges', false, 'system');

      this.emit('state:saved', this.state);

    } catch (error) {
      console.error('Error saving state to storage:', error);
      this.emit('state:save-error', error);
    }
  }

  /**
   * Setup auto-save functionality
   */
  setupAutoSave() {
    // Save on page unload
    window.addEventListener('beforeunload', () => {
      if (this.state.app.hasUnsavedChanges) {
        this.saveToStorage();
      }
    });

    // Periodic save (every 30 seconds)
    setInterval(() => {
      if (this.state.settings.autoSave && this.state.app.hasUnsavedChanges) {
        this.saveToStorage();
      }
    }, 30000);
  }

  /**
   * Add change to history
   */
  addToHistory(changeEvent) {
    this.history.unshift(changeEvent);

    if (this.history.length > this.maxHistoryLength) {
      this.history = this.history.slice(0, this.maxHistoryLength);
    }
  }

  /**
   * Get state change history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
    this.emit('state:history-cleared');
  }

  /**
   * Get value at path
   */
  getValueAtPath(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set value at path
   */
  setValueAtPath(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Deep equality check
   */
  deepEqual(a, b) {
    if (a === b) return true;
    
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    if (!a || !b || (typeof a !== 'object' && typeof b !== 'object')) {
      return a === b;
    }
    
    if (a === null || a === undefined || b === null || b === undefined) {
      return false;
    }
    
    if (a.prototype !== b.prototype) return false;
    
    let keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) {
      return false;
    }
    
    return keys.every(k => this.deepEqual(a[k], b[k]));
  }

  /**
   * Export state data
   */
  export() {
    return {
      state: this.getState(),
      history: this.getHistory(),
      timestamp: new Date().toISOString(),
      version: this.state.app.version
    };
  }

  /**
   * Import state data
   */
  import(data) {
    if (data.state) {
      this.state = { ...this.getDefaultState(), ...data.state };
    }
    
    if (data.history && Array.isArray(data.history)) {
      this.history = data.history;
    }
    
    this.emit('state:imported', data);
    this.saveToStorage();
  }

  /**
   * Get state statistics
   */
  getStatistics() {
    return {
      stateSize: JSON.stringify(this.state).length,
      historySize: this.history.length,
      subscribersCount: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
      lastSaved: this.state.app.lastSaved,
      hasUnsavedChanges: this.state.app.hasUnsavedChanges,
      calculations: this.state.history.calculations.length
    };
  }

  /**
   * Destroy state manager
   */
  destroy() {
    this.subscribers.clear();
    this.history = [];
    this.saveToStorage();
  }
}

/**
 * State action creators for common operations
 */
export const StateActions = {
  /**
   * Update form data
   */
  updateFormData: (stateManager, formData) => {
    stateManager.updateState({
      'form.directMaterials': formData.directMaterials || 0,
      'form.directLabor': formData.directLabor || 0,
      'form.manufacturingOverhead': formData.manufacturingOverhead || 0,
      'form.otherCosts': formData.otherCosts || 0,
      'form.totalUnits': formData.totalUnits || 1,
      'form.isDirty': true
    }, 'form-update');
  },

  /**
   * Set calculation result
   */
  setCalculationResult: (stateManager, result) => {
    stateManager.updateState({
      'calculation.current': result,
      'calculation.isCalculating': false,
      'calculation.lastCalculated': new Date().toISOString(),
      'calculation.error': null,
      'ui.hasResults': true
    }, 'calculation-complete');
  },

  /**
   * Set calculation error
   */
  setCalculationError: (stateManager, error) => {
    stateManager.updateState({
      'calculation.current': null,
      'calculation.isCalculating': false,
      'calculation.error': error,
      'ui.hasResults': false
    }, 'calculation-error');
  },

  /**
   * Start calculation
   */
  startCalculation: (stateManager) => {
    stateManager.updateState({
      'calculation.isCalculating': true,
      'calculation.error': null,
      'ui.isCalculating': true
    }, 'calculation-start');
  },

  /**
   * Add to history
   */
  addToHistory: (stateManager, calculation) => {
    const history = [...stateManager.getState('history.calculations')];
    history.unshift(calculation);
    
    const maxItems = stateManager.getState('history.maxItems');
    if (history.length > maxItems) {
      history.splice(maxItems);
    }

    stateManager.setState('history.calculations', history, 'history-add');
  },

  /**
   * Toggle theme
   */
  toggleTheme: (stateManager) => {
    const currentTheme = stateManager.getState('ui.theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    stateManager.setState('ui.theme', newTheme, 'theme-toggle');
  },

  /**
   * Reset form
   */
  resetForm: (stateManager) => {
    stateManager.updateState({
      'form.directMaterials': DEFAULTS.directMaterials,
      'form.directLabor': DEFAULTS.directLabor,
      'form.manufacturingOverhead': DEFAULTS.manufacturingOverhead,
      'form.otherCosts': DEFAULTS.otherCosts,
      'form.totalUnits': DEFAULTS.totalUnits,
      'form.isValid': false,
      'form.isDirty': false,
      'form.errors': {},
      'form.touched': {},
      'calculation.current': null,
      'ui.hasResults': false
    }, 'form-reset');
  }
};

// Create and export default state manager instance
export const defaultStateManager = new StateManager();