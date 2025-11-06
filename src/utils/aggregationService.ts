/**
 * Aggregation Service
 * Client-side interface for server-side aggregation
 */

import { httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { functions } from '@/firebaseConfig';
import {
  DashboardAggregation,
  UserCostAggregation,
  DailyCostAggregation,
  AggregationRequest,
  AggregationResponse,
} from '@/types/aggregation';

/**
 * Check if server-side aggregation is available
 */
export const isAggregationAvailable = (): boolean => {
  // Check if Cloud Functions are configured
  try {
    return !!functions;
  } catch {
    return false;
  }
};

/**
 * Get dashboard aggregation from Cloud Function
 * Falls back to client-side calculation if unavailable
 */
export const getDashboardAggregation = async (
  request: AggregationRequest
): Promise<AggregationResponse<DashboardAggregation> | null> => {
  if (!isAggregationAvailable()) {
    console.warn('⚠️ Server-side aggregation not available, using client-side calculation');
    return null;
  }

  try {
    const aggregateFunction = httpsCallable<AggregationRequest, AggregationResponse<DashboardAggregation>>(
      functions,
      'aggregateDashboardStats'
    );

    const result: HttpsCallableResult<AggregationResponse<DashboardAggregation>> = await aggregateFunction(request);

    console.log('✅ [Aggregation] Dashboard stats retrieved from server');
    return result.data;
  } catch (error) {
    console.error('❌ [Aggregation] Failed to get dashboard stats:', error);
    return null;
  }
};

/**
 * Get user cost aggregation from Cloud Function
 */
export const getUserCostAggregation = async (
  request: AggregationRequest
): Promise<AggregationResponse<UserCostAggregation[]> | null> => {
  if (!isAggregationAvailable()) {
    console.warn('⚠️ Server-side aggregation not available');
    return null;
  }

  try {
    const aggregateFunction = httpsCallable<AggregationRequest, AggregationResponse<UserCostAggregation[]>>(
      functions,
      'aggregateUserCosts'
    );

    const result = await aggregateFunction(request);

    console.log('✅ [Aggregation] User costs retrieved from server');
    return result.data;
  } catch (error) {
    console.error('❌ [Aggregation] Failed to get user costs:', error);
    return null;
  }
};

/**
 * Get daily cost aggregation from Cloud Function
 */
export const getDailyCostAggregation = async (
  request: AggregationRequest
): Promise<AggregationResponse<DailyCostAggregation[]> | null> => {
  if (!isAggregationAvailable()) {
    console.warn('⚠️ Server-side aggregation not available');
    return null;
  }

  try {
    const aggregateFunction = httpsCallable<AggregationRequest, AggregationResponse<DailyCostAggregation[]>>(
      functions,
      'aggregateDailyCosts'
    );

    const result = await aggregateFunction(request);

    console.log('✅ [Aggregation] Daily costs retrieved from server');
    return result.data;
  } catch (error) {
    console.error('❌ [Aggregation] Failed to get daily costs:', error);
    return null;
  }
};

/**
 * Invalidate server-side cache
 * Triggers recalculation of aggregations
 */
export const invalidateAggregationCache = async (): Promise<void> => {
  if (!isAggregationAvailable()) {
    return;
  }

  try {
    const invalidateFunction = httpsCallable(functions, 'invalidateAggregationCache');
    await invalidateFunction();
    console.log('✅ [Aggregation] Cache invalidated');
  } catch (error) {
    console.error('❌ [Aggregation] Failed to invalidate cache:', error);
  }
};
