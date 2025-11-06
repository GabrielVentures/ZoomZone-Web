/**
 * Budget Management Utilities
 * Handles budget calculations, storage, and alert generation
 */

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/firebaseConfig';
import { BudgetConfig, BudgetUsage, BudgetPeriod, AlertLevel, ScanRecord } from '@/types';
import { logBudgetChange, logBudgetReset } from './auditLogger';

dayjs.extend(isoWeek);

const BUDGET_STORAGE_KEY = 'shelftagsnap_budget_config';
const FIRESTORE_BUDGET_PATH = 'settings/budget_config';

// ================================
// Default Budget Configuration
// ================================

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  dailyBudget: 50.0,     // $50 per day (global shared quota)
  alertThresholds: {
    warning: 80,
    critical: 90,
    exceeded: 100,
  },
  enabled: true,
  emailAlerts: false,
  alertEmails: [],
};

// ================================
// Firestore Storage Functions
// ================================

/**
 * Load budget config from Firestore
 * Falls back to localStorage cache if Firestore fails
 * Falls back to default config if both fail
 */
export const loadBudgetConfig = async (): Promise<BudgetConfig> => {
  try {
    console.log('🔍 [budgetUtils] Loading budget config from Firestore...');

    // Try to load from Firestore
    const docRef = doc(db, 'settings', 'budget_config');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ [budgetUtils] Budget config loaded from Firestore');

      // Map Firestore field names to BudgetConfig interface
      const config: BudgetConfig = {
        dailyBudget: data.daily_cost_limit_usd || DEFAULT_BUDGET_CONFIG.dailyBudget,
        alertThresholds: data.alert_thresholds || DEFAULT_BUDGET_CONFIG.alertThresholds,
        enabled: data.enabled !== undefined ? data.enabled : DEFAULT_BUDGET_CONFIG.enabled,
        emailAlerts: data.email_alerts || DEFAULT_BUDGET_CONFIG.emailAlerts,
        alertEmails: data.alert_emails || DEFAULT_BUDGET_CONFIG.alertEmails,
      };

      // Cache to localStorage for offline access
      try {
        localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(config));
      } catch (err) {
        console.warn('⚠️ [budgetUtils] Failed to cache to localStorage:', err);
      }

      return config;
    } else {
      console.warn('⚠️ [budgetUtils] Budget config not found in Firestore, using default');
    }
  } catch (error) {
    console.error('❌ [budgetUtils] Failed to load from Firestore:', error);

    // Try to load from localStorage cache
    try {
      const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
      if (stored) {
        console.log('📦 [budgetUtils] Using localStorage cache');
        return JSON.parse(stored);
      }
    } catch (cacheError) {
      console.error('❌ [budgetUtils] Failed to load from localStorage cache:', cacheError);
    }
  }

  console.log('🔄 [budgetUtils] Using default budget config');
  return DEFAULT_BUDGET_CONFIG;
};

/**
 * Save budget config to Firestore
 * Also caches to localStorage for offline access
 * Logs audit trail of changes
 *
 * @throws Error if save fails
 */
export const saveBudgetConfig = async (config: BudgetConfig): Promise<void> => {
  try {
    console.log('💾 [budgetUtils] Saving budget config to Firestore...');

    // Load previous config for audit logging
    const previousConfig = await loadBudgetConfig();

    const user = auth.currentUser;
    const userEmail = user?.email || 'unknown';

    // Map BudgetConfig to Firestore document structure
    const firestoreData = {
      daily_cost_limit_usd: config.dailyBudget,
      enabled: config.enabled,
      alert_thresholds: config.alertThresholds,
      email_alerts: config.emailAlerts,
      alert_emails: config.alertEmails,
      updated_at: Timestamp.now(),
      updated_by: userEmail,
    };

    const docRef = doc(db, 'settings', 'budget_config');
    await setDoc(docRef, firestoreData, { merge: true });

    console.log('✅ [budgetUtils] Budget config saved to Firestore');

    // Also cache to localStorage for offline access
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(config));
      console.log('✅ [budgetUtils] Budget config cached to localStorage');
    } catch (err) {
      console.warn('⚠️ [budgetUtils] Failed to cache to localStorage:', err);
    }

    // Log audit trail (async, non-blocking)
    logBudgetChange(previousConfig, config).catch((err) => {
      console.warn('⚠️ [budgetUtils] Failed to log budget change:', err);
    });
  } catch (error) {
    console.error('❌ [budgetUtils] Failed to save budget config:', error);
    throw error; // Re-throw to let caller handle the error
  }
};

/**
 * Reset budget config to defaults
 * Saves to Firestore and localStorage
 * Logs audit trail
 *
 * @throws Error if save fails
 */
export const resetBudgetConfig = async (): Promise<BudgetConfig> => {
  // saveBudgetConfig already handles logging the change,
  // but we also want to log the reset action specifically
  await saveBudgetConfig(DEFAULT_BUDGET_CONFIG);

  // Log the reset action (async, non-blocking)
  logBudgetReset().catch((err) => {
    console.warn('⚠️ [budgetUtils] Failed to log budget reset:', err);
  });

  return DEFAULT_BUDGET_CONFIG;
};

// ================================
// Period Calculation Functions
// ================================

/** Get period start and end dates */
export const getPeriodDates = (period: BudgetPeriod): { start: Date; end: Date } => {
  const now = dayjs();

  switch (period) {
    case BudgetPeriod.DAILY:
      return {
        start: now.startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      };

    case BudgetPeriod.WEEKLY:
      return {
        start: now.startOf('isoWeek').toDate(), // Monday
        end: now.endOf('isoWeek').toDate(),     // Sunday
      };

    case BudgetPeriod.MONTHLY:
      return {
        start: now.startOf('month').toDate(),
        end: now.endOf('month').toDate(),
      };

    default:
      return {
        start: now.startOf('day').toDate(),
        end: now.endOf('day').toDate(),
      };
  }
};

/** Filter records by period */
export const filterRecordsByPeriod = (
  records: ScanRecord[],
  period: BudgetPeriod
): ScanRecord[] => {
  const { start, end } = getPeriodDates(period);
  const startTime = dayjs(start).valueOf();
  const endTime = dayjs(end).valueOf();

  console.log(`🔍 [budgetUtils] Filtering ${records.length} records for ${period}`);
  console.log(`🔍 [budgetUtils] Period: ${dayjs(start).format('YYYY-MM-DD HH:mm')} to ${dayjs(end).format('YYYY-MM-DD HH:mm')}`);

  const filtered = records.filter((record) => {
    const recordTime = dayjs(record.timestamp).valueOf();
    const inRange = recordTime >= startTime && recordTime <= endTime;
    if (!inRange && record.username?.includes('[TEST-BUDGET]')) {
      console.log(`🔍 [budgetUtils] Test record FILTERED OUT:`, {
        timestamp: dayjs(record.timestamp).format('YYYY-MM-DD HH:mm'),
        username: record.username,
        aiCost: record.aiCost?.totalCostUsd,
      });
    }
    return inRange;
  });

  console.log(`🔍 [budgetUtils] Filtered to ${filtered.length} records for ${period}`);
  return filtered;
};

// ================================
// Cost Calculation Functions
// ================================

/** Calculate total cost from records */
export const calculateTotalCost = (records: ScanRecord[]): number => {
  return records.reduce((sum, record) => {
    return sum + (record.aiCost?.totalCostUsd || 0);
  }, 0);
};

/** Calculate average cost per record */
export const calculateAvgCost = (records: ScanRecord[]): number => {
  if (records.length === 0) return 0;
  return calculateTotalCost(records) / records.length;
};

// ================================
// Alert Level Determination
// ================================

/** Determine alert level based on usage percentage */
export const getAlertLevel = (
  usagePercent: number,
  thresholds: BudgetConfig['alertThresholds']
): AlertLevel => {
  if (usagePercent >= thresholds.exceeded) {
    return AlertLevel.EXCEEDED;
  } else if (usagePercent >= thresholds.critical) {
    return AlertLevel.CRITICAL;
  } else if (usagePercent >= thresholds.warning) {
    return AlertLevel.WARNING;
  } else {
    return AlertLevel.SAFE;
  }
};

/** Get color for alert level */
export const getAlertColor = (level: AlertLevel): string => {
  switch (level) {
    case AlertLevel.SAFE:
      return '#52c41a'; // Green
    case AlertLevel.WARNING:
      return '#faad14'; // Orange
    case AlertLevel.CRITICAL:
      return '#ff7a45'; // Deep Orange
    case AlertLevel.EXCEEDED:
      return '#ff4d4f'; // Red
    default:
      return '#d9d9d9'; // Gray
  }
};

/** Get status text for alert level */
export const getAlertText = (level: AlertLevel): string => {
  switch (level) {
    case AlertLevel.SAFE:
      return 'Within Budget';
    case AlertLevel.WARNING:
      return 'Budget Warning';
    case AlertLevel.CRITICAL:
      return 'Budget Critical';
    case AlertLevel.EXCEEDED:
      return 'Budget Exceeded';
    default:
      return 'Unknown';
  }
};

// ================================
// Budget Usage Calculation
// ================================

/** Calculate budget usage for a specific period */
export const calculateBudgetUsage = (
  records: ScanRecord[],
  config: BudgetConfig,
  period: BudgetPeriod
): BudgetUsage => {
  const { start, end } = getPeriodDates(period);
  const periodRecords = filterRecordsByPeriod(records, period);

  const currentUsage = calculateTotalCost(periodRecords);
  const avgCostPerRecord = calculateAvgCost(periodRecords);

  // Always use daily budget (simplified quota system)
  const budgetLimit = config.dailyBudget;

  const usagePercent = budgetLimit > 0 ? (currentUsage / budgetLimit) * 100 : 0;
  const alertLevel = getAlertLevel(usagePercent, config.alertThresholds);
  const remainingBudget = Math.max(0, budgetLimit - currentUsage);

  // Calculate projected usage (linear extrapolation)
  const periodDuration = dayjs(end).diff(dayjs(start), 'hour');
  const elapsedHours = dayjs().diff(dayjs(start), 'hour');
  const projectedUsage =
    elapsedHours > 0 ? (currentUsage / elapsedHours) * periodDuration : currentUsage;

  return {
    period,
    budgetLimit,
    currentUsage,
    usagePercent,
    alertLevel,
    recordCount: periodRecords.length,
    avgCostPerRecord,
    periodStart: start,
    periodEnd: end,
    remainingBudget,
    projectedUsage,
  };
};

// ================================
// Alert Message Generation
// ================================

/** Generate alert message based on usage */
export const generateAlertMessage = (usage: BudgetUsage): string => {
  const periodName = usage.period.charAt(0).toUpperCase() + usage.period.slice(1);

  switch (usage.alertLevel) {
    case AlertLevel.WARNING:
      return `${periodName} budget at ${usage.usagePercent.toFixed(1)}% ($${usage.currentUsage.toFixed(4)} / $${usage.budgetLimit.toFixed(2)})`;

    case AlertLevel.CRITICAL:
      return `${periodName} budget critical: ${usage.usagePercent.toFixed(1)}% used ($${usage.currentUsage.toFixed(4)} / $${usage.budgetLimit.toFixed(2)})`;

    case AlertLevel.EXCEEDED:
      return `${periodName} budget exceeded! $${usage.currentUsage.toFixed(4)} spent (limit: $${usage.budgetLimit.toFixed(2)})`;

    default:
      return `${periodName} budget: ${usage.usagePercent.toFixed(1)}% used`;
  }
};

/** Check if any budget alerts should be shown */
export const shouldShowBudgetAlert = (
  records: ScanRecord[],
  config: BudgetConfig
): boolean => {
  if (!config.enabled) return false;

  // Only check daily budget (simplified quota system)
  const usage = calculateBudgetUsage(records, config, BudgetPeriod.DAILY);
  return usage.alertLevel !== AlertLevel.SAFE;
};

/** Get the highest severity alert */
export const getHighestAlert = (
  records: ScanRecord[],
  config: BudgetConfig
): BudgetUsage | null => {
  if (!config.enabled) return null;

  // Only check daily budget (simplified quota system)
  const usage = calculateBudgetUsage(records, config, BudgetPeriod.DAILY);
  return usage.alertLevel !== AlertLevel.SAFE ? usage : null;
};
