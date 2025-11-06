/**
 * Application Constants
 * Centralized configuration values
 */

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 1000,
  DASHBOARD_PAGE_SIZE: 1000, // Fetch all for stats
} as const;

// Cache Configuration
export const CACHE = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  LIST_TTL: 3 * 60 * 1000, // 3 minutes for list queries
  MAX_SIZE: 100,
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
} as const;

// Date & Time
export const DATE_FORMAT = {
  DISPLAY: 'YYYY-MM-DD',
  DISPLAY_WITH_TIME: 'YYYY-MM-DD HH:mm:ss',
  DISPLAY_SHORT: 'MMM D, YYYY',
  FILENAME: 'YYYY-MM-DD-HHmmss',
} as const;

// Date Range Presets
export const DATE_RANGE_PRESETS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last7days',
  LAST_30_DAYS: 'last30days',
  THIS_MONTH: 'thisMonth',
  LAST_MONTH: 'lastMonth',
  LAST_3_MONTHS: 'last3months',
  THIS_YEAR: 'thisYear',
} as const;

// Retry Configuration
export const RETRY = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 5000, // 5 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// Budget Configuration
export const BUDGET = {
  DEFAULT_DAILY: 1.0,
  DEFAULT_WEEKLY: 5.0,
  DEFAULT_MONTHLY: 20.0,
  WARNING_THRESHOLD: 80, // 80%
  CRITICAL_THRESHOLD: 90, // 90%
} as const;

// AI Processing
export const AI = {
  MOCK_SUCCESS_RATE: 0.7, // 70% success for testing
  PROCESSING_TIMEOUT: 30000, // 30 seconds
} as const;

// Colors (Ant Design compatible)
export const COLORS = {
  PRIMARY: '#1890ff',
  SUCCESS: '#52c41a',
  WARNING: '#faad14',
  ERROR: '#ff4d4f',
  CRITICAL: '#ff7a45',
  INFO: '#722ed1',
  PURPLE: '#722ed1',
  MAGENTA: '#eb2f96',
} as const;

// Status Colors
export const STATUS_COLORS = {
  COMPLETED: '#52c41a',
  PENDING: '#faad14',
  FAILED: '#ff4d4f',
  PROCESSING: '#1890ff',
} as const;

// Alert Levels
export const ALERT_COLORS = {
  SAFE: '#52c41a',
  WARNING: '#faad14',
  CRITICAL: '#ff7a45',
  EXCEEDED: '#ff4d4f',
} as const;

// Network
export const NETWORK = {
  RECONNECT_MESSAGE_DURATION: 3000, // 3 seconds
  REQUEST_TIMEOUT: 30000, // 30 seconds
} as const;

// Search
export const SEARCH = {
  DEBOUNCE_DELAY: 500, // 500ms
  MIN_LENGTH: 1,
} as const;

// File Upload
export const UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_IMAGES: ['image/jpeg', 'image/png', 'image/jpg'],
} as const;

// Firestore Collections
export const COLLECTIONS = {
  SCAN_RECORDS: 'scan_records',
  USERS: 'users',
  USER_COSTS: 'user_cost_stats',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  BUDGET_CONFIG: 'shelftagsnap_budget_config',
  AUTH_TOKEN: 'shelftagsnap_auth_token',
  USER_PREFERENCES: 'shelftagsnap_user_prefs',
} as const;

// App Metadata
export const APP = {
  NAME: 'ShelfTagSnap Admin',
  VERSION: '1.0.0',
  PROJECT_ID: 'shelftag-snap-web',
  ICON: '🏷️',
} as const;

// Resource Labels
export const RESOURCE_LABELS = {
  DASHBOARD: 'Dashboard',
  SCAN_RECORDS: 'Scan Records',
  USER_COSTS: 'User Costs',
  BUDGET: 'Budget Management',
} as const;

// Resource Icons
export const RESOURCE_ICONS = {
  DASHBOARD: '📊',
  SCAN_RECORDS: '📸',
  USER_COSTS: '💰',
  BUDGET: '💳',
} as const;

// Chart Configuration
export const CHARTS = {
  DEFAULT_HEIGHT: 300,
  ACTIVITY_DAYS: 7,
  TREND_DAYS: 30,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection lost. Your changes will sync when connection is restored.',
  PERMISSION_DENIED: 'Permission denied. Please check your access rights.',
  NOT_FOUND: 'Resource not found.',
  OFFLINE: 'You are offline. Changes will be saved and synced when connection is restored.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully',
  DELETED: 'Deleted successfully',
  UPDATED: 'Updated successfully',
  EXPORTED: 'Exported successfully',
} as const;
