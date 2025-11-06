/**
 * Firestore-specific type definitions
 * Improved type safety for Firestore operations
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Firestore document with automatic ID
 */
export interface FirestoreDocument {
  id: string;
}

/**
 * Firestore timestamp fields
 */
export interface FirestoreTimestamps {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Firestore query result
 */
export interface FirestoreQueryResult<T extends FirestoreDocument> {
  data: T[];
  total: number;
}

/**
 * Firestore single result
 */
export interface FirestoreSingleResult<T extends FirestoreDocument> {
  data: T;
}

/**
 * Firestore error types
 */
export type FirestoreErrorCode =
  | 'unavailable'
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unauthenticated'
  | 'cancelled'
  | 'data-loss'
  | 'unknown';

/**
 * Firestore operation options
 */
export interface FirestoreOperationOptions {
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * Resource type mapping
 */
export type ResourceType = 'scan_records' | 'users' | 'user_cost_stats';

/**
 * Type-safe resource mapping
 */
export interface ResourceMap {
  scan_records: any; // Will be ScanRecord
  users: any;
  user_cost_stats: any;
}

/**
 * Get resource type
 */
export type GetResourceType<R extends ResourceType> = ResourceMap[R];
