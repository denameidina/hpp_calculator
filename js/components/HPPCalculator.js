/**
 * HPP Calculator Engine
 * Core calculation logic for Harga Pokok Penjualan (Cost of Goods Sold)
 */

import { VALIDATION, COST_CATEGORIES } from '../utils/constants.js';
import { NumberHelper } from '../utils/helpers.js';
import { defaultValidationManager } from '../utils/validation.js';

/**
 * HPP Calculation Result
 */
export class HPPResult {
  constructor(data = {}) {
    this.directMaterials = data.directMaterials || 0;
    this.directLabor = data.directLabor || 0;
    this.manufacturingOverhead = data.manufacturingOverhead || 0;
    this.otherCosts = data.otherCosts || 0;
    this.totalUnits = data.totalUnits || 1;
    
    // Calculated values
    this.totalCosts = this.calculateTotalCosts();
    this.hppPerUnit = this.calculateHPPPerUnit();
    this.totalHPP = this.calculateTotalHPP();
    
    // Breakdown percentages
    this.breakdown = this.calculateBreakdown();
    
    // Metadata
    this.timestamp = new Date().toISOString();
    this.isValid = this.validate();
  }

  /**
   * Calculate total costs
   */
  calculateTotalCosts() {
    return NumberHelper.round(
      this.directMaterials + 
      this.directLabor + 
      this.manufacturingOverhead + 
      this.otherCosts
    );
  }

  /**
   * Calculate HPP per unit
   */
  calculateHPPPerUnit() {
    if (this.totalUnits <= 0) return 0;
    return NumberHelper.round(this.totalCosts / this.totalUnits);
  }

  /**
   * Calculate total HPP (same as total costs)
   */
  calculateTotalHPP() {
    return this.totalCosts;
  }

  /**
   * Calculate cost breakdown with percentages
   */
  calculateBreakdown() {
    const breakdown = {
      directMaterials: {
        amount: this.directMaterials,
        percentage: NumberHelper.percentage(this.directMaterials, this.totalCosts),
        category: COST_CATEGORIES.directMaterials
      },
      directLabor: {
        amount: this.directLabor,
        percentage: NumberHelper.percentage(this.directLabor, this.totalCosts),
        category: COST_CATEGORIES.directLabor
      },
      manufacturingOverhead: {
        amount: this.manufacturingOverhead,
        percentage: NumberHelper.percentage(this.manufacturingOverhead, this.totalCosts),
        category: COST_CATEGORIES.manufacturingOverhead
      },
      otherCosts: {
        amount: this.otherCosts,
        percentage: NumberHelper.percentage(this.otherCosts, this.totalCosts),
        category: COST_CATEGORIES.otherCosts
      }
    };

    return breakdown;
  }

  /**
   * Validate calculation result
   */
  validate() {
    const validationResult = defaultValidationManager.validateHPPData({
      directMaterials: this.directMaterials,
      directLabor: this.directLabor,
      manufacturingOverhead: this.manufacturingOverhead,
      otherCosts: this.otherCosts,
      totalUnits: this.totalUnits
    });

    return validationResult.isValid;
  }

  /**
   * Get calculation summary
   */
  getSummary() {
    return {
      totalCosts: this.totalCosts,
      totalUnits: this.totalUnits,
      hppPerUnit: this.hppPerUnit,
      totalHPP: this.totalHPP,
      breakdown: this.breakdown,
      isValid: this.isValid,
      timestamp: this.timestamp
    };
  }

  /**
   * Export data for storage
   */
  toJSON() {
    return {
      directMaterials: this.directMaterials,
      directLabor: this.directLabor,
      manufacturingOverhead: this.manufacturingOverhead,
      otherCosts: this.otherCosts,
      totalUnits: this.totalUnits,
      totalCosts: this.totalCosts,
      hppPerUnit: this.hppPerUnit,
      totalHPP: this.totalHPP,
      breakdown: this.breakdown,
      timestamp: this.timestamp,
      isValid: this.isValid
    };
  }
}

/**
 * HPP Calculator Class
 */
export class HPPCalculator {
  constructor(options = {}) {
    this.options = {
      precision: 2,
      validateInput: true,
      logCalculations: false,
      enableCaching: true,
      ...options
    };

    this.calculationHistory = [];
    this.cache = new Map();
    this.callbacks = new Map();
  }

  /**
   * Calculate HPP from input data
   */
  calculate(inputData) {
    try {
      // Validate input data
      if (this.options.validateInput) {
        const validation = defaultValidationManager.validateHPPData(inputData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }

      // Normalize input data
      const normalizedData = this.normalizeInputData(inputData);

      // Check cache if enabled
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(normalizedData);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
          this.triggerCallback('cache-hit', cachedResult);
          return cachedResult;
        }
      }

      // Create calculation result
      const result = new HPPResult(normalizedData);

      // Cache result if enabled
      if (this.options.enableCaching) {
        const cacheKey = this.generateCacheKey(normalizedData);
        this.cache.set(cacheKey, result);
      }

      // Add to history
      this.addToHistory(result);

      // Log calculation if enabled
      if (this.options.logCalculations) {
        console.log('HPP Calculation:', result.getSummary());
      }

      // Trigger callback
      this.triggerCallback('calculation-complete', result);

      return result;

    } catch (error) {
      const errorResult = {
        error: error.message,
        timestamp: new Date().toISOString(),
        isValid: false
      };

      this.triggerCallback('calculation-error', errorResult);
      throw error;
    }
  }

  /**
   * Calculate with step-by-step breakdown
   */
  calculateDetailed(inputData) {
    const steps = [];
    
    try {
      // Step 1: Input validation
      steps.push({
        step: 1,
        description: 'Validasi input data',
        data: inputData,
        timestamp: new Date().toISOString()
      });

      const normalizedData = this.normalizeInputData(inputData);

      // Step 2: Normalize data
      steps.push({
        step: 2,
        description: 'Normalisasi data',
        data: normalizedData,
        timestamp: new Date().toISOString()
      });

      // Step 3: Calculate total costs
      const totalCosts = normalizedData.directMaterials + 
                        normalizedData.directLabor + 
                        normalizedData.manufacturingOverhead + 
                        normalizedData.otherCosts;

      steps.push({
        step: 3,
        description: 'Hitung total biaya produksi',
        calculation: `${normalizedData.directMaterials} + ${normalizedData.directLabor} + ${normalizedData.manufacturingOverhead} + ${normalizedData.otherCosts}`,
        result: totalCosts,
        timestamp: new Date().toISOString()
      });

      // Step 4: Calculate HPP per unit
      const hppPerUnit = totalCosts / normalizedData.totalUnits;

      steps.push({
        step: 4,
        description: 'Hitung HPP per unit',
        calculation: `${totalCosts} ÷ ${normalizedData.totalUnits}`,
        result: hppPerUnit,
        timestamp: new Date().toISOString()
      });

      // Step 5: Final result
      const result = new HPPResult(normalizedData);

      steps.push({
        step: 5,
        description: 'Hasil akhir perhitungan HPP',
        result: result.getSummary(),
        timestamp: new Date().toISOString()
      });

      return {
        result,
        steps,
        success: true
      };

    } catch (error) {
      steps.push({
        step: 'error',
        description: 'Error dalam perhitungan',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        result: null,
        steps,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate multiple scenarios
   */
  calculateScenarios(baseData, scenarios) {
    const results = [];

    scenarios.forEach((scenario, index) => {
      const scenarioData = { ...baseData, ...scenario };
      
      try {
        const result = this.calculate(scenarioData);
        results.push({
          id: index + 1,
          name: scenario.name || `Scenario ${index + 1}`,
          data: scenarioData,
          result: result.getSummary(),
          success: true
        });
      } catch (error) {
        results.push({
          id: index + 1,
          name: scenario.name || `Scenario ${index + 1}`,
          data: scenarioData,
          result: null,
          success: false,
          error: error.message
        });
      }
    });

    return results;
  }

  /**
   * Calculate break-even analysis
   */
  calculateBreakEven(costData, sellingPricePerUnit) {
    try {
      const result = this.calculate(costData);
      
      if (!result.isValid) {
        throw new Error('Invalid cost data for break-even analysis');
      }

      const hppPerUnit = result.hppPerUnit;
      const profitPerUnit = sellingPricePerUnit - hppPerUnit;
      const profitMargin = NumberHelper.percentage(profitPerUnit, sellingPricePerUnit);

      // Calculate break-even for fixed costs (if overhead is considered fixed)
      const fixedCosts = result.manufacturingOverhead;
      const variableCostPerUnit = (result.directMaterials + result.directLabor + result.otherCosts) / result.totalUnits;
      const contributionMargin = sellingPricePerUnit - variableCostPerUnit;
      const breakEvenUnits = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : 0;

      return {
        hppPerUnit,
        sellingPricePerUnit,
        profitPerUnit,
        profitMargin,
        fixedCosts,
        variableCostPerUnit,
        contributionMargin,
        breakEvenUnits,
        breakEvenRevenue: breakEvenUnits * sellingPricePerUnit,
        isValid: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: error.message,
        isValid: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Normalize input data
   */
  normalizeInputData(data) {
    return {
      directMaterials: NumberHelper.round(parseFloat(data.directMaterials) || 0, this.options.precision),
      directLabor: NumberHelper.round(parseFloat(data.directLabor) || 0, this.options.precision),
      manufacturingOverhead: NumberHelper.round(parseFloat(data.manufacturingOverhead) || 0, this.options.precision),
      otherCosts: NumberHelper.round(parseFloat(data.otherCosts) || 0, this.options.precision),
      totalUnits: parseInt(data.totalUnits) || 1
    };
  }

  /**
   * Generate cache key for calculation
   */
  generateCacheKey(data) {
    return JSON.stringify(data);
  }

  /**
   * Add calculation to history
   */
  addToHistory(result) {
    this.calculationHistory.unshift({
      id: Date.now().toString(),
      result: result.toJSON(),
      timestamp: result.timestamp
    });

    // Limit history size
    if (this.calculationHistory.length > 100) {
      this.calculationHistory = this.calculationHistory.slice(0, 100);
    }
  }

  /**
   * Get calculation history
   */
  getHistory() {
    return [...this.calculationHistory];
  }

  /**
   * Clear calculation history
   */
  clearHistory() {
    this.calculationHistory = [];
    this.triggerCallback('history-cleared');
  }

  /**
   * Clear calculation cache
   */
  clearCache() {
    this.cache.clear();
    this.triggerCallback('cache-cleared');
  }

  /**
   * Add callback for events
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * Remove callback
   */
  off(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Trigger callback
   */
  triggerCallback(event, data = null) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Callback error for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get calculator statistics
   */
  getStatistics() {
    const calculations = this.calculationHistory.map(item => item.result);
    
    if (calculations.length === 0) {
      return {
        totalCalculations: 0,
        averageHPP: 0,
        minHPP: 0,
        maxHPP: 0,
        totalUnitsCalculated: 0
      };
    }

    const hppValues = calculations.map(calc => calc.hppPerUnit);
    const totalUnits = calculations.reduce((sum, calc) => sum + calc.totalUnits, 0);

    return {
      totalCalculations: calculations.length,
      averageHPP: NumberHelper.round(hppValues.reduce((sum, hpp) => sum + hpp, 0) / hppValues.length),
      minHPP: Math.min(...hppValues),
      maxHPP: Math.max(...hppValues),
      totalUnitsCalculated: totalUnits,
      cacheSize: this.cache.size
    };
  }

  /**
   * Export calculator data
   */
  export() {
    return {
      history: this.getHistory(),
      statistics: this.getStatistics(),
      options: this.options,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import calculator data
   */
  import(data) {
    if (data.history && Array.isArray(data.history)) {
      this.calculationHistory = data.history;
    }
    
    if (data.options) {
      this.options = { ...this.options, ...data.options };
    }
    
    this.triggerCallback('data-imported', data);
  }

  /**
   * Reset calculator
   */
  reset() {
    this.clearHistory();
    this.clearCache();
    this.triggerCallback('calculator-reset');
  }
}

// Create and export default calculator instance
export const defaultHPPCalculator = new HPPCalculator({
  precision: 2,
  validateInput: true,
  logCalculations: false,
  enableCaching: true
});