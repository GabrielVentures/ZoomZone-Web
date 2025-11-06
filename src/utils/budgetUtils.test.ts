/**
 * Budget Utils Tests
 * Comprehensive tests for budget calculation and management functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dayjs from 'dayjs';
import {
  DEFAULT_BUDGET_CONFIG,
  loadBudgetConfig,
  saveBudgetConfig,
  resetBudgetConfig,
  getPeriodDates,
  filterRecordsByPeriod,
  calculateTotalCost,
  calculateAvgCost,
  getAlertLevel,
  getAlertColor,
  getAlertText,
  calculateBudgetUsage,
  generateAlertMessage,
  shouldShowBudgetAlert,
  getHighestAlert,
} from './budgetUtils';
import { BudgetConfig, BudgetPeriod, AlertLevel, ScanRecord } from '@/types';

describe('budgetUtils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadBudgetConfig', () => {
    it('should return default config when localStorage is empty', () => {
      const config = loadBudgetConfig();
      expect(config).toEqual(DEFAULT_BUDGET_CONFIG);
    });

    it('should load saved config from localStorage', () => {
      const customConfig: BudgetConfig = {
        ...DEFAULT_BUDGET_CONFIG,
        dailyBudget: 2.0,
        weeklyBudget: 10.0,
      };
      localStorage.setItem('shelftagsnap_budget_config', JSON.stringify(customConfig));

      const loaded = loadBudgetConfig();
      expect(loaded.dailyBudget).toBe(2.0);
      expect(loaded.weeklyBudget).toBe(10.0);
    });

    it('should return default config when localStorage has invalid JSON', () => {
      localStorage.setItem('shelftagsnap_budget_config', 'invalid json');
      const config = loadBudgetConfig();
      expect(config).toEqual(DEFAULT_BUDGET_CONFIG);
    });
  });

  describe('saveBudgetConfig', () => {
    it('should save config to localStorage', () => {
      const customConfig: BudgetConfig = {
        ...DEFAULT_BUDGET_CONFIG,
        monthlyBudget: 50.0,
      };

      saveBudgetConfig(customConfig);

      const saved = localStorage.getItem('shelftagsnap_budget_config');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.monthlyBudget).toBe(50.0);
    });
  });

  describe('resetBudgetConfig', () => {
    it('should reset config to defaults', () => {
      // Save custom config first
      const customConfig: BudgetConfig = {
        ...DEFAULT_BUDGET_CONFIG,
        dailyBudget: 5.0,
      };
      saveBudgetConfig(customConfig);

      // Reset
      const reset = resetBudgetConfig();
      expect(reset).toEqual(DEFAULT_BUDGET_CONFIG);

      // Verify it's saved in localStorage
      const loaded = loadBudgetConfig();
      expect(loaded).toEqual(DEFAULT_BUDGET_CONFIG);
    });
  });

  describe('getPeriodDates', () => {
    it('should return correct daily period dates', () => {
      const { start, end } = getPeriodDates(BudgetPeriod.DAILY);
      const now = dayjs();

      expect(dayjs(start).format('YYYY-MM-DD')).toBe(now.format('YYYY-MM-DD'));
      expect(dayjs(end).format('YYYY-MM-DD')).toBe(now.format('YYYY-MM-DD'));
      expect(dayjs(start).hour()).toBe(0);
      expect(dayjs(end).hour()).toBe(23);
    });

    it('should return correct weekly period dates', () => {
      const { start, end } = getPeriodDates(BudgetPeriod.WEEKLY);
      const now = dayjs();

      expect(dayjs(start).day()).toBe(1); // Monday
      expect(dayjs(end).day()).toBe(0); // Sunday
    });

    it('should return correct monthly period dates', () => {
      const { start, end } = getPeriodDates(BudgetPeriod.MONTHLY);
      const now = dayjs();

      expect(dayjs(start).date()).toBe(1); // First day
      expect(dayjs(start).format('YYYY-MM')).toBe(now.format('YYYY-MM'));
      expect(dayjs(end).format('YYYY-MM')).toBe(now.format('YYYY-MM'));
    });
  });

  describe('filterRecordsByPeriod', () => {
    const mockRecords: ScanRecord[] = [
      {
        id: '1',
        timestamp: dayjs().toDate(), // Today
        aiCost: { totalCostUsd: 0.05 },
      } as ScanRecord,
      {
        id: '2',
        timestamp: dayjs().subtract(2, 'days').toDate(), // 2 days ago
        aiCost: { totalCostUsd: 0.03 },
      } as ScanRecord,
      {
        id: '3',
        timestamp: dayjs().subtract(8, 'days').toDate(), // 8 days ago
        aiCost: { totalCostUsd: 0.02 },
      } as ScanRecord,
    ];

    it('should filter daily records correctly', () => {
      const filtered = filterRecordsByPeriod(mockRecords, BudgetPeriod.DAILY);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter weekly records correctly', () => {
      const filtered = filterRecordsByPeriod(mockRecords, BudgetPeriod.WEEKLY);
      expect(filtered.length).toBeGreaterThanOrEqual(1); // At least today's record
    });

    it('should return empty array for records outside period', () => {
      const oldRecords: ScanRecord[] = [
        {
          id: '1',
          timestamp: dayjs().subtract(40, 'days').toDate(),
          aiCost: { totalCostUsd: 0.05 },
        } as ScanRecord,
      ];

      const filtered = filterRecordsByPeriod(oldRecords, BudgetPeriod.DAILY);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost correctly', () => {
      const records: ScanRecord[] = [
        { aiCost: { totalCostUsd: 0.05 } } as ScanRecord,
        { aiCost: { totalCostUsd: 0.03 } } as ScanRecord,
        { aiCost: { totalCostUsd: 0.02 } } as ScanRecord,
      ];

      const total = calculateTotalCost(records);
      expect(total).toBe(0.1);
    });

    it('should handle records without aiCost', () => {
      const records: ScanRecord[] = [
        { aiCost: { totalCostUsd: 0.05 } } as ScanRecord,
        {} as ScanRecord, // No aiCost
        { aiCost: undefined } as ScanRecord,
      ];

      const total = calculateTotalCost(records);
      expect(total).toBe(0.05);
    });

    it('should return 0 for empty array', () => {
      const total = calculateTotalCost([]);
      expect(total).toBe(0);
    });
  });

  describe('calculateAvgCost', () => {
    it('should calculate average cost correctly', () => {
      const records: ScanRecord[] = [
        { aiCost: { totalCostUsd: 0.06 } } as ScanRecord,
        { aiCost: { totalCostUsd: 0.03 } } as ScanRecord,
        { aiCost: { totalCostUsd: 0.03 } } as ScanRecord,
      ];

      const avg = calculateAvgCost(records);
      expect(avg).toBe(0.04);
    });

    it('should return 0 for empty array', () => {
      const avg = calculateAvgCost([]);
      expect(avg).toBe(0);
    });
  });

  describe('getAlertLevel', () => {
    const thresholds = DEFAULT_BUDGET_CONFIG.alertThresholds;

    it('should return SAFE when usage is below warning threshold', () => {
      expect(getAlertLevel(50, thresholds)).toBe(AlertLevel.SAFE);
      expect(getAlertLevel(79, thresholds)).toBe(AlertLevel.SAFE);
    });

    it('should return WARNING when usage is at warning threshold', () => {
      expect(getAlertLevel(80, thresholds)).toBe(AlertLevel.WARNING);
      expect(getAlertLevel(85, thresholds)).toBe(AlertLevel.WARNING);
      expect(getAlertLevel(89, thresholds)).toBe(AlertLevel.WARNING);
    });

    it('should return CRITICAL when usage is at critical threshold', () => {
      expect(getAlertLevel(90, thresholds)).toBe(AlertLevel.CRITICAL);
      expect(getAlertLevel(95, thresholds)).toBe(AlertLevel.CRITICAL);
      expect(getAlertLevel(99, thresholds)).toBe(AlertLevel.CRITICAL);
    });

    it('should return EXCEEDED when usage is at or above 100%', () => {
      expect(getAlertLevel(100, thresholds)).toBe(AlertLevel.EXCEEDED);
      expect(getAlertLevel(105, thresholds)).toBe(AlertLevel.EXCEEDED);
      expect(getAlertLevel(150, thresholds)).toBe(AlertLevel.EXCEEDED);
    });
  });

  describe('getAlertColor', () => {
    it('should return correct colors for each alert level', () => {
      expect(getAlertColor(AlertLevel.SAFE)).toBe('#52c41a');
      expect(getAlertColor(AlertLevel.WARNING)).toBe('#faad14');
      expect(getAlertColor(AlertLevel.CRITICAL)).toBe('#ff7a45');
      expect(getAlertColor(AlertLevel.EXCEEDED)).toBe('#ff4d4f');
    });
  });

  describe('getAlertText', () => {
    it('should return correct text for each alert level', () => {
      expect(getAlertText(AlertLevel.SAFE)).toBe('Within Budget');
      expect(getAlertText(AlertLevel.WARNING)).toBe('Budget Warning');
      expect(getAlertText(AlertLevel.CRITICAL)).toBe('Budget Critical');
      expect(getAlertText(AlertLevel.EXCEEDED)).toBe('Budget Exceeded');
    });
  });

  describe('calculateBudgetUsage', () => {
    const config = DEFAULT_BUDGET_CONFIG;

    it('should calculate daily budget usage correctly', () => {
      const records: ScanRecord[] = [
        {
          id: '1',
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.5 },
        } as ScanRecord,
        {
          id: '2',
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.3 },
        } as ScanRecord,
      ];

      const usage = calculateBudgetUsage(records, config, BudgetPeriod.DAILY);

      expect(usage.period).toBe(BudgetPeriod.DAILY);
      expect(usage.budgetLimit).toBe(1.0);
      expect(usage.currentUsage).toBe(0.8);
      expect(usage.usagePercent).toBe(80);
      expect(usage.alertLevel).toBe(AlertLevel.WARNING);
      expect(usage.recordCount).toBe(2);
      expect(usage.remainingBudget).toBeCloseTo(0.2, 2);
    });

    it('should calculate weekly budget usage correctly', () => {
      const records: ScanRecord[] = [
        {
          id: '1',
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 4.5 },
        } as ScanRecord,
      ];

      const usage = calculateBudgetUsage(records, config, BudgetPeriod.WEEKLY);

      expect(usage.budgetLimit).toBe(5.0);
      expect(usage.currentUsage).toBe(4.5);
      expect(usage.usagePercent).toBe(90);
      expect(usage.alertLevel).toBe(AlertLevel.CRITICAL);
    });

    it('should calculate monthly budget usage correctly', () => {
      const records: ScanRecord[] = [
        {
          id: '1',
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 21.0 },
        } as ScanRecord,
      ];

      const usage = calculateBudgetUsage(records, config, BudgetPeriod.MONTHLY);

      expect(usage.budgetLimit).toBe(20.0);
      expect(usage.currentUsage).toBe(21.0);
      expect(usage.usagePercent).toBe(105);
      expect(usage.alertLevel).toBe(AlertLevel.EXCEEDED);
      expect(usage.remainingBudget).toBe(0);
    });

    it('should handle zero budget limit', () => {
      const customConfig = { ...config, dailyBudget: 0 };
      const records: ScanRecord[] = [
        {
          id: '1',
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.5 },
        } as ScanRecord,
      ];

      const usage = calculateBudgetUsage(records, customConfig, BudgetPeriod.DAILY);

      expect(usage.usagePercent).toBe(0);
      expect(usage.alertLevel).toBe(AlertLevel.SAFE);
    });
  });

  describe('generateAlertMessage', () => {
    const createUsage = (alertLevel: AlertLevel, usagePercent: number): any => ({
      period: BudgetPeriod.DAILY,
      alertLevel,
      usagePercent,
      currentUsage: 0.8,
      budgetLimit: 1.0,
    });

    it('should generate WARNING message', () => {
      const usage = createUsage(AlertLevel.WARNING, 85);
      const message = generateAlertMessage(usage);

      expect(message).toContain('Daily budget at 85.0%');
      expect(message).toContain('$0.8000');
      expect(message).toContain('$1.00');
    });

    it('should generate CRITICAL message', () => {
      const usage = createUsage(AlertLevel.CRITICAL, 95);
      const message = generateAlertMessage(usage);

      expect(message).toContain('critical');
      expect(message).toContain('95.0%');
    });

    it('should generate EXCEEDED message', () => {
      const usage = createUsage(AlertLevel.EXCEEDED, 110);
      const message = generateAlertMessage(usage);

      expect(message).toContain('exceeded');
      expect(message).toContain('$0.8000 spent');
    });
  });

  describe('shouldShowBudgetAlert', () => {
    const config = DEFAULT_BUDGET_CONFIG;

    it('should return false when budget monitoring is disabled', () => {
      const disabledConfig = { ...config, enabled: false };
      const records: ScanRecord[] = [
        {
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 10.0 },
        } as ScanRecord,
      ];

      expect(shouldShowBudgetAlert(records, disabledConfig)).toBe(false);
    });

    it('should return true when any period has alert', () => {
      const records: ScanRecord[] = [
        {
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.9 },
        } as ScanRecord,
      ];

      expect(shouldShowBudgetAlert(records, config)).toBe(true);
    });

    it('should return false when all periods are safe', () => {
      const records: ScanRecord[] = [
        {
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.1 },
        } as ScanRecord,
      ];

      expect(shouldShowBudgetAlert(records, config)).toBe(false);
    });
  });

  describe('getHighestAlert', () => {
    const config = DEFAULT_BUDGET_CONFIG;

    it('should return null when budget monitoring is disabled', () => {
      const disabledConfig = { ...config, enabled: false };
      const records: ScanRecord[] = [
        {
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 10.0 },
        } as ScanRecord,
      ];

      expect(getHighestAlert(records, disabledConfig)).toBeNull();
    });

    it('should return highest severity alert', () => {
      const records: ScanRecord[] = [
        {
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.9 }, // 90% of daily
        } as ScanRecord,
      ];

      const highest = getHighestAlert(records, config);

      expect(highest).not.toBeNull();
      expect(highest!.alertLevel).toBe(AlertLevel.CRITICAL);
      expect(highest!.period).toBe(BudgetPeriod.DAILY);
    });

    it('should return null when all periods are safe', () => {
      const records: ScanRecord[] = [
        {
          timestamp: dayjs().toDate(),
          aiCost: { totalCostUsd: 0.1 },
        } as ScanRecord,
      ];

      expect(getHighestAlert(records, config)).toBeNull();
    });
  });
});
