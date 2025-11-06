/**
 * AI Retry Utilities - P0.3
 * Mock implementation for retrying AI processing
 */

import { ScanRecord, RetryAttempt, AICost } from '@/types';

/**
 * Simulate AI retry processing
 * In production, this would call the backend Cloud Function
 */
export const retryAIProcessing = async (record: ScanRecord): Promise<{
  success: boolean;
  record: ScanRecord;
  error?: string;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const currentRetryCount = (record.retryCount || 0) + 1;

  // Mock: 70% success rate for retries
  const willSucceed = Math.random() < 0.7;

  if (willSucceed) {
    // Generate mock AI result
    const mockProducts = [
      { title: 'Organic Milk 1L', price: '$3.99', category: 'Dairy', brand: 'Happy Farms' },
      { title: 'Whole Grain Bread', price: '$2.49', category: 'Bakery', brand: 'Baker\'s Choice' },
      { title: 'Fresh Orange Juice', price: '$4.99', category: 'Beverages', brand: 'Sunshine' },
      { title: 'Greek Yogurt 500g', price: '$5.49', category: 'Dairy', brand: 'Chobani' },
      { title: 'Brown Rice 2kg', price: '$6.99', category: 'Grains', brand: 'Golden Grain' },
    ];
    const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];

    // Generate mock cost
    const tokens = Math.floor(800 + Math.random() * 800);
    const retryCost: AICost = {
      totalCostUsd: tokens * 0.0000035,
      inputTokens: Math.floor(tokens * 0.9),
      outputTokens: Math.floor(tokens * 0.1),
      totalTokens: tokens,
      processingTimeMs: Math.floor(1500 + Math.random() * 2000),
      model: 'gpt-4o',
    };

    // Create retry attempt record
    const retryAttempt: RetryAttempt = {
      attemptNumber: currentRetryCount,
      timestamp: new Date(),
      success: true,
      cost: retryCost,
      initiatedBy: 'admin',
    };

    // Calculate total cost with retries
    const previousCost = record.totalCostWithRetries || record.aiCost?.totalCostUsd || 0;
    const totalCostWithRetries = previousCost + (retryCost.totalCostUsd ?? 0);

    // Update record
    const updatedRecord: ScanRecord = {
      ...record,
      aiProcessed: true,
      aiError: undefined,
      aiResult: {
        title: product.title,
        price: product.price,
        category: product.category,
        brand: product.brand,
        confidence: 0.75 + Math.random() * 0.2, // 75-95%
        processedAt: new Date(),
      },
      aiCost: retryCost,
      retryCount: currentRetryCount,
      lastRetryAt: new Date(),
      retryHistory: [...(record.retryHistory || []), retryAttempt],
      totalCostWithRetries,
    };

    return {
      success: true,
      record: updatedRecord,
    };
  } else {
    // Retry failed
    const failureMessages = [
      'Image quality still too low after preprocessing',
      'Barcode region detection failed',
      'OCR confidence below threshold',
      'Network timeout during API call',
      'Invalid image format after conversion',
    ];
    const error = failureMessages[Math.floor(Math.random() * failureMessages.length)];

    // Create failed retry attempt record
    const retryAttempt: RetryAttempt = {
      attemptNumber: currentRetryCount,
      timestamp: new Date(),
      success: false,
      error,
      initiatedBy: 'admin',
    };

    // Update record with failed attempt
    const updatedRecord: ScanRecord = {
      ...record,
      aiError: error,
      retryCount: currentRetryCount,
      lastRetryAt: new Date(),
      retryHistory: [...(record.retryHistory || []), retryAttempt],
    };

    return {
      success: false,
      record: updatedRecord,
      error,
    };
  }
};

/**
 * Batch retry multiple records
 */
export const batchRetryAIProcessing = async (records: ScanRecord[]): Promise<{
  successCount: number;
  failCount: number;
  results: Array<{ recordId: string; success: boolean; error?: string }>;
}> => {
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    const result = await retryAIProcessing(record);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    results.push({
      recordId: record.id,
      success: result.success,
      error: result.error,
    });
  }

  return {
    successCount,
    failCount,
    results,
  };
};

/**
 * Check if record can be retried
 */
export const canRetry = (record: ScanRecord): boolean => {
  // Can retry if:
  // 1. AI not processed successfully
  // 2. Has an error OR is pending
  // 3. Retry count less than max (e.g., 3)
  const MAX_RETRIES = 3;
  const currentRetries = record.retryCount || 0;

  return !record.aiProcessed && currentRetries < MAX_RETRIES;
};

/**
 * Get retry status message
 */
export const getRetryStatusMessage = (record: ScanRecord): string => {
  if (!record.retryCount || record.retryCount === 0) {
    return 'No retry attempts yet';
  }

  const lastAttempt = record.retryHistory?.[record.retryHistory.length - 1];
  if (lastAttempt) {
    if (lastAttempt.success) {
      return `Retry successful on attempt ${lastAttempt.attemptNumber}`;
    } else {
      return `Last retry failed (Attempt ${lastAttempt.attemptNumber}): ${lastAttempt.error}`;
    }
  }

  return `${record.retryCount} retry attempt(s)`;
};

/**
 * Calculate total retry cost for a record
 */
export const calculateRetryCost = (record: ScanRecord): number => {
  if (!record.retryHistory || record.retryHistory.length === 0) {
    return 0;
  }

  return record.retryHistory.reduce((total, attempt) => {
    return total + (attempt.cost?.totalCostUsd || 0);
  }, 0);
};

/**
 * Get retry statistics summary
 */
export const getRetryStatistics = (records: ScanRecord[]): {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  totalRetryCost: number;
  avgCostPerRetry: number;
  recordsWithRetries: number;
} => {
  let totalRetries = 0;
  let successfulRetries = 0;
  let failedRetries = 0;
  let totalRetryCost = 0;
  let recordsWithRetries = 0;

  records.forEach(record => {
    if (record.retryHistory && record.retryHistory.length > 0) {
      recordsWithRetries++;
      record.retryHistory.forEach(attempt => {
        totalRetries++;
        if (attempt.success) {
          successfulRetries++;
        } else {
          failedRetries++;
        }
        totalRetryCost += attempt.cost?.totalCostUsd || 0;
      });
    }
  });

  return {
    totalRetries,
    successfulRetries,
    failedRetries,
    totalRetryCost,
    avgCostPerRetry: totalRetries > 0 ? totalRetryCost / totalRetries : 0,
    recordsWithRetries,
  };
};
