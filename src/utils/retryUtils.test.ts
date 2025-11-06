/**
 * Retry Utils Tests
 * Tests for AI retry functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  retryAIProcessing,
  batchRetryAIProcessing,
  canRetry,
  getRetryStatusMessage,
  calculateRetryCost,
  getRetryStatistics,
} from './retryUtils';
import { ScanRecord, RetryAttempt } from '@/types';

describe('retryUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Math.random mock
    vi.spyOn(Math, 'random').mockRestore();
  });

  describe('canRetry', () => {
    it('should allow retry when AI not processed and retry count < 3', () => {
      const record: ScanRecord = {
        id: '1',
        aiProcessed: false,
        retryCount: 0,
      } as ScanRecord;

      expect(canRetry(record)).toBe(true);
    });

    it('should allow retry when AI failed and retry count is 2', () => {
      const record: ScanRecord = {
        id: '1',
        aiProcessed: false,
        aiError: 'Some error',
        retryCount: 2,
      } as ScanRecord;

      expect(canRetry(record)).toBe(true);
    });

    it('should not allow retry when AI already processed successfully', () => {
      const record: ScanRecord = {
        id: '1',
        aiProcessed: true,
        retryCount: 1,
        aiResult: { title: 'Product', price: '$1.00' },
      } as ScanRecord;

      expect(canRetry(record)).toBe(false);
    });

    it('should not allow retry when retry count reaches maximum (3)', () => {
      const record: ScanRecord = {
        id: '1',
        aiProcessed: false,
        aiError: 'Some error',
        retryCount: 3,
      } as ScanRecord;

      expect(canRetry(record)).toBe(false);
    });

    it('should handle undefined retry count as 0', () => {
      const record: ScanRecord = {
        id: '1',
        aiProcessed: false,
        retryCount: undefined,
      } as ScanRecord;

      expect(canRetry(record)).toBe(true);
    });
  });

  describe('getRetryStatusMessage', () => {
    it('should return no attempts message when retryCount is 0', () => {
      const record: ScanRecord = {
        id: '1',
        retryCount: 0,
      } as ScanRecord;

      const message = getRetryStatusMessage(record);
      expect(message).toBe('No retry attempts yet');
    });

    it('should return no attempts message when retryCount is undefined', () => {
      const record: ScanRecord = {
        id: '1',
        retryCount: undefined,
      } as ScanRecord;

      const message = getRetryStatusMessage(record);
      expect(message).toBe('No retry attempts yet');
    });

    it('should return success message for last successful attempt', () => {
      const lastAttempt: RetryAttempt = {
        attemptNumber: 2,
        timestamp: new Date(),
        success: true,
        initiatedBy: 'admin',
      };

      const record: ScanRecord = {
        id: '1',
        retryCount: 2,
        retryHistory: [lastAttempt],
      } as ScanRecord;

      const message = getRetryStatusMessage(record);
      expect(message).toBe('Retry successful on attempt 2');
    });

    it('should return failure message for last failed attempt', () => {
      const lastAttempt: RetryAttempt = {
        attemptNumber: 1,
        timestamp: new Date(),
        success: false,
        error: 'Network timeout',
        initiatedBy: 'admin',
      };

      const record: ScanRecord = {
        id: '1',
        retryCount: 1,
        retryHistory: [lastAttempt],
      } as ScanRecord;

      const message = getRetryStatusMessage(record);
      expect(message).toBe('Last retry failed (Attempt 1): Network timeout');
    });

    it('should return retry count when no history available', () => {
      const record: ScanRecord = {
        id: '1',
        retryCount: 2,
        retryHistory: [],
      } as ScanRecord;

      const message = getRetryStatusMessage(record);
      expect(message).toBe('2 retry attempt(s)');
    });
  });

  describe('calculateRetryCost', () => {
    it('should return 0 when no retry history', () => {
      const record: ScanRecord = {
        id: '1',
        retryHistory: undefined,
      } as ScanRecord;

      const cost = calculateRetryCost(record);
      expect(cost).toBe(0);
    });

    it('should return 0 when retry history is empty', () => {
      const record: ScanRecord = {
        id: '1',
        retryHistory: [],
      } as ScanRecord;

      const cost = calculateRetryCost(record);
      expect(cost).toBe(0);
    });

    it('should calculate total cost from retry history', () => {
      const record: ScanRecord = {
        id: '1',
        retryHistory: [
          {
            attemptNumber: 1,
            timestamp: new Date(),
            success: true,
            cost: { totalCostUsd: 0.05 },
            initiatedBy: 'admin',
          },
          {
            attemptNumber: 2,
            timestamp: new Date(),
            success: false,
            cost: { totalCostUsd: 0.03 },
            initiatedBy: 'admin',
          },
          {
            attemptNumber: 3,
            timestamp: new Date(),
            success: true,
            cost: { totalCostUsd: 0.04 },
            initiatedBy: 'admin',
          },
        ],
      } as ScanRecord;

      const cost = calculateRetryCost(record);
      expect(cost).toBe(0.12);
    });

    it('should handle attempts without cost', () => {
      const record: ScanRecord = {
        id: '1',
        retryHistory: [
          {
            attemptNumber: 1,
            timestamp: new Date(),
            success: false,
            error: 'Error',
            initiatedBy: 'admin',
          },
          {
            attemptNumber: 2,
            timestamp: new Date(),
            success: true,
            cost: { totalCostUsd: 0.05 },
            initiatedBy: 'admin',
          },
        ],
      } as ScanRecord;

      const cost = calculateRetryCost(record);
      expect(cost).toBe(0.05);
    });
  });

  describe('getRetryStatistics', () => {
    it('should return zero stats for empty records array', () => {
      const stats = getRetryStatistics([]);

      expect(stats).toEqual({
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        totalRetryCost: 0,
        avgCostPerRetry: 0,
        recordsWithRetries: 0,
      });
    });

    it('should return zero stats for records without retries', () => {
      const records: ScanRecord[] = [
        { id: '1', aiProcessed: true } as ScanRecord,
        { id: '2', aiProcessed: false } as ScanRecord,
      ];

      const stats = getRetryStatistics(records);

      expect(stats).toEqual({
        totalRetries: 0,
        successfulRetries: 0,
        failedRetries: 0,
        totalRetryCost: 0,
        avgCostPerRetry: 0,
        recordsWithRetries: 0,
      });
    });

    it('should calculate correct statistics for records with retry history', () => {
      const records: ScanRecord[] = [
        {
          id: '1',
          retryHistory: [
            {
              attemptNumber: 1,
              timestamp: new Date(),
              success: true,
              cost: { totalCostUsd: 0.05 },
              initiatedBy: 'admin',
            },
            {
              attemptNumber: 2,
              timestamp: new Date(),
              success: false,
              cost: { totalCostUsd: 0.03 },
              initiatedBy: 'admin',
            },
          ],
        } as ScanRecord,
        {
          id: '2',
          retryHistory: [
            {
              attemptNumber: 1,
              timestamp: new Date(),
              success: true,
              cost: { totalCostUsd: 0.04 },
              initiatedBy: 'admin',
            },
          ],
        } as ScanRecord,
      ];

      const stats = getRetryStatistics(records);

      expect(stats.totalRetries).toBe(3);
      expect(stats.successfulRetries).toBe(2);
      expect(stats.failedRetries).toBe(1);
      expect(stats.totalRetryCost).toBe(0.12);
      expect(stats.avgCostPerRetry).toBe(0.04);
      expect(stats.recordsWithRetries).toBe(2);
    });

    it('should handle mix of records with and without retries', () => {
      const records: ScanRecord[] = [
        {
          id: '1',
          retryHistory: [
            {
              attemptNumber: 1,
              timestamp: new Date(),
              success: true,
              cost: { totalCostUsd: 0.05 },
              initiatedBy: 'admin',
            },
          ],
        } as ScanRecord,
        {
          id: '2',
          retryHistory: undefined,
        } as ScanRecord,
        {
          id: '3',
          retryHistory: [],
        } as ScanRecord,
      ];

      const stats = getRetryStatistics(records);

      expect(stats.totalRetries).toBe(1);
      expect(stats.successfulRetries).toBe(1);
      expect(stats.failedRetries).toBe(0);
      expect(stats.recordsWithRetries).toBe(1);
    });
  });

  describe('retryAIProcessing', () => {
    it('should increment retry count', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Ensure success
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

      const record: ScanRecord = {
        id: '1',
        retryCount: 1,
        aiProcessed: false,
      } as ScanRecord;

      const result = await retryAIProcessing(record);

      expect(result.record.retryCount).toBe(2);
      expect(result.record.retryHistory).toHaveLength(1);
      expect(result.record.retryHistory![0].attemptNumber).toBe(2);
    });

    it('should handle record with no previous retry count', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Ensure success
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

      const record: ScanRecord = {
        id: '1',
        aiProcessed: false,
        retryCount: undefined,
      } as ScanRecord;

      const result = await retryAIProcessing(record);

      expect(result.record.retryCount).toBe(1);
      expect(result.record.retryHistory).toHaveLength(1);
      expect(result.record.retryHistory![0].attemptNumber).toBe(1);
    });

    it('should mark as successful when retry succeeds', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // < 0.7, will succeed
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

      const record: ScanRecord = {
        id: '1',
        retryCount: 0,
        aiProcessed: false,
        aiError: 'Previous error',
      } as ScanRecord;

      const result = await retryAIProcessing(record);

      expect(result.success).toBe(true);
      expect(result.record.aiProcessed).toBe(true);
      expect(result.record.aiError).toBeUndefined();
      expect(result.record.aiResult).toBeDefined();
      expect(result.record.aiResult?.title).toBeDefined();
      expect(result.record.aiResult?.price).toBeDefined();
    });

    it('should mark as failed when retry fails', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.8); // >= 0.7, will fail
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

      const record: ScanRecord = {
        id: '1',
        retryCount: 0,
        aiProcessed: false,
      } as ScanRecord;

      const result = await retryAIProcessing(record);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.record.aiError).toBe(result.error);
      expect(result.record.aiProcessed).toBe(false);
    });
  });

  describe('batchRetryAIProcessing', () => {
    it('should process multiple records', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // All succeed
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

      const records: ScanRecord[] = [
        { id: '1', retryCount: 0, aiProcessed: false } as ScanRecord,
        { id: '2', retryCount: 1, aiProcessed: false } as ScanRecord,
        { id: '3', retryCount: 0, aiProcessed: false } as ScanRecord,
      ];

      const result = await batchRetryAIProcessing(records);

      expect(result.successCount).toBe(3);
      expect(result.failCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('should handle mixed success and failures', async () => {
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        // First call succeeds, second fails, third succeeds
        return callCount++ % 2 === 0 ? 0.5 : 0.8;
      });
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 0 as any;
      });

      const records: ScanRecord[] = [
        { id: '1', retryCount: 0, aiProcessed: false } as ScanRecord,
        { id: '2', retryCount: 1, aiProcessed: false } as ScanRecord,
        { id: '3', retryCount: 0, aiProcessed: false } as ScanRecord,
      ];

      const result = await batchRetryAIProcessing(records);

      expect(result.successCount).toBeGreaterThan(0);
      expect(result.failCount).toBeGreaterThan(0);
      expect(result.successCount + result.failCount).toBe(3);
      expect(result.results).toHaveLength(3);
    });

    it('should return empty results for empty input', async () => {
      const result = await batchRetryAIProcessing([]);

      expect(result.successCount).toBe(0);
      expect(result.failCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });
});
