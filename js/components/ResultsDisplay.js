/**
 * Results Display Component
 * Handles the display of HPP calculation results with visual breakdown
 */

import { COST_CATEGORIES, ANIMATIONS, CHART_CONFIG } from '../utils/constants.js';
import { DOMHelper, EventHelper, CurrencyHelper, AnimationHelper, NumberHelper } from '../utils/helpers.js';

export class ResultsDisplay {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      showAnimations: true,
      showChart: true,
      showBreakdown: true,
      showStats: true,
      autoUpdate: true,
      chartHeight: 200,
      ...options
    };

    this.currentResult = null;
    this.elements = {};
    this.chart = null;
    this.eventListeners = [];

    this.init();
  }

  /**
   * Initialize results display component
   */
  init() {
    if (!this.container) {
      console.error('Results container element not found');
      return;
    }

    this.setupElements();
    this.setupEventListeners();
    this.showEmptyState();
  }

  /**
   * Setup DOM elements
   */
  setupElements() {
    this.elements = {
      container: this.container,
      main: DOMHelper.$('.results__main', this.container),
      breakdown: DOMHelper.$('.results__breakdown', this.container),
      stats: DOMHelper.$('.results__stats', this.container),
      chart: DOMHelper.$('.results__chart', this.container),
      export: DOMHelper.$('.results__export', this.container)
    };

    // Create elements if they don't exist
    if (!this.elements.main) {
      this.createMainResultElement();
    }

    if (!this.elements.breakdown) {
      this.createBreakdownElement();
    }

    if (!this.elements.stats) {
      this.createStatsElement();
    }

    if (!this.elements.chart) {
      this.createChartElement();
    }

    if (!this.elements.export) {
      this.createExportElement();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for calculation events
    this.addEventListenerWithCleanup(document, 'hpp:calculation-complete', (e) => {
      this.displayResult(e.detail.result);
    });

    this.addEventListenerWithCleanup(document, 'hpp:calculation-error', (e) => {
      this.showErrorState(e.detail.error);
    });

    this.addEventListenerWithCleanup(document, 'hpp:reset', () => {
      this.showEmptyState();
    });

    // Export button events
    if (this.elements.export) {
      const exportButtons = DOMHelper.$$('.btn', this.elements.export);
      exportButtons.forEach(button => {
        this.addEventListenerWithCleanup(button, 'click', (e) => {
          e.preventDefault();
          this.handleExport(button.dataset.format);
        });
      });
    }
  }

  /**
   * Display calculation result
   */
  async displayResult(result) {
    if (!result || !result.isValid) {
      this.showErrorState('Invalid calculation result');
      return;
    }

    this.currentResult = result;

    // Show animations if enabled
    if (this.options.showAnimations) {
      await this.animateResultDisplay();
    } else {
      this.updateDisplay();
    }
  }

  /**
   * Update display with current result
   */
  updateDisplay() {
    if (!this.currentResult) return;

    this.updateMainResult();
    this.updateBreakdown();
    this.updateStats();
    this.updateChart();
    
    // Show results container
    this.showResults();
  }

  /**
   * Update main result display
   */
  updateMainResult() {
    if (!this.elements.main) return;

    const hppValue = DOMHelper.$('.results__hpp-value', this.elements.main);
    const hppPerUnit = DOMHelper.$('.results__hpp-per-unit', this.elements.main);
    const unitsInfo = DOMHelper.$('.results__units-info', this.elements.main);

    if (hppValue) {
      hppValue.textContent = CurrencyHelper.format(this.currentResult.totalHPP);
    }

    if (hppPerUnit) {
      hppPerUnit.textContent = `${CurrencyHelper.format(this.currentResult.hppPerUnit)} per unit`;
    }

    if (unitsInfo) {
      unitsInfo.textContent = `Total ${this.currentResult.totalUnits.toLocaleString('id-ID')} unit diproduksi`;
    }
  }

  /**
   * Update cost breakdown display
   */
  updateBreakdown() {
    if (!this.elements.breakdown || !this.options.showBreakdown) return;

    const itemsContainer = DOMHelper.$('.breakdown__items', this.elements.breakdown);
    if (!itemsContainer) return;

    // Clear existing items
    itemsContainer.innerHTML = '';

    // Create breakdown items
    Object.entries(this.currentResult.breakdown).forEach(([key, data]) => {
      if (data.amount > 0) {
        const item = this.createBreakdownItem(key, data);
        itemsContainer.appendChild(item);
      }
    });
  }

  /**
   * Create breakdown item element
   */
  createBreakdownItem(key, data) {
    const item = DOMHelper.create('div', {
      className: `breakdown__item breakdown__item--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    });

    // Set percentage width for visual bar
    item.style.setProperty('--percentage', `${data.percentage}%`);

    const content = DOMHelper.create('div', { className: 'breakdown__item-content' });

    const label = DOMHelper.create('div', { className: 'breakdown__item-label' });
    label.innerHTML = `
      <i class="${data.category.icon} breakdown__item-icon" aria-hidden="true"></i>
      <span>${data.category.label}</span>
    `;

    const values = DOMHelper.create('div', { className: 'breakdown__item-values' });
    values.innerHTML = `
      <div class="breakdown__item-amount">${CurrencyHelper.format(data.amount)}</div>
      <div class="breakdown__item-percentage">${data.percentage}%</div>
    `;

    content.appendChild(label);
    content.appendChild(values);
    item.appendChild(content);

    // Add hover effect
    this.addEventListenerWithCleanup(item, 'mouseenter', () => {
      this.highlightBreakdownItem(key);
    });

    this.addEventListenerWithCleanup(item, 'mouseleave', () => {
      this.unhighlightBreakdownItem(key);
    });

    return item;
  }

  /**
   * Update statistics display
   */
  updateStats() {
    if (!this.elements.stats || !this.options.showStats) return;

    const stats = [
      {
        icon: 'fas fa-calculator',
        label: 'HPP per Unit',
        value: CurrencyHelper.format(this.currentResult.hppPerUnit)
      },
      {
        icon: 'fas fa-coins',
        label: 'Total Biaya',
        value: CurrencyHelper.format(this.currentResult.totalCosts)
      },
      {
        icon: 'fas fa-boxes',
        label: 'Total Unit',
        value: this.currentResult.totalUnits.toLocaleString('id-ID')
      },
      {
        icon: 'fas fa-percentage',
        label: 'Overhead %',
        value: `${this.currentResult.breakdown.manufacturingOverhead.percentage}%`
      }
    ];

    this.elements.stats.innerHTML = '';

    stats.forEach(stat => {
      const card = this.createStatCard(stat);
      this.elements.stats.appendChild(card);
    });
  }

  /**
   * Create stat card element
   */
  createStatCard(stat) {
    return DOMHelper.create('div', { className: 'stat-card' }, `
      <div class="stat-card__icon">
        <i class="${stat.icon}" aria-hidden="true"></i>
      </div>
      <div class="stat-card__label">${stat.label}</div>
      <div class="stat-card__value">${stat.value}</div>
    `);
  }

  /**
   * Update chart display
   */
  updateChart() {
    if (!this.elements.chart || !this.options.showChart) return;

    // Clear existing chart
    this.elements.chart.innerHTML = '';

    // Create simple bar chart
    const chartContainer = DOMHelper.create('div', { className: 'simple-chart' });

    Object.entries(this.currentResult.breakdown).forEach(([key, data]) => {
      if (data.amount > 0) {
        const bar = this.createChartBar(key, data);
        chartContainer.appendChild(bar);
      }
    });

    this.elements.chart.appendChild(chartContainer);
  }

  /**
   * Create chart bar element
   */
  createChartBar(key, data) {
    const maxHeight = this.options.chartHeight;
    const height = Math.max(data.percentage * (maxHeight / 100), 10); // Minimum 10px height

    const bar = DOMHelper.create('div', {
      className: `chart-bar chart-bar--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`,
      style: `height: ${height}px;`
    });

    const label = DOMHelper.create('div', { className: 'chart-bar__label' });
    label.textContent = data.category.label.split(' ')[0]; // First word only

    const value = DOMHelper.create('div', { className: 'chart-bar__value' });
    value.textContent = `${data.percentage}%`;

    bar.appendChild(label);
    bar.appendChild(value);

    // Add click event for details
    this.addEventListenerWithCleanup(bar, 'click', () => {
      this.showCostDetails(key, data);
    });

    return bar;
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="results__empty">
        <i class="fas fa-chart-line results__empty-icon" aria-hidden="true"></i>
        <p class="results__empty-text">Silakan isi form untuk melihat hasil perhitungan HPP</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showErrorState(error) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="results__error">
        <i class="fas fa-exclamation-triangle results__error-icon" aria-hidden="true"></i>
        <p class="results__error-text">Terjadi kesalahan dalam perhitungan</p>
        <p class="results__error-detail">${error}</p>
      </div>
    `;
  }

  /**
   * Show results container
   */
  showResults() {
    const emptyState = DOMHelper.$('.results__empty', this.container);
    const errorState = DOMHelper.$('.results__error', this.container);

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    if (errorState) {
      errorState.style.display = 'none';
    }

    // Show all result elements
    Object.values(this.elements).forEach(element => {
      if (element && element !== this.container) {
        element.style.display = '';
      }
    });
  }

  /**
   * Animate result display
   */
  async animateResultDisplay() {
    // Hide current content with animation
    const currentContent = DOMHelper.$$('.results > *:not(.results__empty):not(.results__error)', this.container);
    
    for (const element of currentContent) {
      await AnimationHelper.fadeOut(element, ANIMATIONS.fast);
    }

    // Update content
    this.updateDisplay();

    // Show new content with animation
    const newContent = DOMHelper.$$('.results > *:not(.results__empty):not(.results__error)', this.container);
    
    for (const element of newContent) {
      await AnimationHelper.fadeIn(element, ANIMATIONS.normal);
    }
  }

  /**
   * Highlight breakdown item
   */
  highlightBreakdownItem(key) {
    const item = DOMHelper.$(`.breakdown__item--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, this.container);
    const chartBar = DOMHelper.$(`.chart-bar--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, this.container);

    if (item) {
      DOMHelper.addClass(item, 'breakdown__item--highlighted');
    }

    if (chartBar) {
      DOMHelper.addClass(chartBar, 'chart-bar--highlighted');
    }
  }

  /**
   * Unhighlight breakdown item
   */
  unhighlightBreakdownItem(key) {
    const item = DOMHelper.$(`.breakdown__item--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, this.container);
    const chartBar = DOMHelper.$(`.chart-bar--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, this.container);

    if (item) {
      DOMHelper.removeClass(item, 'breakdown__item--highlighted');
    }

    if (chartBar) {
      DOMHelper.removeClass(chartBar, 'chart-bar--highlighted');
    }
  }

  /**
   * Show cost details modal
   */
  showCostDetails(key, data) {
    const content = `
      <div class="cost-details">
        <div class="cost-details__header">
          <i class="${data.category.icon}" aria-hidden="true"></i>
          <h4>${data.category.label}</h4>
        </div>
        <div class="cost-details__body">
          <div class="cost-details__item">
            <span>Jumlah Biaya:</span>
            <strong>${CurrencyHelper.format(data.amount)}</strong>
          </div>
          <div class="cost-details__item">
            <span>Persentase:</span>
            <strong>${data.percentage}%</strong>
          </div>
          <div class="cost-details__item">
            <span>Per Unit:</span>
            <strong>${CurrencyHelper.format(data.amount / this.currentResult.totalUnits)}</strong>
          </div>
          <div class="cost-details__description">
            <p>${data.category.description}</p>
          </div>
        </div>
      </div>
    `;

    EventHelper.trigger(document, 'hpp:show-modal', {
      title: 'Detail Komponen Biaya',
      content: content,
      size: 'small'
    });
  }

  /**
   * Handle export action
   */
  handleExport(format) {
    if (!this.currentResult) {
      EventHelper.trigger(document, 'hpp:show-toast', {
        type: 'warning',
        message: 'Tidak ada data untuk diekspor'
      });
      return;
    }

    EventHelper.trigger(document, 'hpp:export', {
      format: format,
      data: this.currentResult,
      source: 'results-display'
    });
  }

  /**
   * Create main result element
   */
  createMainResultElement() {
    const main = DOMHelper.create('div', { className: 'results__main' }, `
      <div class="results__hpp-title">Total Harga Pokok Penjualan</div>
      <div class="results__hpp-value">Rp 0</div>
      <div class="results__hpp-per-unit">Rp 0 per unit</div>
      <div class="results__units-info">0 unit diproduksi</div>
    `);

    this.container.appendChild(main);
    this.elements.main = main;
  }

  /**
   * Create breakdown element
   */
  createBreakdownElement() {
    const breakdown = DOMHelper.create('div', { className: 'results__breakdown' }, `
      <div class="breakdown__title">
        <i class="fas fa-chart-pie" aria-hidden="true"></i>
        Rincian Biaya
      </div>
      <div class="breakdown__items"></div>
    `);

    this.container.appendChild(breakdown);
    this.elements.breakdown = breakdown;
  }

  /**
   * Create stats element
   */
  createStatsElement() {
    const stats = DOMHelper.create('div', { className: 'results__stats' });
    this.container.appendChild(stats);
    this.elements.stats = stats;
  }

  /**
   * Create chart element
   */
  createChartElement() {
    const chart = DOMHelper.create('div', { className: 'results__chart' }, `
      <div class="chart-placeholder">
        <i class="fas fa-chart-bar chart-placeholder__icon" aria-hidden="true"></i>
        <p class="chart-placeholder__text">Grafik akan ditampilkan setelah perhitungan</p>
      </div>
    `);

    this.container.appendChild(chart);
    this.elements.chart = chart;
  }

  /**
   * Create export element
   */
  createExportElement() {
    const exportEl = DOMHelper.create('div', { className: 'results__export' }, `
      <button type="button" class="btn btn--secondary" data-format="pdf">
        <i class="fas fa-file-pdf" aria-hidden="true"></i>
        Export PDF
      </button>
      <button type="button" class="btn btn--secondary" data-format="csv">
        <i class="fas fa-file-csv" aria-hidden="true"></i>
        Export CSV
      </button>
      <button type="button" class="btn btn--secondary" data-format="print">
        <i class="fas fa-print" aria-hidden="true"></i>
        Print
      </button>
    `);

    this.container.appendChild(exportEl);
    this.elements.export = exportEl;
  }

  /**
   * Get current result data
   */
  getCurrentResult() {
    return this.currentResult;
  }

  /**
   * Update options
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    
    if (this.currentResult) {
      this.updateDisplay();
    }
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
    this.currentResult = null;
    this.elements = {};
  }
}