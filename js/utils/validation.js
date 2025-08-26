/**
 * Validation Utilities
 * Comprehensive validation system for form inputs and data
 */

import { VALIDATION, ERROR_MESSAGES, FORM_FIELDS } from './constants.js';
import { NumberHelper } from './helpers.js';

/**
 * Validation result structure
 */
export class ValidationResult {
  constructor(isValid = true, errors = [], warnings = []) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
  }

  /**
   * Add error to validation result
   * @param {string} field - Field name
   * @param {string} message - Error message
   */
  addError(field, message) {
    this.errors.push({ field, message });
    this.isValid = false;
  }

  /**
   * Add warning to validation result
   * @param {string} field - Field name
   * @param {string} message - Warning message
   */
  addWarning(field, message) {
    this.warnings.push({ field, message });
  }

  /**
   * Get errors for specific field
   * @param {string} field - Field name
   * @returns {Array} Field errors
   */
  getFieldErrors(field) {
    return this.errors.filter(error => error.field === field);
  }

  /**
   * Get warnings for specific field
   * @param {string} field - Field name
   * @returns {Array} Field warnings
   */
  getFieldWarnings(field) {
    return this.warnings.filter(warning => warning.field === field);
  }

  /**
   * Check if field has errors
   * @param {string} field - Field name
   * @returns {boolean} True if field has errors
   */
  hasFieldErrors(field) {
    return this.getFieldErrors(field).length > 0;
  }

  /**
   * Get first error message for field
   * @param {string} field - Field name
   * @returns {string|null} First error message
   */
  getFirstFieldError(field) {
    const errors = this.getFieldErrors(field);
    return errors.length > 0 ? errors[0].message : null;
  }
}

/**
 * Base validator class
 */
export class BaseValidator {
  constructor(rules = {}) {
    this.rules = rules;
  }

  /**
   * Validate a value
   * @param {any} value - Value to validate
   * @param {string} field - Field name
   * @returns {ValidationResult} Validation result
   */
  validate(value, field = 'unknown') {
    throw new Error('validate method must be implemented');
  }

  /**
   * Format error message with placeholders
   * @param {string} message - Message template
   * @param {Object} params - Parameters to replace
   * @returns {string} Formatted message
   */
  formatMessage(message, params = {}) {
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }
}

/**
 * Required field validator
 */
export class RequiredValidator extends BaseValidator {
  validate(value, field) {
    const result = new ValidationResult();

    if (value === null || value === undefined || value === '') {
      result.addError(field, ERROR_MESSAGES.required);
    }

    return result;
  }
}

/**
 * Number validator
 */
export class NumberValidator extends BaseValidator {
  constructor(rules = {}) {
    super(rules);
    this.min = rules.min !== undefined ? rules.min : VALIDATION.minValue;
    this.max = rules.max !== undefined ? rules.max : VALIDATION.maxValue;
    this.allowNegative = rules.allowNegative || false;
    this.allowDecimals = rules.allowDecimals !== false;
    this.decimalPlaces = rules.decimalPlaces || VALIDATION.decimalPlaces;
  }

  validate(value, field) {
    const result = new ValidationResult();

    // Convert to number if string
    let numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Check if it's a valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      result.addError(field, ERROR_MESSAGES.invalidNumber);
      return result;
    }

    // Check negative values
    if (!this.allowNegative && numValue < 0) {
      result.addError(field, this.formatMessage(ERROR_MESSAGES.minValue, { min: 0 }));
    }

    // Check minimum value
    if (numValue < this.min) {
      result.addError(field, this.formatMessage(ERROR_MESSAGES.minValue, { min: this.min }));
    }

    // Check maximum value
    if (numValue > this.max) {
      result.addError(field, this.formatMessage(ERROR_MESSAGES.maxValue, { max: this.max }));
    }

    // Check decimal places
    if (!this.allowDecimals && numValue % 1 !== 0) {
      result.addError(field, 'Nilai harus berupa bilangan bulat');
    } else if (this.allowDecimals) {
      const decimalPart = numValue.toString().split('.')[1];
      if (decimalPart && decimalPart.length > this.decimalPlaces) {
        result.addWarning(field, `Nilai akan dibulatkan ke ${this.decimalPlaces} desimal`);
      }
    }

    return result;
  }
}

/**
 * Units validator (specific for total units field)
 */
export class UnitsValidator extends BaseValidator {
  constructor(rules = {}) {
    super(rules);
    this.min = rules.min !== undefined ? rules.min : VALIDATION.minUnits;
    this.max = rules.max !== undefined ? rules.max : VALIDATION.maxUnits;
  }

  validate(value, field) {
    const result = new ValidationResult();

    let numValue = typeof value === 'string' ? parseInt(value) : value;

    if (isNaN(numValue) || !isFinite(numValue)) {
      result.addError(field, ERROR_MESSAGES.invalidNumber);
      return result;
    }

    // Must be integer
    if (numValue % 1 !== 0) {
      result.addError(field, 'Jumlah unit harus berupa bilangan bulat');
      return result;
    }

    // Check minimum
    if (numValue < this.min) {
      result.addError(field, ERROR_MESSAGES.minUnits);
    }

    // Check maximum
    if (numValue > this.max) {
      result.addError(field, this.formatMessage(ERROR_MESSAGES.maxUnits, { max: this.max }));
    }

    return result;
  }
}

/**
 * Currency validator
 */
export class CurrencyValidator extends BaseValidator {
  constructor(rules = {}) {
    super(rules);
    this.min = rules.min !== undefined ? rules.min : VALIDATION.minValue;
    this.max = rules.max !== undefined ? rules.max : VALIDATION.maxValue;
  }

  validate(value, field) {
    const result = new ValidationResult();

    // Parse currency string if needed
    let numValue;
    if (typeof value === 'string') {
      // Remove currency symbol and thousand separators
      const cleaned = value
        .replace(/Rp\s*/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      numValue = parseFloat(cleaned);
    } else {
      numValue = value;
    }

    if (isNaN(numValue) || !isFinite(numValue)) {
      result.addError(field, ERROR_MESSAGES.invalidNumber);
      return result;
    }

    if (numValue < this.min) {
      result.addError(field, this.formatMessage(ERROR_MESSAGES.minValue, { min: this.min }));
    }

    if (numValue > this.max) {
      result.addError(field, this.formatMessage(ERROR_MESSAGES.maxValue, { max: this.max }));
    }

    return result;
  }
}

/**
 * Main validation manager
 */
export class ValidationManager {
  constructor() {
    this.validators = new Map();
    this.setupDefaultValidators();
  }

  /**
   * Setup default validators for form fields
   */
  setupDefaultValidators() {
    // Direct Materials
    this.addValidator('directMaterials', [
      new RequiredValidator(),
      new CurrencyValidator({ min: 0, max: VALIDATION.maxValue })
    ]);

    // Direct Labor
    this.addValidator('directLabor', [
      new RequiredValidator(),
      new CurrencyValidator({ min: 0, max: VALIDATION.maxValue })
    ]);

    // Manufacturing Overhead
    this.addValidator('manufacturingOverhead', [
      new RequiredValidator(),
      new CurrencyValidator({ min: 0, max: VALIDATION.maxValue })
    ]);

    // Other Costs (optional)
    this.addValidator('otherCosts', [
      new CurrencyValidator({ min: 0, max: VALIDATION.maxValue })
    ]);

    // Total Units
    this.addValidator('totalUnits', [
      new RequiredValidator(),
      new UnitsValidator({ min: VALIDATION.minUnits, max: VALIDATION.maxUnits })
    ]);
  }

  /**
   * Add validator for a field
   * @param {string} field - Field name
   * @param {Array} validators - Array of validators
   */
  addValidator(field, validators) {
    this.validators.set(field, Array.isArray(validators) ? validators : [validators]);
  }

  /**
   * Remove validator for a field
   * @param {string} field - Field name
   */
  removeValidator(field) {
    this.validators.delete(field);
  }

  /**
   * Validate single field
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {ValidationResult} Validation result
   */
  validateField(field, value) {
    const validators = this.validators.get(field) || [];
    const result = new ValidationResult();

    for (const validator of validators) {
      const fieldResult = validator.validate(value, field);
      
      // Merge errors
      result.errors.push(...fieldResult.errors);
      
      // Merge warnings
      result.warnings.push(...fieldResult.warnings);
      
      // Update validity
      if (!fieldResult.isValid) {
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Validate all fields in data object
   * @param {Object} data - Data object to validate
   * @returns {ValidationResult} Combined validation result
   */
  validateAll(data) {
    const result = new ValidationResult();

    for (const [field, value] of Object.entries(data)) {
      const fieldResult = this.validateField(field, value);
      
      result.errors.push(...fieldResult.errors);
      result.warnings.push(...fieldResult.warnings);
      
      if (!fieldResult.isValid) {
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Validate HPP calculation data
   * @param {Object} data - HPP calculation data
   * @returns {ValidationResult} Validation result
   */
  validateHPPData(data) {
    const result = this.validateAll(data);

    // Additional business logic validation
    const totalCosts = (data.directMaterials || 0) + 
                      (data.directLabor || 0) + 
                      (data.manufacturingOverhead || 0) + 
                      (data.otherCosts || 0);

    if (totalCosts === 0) {
      result.addError('general', 'Total biaya tidak boleh nol');
    }

    if (totalCosts > 0 && (data.totalUnits || 0) === 0) {
      result.addError('totalUnits', 'Jumlah unit harus lebih dari 0 jika ada biaya');
    }

    // Warning for very high HPP per unit
    if (totalCosts > 0 && data.totalUnits > 0) {
      const hppPerUnit = totalCosts / data.totalUnits;
      if (hppPerUnit > 10000000) { // 10 million per unit
        result.addWarning('general', 'HPP per unit sangat tinggi, pastikan data sudah benar');
      }
    }

    return result;
  }

  /**
   * Check if field is required
   * @param {string} field - Field name
   * @returns {boolean} True if field is required
   */
  isRequired(field) {
    return VALIDATION.requiredFields.includes(field);
  }

  /**
   * Get field configuration
   * @param {string} field - Field name
   * @returns {Object|null} Field configuration
   */
  getFieldConfig(field) {
    return FORM_FIELDS[field] || null;
  }
}

/**
 * Real-time validation helper
 */
export class RealTimeValidator {
  constructor(validationManager) {
    this.validationManager = validationManager;
    this.fieldStates = new Map();
    this.callbacks = new Map();
  }

  /**
   * Register field for real-time validation
   * @param {string} field - Field name
   * @param {Element} element - Input element
   * @param {Function} callback - Validation callback
   */
  registerField(field, element, callback) {
    if (!element) return;

    this.callbacks.set(field, callback);
    this.fieldStates.set(field, { touched: false, dirty: false });

    // Add event listeners
    element.addEventListener('blur', () => {
      this.fieldStates.get(field).touched = true;
      this.validateField(field, element.value);
    });

    element.addEventListener('input', () => {
      this.fieldStates.get(field).dirty = true;
      if (this.fieldStates.get(field).touched) {
        this.validateField(field, element.value);
      }
    });
  }

  /**
   * Validate field and trigger callback
   * @param {string} field - Field name
   * @param {any} value - Field value
   */
  validateField(field, value) {
    const result = this.validationManager.validateField(field, value);
    const callback = this.callbacks.get(field);
    
    if (callback) {
      callback(result, field, value);
    }
  }

  /**
   * Get field state
   * @param {string} field - Field name
   * @returns {Object} Field state
   */
  getFieldState(field) {
    return this.fieldStates.get(field) || { touched: false, dirty: false };
  }

  /**
   * Reset field state
   * @param {string} field - Field name
   */
  resetField(field) {
    this.fieldStates.set(field, { touched: false, dirty: false });
  }

  /**
   * Reset all field states
   */
  resetAll() {
    for (const field of this.fieldStates.keys()) {
      this.resetField(field);
    }
  }
}

// Create and export default validation manager instance
export const defaultValidationManager = new ValidationManager();