/**
 * Audit Logger Utility
 * Frontend wrapper for logging user activities to Cloud Functions
 *
 * This utility provides convenience functions to log admin activities
 * which are then stored in Firestore's activity_logs collection via Cloud Functions.
 *
 * NOTE: Actual writes to Firestore are done server-side by Cloud Functions
 * to ensure audit log integrity and prevent tampering.
 */

import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/firebaseConfig';
import {
  ActivityAction,
  ResourceType,
  ActivityLevel,
  ActivityLogChanges,
  BudgetConfig,
} from '@/types';

// ================================
// Helper Functions
// ================================

/**
 * Get current authenticated user info
 * @returns User ID and email, or throws if not authenticated
 */
const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to log activities');
  }
  return {
    userId: user.uid,
    userEmail: user.email || 'unknown',
  };
};

/**
 * Calculate changes between two objects
 * @param before - Previous state
 * @param after - New state
 * @returns Changes object with fields_changed, before, and after
 */
export const calculateChanges = (
  before: Record<string, any>,
  after: Record<string, any>
): ActivityLogChanges => {
  const fieldsChanged: string[] = [];
  const beforeChanges: Record<string, any> = {};
  const afterChanges: Record<string, any> = {};

  // Find all keys from both objects
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Deep comparison for objects and arrays
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      fieldsChanged.push(key);
      beforeChanges[key] = beforeValue;
      afterChanges[key] = afterValue;
    }
  }

  return {
    fields_changed: fieldsChanged,
    before: beforeChanges,
    after: afterChanges,
  };
};

// ================================
// Core Logging Function
// ================================

/**
 * Base function to log an activity
 * This is typically not called directly - use the specialized functions below
 *
 * NOTE: This function is async but does not throw errors to avoid breaking
 * the main application flow if logging fails.
 */
export const logActivity = async (
  action: ActivityAction,
  resourceType: ResourceType,
  resourceId: string,
  description: string,
  options?: {
    level?: ActivityLevel;
    changes?: ActivityLogChanges;
    metadata?: Record<string, any>;
  }
): Promise<void> => {
  try {
    const { userId, userEmail } = getCurrentUser();

    // Prepare log data
    const logData = {
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      user_email: userEmail,
      level: options?.level || ActivityLevel.INFO,
      description,
      changes: options?.changes,
      metadata: {
        success: true,
        ...options?.metadata,
      },
      // Note: IP address and user_agent are typically added server-side
    };

    console.log('📝 [AuditLogger] Logging activity:', {
      action,
      resourceType,
      resourceId,
    });

    // Call Cloud Function to log activity
    const logFunction = httpsCallable(functions, 'logActivity');
    await logFunction(logData);

    console.log('✅ [AuditLogger] Activity logged successfully');
  } catch (error) {
    // Log errors but don't throw to avoid breaking main flow
    console.error('❌ [AuditLogger] Failed to log activity:', error);
  }
};

// ================================
// Budget Configuration Logging
// ================================

/**
 * Log budget configuration update
 * @param before - Previous budget config
 * @param after - New budget config
 */
export const logBudgetChange = async (
  before: BudgetConfig,
  after: BudgetConfig
): Promise<void> => {
  try {
    const changes = calculateChanges(before as any, after as any);

    if (changes.fields_changed.length === 0) {
      console.log('⏭️  [AuditLogger] No budget changes detected, skipping log');
      return;
    }

    const description = `Updated budget configuration: ${changes.fields_changed.join(', ')}`;

    await logActivity(
      ActivityAction.BUDGET_CONFIG_UPDATE,
      ResourceType.BUDGET_CONFIG,
      'budget_config',
      description,
      {
        level: ActivityLevel.INFO,
        changes,
        metadata: {
          success: true,
          fields_updated: changes.fields_changed,
        },
      }
    );

    console.log('✅ [AuditLogger] Budget change logged:', changes.fields_changed);
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log budget change:', error);
  }
};

/**
 * Log budget configuration reset to defaults
 */
export const logBudgetReset = async (): Promise<void> => {
  try {
    await logActivity(
      ActivityAction.BUDGET_CONFIG_RESET,
      ResourceType.BUDGET_CONFIG,
      'budget_config',
      'Reset budget configuration to default values',
      {
        level: ActivityLevel.WARNING,
        metadata: { success: true },
      }
    );

    console.log('✅ [AuditLogger] Budget reset logged');
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log budget reset:', error);
  }
};

// ================================
// Scan Record Logging
// ================================

/**
 * Log single scan record deletion
 * @param recordId - Scan record ID
 * @param recordInfo - Additional info about the record (username, barcode, etc.)
 */
export const logScanRecordDelete = async (
  recordId: string,
  recordInfo?: { username?: string; barcode?: string; merchant?: string }
): Promise<void> => {
  try {
    const description = recordInfo
      ? `Deleted scan record (User: ${recordInfo.username || 'unknown'}, Barcode: ${recordInfo.barcode || 'unknown'})`
      : `Deleted scan record ${recordId}`;

    await logActivity(
      ActivityAction.SCAN_RECORD_DELETE,
      ResourceType.SCAN_RECORD,
      recordId,
      description,
      {
        level: ActivityLevel.WARNING,
        metadata: {
          success: true,
          ...recordInfo,
        },
      }
    );

    console.log('✅ [AuditLogger] Scan record deletion logged:', recordId);
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log scan record deletion:', error);
  }
};

/**
 * Log batch scan record deletion
 * @param recordIds - Array of scan record IDs
 * @param recordCount - Number of records deleted
 */
export const logBatchScanRecordDelete = async (
  recordIds: string[],
  recordCount: number
): Promise<void> => {
  try {
    const description = `Batch deleted ${recordCount} scan records`;

    await logActivity(
      ActivityAction.SCAN_RECORD_BATCH_DELETE,
      ResourceType.SCAN_RECORD,
      'batch_delete',
      description,
      {
        level: ActivityLevel.WARNING,
        metadata: {
          success: true,
          record_ids: recordIds,
          count: recordCount,
        },
      }
    );

    console.log('✅ [AuditLogger] Batch deletion logged:', recordCount, 'records');
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log batch deletion:', error);
  }
};

/**
 * Log scan record retry (AI reprocessing)
 * @param recordId - Scan record ID
 * @param attemptNumber - Retry attempt number
 */
export const logScanRecordRetry = async (
  recordId: string,
  attemptNumber: number
): Promise<void> => {
  try {
    const description = `Retried AI processing for scan record (Attempt #${attemptNumber})`;

    await logActivity(
      ActivityAction.SCAN_RECORD_RETRY,
      ResourceType.SCAN_RECORD,
      recordId,
      description,
      {
        level: ActivityLevel.INFO,
        metadata: {
          success: true,
          attempt_number: attemptNumber,
        },
      }
    );

    console.log('✅ [AuditLogger] Scan record retry logged:', recordId);
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log scan record retry:', error);
  }
};

/**
 * Log batch scan record retry
 * @param recordIds - Array of scan record IDs
 * @param recordCount - Number of records retried
 */
export const logBatchScanRecordRetry = async (
  recordIds: string[],
  recordCount: number
): Promise<void> => {
  try {
    const description = `Batch retried AI processing for ${recordCount} scan records`;

    await logActivity(
      ActivityAction.SCAN_RECORD_BATCH_RETRY,
      ResourceType.SCAN_RECORD,
      'batch_retry',
      description,
      {
        level: ActivityLevel.INFO,
        metadata: {
          success: true,
          record_ids: recordIds,
          count: recordCount,
        },
      }
    );

    console.log('✅ [AuditLogger] Batch retry logged:', recordCount, 'records');
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log batch retry:', error);
  }
};

/**
 * Log CSV export
 * @param recordCount - Number of records exported
 * @param filters - Filters applied (if any)
 */
export const logScanRecordExport = async (
  recordCount: number,
  filters?: Record<string, any>
): Promise<void> => {
  try {
    const description = filters
      ? `Exported ${recordCount} scan records with filters`
      : `Exported ${recordCount} scan records (all)`;

    await logActivity(
      ActivityAction.SCAN_RECORD_EXPORT,
      ResourceType.SCAN_RECORD,
      'csv_export',
      description,
      {
        level: ActivityLevel.INFO,
        metadata: {
          success: true,
          count: recordCount,
          filters,
        },
      }
    );

    console.log('✅ [AuditLogger] CSV export logged:', recordCount, 'records');
  } catch (error) {
    console.error('❌ [AuditLogger] Failed to log CSV export:', error);
  }
};

// ================================
// Export All Functions
// ================================

export default {
  logActivity,
  calculateChanges,
  logBudgetChange,
  logBudgetReset,
  logScanRecordDelete,
  logBatchScanRecordDelete,
  logScanRecordRetry,
  logBatchScanRecordRetry,
  logScanRecordExport,
};
