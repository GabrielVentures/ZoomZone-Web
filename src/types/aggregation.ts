/**
 * Server-side Aggregation Types
 * Type definitions for aggregated data from Cloud Functions
 */

/**
 * Dashboard aggregation result
 * Pre-calculated statistics from server-side aggregation
 */
export interface DashboardAggregation {
  totalRecords: number;
  aiCompleted: number;
  aiPending: number;
  aiFailed: number;
  totalUsers: number;
  totalAICostUsd: number;
  avgCostPerRecord: number;
  totalTokens: number;
  periodStart: Date;
  periodEnd: Date;
  lastUpdated: Date;
}

/**
 * User cost aggregation
 */
export interface UserCostAggregation {
  userId: string;
  username: string;
  totalCost: number;
  totalRecords: number;
  avgCost: number;
  lastScan: Date;
}

/**
 * Daily cost aggregation
 */
export interface DailyCostAggregation {
  date: string; // YYYY-MM-DD format
  totalCost: number;
  recordCount: number;
  avgCost: number;
}

/**
 * AI status aggregation
 */
export interface AIStatusAggregation {
  status: 'completed' | 'pending' | 'failed';
  count: number;
  percentage: number;
}

/**
 * Aggregation request parameters
 */
export interface AggregationRequest {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month' | 'user';
  metrics?: Array<'cost' | 'tokens' | 'count' | 'status'>;
}

/**
 * Aggregation response wrapper
 */
export interface AggregationResponse<T> {
  data: T;
  cached: boolean;
  generatedAt: Date;
  ttl?: number; // Time to live in seconds
}
