/**
 * Input Form Component
 * Handles form interactions, validation, and user input for HPP calculation
 */

import { FORM_FIELDS, ANIMATIONS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';
import { DOMHelper, EventHelper, CurrencyHelper, AnimationHelper } from '../utils/helpers.js';
import { defaultValidationManager, RealTimeValidator } from '../utils/validation.js';

export class InputForm {
  constructor(formElement, options = {}) {
    this.form = formElement;
    this.options = {
      validateOnInput: true,
      validateOnBlur: true,
      showTooltips: true,
      formatCurrency: true,
      autoCalculate: true,
      debounceDelay: 300,
      ...options
    };

    this.formData = {};
    this.validationResults = new Map();
    this.eventListeners = [];
    this.realTimeValidator = new RealTimeValidator(defaultValidationManager);
    
    this.init();
  }

  /**
   * Initialize form component
   */
  init() {
    if (!this.form) {
      console.error('Form element not found');
      return;
    }

    this.setupFormElements();
    this.setupEventListeners();
    this.setupValidation();
    this.setupTooltips();
    this.loadInitialData();
  }

  /**
   * Setup form elements and references
   */
  setupFormElements() {
    this.elements = {
      directMaterials: DOMHelper.$('#direct-materials', this.form),
      directLabor: DOMHelper.$('#direct-labor', this.form),
      manufacturingOverhead: DOMHelper.$('#overhead', this.form),
      otherCosts: DOMHelper.$('#other-costs', this.form),
      totalUnits: DOMHelper.$('#total-units', this.form),
      submitBtn: DOMHelper.$('button[type="submit"]', this.form),
      resetBtn: DOMHelper.$('button[type="reset"]', this.form)
    };

    // Setup currency inputs
    this.setupCurrencyInputs();
    
    // Setup unit input
    this.setupUnitInput();
  }

  /**
   * Setup currency input formatting
   */
  setupCurrencyInputs() {
    const currencyFields = ['directMaterials', 'directLabor', 'manufacturingOverhead', 'otherCosts'];
    
    currencyFields.forEach(field => {
      const element = this.elements[field];
      if (!element) return;

      // Add currency wrapper if not exists
      if (!element.parentElement.classList.contains('currency-input')) {
        const wrapper = DOMHelper.create('div', { className: 'currency-input' });
        element.parentElement.insertBefore(wrapper, element);
        wrapper.appendChild(element);
      }

      // Format on blur
      this.addEventListenerWithCleanup(element, 'blur', () => {
        if (this.options.formatCurrency && element.value) {
          const value = CurrencyHelper.parse(element.value);
          element.value = CurrencyHelper.format(value, false);
        }
      });

      // Parse on focus
      this.addEventListenerWithCleanup(element, 'focus', () => {
        if (element.value) {
          const value = CurrencyHelper.parse(element.value);
          element.value = value.toString();
        }
      });
    });
  }

  /**
   * Setup unit input
   */
  setupUnitInput() {
    const element = this.elements.totalUnits;
    if (!element) return;

    // Add unit wrapper if not exists
    if (!element.parentElement.classList.contains('unit-input')) {
      DOMHelper.addClass(element.parentElement, 'unit-input');
    }

    // Only allow integers
    this.addEventListenerWithCleanup(element, 'input', () => {
      element.value = element.value.replace(/[^\d]/g, '');
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Form submission
    this.addEventListenerWithCleanup(this.form, 'submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Form reset
    if (this.elements.resetBtn) {
      this.addEventListenerWithCleanup(this.elements.resetBtn, 'click', (e) => {
        e.preventDefault();
        this.handleReset();
      });
    }

    // Input change events
    Object.entries(this.elements).forEach(([field, element]) => {
      if (!element || ['submitBtn', 'resetBtn'].includes(field)) return;

      // Debounced input handler for auto-calculation
      const debouncedHandler = EventHelper.debounce(() => {
        this.handleInputChange(field, element.value);
      }, this.options.debounceDelay);

      this.addEventListenerWithCleanup(element, 'input', debouncedHandler);

      // Immediate validation on blur
      this.addEventListenerWithCleanup(element, 'blur', () => {
        this.validateField(field, element.value);
      });

      // Clear errors on focus
      this.addEventListenerWithCleanup(element, 'focus', () => {
        this.clearFieldError(field);
      });
    });

    // Keyboard shortcuts
    this.addEventListenerWithCleanup(document, 'keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
  }

  /**
   * Setup form validation
   */
  setupValidation() {
    Object.entries(this.elements).forEach(([field, element]) => {
      if (!element || ['submitBtn', 'resetBtn'].includes(field)) return;

      this.realTimeValidator.registerField(field, element, (result, fieldName) => {
        this.handleValidationResult(result, fieldName);
      });
    });
  }

  /**
   * Setup tooltips for help text
   */
  setupTooltips() {
    if (!this.options.showTooltips) return;

    const helpButtons = DOMHelper.$$('.help-btn', this.form);
    helpButtons.forEach(button => {
      this.addEventListenerWithCleanup(button, 'click', (e) => {
        e.preventDefault();
        this.showTooltip(button);
      });

      this.addEventListenerWithCleanup(button, 'mouseenter', () => {
        this.showTooltip(button);
      });

      this.addEventListenerWithCleanup(button, 'mouseleave', () => {
        this.hideTooltip(button);
      });
    });
  }

  /**
   * Load initial form data
   */
  loadInitialData() {
    // Set default values
    Object.entries(FORM_FIELDS).forEach(([field, config]) => {
      const element = this.elements[field];
      if (element && !element.value) {
        element.value = config.type === 'number' ? '0' : '';
      }
    });

    // Update form data
    this.updateFormData();
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    try {
      // Show loading state
      this.setLoadingState(true);

      // Update form data
      this.updateFormData();

      // Validate all fields
      const validationResult = defaultValidationManager.validateHPPData(this.formData);

      if (!validationResult.isValid) {
        this.displayValidationErrors(validationResult);
        this.setLoadingState(false);
        return;
      }

      // Trigger calculation event
      EventHelper.trigger(this.form, 'hpp:calculate', {
        data: this.formData,
        source: 'form-submit'
      });

      // Show success message
      this.showSuccessMessage(SUCCESS_MESSAGES.calculationComplete);

    } catch (error) {
      console.error('Form submission error:', error);
      this.showErrorMessage(ERROR_MESSAGES.calculationError);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Handle form reset
   */
  handleReset() {
    // Reset form elements
    this.form.reset();

    // Clear validation states
    this.clearAllErrors();
    this.realTimeValidator.resetAll();

    // Reset form data
    this.formData = {};
    this.loadInitialData();

    // Trigger reset event
    EventHelper.trigger(this.form, 'hpp:reset', {
      source: 'form-reset'
    });

    // Show success message
    this.showSuccessMessage(SUCCESS_MESSAGES.formReset);
  }

  /**
   * Handle input change
   */
  handleInputChange(field, value) {
    // Update form data
    this.formData[field] = this.parseFieldValue(field, value);

    // Validate if enabled
    if (this.options.validateOnInput) {
      this.validateField(field, value);
    }

    // Auto-calculate if enabled
    if (this.options.autoCalculate && this.isFormValid()) {
      EventHelper.trigger(this.form, 'hpp:calculate', {
        data: this.formData,
        source: 'auto-calculate'
      });
    }

    // Trigger input change event
    EventHelper.trigger(this.form, 'hpp:input-change', {
      field,
      value,
      formData: { ...this.formData }
    });
  }

  /**
   * Handle validation result
   */
  handleValidationResult(result, field) {
    this.validationResults.set(field, result);

    if (result.isValid) {
      this.clearFieldError(field);
      this.showFieldSuccess(field);
    } else {
      this.showFieldError(field, result.getFirstFieldError(field));
    }

    // Update submit button state
    this.updateSubmitButtonState();
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    // Only handle if form is focused
    if (!this.form.contains(e.target)) return;

    switch (e.key) {
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleSubmit();
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.handleReset();
        break;
      case 'F1':
        e.preventDefault();
        this.showHelp();
        break;
    }
  }

  /**
   * Validate single field
   */
  validateField(field, value) {
    const result = defaultValidationManager.validateField(field, value);
    this.handleValidationResult(result, field);
    return result;
  }

  /**
   * Update form data from inputs
   */
  updateFormData() {
    Object.entries(this.elements).forEach(([field, element]) => {
      if (!element || ['submitBtn', 'resetBtn'].includes(field)) return;
      
      this.formData[field] = this.parseFieldValue(field, element.value);
    });
  }

  /**
   * Parse field value based on field type
   */
  parseFieldValue(field, value) {
    const config = FORM_FIELDS[field];
    if (!config) return value;

    if (config.type === 'number') {
      if (['directMaterials', 'directLabor', 'manufacturingOverhead', 'otherCosts'].includes(field)) {
        return CurrencyHelper.parse(value);
      }
      return parseFloat(value) || 0;
    }

    return value;
  }

  /**
   * Check if form is valid
   */
  isFormValid() {
    for (const [field, result] of this.validationResults) {
      if (!result.isValid) return false;
    }
    return true;
  }

  /**
   * Show field error
   */
  showFieldError(field, message) {
    const element = this.elements[field];
    if (!element) return;

    const errorElement = DOMHelper.$(`#${field}-error`);
    const formGroup = element.closest('.form__group');

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'flex';
    }

    if (formGroup) {
      DOMHelper.addClass(formGroup, 'form__group--error');
      DOMHelper.removeClass(formGroup, 'form__group--success');
    }

    DOMHelper.addClass(element, 'form__input--error');
    DOMHelper.removeClass(element, 'form__input--success');
  }

  /**
   * Clear field error
   */
  clearFieldError(field) {
    const element = this.elements[field];
    if (!element) return;

    const errorElement = DOMHelper.$(`#${field}-error`);
    const formGroup = element.closest('.form__group');

    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }

    if (formGroup) {
      DOMHelper.removeClass(formGroup, 'form__group--error');
    }

    DOMHelper.removeClass(element, 'form__input--error');
  }

  /**
   * Show field success
   */
  showFieldSuccess(field) {
    const element = this.elements[field];
    if (!element) return;

    const formGroup = element.closest('.form__group');

    if (formGroup) {
      DOMHelper.addClass(formGroup, 'form__group--success');
      DOMHelper.removeClass(formGroup, 'form__group--error');
    }

    DOMHelper.addClass(element, 'form__input--success');
    DOMHelper.removeClass(element, 'form__input--error');
  }

  /**
   * Clear all errors
   */
  clearAllErrors() {
    Object.keys(this.elements).forEach(field => {
      this.clearFieldError(field);
    });
  }

  /**
   * Display validation errors
   */
  displayValidationErrors(validationResult) {
    validationResult.errors.forEach(error => {
      this.showFieldError(error.field, error.message);
    });

    // Focus first error field
    const firstErrorField = validationResult.errors[0]?.field;
    if (firstErrorField && this.elements[firstErrorField]) {
      this.elements[firstErrorField].focus();
    }
  }

  /**
   * Update submit button state
   */
  updateSubmitButtonState() {
    if (!this.elements.submitBtn) return;

    const isValid = this.isFormValid();
    this.elements.submitBtn.disabled = !isValid;

    if (isValid) {
      DOMHelper.removeClass(this.elements.submitBtn, 'btn--disabled');
    } else {
      DOMHelper.addClass(this.elements.submitBtn, 'btn--disabled');
    }
  }

  /**
   * Set loading state
   */
  setLoadingState(loading) {
    if (!this.elements.submitBtn) return;

    if (loading) {
      DOMHelper.addClass(this.elements.submitBtn, 'btn--loading');
      this.elements.submitBtn.disabled = true;
    } else {
      DOMHelper.removeClass(this.elements.submitBtn, 'btn--loading');
      this.updateSubmitButtonState();
    }
  }

  /**
   * Show tooltip
   */
  showTooltip(button) {
    const tooltip = button.getAttribute('data-tooltip');
    if (!tooltip) return;

    // Create tooltip element if not exists
    let tooltipElement = DOMHelper.$('.tooltip__content', button.parentElement);
    if (!tooltipElement) {
      tooltipElement = DOMHelper.create('div', {
        className: 'tooltip__content'
      }, tooltip);
      
      button.parentElement.appendChild(tooltipElement);
      DOMHelper.addClass(button.parentElement, 'tooltip');
    }

    tooltipElement.textContent = tooltip;
    AnimationHelper.fadeIn(tooltipElement, ANIMATIONS.fast);
  }

  /**
   * Hide tooltip
   */
  hideTooltip(button) {
    const tooltipElement = DOMHelper.$('.tooltip__content', button.parentElement);
    if (tooltipElement) {
      AnimationHelper.fadeOut(tooltipElement, ANIMATIONS.fast);
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    EventHelper.trigger(document, 'hpp:show-toast', {
      type: 'success',
      message
    });
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    EventHelper.trigger(document, 'hpp:show-toast', {
      type: 'error',
      message
    });
  }

  /**
   * Show help modal
   */
  showHelp() {
    EventHelper.trigger(document, 'hpp:show-modal', {
      type: 'help',
      title: 'Bantuan Pengisian Form',
      content: this.generateHelpContent()
    });
  }

  /**
   * Generate help content
   */
  generateHelpContent() {
    return `
      <div class="help-content">
        <h4>Cara Menggunakan Kalkulator HPP</h4>
        <ol>
          <li><strong>Bahan Baku Langsung:</strong> Masukkan total biaya bahan yang langsung digunakan dalam produksi</li>
          <li><strong>Tenaga Kerja Langsung:</strong> Masukkan biaya upah pekerja yang terlibat langsung dalam produksi</li>
          <li><strong>Biaya Overhead:</strong> Masukkan biaya tidak langsung seperti listrik, sewa, depresiasi</li>
          <li><strong>Biaya Lainnya:</strong> Masukkan biaya tambahan lainnya (opsional)</li>
          <li><strong>Jumlah Unit:</strong> Masukkan jumlah unit yang diproduksi</li>
        </ol>
        
        <h4>Tips:</h4>
        <ul>
          <li>Gunakan Enter untuk menghitung atau Escape untuk reset</li>
          <li>Perhitungan akan otomatis diupdate saat Anda mengetik</li>
          <li>Semua hasil akan disimpan dalam riwayat</li>
        </ul>
      </div>
    `;
  }

  /**
   * Get current form data
   */
  getFormData() {
    this.updateFormData();
    return { ...this.formData };
  }

  /**
   * Set form data
   */
  setFormData(data) {
    Object.entries(data).forEach(([field, value]) => {
      const element = this.elements[field];
      if (element) {
        if (['directMaterials', 'directLabor', 'manufacturingOverhead', 'otherCosts'].includes(field)) {
          element.value = CurrencyHelper.format(value, false);
        } else {
          element.value = value;
        }
      }
    });

    this.updateFormData();
  }

  /**
   * Add event listener with cleanup tracking
   */
  addEventListenerWithCleanup(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Destroy component and cleanup
   */
  destroy() {
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    
    this.eventListeners = [];
    this.validationResults.clear();
    this.formData = {};
  }
}