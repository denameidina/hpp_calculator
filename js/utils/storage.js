/**
 * Storage Utilities
 * Local storage operations and data persistence management
 */

import { STORAGE_KEYS, DEFAULTS } from './constants.js';
import { DeviceHelper } from './helpers.js';

/**
 * Storage operation result
 */
export class StorageResult {
  constructor(success = true, data = null, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
  }
}

/**
 * Base storage manager
 */
export class BaseStorage {
  constructor(prefix = 'hpp_') {
    this.prefix = prefix;
    this.isAvailable = this.checkAvailability();
  }

  /**
   * Check if storage is available
   * @returns {boolean} True if storage is available
   */
  checkAvailability() {
    return DeviceHelper.supports('localStorage');
  }

  /**
   * Get prefixed key
   * @param {string} key - Key name
   * @returns {string} Prefixed key
   */
  getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {StorageResult} Operation result
   */
  setItem(key, value) {
    if (!this.isAvailable) {
      return new StorageResult(false, null, 'Storage not available');
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.getKey(key), serialized);
      return new StorageResult(true, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      return new StorageResult(false, null, error.message);
    }
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {StorageResult} Operation result
   */
  getItem(key, defaultValue = null) {
    if (!this.isAvailable) {
      return new StorageResult(false, defaultValue, 'Storage not available');
    }

    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) {
        return new StorageResult(true, defaultValue);
      }
      
      const parsed = JSON.parse(item);
      return new StorageResult(true, parsed);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return new StorageResult(false, defaultValue, error.message);
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   * @returns {StorageResult} Operation result
   */
  removeItem(key) {
    if (!this.isAvailable) {
      return new StorageResult(false, null, 'Storage not available');
    }

    try {
      localStorage.removeItem(this.getKey(key));
      return new StorageResult(true);
    } catch (error) {
      console.error('Storage removeItem error:', error);
      return new StorageResult(false, null, error.message);
    }
  }

  /**
   * Clear all items with prefix
   * @returns {StorageResult} Operation result
   */
  clear() {
    if (!this.isAvailable) {
      return new StorageResult(false, null, 'Storage not available');
    }

    try {
      const keys = Object.keys(localStorage);
      const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
      
      prefixedKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      return new StorageResult(true);
    } catch (error) {
      console.error('Storage clear error:', error);
      return new StorageResult(false, null, error.message);
    }
  }

  /**
   * Get all items with prefix
   * @returns {StorageResult} Operation result with all items
   */
  getAllItems() {
    if (!this.isAvailable) {
      return new StorageResult(false, {}, 'Storage not available');
    }

    try {
      const keys = Object.keys(localStorage);
      const prefixedKeys = keys.filter(key => key.startsWith(this.prefix));
      const items = {};
      
      prefixedKeys.forEach(key => {
        const originalKey = key.replace(this.prefix, '');
        const item = localStorage.getItem(key);
        try {
          items[originalKey] = JSON.parse(item);
        } catch {
          items[originalKey] = item;
        }
      });
      
      return new StorageResult(true, items);
    } catch (error) {
      console.error('Storage getAllItems error:', error);
      return new StorageResult(false, {}, error.message);
    }
  }

  /**
   * Get storage usage info
   * @returns {Object} Storage usage information
   */
  getUsageInfo() {
    if (!this.isAvailable) {
      return { available: false, used: 0, remaining: 0, total: 0 };
    }

    try {
      let used = 0;
      let total = 0;
      
      // Calculate used space
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      
      // Estimate total available space (varies by browser)
      // Most browsers allow 5-10MB for localStorage
      total = 5 * 1024 * 1024; // 5MB estimate
      
      return {
        available: true,
        used,
        remaining: total - used,
        total,
        percentage: (used / total) * 100
      };
    } catch (error) {
      console.error('Storage getUsageInfo error:', error);
      return { available: false, used: 0, remaining: 0, total: 0 };
    }
  }
}

/**
 * Calculations storage manager
 */
export class CalculationsStorage extends BaseStorage {
  constructor() {
    super('hpp_calc_');
    this.maxItems = DEFAULTS.maxHistoryItems;
  }

  /**
   * Save calculation result
   * @param {Object} calculation - Calculation data
   * @returns {StorageResult} Operation result
   */
  saveCalculation(calculation) {
    const calculationData = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      name: calculation.name || `Perhitungan ${new Date().toLocaleDateString('id-ID')}`,
      data: {
        directMaterials: calculation.directMaterials || 0,
        directLabor: calculation.directLabor || 0,
        manufacturingOverhead: calculation.manufacturingOverhead || 0,
        otherCosts: calculation.otherCosts || 0,
        totalUnits: calculation.totalUnits || 1,
        hppPerUnit: calculation.hppPerUnit || 0,
        totalHPP: calculation.totalHPP || 0
      }
    };

    // Get existing calculations
    const existingResult = this.getAllCalculations();
    if (!existingResult.success) {
      return existingResult;
    }

    let calculations = existingResult.data;

    // Add new calculation
    calculations.unshift(calculationData);

    // Limit number of items
    if (calculations.length > this.maxItems) {
      calculations = calculations.slice(0, this.maxItems);
    }

    // Save back to storage
    return this.setItem(STORAGE_KEYS.calculations, calculations);
  }

  /**
   * Get all calculations
   * @returns {StorageResult} Operation result with calculations array
   */
  getAllCalculations() {
    return this.getItem(STORAGE_KEYS.calculations, []);
  }

  /**
   * Get calculation by ID
   * @param {string} id - Calculation ID
   * @returns {StorageResult} Operation result with calculation data
   */
  getCalculation(id) {
    const result = this.getAllCalculations();
    if (!result.success) {
      return result;
    }

    const calculation = result.data.find(calc => calc.id === id);
    if (!calculation) {
      return new StorageResult(false, null, 'Calculation not found');
    }

    return new StorageResult(true, calculation);
  }

  /**
   * Delete calculation by ID
   * @param {string} id - Calculation ID
   * @returns {StorageResult} Operation result
   */
  deleteCalculation(id) {
    const result = this.getAllCalculations();
    if (!result.success) {
      return result;
    }

    const calculations = result.data.filter(calc => calc.id !== id);
    return this.setItem(STORAGE_KEYS.calculations, calculations);
  }

  /**
   * Update calculation
   * @param {string} id - Calculation ID
   * @param {Object} updatedData - Updated calculation data
   * @returns {StorageResult} Operation result
   */
  updateCalculation(id, updatedData) {
    const result = this.getAllCalculations();
    if (!result.success) {
      return result;
    }

    const calculations = result.data.map(calc => {
      if (calc.id === id) {
        return { ...calc, ...updatedData, id }; // Preserve ID
      }
      return calc;
    });

    return this.setItem(STORAGE_KEYS.calculations, calculations);
  }

  /**
   * Clear all calculations
   * @returns {StorageResult} Operation result
   */
  clearCalculations() {
    return this.setItem(STORAGE_KEYS.calculations, []);
  }

  /**
   * Generate unique ID for calculation
   * @returns {string} Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Export calculations as JSON
   * @returns {StorageResult} Operation result with JSON data
   */
  exportCalculations() {
    const result = this.getAllCalculations();
    if (!result.success) {
      return result;
    }

    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      calculations: result.data
    };

    return new StorageResult(true, JSON.stringify(exportData, null, 2));
  }

  /**
   * Import calculations from JSON
   * @param {string} jsonData - JSON data to import
   * @returns {StorageResult} Operation result
   */
  importCalculations(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.calculations || !Array.isArray(importData.calculations)) {
        return new StorageResult(false, null, 'Invalid import format');
      }

      // Validate each calculation
      const validCalculations = importData.calculations.filter(calc => {
        return calc.data && 
               typeof calc.data.directMaterials === 'number' &&
               typeof calc.data.directLabor === 'number' &&
               typeof calc.data.manufacturingOverhead === 'number' &&
               typeof calc.data.totalUnits === 'number';
      });

      return this.setItem(STORAGE_KEYS.calculations, validCalculations);
    } catch (error) {
      return new StorageResult(false, null, `Import error: ${error.message}`);
    }
  }
}

/**
 * Preferences storage manager
 */
export class PreferencesStorage extends BaseStorage {
  constructor() {
    super('hpp_pref_');
  }

  /**
   * Save user preferences
   * @param {Object} preferences - Preferences object
   * @returns {StorageResult} Operation result
   */
  savePreferences(preferences) {
    const currentResult = this.getPreferences();
    const currentPrefs = currentResult.success ? currentResult.data : {};
    
    const updatedPrefs = { ...currentPrefs, ...preferences };
    return this.setItem(STORAGE_KEYS.preferences, updatedPrefs);
  }

  /**
   * Get user preferences
   * @returns {StorageResult} Operation result with preferences
   */
  getPreferences() {
    return this.getItem(STORAGE_KEYS.preferences, {
      theme: DEFAULTS.theme,
      language: DEFAULTS.language,
      currency: DEFAULTS.currency,
      autoSave: true,
      showTooltips: true,
      showAnimations: true
    });
  }

  /**
   * Get specific preference
   * @param {string} key - Preference key
   * @param {any} defaultValue - Default value
   * @returns {StorageResult} Operation result
   */
  getPreference(key, defaultValue = null) {
    const result = this.getPreferences();
    if (!result.success) {
      return new StorageResult(false, defaultValue, result.error);
    }

    const value = result.data[key];
    return new StorageResult(true, value !== undefined ? value : defaultValue);
  }

  /**
   * Set specific preference
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {StorageResult} Operation result
   */
  setPreference(key, value) {
    return this.savePreferences({ [key]: value });
  }

  /**
   * Reset preferences to defaults
   * @returns {StorageResult} Operation result
   */
  resetPreferences() {
    return this.setItem(STORAGE_KEYS.preferences, {
      theme: DEFAULTS.theme,
      language: DEFAULTS.language,
      currency: DEFAULTS.currency,
      autoSave: true,
      showTooltips: true,
      showAnimations: true
    });
  }
}

/**
 * Main storage manager
 */
export class StorageManager {
  constructor() {
    this.calculations = new CalculationsStorage();
    this.preferences = new PreferencesStorage();
    this.base = new BaseStorage();
  }

  /**
   * Initialize storage with default data
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Check if this is first run
      const isFirstRun = !this.base.getItem('initialized').success;
      
      if (isFirstRun) {
        // Set default preferences
        await this.preferences.resetPreferences();
        
        // Mark as initialized
        this.base.setItem('initialized', true);
        
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Storage initialization error:', error);
      return false;
    }
  }

  /**
   * Backup all data
   * @returns {StorageResult} Operation result with backup data
   */
  createBackup() {
    try {
      const calculations = this.calculations.getAllCalculations();
      const preferences = this.preferences.getPreferences();
      
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          calculations: calculations.success ? calculations.data : [],
          preferences: preferences.success ? preferences.data : {}
        }
      };
      
      return new StorageResult(true, JSON.stringify(backup, null, 2));
    } catch (error) {
      return new StorageResult(false, null, `Backup error: ${error.message}`);
    }
  }

  /**
   * Restore from backup
   * @param {string} backupData - Backup JSON data
   * @returns {StorageResult} Operation result
   */
  restoreBackup(backupData) {
    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.data) {
        return new StorageResult(false, null, 'Invalid backup format');
      }
      
      // Restore calculations
      if (backup.data.calculations) {
        this.calculations.setItem(STORAGE_KEYS.calculations, backup.data.calculations);
      }
      
      // Restore preferences
      if (backup.data.preferences) {
        this.preferences.setItem(STORAGE_KEYS.preferences, backup.data.preferences);
      }
      
      return new StorageResult(true);
    } catch (error) {
      return new StorageResult(false, null, `Restore error: ${error.message}`);
    }
  }

  /**
   * Clear all application data
   * @returns {StorageResult} Operation result
   */
  clearAllData() {
    try {
      this.calculations.clearCalculations();
      this.preferences.resetPreferences();
      this.base.clear();
      
      return new StorageResult(true);
    } catch (error) {
      return new StorageResult(false, null, `Clear error: ${error.message}`);
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    const usage = this.base.getUsageInfo();
    
    return {
      ...usage,
      calculations: this.calculations.getAllCalculations().data?.length || 0,
      preferences: Object.keys(this.preferences.getPreferences().data || {}).length
    };
  }
}

// Create and export default storage manager instance
export const defaultStorageManager = new StorageManager();