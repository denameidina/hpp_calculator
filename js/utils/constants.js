/**
 * Application Constants
 * Central configuration and constants for the HPP Calculator
 */

// Application Configuration
export const APP_CONFIG = {
  name: 'Kalkulator HPP',
  version: '1.0.0',
  author: 'HPP Calculator Team',
  description: 'Aplikasi untuk menghitung Harga Pokok Penjualan'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  calculations: 'hpp_calculations',
  preferences: 'hpp_preferences',
  history: 'hpp_history',
  theme: 'hpp_theme',
  language: 'hpp_language'
};

// Default Values
export const DEFAULTS = {
  directMaterials: 0,
  directLabor: 0,
  manufacturingOverhead: 0,
  otherCosts: 0,
  totalUnits: 1,
  theme: 'light',
  language: 'id',
  currency: 'IDR',
  maxHistoryItems: 50
};

// Validation Rules
export const VALIDATION = {
  minValue: 0,
  maxValue: 999999999999, // 999 billion
  minUnits: 1,
  maxUnits: 999999999,
  decimalPlaces: 2,
  requiredFields: ['directMaterials', 'directLabor', 'manufacturingOverhead', 'totalUnits']
};

// Currency Configuration
export const CURRENCY = {
  symbol: 'Rp',
  code: 'IDR',
  locale: 'id-ID',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
};

// Form Field Configurations
export const FORM_FIELDS = {
  directMaterials: {
    name: 'directMaterials',
    label: 'Biaya Bahan Baku (Rp)',
    placeholder: '0',
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    icon: 'fas fa-boxes',
    helpText: 'Contoh: bahan utama, kemasan, label',
    tooltip: 'Biaya bahan yang langsung digunakan dalam produksi'
  },
  directLabor: {
    name: 'directLabor',
    label: 'Biaya Tenaga Kerja (Rp)',
    placeholder: '0',
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    icon: 'fas fa-users',
    helpText: 'Contoh: gaji operator, bonus produksi',
    tooltip: 'Upah pekerja yang terlibat langsung dalam produksi'
  },
  manufacturingOverhead: {
    name: 'manufacturingOverhead',
    label: 'Biaya Overhead (Rp)',
    placeholder: '0',
    type: 'number',
    required: true,
    min: 0,
    step: 0.01,
    icon: 'fas fa-industry',
    helpText: 'Contoh: listrik, air, sewa pabrik, depresiasi mesin',
    tooltip: 'Biaya produksi tidak langsung seperti listrik, sewa, depresiasi'
  },
  otherCosts: {
    name: 'otherCosts',
    label: 'Biaya Lainnya (Rp)',
    placeholder: '0',
    type: 'number',
    required: false,
    min: 0,
    step: 0.01,
    icon: 'fas fa-plus-circle',
    helpText: 'Contoh: quality control, transportasi, penyimpanan',
    tooltip: 'Biaya tambahan yang terkait dengan produksi'
  },
  totalUnits: {
    name: 'totalUnits',
    label: 'Jumlah Unit Diproduksi',
    placeholder: '0',
    type: 'number',
    required: true,
    min: 1,
    step: 1,
    icon: 'fas fa-calculator',
    helpText: 'Masukkan jumlah unit yang diproduksi',
    tooltip: 'Total unit produk yang dihasilkan'
  }
};

// Cost Categories for Display
export const COST_CATEGORIES = {
  directMaterials: {
    label: 'Bahan Baku Langsung',
    icon: 'fas fa-boxes',
    color: 'var(--color-primary)',
    description: 'Biaya bahan yang langsung digunakan dalam produksi'
  },
  directLabor: {
    label: 'Tenaga Kerja Langsung',
    icon: 'fas fa-users',
    color: 'var(--color-secondary)',
    description: 'Upah pekerja yang terlibat langsung dalam produksi'
  },
  manufacturingOverhead: {
    label: 'Biaya Overhead Pabrik',
    icon: 'fas fa-industry',
    color: 'var(--color-accent)',
    description: 'Biaya produksi tidak langsung'
  },
  otherCosts: {
    label: 'Biaya Lainnya',
    icon: 'fas fa-plus-circle',
    color: 'var(--color-info)',
    description: 'Biaya tambahan yang terkait dengan produksi'
  }
};

// Animation Durations
export const ANIMATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  veryFast: 100,
  verySlow: 800
};

// Toast Configuration
export const TOAST_CONFIG = {
  duration: 5000,
  maxToasts: 5,
  position: 'top-right',
  types: {
    success: {
      icon: 'fas fa-check-circle',
      className: 'toast--success'
    },
    error: {
      icon: 'fas fa-exclamation-circle',
      className: 'toast--error'
    },
    warning: {
      icon: 'fas fa-exclamation-triangle',
      className: 'toast--warning'
    },
    info: {
      icon: 'fas fa-info-circle',
      className: 'toast--info'
    }
  }
};

// Modal Configuration
export const MODAL_CONFIG = {
  closeOnEscape: true,
  closeOnBackdrop: true,
  focusTrap: true,
  restoreFocus: true
};

// Export Formats
export const EXPORT_FORMATS = {
  pdf: {
    label: 'PDF',
    icon: 'fas fa-file-pdf',
    mimeType: 'application/pdf',
    extension: '.pdf'
  },
  csv: {
    label: 'CSV',
    icon: 'fas fa-file-csv',
    mimeType: 'text/csv',
    extension: '.csv'
  },
  excel: {
    label: 'Excel',
    icon: 'fas fa-file-excel',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: '.xlsx'
  },
  print: {
    label: 'Print',
    icon: 'fas fa-print',
    mimeType: null,
    extension: null
  }
};

// Chart Configuration
export const CHART_CONFIG = {
  colors: [
    'var(--color-primary)',
    'var(--color-secondary)',
    'var(--color-accent)',
    'var(--color-info)',
    'var(--color-warning)',
    'var(--color-success)'
  ],
  defaultHeight: 300,
  animation: {
    duration: 1000,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  required: 'Field ini wajib diisi',
  invalidNumber: 'Masukkan angka yang valid',
  minValue: 'Nilai tidak boleh kurang dari {min}',
  maxValue: 'Nilai tidak boleh lebih dari {max}',
  minUnits: 'Jumlah unit minimal adalah 1',
  maxUnits: 'Jumlah unit maksimal adalah {max}',
  calculationError: 'Terjadi kesalahan dalam perhitungan',
  storageError: 'Gagal menyimpan data',
  loadError: 'Gagal memuat data',
  networkError: 'Terjadi masalah koneksi',
  genericError: 'Terjadi kesalahan yang tidak diketahui'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  calculationComplete: 'Perhitungan HPP berhasil diselesaikan',
  dataSaved: 'Data berhasil disimpan',
  dataExported: 'Data berhasil diekspor',
  settingsUpdated: 'Pengaturan berhasil diperbarui',
  historyCleared: 'Riwayat berhasil dihapus',
  formReset: 'Form berhasil direset'
};

// Info Messages
export const INFO_MESSAGES = {
  calculating: 'Sedang menghitung HPP...',
  saving: 'Menyimpan data...',
  loading: 'Memuat data...',
  exporting: 'Mengekspor data...',
  noHistory: 'Belum ada riwayat perhitungan',
  noResults: 'Silakan isi form untuk melihat hasil perhitungan'
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  calculate: 'Enter',
  reset: 'Escape',
  help: 'F1',
  theme: 'Ctrl+Shift+T',
  export: 'Ctrl+E',
  save: 'Ctrl+S'
};

// Debounce Delays
export const DEBOUNCE_DELAYS = {
  input: 300,
  search: 500,
  resize: 100,
  scroll: 50
};

// Breakpoints (for JavaScript)
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Feature Flags
export const FEATURES = {
  darkMode: true,
  export: true,
  history: true,
  charts: true,
  tooltips: true,
  animations: true,
  keyboard: true,
  print: true,
  offline: false,
  analytics: false
};

// API Configuration (if needed in future)
export const API_CONFIG = {
  baseURL: '',
  timeout: 10000,
  retries: 3,
  endpoints: {
    calculate: '/api/calculate',
    save: '/api/save',
    history: '/api/history'
  }
};

// Performance Monitoring
export const PERFORMANCE = {
  enableMetrics: false,
  logSlowOperations: true,
  slowOperationThreshold: 100, // milliseconds
  memoryWarningThreshold: 50 * 1024 * 1024, // 50MB
  maxHistoryItems: 50,
  maxCacheSize: 100
};