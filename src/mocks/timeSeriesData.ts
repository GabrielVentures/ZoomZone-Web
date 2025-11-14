/**
 * Time Series Mock Data for Dashboard Charts
 * Dynamically generated from enrichedMockScanRecords
 */

import dayjs from 'dayjs';
import { enrichedMockScanRecords } from './enrichedScanRecords';
import { ScanRecord } from '@/types';

export interface DailyStats {
  date: string;
  dateFormatted: string;
  totalRecords: number;
  aiCompleted: number;
  aiPending: number;
  aiFailed: number;
  totalCostUsd: number;
  totalTokens: number;
}

export interface UserDailyCost {
  username: string;
  totalCostUsd: number;
  recordCount: number;
  avgCostPerRecord: number;
}

/**
 * Generate daily statistics from enrichedMockScanRecords
 * Aggregates records by day and calculates real statistics
 */
export const generateDailyStatsFromRecords = (records: ScanRecord[], days: number = 7): DailyStats[] => {
  const statsMap = new Map<string, DailyStats>();

  // Initialize map for past N days
  for (let i = days - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    statsMap.set(dateKey, {
      date: dateKey,
      dateFormatted: date.format('MMM DD'),
      totalRecords: 0,
      aiCompleted: 0,
      aiPending: 0,
      aiFailed: 0,
      totalCostUsd: 0,
      totalTokens: 0,
    });
  }

  // Aggregate records by day
  records.forEach(record => {
    const dateKey = dayjs(record.timestamp).format('YYYY-MM-DD');
    const stats = statsMap.get(dateKey);
    if (!stats) return; // Outside date range

    stats.totalRecords++;
    if (record.aiProcessed && record.aiResult) {
      stats.aiCompleted++;
      stats.totalCostUsd += record.aiCost?.totalCostUsd || 0;
      stats.totalTokens += record.aiCost?.totalTokens || 0;
    } else if (record.aiError) {
      stats.aiFailed++;
      stats.totalCostUsd += record.aiCost?.totalCostUsd || 0;
      stats.totalTokens += record.aiCost?.totalTokens || 0;
    } else {
      stats.aiPending++;
    }
  });

  // Round cost to 4 decimal places
  statsMap.forEach(stats => {
    stats.totalCostUsd = parseFloat(stats.totalCostUsd.toFixed(4));
  });

  return Array.from(statsMap.values());
};

/**
 * Mock daily statistics (past 7 days)
 * Dynamically generated from enrichedMockScanRecords
 */
export const mockDailyStats: DailyStats[] = (() => {
  console.log('📊 [TimeSeriesData] Generating daily stats...');
  console.log(`📊 [TimeSeriesData] Total records available: ${enrichedMockScanRecords.length}`);

  const stats = generateDailyStatsFromRecords(enrichedMockScanRecords, 7);

  console.log('📊 [TimeSeriesData] Generated daily stats:');
  stats.forEach(day => {
    console.log(`  ${day.dateFormatted}: ${day.totalRecords} records, $${day.totalCostUsd}, ${day.totalTokens} tokens`);
  });

  return stats;
})();

/**
 * Generate user daily costs from enrichedMockScanRecords
 * Aggregates costs by user for today's data
 */
export const generateUserDailyCosts = (records: ScanRecord[]): UserDailyCost[] => {
  const userMap = new Map<string, UserDailyCost>();
  const today = dayjs().format('YYYY-MM-DD');

  // Filter records for today
  const todayRecords = records.filter(record =>
    dayjs(record.timestamp).format('YYYY-MM-DD') === today
  );

  // Aggregate by user
  todayRecords.forEach(record => {
    if (!userMap.has(record.username)) {
      userMap.set(record.username, {
        username: record.username,
        totalCostUsd: 0,
        recordCount: 0,
        avgCostPerRecord: 0,
      });
    }

    const userStats = userMap.get(record.username)!;
    userStats.recordCount++;
    userStats.totalCostUsd += record.aiCost?.totalCostUsd || 0;
  });

  // Calculate averages and round
  const result = Array.from(userMap.values()).map(stats => ({
    ...stats,
    totalCostUsd: parseFloat(stats.totalCostUsd.toFixed(4)),
    avgCostPerRecord: stats.recordCount > 0
      ? parseFloat((stats.totalCostUsd / stats.recordCount).toFixed(4))
      : 0,
  }));

  // Sort by total cost descending
  return result.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
};

/**
 * User daily costs (for bar chart)
 * Dynamically generated from enrichedMockScanRecords
 */
export const mockUserDailyCosts: UserDailyCost[] = (() => {
  console.log('👥 [TimeSeriesData] Generating user daily costs...');
  const costs = generateUserDailyCosts(enrichedMockScanRecords);
  console.log(`👥 [TimeSeriesData] Generated ${costs.length} user costs for today`);
  costs.forEach(user => {
    console.log(`  ${user.username}: ${user.recordCount} records, $${user.totalCostUsd}`);
  });
  return costs;
})();

/**
 * Generate AI status distribution from enrichedMockScanRecords
 * Calculates current distribution of AI processing statuses
 */
export const generateAIStatusDistribution = (records: ScanRecord[]) => {
  let completed = 0;
  let pending = 0;
  let failed = 0;

  records.forEach(record => {
    if (record.aiProcessed && record.aiResult) {
      completed++;
    } else if (record.ai_status === 'failed') {
      failed++;
    } else {
      pending++;
    }
  });

  return [
    { name: 'Completed', value: completed, color: '#52c41a' },
    { name: 'Pending', value: pending, color: '#faad14' },
    { name: 'Failed', value: failed, color: '#ff4d4f' },
  ];
};

/**
 * AI Status distribution (for pie chart)
 * Dynamically generated from enrichedMockScanRecords
 */
export const mockAIStatusDistribution = (() => {
  console.log('📈 [TimeSeriesData] Generating AI status distribution...');
  const distribution = generateAIStatusDistribution(enrichedMockScanRecords);
  console.log('📈 [TimeSeriesData] AI Status Distribution:');
  distribution.forEach(status => {
    console.log(`  ${status.name}: ${status.value}`);
  });
  return distribution;
})();
