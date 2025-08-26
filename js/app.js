/**
 * Main Application Entry Point
 * Initializes and coordinates all components of the HPP Calculator
 */

import { defaultStateManager, StateActions } from './components/StateManager.js';
import { defaultHPPCalculator } from './components/HPPCalculator.js';
import { InputForm } from './components/InputForm.js';
import { ResultsDisplay } from './components/ResultsDisplay.js';
import { DOMHelper, EventHelper } from './utils/helpers.js';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from './utils/constants.js';

/**
 * HPP Calculator Application
 */
class HPPCalculatorApp {
  constructor() {
    this.components = {};
    this.initialized = false;
    this.eventListeners = [];
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Initializing HPP Calculator App...');

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize state manager
      await defaultStateManager.init();

      // Initialize components
      this.initializeComponents();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup theme
      this.setupTheme();

      // Mark as initialized
      this.initialized = true;
      StateActions.updateState(defaultStateManager, {
        'app.initialized': true
      }, 'app-init');

      console.log('HPP Calculator App initialized successfully');

      // Show welcome message
      this.showWelcomeMessage();

    } catch (error) {
      console.error('Application initialization error:', error);
      this.showErrorMessage('Terjadi kesalahan saat memuat aplikasi');
    }
  }

  /**
   * Initialize all components
   */
  initializeComponents() {
    // Initialize form component
    const formElement = DOMHelper.$('#hpp-form');
    if (formElement) {
      this.components.form = new InputForm(formElement, {
        validateOnInput: true,
        validateOnBlur: true,
        autoCalculate: defaultStateManager.getState('settings.autoCalculate'),
        formatCurrency: true
      });
    }

    // Initialize results display
    const resultsContainer = DOMHelper.$('#results-container');
    if (resultsContainer) {
      this.components.results = new ResultsDisplay(resultsContainer, {
        showAnimations: defaultStateManager.getState('ui.showAnimations'),
        showChart: true,
        autoUpdate: true
      });
    }

    // Initialize other UI components
    this.initializeUIComponents();
  }

  /**
   * Initialize UI components (buttons, modals, etc.)
   */
  initializeUIComponents() {
    // Theme toggle button
    const themeToggle = DOMHelper.$('.theme-toggle');
    if (themeToggle) {
      this.addEventListenerWithCleanup(themeToggle, 'click', () => {
        StateActions.toggleTheme(defaultStateManager);
      });
    }

    // Help toggle button
    const helpToggle = DOMHelper.$('.help-toggle');
    if (helpToggle) {
      this.addEventListenerWithCleanup(helpToggle, 'click', () => {
        this.showHelpModal();
      });
    }

    // Clear history button
    const clearHistoryBtn = DOMHelper.$('#clear-history');
    if (clearHistoryBtn) {
      this.addEventListenerWithCleanup(clearHistoryBtn, 'click', () => {
        this.clearHistory();
      });
    }

    // About and privacy buttons
    const aboutBtn = DOMHelper.$('#about-btn');
    if (aboutBtn) {
      this.addEventListenerWithCleanup(aboutBtn, 'click', () => {
        this.showAboutModal();
      });
    }

    const privacyBtn = DOMHelper.$('#privacy-btn');
    if (privacyBtn) {
      this.addEventListenerWithCleanup(privacyBtn, 'click', () => {
        this.showPrivacyModal();
      });
    }
  }

  /**
   * Setup global event handlers
   */
  setupEventHandlers() {
    // Calculator events
    this.addEventListenerWithCleanup(document, 'hpp:calculate', (e) => {
      this.handleCalculation(e.detail);
    });

    this.addEventListenerWithCleanup(document, 'hpp:reset', (e) => {
      this.handleReset();
    });

    // State change events
    defaultStateManager.subscribe('ui.theme', (theme) => {
      this.applyTheme(theme);
    });

    defaultStateManager.subscribe('settings.autoCalculate', (autoCalc) => {
      if (this.components.form) {
        this.components.form.options.autoCalculate = autoCalc;
      }
    });

    defaultStateManager.subscribe('ui.showAnimations', (showAnimations) => {
      if (this.components.results) {
        this.components.results.updateOptions({ showAnimations });
      }
    });

    // Window events
    this.addEventListenerWithCleanup(window, 'beforeunload', (e) => {
      if (defaultStateManager.getState('app.hasUnsavedChanges')) {
        e.preventDefault();
        e.returnValue = 'Ada perubahan yang belum disimpan. Yakin ingin keluar?';
        return e.returnValue;
      }
    });

    // Keyboard shortcuts
    this.addEventListenerWithCleanup(document, 'keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Toast events
    this.addEventListenerWithCleanup(document, 'hpp:show-toast', (e) => {
      this.showToast(e.detail);
    });

    // Modal events
    this.addEventListenerWithCleanup(document, 'hpp:show-modal', (e) => {
      this.showModal(e.detail);
    });

    // Export events
    this.addEventListenerWithCleanup(document, 'hpp:export', (e) => {
      this.handleExport(e.detail);
    });
  }

  /**
   * Handle calculation request
   */
  async handleCalculation(detail) {
    try {
      StateActions.startCalculation(defaultStateManager);

      const result = defaultHPPCalculator.calculate(detail.data);

      if (result.isValid) {
        StateActions.setCalculationResult(defaultStateManager, result);
        
        // Save to history if auto-save is enabled
        if (defaultStateManager.getState('settings.autoSave')) {
          StateActions.addToHistory(defaultStateManager, {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            name: `Perhitungan ${new Date().toLocaleDateString('id-ID')}`,
            data: result.toJSON()
          });
        }

        // Update form state
        StateActions.updateFormData(defaultStateManager, detail.data);

        this.showSuccessMessage(SUCCESS_MESSAGES.calculationComplete);
      } else {
        throw new Error('Invalid calculation result');
      }

    } catch (error) {
      console.error('Calculation error:', error);
      StateActions.setCalculationError(defaultStateManager, error.message);
      this.showErrorMessage(ERROR_MESSAGES.calculationError);
    }
  }

  /**
   * Handle form reset
   */
  handleReset() {
    StateActions.resetForm(defaultStateManager);
    this.showSuccessMessage(SUCCESS_MESSAGES.formReset);
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    // Only handle if not in input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case 'F1':
        e.preventDefault();
        this.showHelpModal();
        break;
      case 't':
        if (e.ctrlKey && e.shiftKey) {
          e.preventDefault();
          StateActions.toggleTheme(defaultStateManager);
        }
        break;
      case 'e':
        if (e.ctrlKey) {
          e.preventDefault();
          this.handleExport({ format: 'pdf' });
        }
        break;
    }
  }

  /**
   * Setup and apply theme
   */
  setupTheme() {
    const theme = defaultStateManager.getState('ui.theme');
    this.applyTheme(theme);
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme toggle icon
    const themeToggle = DOMHelper.$('.theme-toggle');
    if (themeToggle) {
      const icon = DOMHelper.$('i', themeToggle);
      if (icon) {
        if (theme === 'dark') {
          icon.className = 'fas fa-sun';
        } else {
          icon.className = 'fas fa-moon';
        }
      }
    }
  }

  /**
   * Clear calculation history
   */
  clearHistory() {
    const confirmClear = confirm('Yakin ingin menghapus semua riwayat perhitungan?');
    if (confirmClear) {
      defaultStateManager.setState('history.calculations', [], 'history-clear');
      this.showSuccessMessage('Riwayat berhasil dihapus');
    }
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage() {
    this.showToast({
      type: 'info',
      message: 'Selamat datang di Kalkulator HPP! Mulai dengan mengisi form di sebelah kiri.'
    });
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    this.showToast({
      type: 'success',
      message: message
    });
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    this.showToast({
      type: 'error',
      message: message
    });
  }

  /**
   * Show toast notification
   */
  showToast(detail) {
    const { type, message, duration = 5000 } = detail;
    
    const toastContainer = DOMHelper.$('#toast-container');
    if (!toastContainer) return;

    const toast = DOMHelper.create('div', {
      className: `toast toast--${type}`,
      role: 'alert',
      'aria-live': 'polite'
    });

    const iconMap = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    toast.innerHTML = `
      <i class="${iconMap[type]} toast__icon" aria-hidden="true"></i>
      <span class="toast__message">${message}</span>
      <button type="button" class="toast__close" aria-label="Close notification">
        <i class="fas fa-times" aria-hidden="true"></i>
      </button>
    `;

    // Add close functionality
    const closeBtn = DOMHelper.$('.toast__close', toast);
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    // Add to container
    toastContainer.appendChild(toast);

    // Show with animation
    setTimeout(() => {
      DOMHelper.addClass(toast, 'show');
    }, 10);

    // Auto remove
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
  }

  /**
   * Remove toast notification
   */
  removeToast(toast) {
    DOMHelper.removeClass(toast, 'show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Show modal
   */
  showModal(detail) {
    const { title, content, size = 'medium' } = detail;
    
    const modalOverlay = DOMHelper.$('#modal-overlay');
    if (!modalOverlay) return;

    const modal = DOMHelper.$('.modal', modalOverlay);
    const modalTitle = DOMHelper.$('#modal-title', modal);
    const modalContent = DOMHelper.$('#modal-content', modal);
    const modalClose = DOMHelper.$('.modal__close', modal);

    if (modalTitle) modalTitle.textContent = title;
    if (modalContent) modalContent.innerHTML = content;

    // Set size class
    modal.className = `modal modal--${size}`;

    // Show modal
    modalOverlay.setAttribute('aria-hidden', 'false');

    // Focus management
    modalClose.focus();

    // Close handlers
    const closeModal = () => {
      modalOverlay.setAttribute('aria-hidden', 'true');
    };

    modalClose.onclick = closeModal;
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    };

    // Escape key handler
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Show help modal
   */
  showHelpModal() {
    const content = `
      <div class="help-content">
        <h4>Panduan Penggunaan Kalkulator HPP</h4>
        
        <section class="help-section">
          <h5>Apa itu HPP?</h5>
          <p>Harga Pokok Penjualan (HPP) adalah total biaya yang dikeluarkan untuk memproduksi barang yang dijual.</p>
        </section>

        <section class="help-section">
          <h5>Komponen HPP:</h5>
          <ul>
            <li><strong>Bahan Baku Langsung:</strong> Biaya bahan yang langsung digunakan dalam produksi</li>
            <li><strong>Tenaga Kerja Langsung:</strong> Upah pekerja yang terlibat langsung dalam produksi</li>
            <li><strong>Biaya Overhead Pabrik:</strong> Biaya tidak langsung seperti listrik, sewa, depresiasi</li>
            <li><strong>Biaya Lainnya:</strong> Biaya tambahan yang terkait dengan produksi (opsional)</li>
          </ul>
        </section>

        <section class="help-section">
          <h5>Cara Menggunakan:</h5>
          <ol>
            <li>Isi semua field yang diperlukan</li>
            <li>Masukkan jumlah unit yang diproduksi</li>
            <li>Klik "Hitung HPP" atau tekan Enter</li>
            <li>Lihat hasil perhitungan di sebelah kanan</li>
          </ol>
        </section>

        <section class="help-section">
          <h5>Keyboard Shortcuts:</h5>
          <ul>
            <li><kbd>Enter</kbd> - Hitung HPP</li>
            <li><kbd>Escape</kbd> - Reset form</li>
            <li><kbd>F1</kbd> - Tampilkan bantuan</li>
            <li><kbd>Ctrl+Shift+T</kbd> - Toggle tema</li>
            <li><kbd>Ctrl+E</kbd> - Export hasil</li>
          </ul>
        </section>
      </div>
    `;

    this.showModal({
      title: 'Bantuan - Kalkulator HPP',
      content: content,
      size: 'large'
    });
  }

  /**
   * Show about modal
   */
  showAboutModal() {
    const content = `
      <div class="about-content">
        <h4>Tentang Kalkulator HPP</h4>
        <p>Aplikasi ini dirancang untuk membantu pelaku usaha menghitung Harga Pokok Penjualan (HPP) dengan mudah dan akurat.</p>
        
        <h5>Fitur:</h5>
        <ul>
          <li>Perhitungan HPP otomatis</li>
          <li>Breakdown detail komponen biaya</li>
          <li>Riwayat perhitungan</li>
          <li>Export hasil ke PDF/CSV</li>
          <li>Interface responsif untuk semua perangkat</li>
          <li>Mode gelap/terang</li>
        </ul>

        <h5>Teknologi:</h5>
        <p>Dibangun dengan HTML5, CSS3, dan JavaScript vanilla untuk performa optimal.</p>
        
        <p class="text-center">
          <strong>Versi 1.0.0</strong><br>
          © 2024 Kalkulator HPP
        </p>
      </div>
    `;

    this.showModal({
      title: 'Tentang Aplikasi',
      content: content
    });
  }

  /**
   * Show privacy modal
   */
  showPrivacyModal() {
    const content = `
      <div class="privacy-content">
        <h4>Kebijakan Privasi</h4>
        
        <h5>Penyimpanan Data</h5>
        <p>Semua data perhitungan disimpan secara lokal di browser Anda menggunakan Local Storage. Data tidak dikirim ke server manapun.</p>
        
        <h5>Keamanan</h5>
        <p>Data Anda aman dan hanya dapat diakses dari browser yang sama di perangkat Anda.</p>
        
        <h5>Penghapusan Data</h5>
        <p>Anda dapat menghapus data kapan saja melalui tombol "Hapus Semua" pada riwayat perhitungan.</p>
        
        <h5>Cookies</h5>
        <p>Aplikasi ini tidak menggunakan cookies untuk pelacakan. Hanya Local Storage yang digunakan untuk menyimpan preferensi pengguna.</p>
      </div>
    `;

    this.showModal({
      title: 'Kebijakan Privasi',
      content: content
    });
  }

  /**
   * Handle export functionality
   */
  handleExport(detail) {
    const { format, data } = detail;
    
    if (!data) {
      this.showErrorMessage('Tidak ada data untuk diekspor');
      return;
    }

    try {
      switch (format) {
        case 'pdf':
          this.exportToPDF(data);
          break;
        case 'csv':
          this.exportToCSV(data);
          break;
        case 'print':
          this.printResults();
          break;
        default:
          this.showErrorMessage('Format export tidak didukung');
      }
    } catch (error) {
      console.error('Export error:', error);
      this.showErrorMessage('Gagal mengekspor data');
    }
  }

  /**
   * Export to PDF (simplified implementation)
   */
  exportToPDF(data) {
    window.print();
    this.showSuccessMessage('Silakan gunakan print dialog untuk menyimpan sebagai PDF');
  }

  /**
   * Export to CSV
   */
  exportToCSV(data) {
    const csvData = [
      ['Komponen', 'Jumlah', 'Persentase'],
      ['Bahan Baku Langsung', data.directMaterials, data.breakdown.directMaterials.percentage + '%'],
      ['Tenaga Kerja Langsung', data.directLabor, data.breakdown.directLabor.percentage + '%'],
      ['Biaya Overhead', data.manufacturingOverhead, data.breakdown.manufacturingOverhead.percentage + '%'],
      ['Biaya Lainnya', data.otherCosts, data.breakdown.otherCosts.percentage + '%'],
      ['', '', ''],
      ['Total Biaya', data.totalCosts, '100%'],
      ['Jumlah Unit', data.totalUnits, ''],
      ['HPP per Unit', data.hppPerUnit, '']
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `hpp-calculation-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showSuccessMessage('Data berhasil diekspor ke CSV');
    }
  }

  /**
   * Print results
   */
  printResults() {
    window.print();
  }

  /**
   * Add event listener with cleanup tracking
   */
  addEventListenerWithCleanup(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.eventListeners.push({ element, event, handler, options });
  }

  /**
   * Destroy application and cleanup
   */
  destroy() {
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    
    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });

    // Cleanup state
    defaultStateManager.destroy();
    
    this.eventListeners = [];
    this.components = {};
    this.initialized = false;
  }
}

// Initialize application when DOM is ready
const app = new HPPCalculatorApp();

// Start the application
app.init().catch(error => {
  console.error('Failed to initialize HPP Calculator App:', error);
});

// Export for potential external use
window.HPPCalculatorApp = app;