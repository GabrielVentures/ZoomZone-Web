/**
 * ShelfTagSnap Web Admin - Type Definitions
 * Milestone 2: Cloud Backup & AI Recognition
 */

// ================================
// AI Processing Status
// ================================

export enum AIProcessingStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ConfidenceLevel {
  HIGH = 'high',      // >= 80%
  MEDIUM = 'medium',  // 50-79%
  LOW = 'low',        // < 50%
}

// ================================
// AI Result Model
// ================================

export interface AIResult {
  /** Product title */
  title?: string;
  /** Product price */
  price?: string;
  /** Unit price (e.g., "$0.044/oz") */
  unitPrice?: string;
  /** Product category */
  category?: string;
  /** Product brand */
  brand?: string;
  /** Product size/weight */
  size?: string;
  /** Promotion text (e.g., "Buy 2 Get 1 Free") */
  promotion?: string;
  /** Product description */
  description?: string;
  /** Recognition confidence (0.0 - 1.0) */
  confidence?: number;
  /** Processing timestamp */
  processedAt?: Date;
  /** Additional metadata */
  metadata?: Record<string, string>;
}

// ================================
// AI Cost Tracking
// ================================

export interface AICost {
  /** Total cost in USD */
  totalCostUsd?: number;
  /** Input tokens used */
  inputTokens?: number;
  /** Output tokens used */
  outputTokens?: number;
  /** Total tokens used */
  totalTokens?: number;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Model used (e.g., "gpt-4o") */
  model?: string;
}

// ================================
// AI Retry Tracking
// ================================

/** Single retry attempt record */
export interface RetryAttempt {
  /** Retry attempt number (1, 2, 3...) */
  attemptNumber: number;
  /** Timestamp of retry */
  timestamp: Date;
  /** Whether retry succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Cost of this retry attempt */
  cost?: AICost;
  /** Admin user who initiated retry */
  initiatedBy?: string;
}

// ================================
// Scan Record Model
// ================================

export interface ScanRecord {
  /** Document ID (Firestore) */
  id: string;

  /** Username who created the scan */
  username: string;

  /** Firebase user ID */
  userId: string;

  /** Timestamp when scan was created (device time) */
  timestamp: Date;

  /** Timestamp when record was uploaded to cloud */
  uploadTimestamp?: Date;

  /** Merchant name (e.g., "Walmart", "Target") */
  merchant: string;

  /** Barcode value */
  barcode: string;

  /** GPS latitude */
  latitude?: number;

  /** GPS longitude */
  longitude?: number;

  /** Store location description */
  storeLocation?: string;

  /** Image filename (original) */
  imageFilename: string;

  /** Image URL in Firebase Storage */
  imageUrl: string;

  /** Whether AI processing completed */
  aiProcessed: boolean;

  /** AI processing error message (if any) */
  aiError?: string;

  /** AI recognition result */
  aiResult?: AIResult;

  /** AI cost tracking */
  aiCost?: AICost;

  // -------- Retry Tracking Fields --------

  /** Number of retry attempts */
  retryCount?: number;

  /** Timestamp of last retry attempt */
  lastRetryAt?: Date;

  /** History of all retry attempts */
  retryHistory?: RetryAttempt[];

  /** Total cumulative cost including retries */
  totalCostWithRetries?: number;
}

// ================================
// User Model
// ================================

export interface User {
  /** User ID */
  id: string;
  /** Email address */
  email: string;
  /** Username */
  username: string;
  /** Email verified status */
  emailVerified: boolean;
  /** Account creation date */
  createdAt: Date;
  /** Last login date */
  lastLoginAt?: Date;
}

// ================================
// Statistics Models
// ================================

export interface DashboardStats {
  /** Total number of scan records */
  totalRecords: number;
  /** Number of records with AI completed */
  aiCompleted: number;
  /** Number of records with AI pending */
  aiPending: number;
  /** Number of records with AI failed */
  aiFailed: number;
  /** Total users */
  totalUsers: number;
  /** Total AI cost in USD */
  totalAICostUsd: number;
  /** Average cost per record in USD */
  avgCostPerRecord: number;
  /** Total tokens used */
  totalTokens: number;
}

export interface UserCostStats {
  /** User ID */
  userId: string;
  /** Username */
  username: string;
  /** Total records uploaded */
  recordCount: number;
  /** Total AI cost in USD */
  totalCostUsd: number;
  /** Average cost per record */
  avgCostPerRecord: number;
  /** Total tokens used */
  totalTokens: number;
  /** Last upload date */
  lastUploadDate?: Date;
}

// ================================
// Filter & Pagination Models
// ================================

export interface RecordFilters {
  /** Filter by AI status */
  aiStatus?: AIProcessingStatus;
  /** Filter by merchant */
  merchant?: string;
  /** Filter by username */
  username?: string;
  /** Filter by date range start */
  dateFrom?: Date;
  /** Filter by date range end */
  dateTo?: Date;
  /** Search keyword (barcode, title, etc.) */
  searchKeyword?: string;
}

export interface PaginationParams {
  /** Current page (1-indexed) */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total count */
  total?: number;
}

// ================================
// Helper Types
// ================================

export type ScanRecordWithComputed = ScanRecord & {
  /** AI status computed from aiProcessed and aiError */
  aiStatus: AIProcessingStatus;
  /** Confidence level computed from confidence value */
  confidenceLevel?: ConfidenceLevel;
  /** Whether has valid GPS location */
  hasLocation: boolean;
};

// ================================
// Budget Management
// ================================

/** Budget period type */
export enum BudgetPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/** Alert level for budget warnings */
export enum AlertLevel {
  SAFE = 'safe',        // < 80%
  WARNING = 'warning',  // 80-89%
  CRITICAL = 'critical',// 90-99%
  EXCEEDED = 'exceeded',// >= 100%
}

/** Budget configuration - Simplified global daily quota */
export interface BudgetConfig {
  /** Global daily budget limit in USD (shared by all users) */
  dailyBudget: number;
  /** Alert thresholds (percentage) */
  alertThresholds: {
    warning: number;   // Default: 80
    critical: number;  // Default: 90
    exceeded: number;  // Default: 100
  };
  /** Whether budget monitoring is enabled */
  enabled: boolean;
  /** Email notifications enabled */
  emailAlerts: boolean;
  /** Alert email addresses */
  alertEmails: string[];
}

/** Budget usage statistics */
export interface BudgetUsage {
  /** Period type */
  period: BudgetPeriod;
  /** Budget limit for this period */
  budgetLimit: number;
  /** Current usage in USD */
  currentUsage: number;
  /** Usage percentage */
  usagePercent: number;
  /** Alert level */
  alertLevel: AlertLevel;
  /** Number of records processed */
  recordCount: number;
  /** Average cost per record */
  avgCostPerRecord: number;
  /** Period start date */
  periodStart: Date;
  /** Period end date */
  periodEnd: Date;
  /** Remaining budget */
  remainingBudget: number;
  /** Projected end-of-period usage (based on trend) */
  projectedUsage?: number;
}

/** Budget alert */
export interface BudgetAlert {
  /** Alert ID */
  id: string;
  /** Alert level */
  level: AlertLevel;
  /** Budget period */
  period: BudgetPeriod;
  /** Alert message */
  message: string;
  /** Usage percentage when alert was triggered */
  usagePercent: number;
  /** Current cost when alert was triggered */
  currentCost: number;
  /** Budget limit */
  budgetLimit: number;
  /** Timestamp */
  timestamp: Date;
  /** Whether alert has been acknowledged */
  acknowledged: boolean;
}

// ================================
// Audit Logging System
// ================================

/** Activity action types */
export enum ActivityAction {
  // Budget actions
  BUDGET_CONFIG_UPDATE = 'BUDGET_CONFIG_UPDATE',
  BUDGET_CONFIG_RESET = 'BUDGET_CONFIG_RESET',

  // Scan record actions
  SCAN_RECORD_DELETE = 'SCAN_RECORD_DELETE',
  SCAN_RECORD_BATCH_DELETE = 'SCAN_RECORD_BATCH_DELETE',
  SCAN_RECORD_RETRY = 'SCAN_RECORD_RETRY',
  SCAN_RECORD_BATCH_RETRY = 'SCAN_RECORD_BATCH_RETRY',
  SCAN_RECORD_EXPORT = 'SCAN_RECORD_EXPORT',

  // User management actions
  USER_QUOTA_UPDATE = 'USER_QUOTA_UPDATE',
  USER_ROLE_CHANGE = 'USER_ROLE_CHANGE',
  USER_CREATE = 'USER_CREATE',
  USER_DELETE = 'USER_DELETE',

  // Global AI config actions
  GLOBAL_AI_CONFIG_UPDATE = 'GLOBAL_AI_CONFIG_UPDATE',
  CIRCUIT_BREAKER_TOGGLE = 'CIRCUIT_BREAKER_TOGGLE',

  // System actions
  DAILY_QUOTA_RESET = 'DAILY_QUOTA_RESET',
  COST_ALERT_TRIGGERED = 'COST_ALERT_TRIGGERED',
}

/** Resource types for audit logging */
export enum ResourceType {
  BUDGET_CONFIG = 'budget_config',
  SCAN_RECORD = 'scan_record',
  USER = 'user',
  USER_QUOTA = 'user_quota',
  GLOBAL_AI_CONFIG = 'global_ai_config',
  SYSTEM = 'system',
}

/** Activity severity levels */
export enum ActivityLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/** Audit log changes details */
export interface ActivityLogChanges {
  /** Fields that were changed */
  fields_changed: string[];
  /** Previous values */
  before?: Record<string, any>;
  /** New values */
  after?: Record<string, any>;
}

/** Audit log metadata */
export interface ActivityLogMetadata {
  /** Whether operation succeeded */
  success: boolean;
  /** Error message if failed */
  error_message?: string;
  /** Additional context */
  [key: string]: any;
}

/** Complete audit log entry */
export interface ActivityLog {
  /** Log entry ID */
  id: string;
  /** Timestamp of activity */
  timestamp: Date;
  /** Action performed */
  action: ActivityAction | string;
  /** Resource type affected */
  resource_type: ResourceType | string;
  /** Resource ID (e.g., budget_config, scan record ID, user ID) */
  resource_id: string;
  /** User who performed the action */
  user_id: string;
  /** User email */
  user_email: string;
  /** User role at time of action */
  user_role: string;
  /** Activity severity level */
  level: ActivityLevel;
  /** Human-readable description */
  description: string;
  /** Detailed changes */
  changes?: ActivityLogChanges;
  /** IP address (if available) */
  ip_address?: string;
  /** User agent (if available) */
  user_agent?: string;
  /** Additional metadata */
  metadata: ActivityLogMetadata;
}

/** Audit log filters */
export interface AuditLogFilters {
  /** Filter by user ID */
  user_id?: string;
  /** Filter by resource type */
  resource_type?: ResourceType;
  /** Filter by action */
  action?: ActivityAction;
  /** Filter by severity level */
  level?: ActivityLevel;
  /** Start date for date range filter */
  start_date?: string;
  /** End date for date range filter */
  end_date?: string;
}

/** Audit log sort options */
export interface AuditLogSort {
  /** Field to sort by */
  field: 'timestamp' | 'level' | 'action';
  /** Sort order */
  order: 'asc' | 'desc';
}

/** Request to fetch audit logs */
export interface GetAuditLogsRequest {
  /** Page number (1-indexed) */
  page?: number;
  /** Page size (max 100) */
  pageSize?: number;
  /** Filters */
  filters?: AuditLogFilters;
  /** Sort options */
  sort?: AuditLogSort;
}

/** Response from fetching audit logs */
export interface GetAuditLogsResponse {
  /** Whether request succeeded */
  success: boolean;
  /** Response data */
  data?: {
    /** Array of audit logs */
    logs: ActivityLog[];
    /** Total count of logs */
    total: number;
    /** Current page */
    page: number;
    /** Page size */
    pageSize: number;
    /** Whether more logs exist */
    hasMore: boolean;
  };
  /** Error message if failed */
  error?: string;
}
