/**
 * Firestore Data Provider for Refine
 * Connects to real Firebase Firestore instead of mock data
 */

import { DataProvider, LogicalFilter, CrudFilter } from '@refinedev/core';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ScanRecord, AIResult, AICost } from '@/types';
import { cacheManager, generateCacheKey } from '@/utils/cacheManager';
import { CACHE, ERROR_MESSAGES } from '@/constants/app';

// ================================
// Field Mapping Utilities
// ================================

/**
 * Maps Firestore document to frontend ScanRecord
 * Handles field name differences between backend and frontend
 */
const mapFirestoreToScanRecord = (docId: string, data: DocumentData): ScanRecord => {
  // Map AI Result fields
  const aiResultData = data.AI_Result || data.ai_result;
  let aiResult: AIResult | undefined;

  if (aiResultData) {
    aiResult = {
      title: aiResultData.product_name || aiResultData.title,
      price: aiResultData.price,
      unitPrice: aiResultData.unit_price || aiResultData.unitPrice,
      category: aiResultData.category,
      brand: aiResultData.brand,
      size: aiResultData.weight_or_count || aiResultData.size,
      promotion: aiResultData.promotion,
      description: aiResultData.description,
      confidence: aiResultData.confidence
        ? (typeof aiResultData.confidence === 'string'
            ? parseConfidenceString(aiResultData.confidence)
            : aiResultData.confidence)
        : undefined,
      processedAt: aiResultData.processed_at?.toDate?.() || aiResultData.processedAt?.toDate?.(),
      metadata: aiResultData.metadata,
    };
  }

  // Map AI Cost fields
  const aiCostData = data.ai_cost;
  let aiCost: AICost | undefined;

  if (aiCostData) {
    aiCost = {
      totalCostUsd: aiCostData.total_cost_usd || aiCostData.totalCostUsd,
      inputTokens: aiCostData.input_tokens || aiCostData.inputTokens,
      outputTokens: aiCostData.output_tokens || aiCostData.outputTokens,
      totalTokens: aiCostData.total_tokens || aiCostData.totalTokens,
      model: aiCostData.pricing_model || aiCostData.model,
    };
  }

  return {
    id: docId,
    userId: data.User_ID || data.userId,
    username: data.Username || data.username,
    timestamp: data.Timestamp?.toDate?.() || new Date(data.timestamp),
    uploadTimestamp: data.Upload_Timestamp?.toDate?.() || data.uploadTimestamp?.toDate?.(),
    merchant: data.Merchant || data.merchant,
    barcode: data.Barcode || data.barcode,
    latitude: data.Latitude ?? data.latitude,
    longitude: data.Longitude ?? data.longitude,
    storeLocation: data.Store_Location || data.storeLocation,
    imageFilename: data.Image_Filename || data.imageFilename,
    imageUrl: data.Image_URL || data.imageUrl,
    aiProcessed: data.ai_processed ?? false,
    aiError: data.ai_processing_error_message || data.ai_error,
    aiResult,
    aiCost,
  };
};

/**
 * Convert string confidence to number
 */
const parseConfidenceString = (conf: string): number => {
  // Try to parse as number first
  const num = parseFloat(conf);
  if (!isNaN(num)) return num;

  // Convert string to number
  switch (conf.toLowerCase()) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.7;
    case 'low':
      return 0.3;
    default:
      return 0.5;
  }
};

/**
 * Maps frontend ScanRecord to Firestore document format
 */
const mapScanRecordToFirestore = (record: Partial<ScanRecord>): DocumentData => {
  const firestoreDoc: DocumentData = {};

  if (record.userId) firestoreDoc.User_ID = record.userId;
  if (record.username) firestoreDoc.Username = record.username;
  if (record.timestamp) firestoreDoc.Timestamp = Timestamp.fromDate(record.timestamp);
  if (record.merchant) firestoreDoc.Merchant = record.merchant;
  if (record.barcode) firestoreDoc.Barcode = record.barcode;
  if (record.latitude !== undefined) firestoreDoc.Latitude = record.latitude;
  if (record.longitude !== undefined) firestoreDoc.Longitude = record.longitude;
  if (record.storeLocation) firestoreDoc.Store_Location = record.storeLocation;
  if (record.imageFilename) firestoreDoc.Image_Filename = record.imageFilename;
  if (record.imageUrl) firestoreDoc.Image_URL = record.imageUrl;
  if (record.aiProcessed !== undefined) firestoreDoc.ai_processed = record.aiProcessed;
  if (record.aiError) firestoreDoc.ai_processing_error_message = record.aiError;

  return firestoreDoc;
};

// ================================
// Helper Functions
// ================================

/**
 * Check if error is due to network/offline issue
 */
const isNetworkError = (error: any): boolean => {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  return (
    errorCode === 'unavailable' ||
    errorCode === 'failed-precondition' ||
    errorMessage.includes('offline') ||
    errorMessage.includes('network') ||
    !navigator.onLine
  );
};

/**
 * Handle Firestore errors with user-friendly messages
 */
const handleFirestoreError = (error: any, operation: string): Error => {
  console.error(`❌ [FirestoreProvider] ${operation} error:`, error);

  if (isNetworkError(error)) {
    return new Error(ERROR_MESSAGES.NETWORK_ERROR);
  }

  if (error?.code === 'permission-denied') {
    return new Error(ERROR_MESSAGES.PERMISSION_DENIED);
  }

  if (error?.code === 'not-found') {
    return new Error(ERROR_MESSAGES.NOT_FOUND);
  }

  return error;
};

/**
 * Type guard to check if filter is a LogicalFilter
 */
const isLogicalFilter = (filter: CrudFilter): filter is LogicalFilter => {
  return 'field' in filter;
};

/**
 * Build Firestore query constraints from Refine filters
 */
const buildQueryConstraints = (
  filters?: CrudFilter[],
  sorters?: Array<{ field: string; order: 'asc' | 'desc' }>,
  pagination?: { current?: number; pageSize?: number; mode?: string },
  lastDoc?: QueryDocumentSnapshot
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];

  // Apply filters
  if (filters && filters.length > 0) {
    filters.forEach((filter) => {
      if (!isLogicalFilter(filter)) return;

      // Skip search filter (handled separately)
      if (filter.field === 'q') return;

      // Handle AI status filter
      if (filter.field === 'aiStatus' && filter.value) {
        if (filter.value === 'completed') {
          constraints.push(where('ai_processed', '==', true));
        } else if (filter.value === 'pending') {
          constraints.push(where('ai_processed', '==', false));
          // Note: Can't easily filter for null error in Firestore
        } else if (filter.value === 'failed') {
          constraints.push(where('ai_processed', '==', false));
          // Would need a separate field or client-side filtering
        }
      }
      // Handle other filters
      else if (filter.value !== undefined && filter.value !== null && filter.value !== '') {
        const firestoreField = mapFieldToFirestore(filter.field);
        constraints.push(where(firestoreField, '==', filter.value));
      }
    });
  }

  // Apply sorting
  if (sorters && sorters.length > 0) {
    const sorter = sorters[0];
    const firestoreField = mapFieldToFirestore(sorter.field);
    constraints.push(orderBy(firestoreField, sorter.order));
  } else {
    // Default sort by timestamp descending
    constraints.push(orderBy('Timestamp', 'desc'));
  }

  // Apply pagination
  if (pagination && pagination.pageSize) {
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    constraints.push(limit(pagination.pageSize));
  }

  return constraints;
};

/**
 * Map frontend field names to Firestore field names
 */
const mapFieldToFirestore = (field: string): string => {
  const fieldMap: Record<string, string> = {
    userId: 'User_ID',
    username: 'Username',
    timestamp: 'Timestamp',
    merchant: 'Merchant',
    barcode: 'Barcode',
    latitude: 'Latitude',
    longitude: 'Longitude',
    storeLocation: 'Store_Location',
    imageFilename: 'Image_Filename',
    imageUrl: 'Image_URL',
    aiProcessed: 'ai_processed',
  };

  return fieldMap[field] || field;
};

// ================================
// Firestore Data Provider
// ================================

export const firestoreDataProvider: DataProvider = {
  /**
   * Get list of resources with filtering, sorting, and pagination
   */
  getList: async ({ resource, pagination, filters, sorters }) => {
    console.log('🔥 [FirestoreProvider] getList:', { resource, pagination, filters, sorters });

    // Check cache first
    const cacheKey = generateCacheKey(resource, { pagination, filters, sorters });
    const cachedData = cacheManager.get(cacheKey);

    if (cachedData) {
      console.log('✅ [FirestoreProvider] Cache hit:', cacheKey);
      return cachedData;
    }

    try {
      const collectionRef = collection(db, resource);

      // Build query constraints
      const constraints = buildQueryConstraints(filters, sorters, pagination);

      // Execute query
      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      // Map documents
      const data = snapshot.docs.map((doc) => {
        if (resource === 'scan_records') {
          return mapFirestoreToScanRecord(doc.id, doc.data());
        }
        return { id: doc.id, ...doc.data() };
      });

      // Handle search filter client-side (Firestore doesn't support full-text search well)
      let filteredData = data;
      if (filters) {
        const searchFilter = filters.find(
          (f) => isLogicalFilter(f) && f.field === 'q'
        ) as LogicalFilter | undefined;

        if (searchFilter && searchFilter.value) {
          const searchTerm = String(searchFilter.value).toLowerCase();
          filteredData = data.filter((record: any) => {
            return (
              record.barcode?.toLowerCase().includes(searchTerm) ||
              record.merchant?.toLowerCase().includes(searchTerm) ||
              record.username?.toLowerCase().includes(searchTerm) ||
              record.aiResult?.title?.toLowerCase().includes(searchTerm)
            );
          });
        }
      }

      console.log(`✅ [FirestoreProvider] Found ${filteredData.length} records`);

      const result: { data: unknown[]; total: number } = {
        data: filteredData,
        total: filteredData.length,
      };

      // Cache the result
      cacheManager.set(cacheKey, result, CACHE.LIST_TTL);

      return result as { data: any[]; total: number };
    } catch (error) {
      throw handleFirestoreError(error, 'getList');
    }
  },

  /**
   * Get a single resource by ID
   */
  getOne: async ({ resource, id }) => {
    console.log('🔥 [FirestoreProvider] getOne:', { resource, id });

    try {
      const docRef = doc(db, resource, id as string);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error(`Document ${id} not found in ${resource}`);
      }

      let data;
      if (resource === 'scan_records') {
        data = mapFirestoreToScanRecord(docSnap.id, docSnap.data());
      } else {
        data = { id: docSnap.id, ...docSnap.data() };
      }

      console.log('✅ [FirestoreProvider] Found document:', docSnap.id);

      return { data } as { data: any };
    } catch (error) {
      throw handleFirestoreError(error, 'getOne');
    }
  },

  /**
   * Create a new resource
   */
  create: async ({ resource, variables }) => {
    console.log('🔥 [FirestoreProvider] create:', { resource, variables });

    try {
      const collectionRef = collection(db, resource);

      let dataToSave: any = variables;
      if (resource === 'scan_records') {
        dataToSave = mapScanRecordToFirestore(variables as ScanRecord);
      }

      const docRef = await addDoc(collectionRef, dataToSave as any);

      console.log('✅ [FirestoreProvider] Created document:', docRef.id);

      // Invalidate list cache for this resource
      cacheManager.invalidatePattern(`^${resource}:`);

      return {
        data: { id: docRef.id, ...variables },
      } as { data: any };
    } catch (error) {
      throw handleFirestoreError(error, 'create');
    }
  },

  /**
   * Update a resource
   */
  update: async ({ resource, id, variables }) => {
    console.log('🔥 [FirestoreProvider] update:', { resource, id, variables });

    try {
      const docRef = doc(db, resource, id as string);

      let dataToUpdate: any = variables;
      if (resource === 'scan_records') {
        dataToUpdate = mapScanRecordToFirestore(variables as ScanRecord);
      }

      await updateDoc(docRef, dataToUpdate as any);

      console.log('✅ [FirestoreProvider] Updated document:', id);

      // Invalidate cache for this resource
      cacheManager.invalidatePattern(`^${resource}:`);

      return {
        data: { id, ...variables },
      } as { data: any };
    } catch (error) {
      throw handleFirestoreError(error, 'update');
    }
  },

  /**
   * Delete a resource
   */
  deleteOne: async ({ resource, id }) => {
    console.log('🔥 [FirestoreProvider] deleteOne:', { resource, id });

    try {
      const docRef = doc(db, resource, id as string);
      await deleteDoc(docRef);

      console.log('✅ [FirestoreProvider] Deleted document:', id);

      // Invalidate cache for this resource
      cacheManager.invalidatePattern(`^${resource}:`);

      return { data: { id } } as { data: any };
    } catch (error) {
      throw handleFirestoreError(error, 'deleteOne');
    }
  },

  /**
   * Delete multiple resources
   */
  deleteMany: async ({ resource, ids }) => {
    console.log('🔥 [FirestoreProvider] deleteMany:', { resource, ids });

    try {
      const deletePromises = ids.map((id) => {
        const docRef = doc(db, resource, id as string);
        return deleteDoc(docRef);
      });

      await Promise.all(deletePromises);

      console.log(`✅ [FirestoreProvider] Deleted ${ids.length} documents`);

      // Invalidate cache for this resource
      cacheManager.invalidatePattern(`^${resource}:`);

      return { data: ids } as { data: any };
    } catch (error) {
      throw handleFirestoreError(error, 'deleteMany');
    }
  },

  /**
   * Get API URL (not used with Firestore)
   */
  getApiUrl: () => 'firestore://zoom-zone-6619c',

  /**
   * Custom method for special queries (e.g., Cloud Functions)
   */
  custom: async <T = unknown>({ url, method, payload }: {
    url: string;
    method: string;
    payload?: unknown;
  }): Promise<{ data: T }> => {
    console.log('🔥 [FirestoreProvider] custom:', { url, method, payload });

    // For now, return empty data
    // TODO: Implement Cloud Functions integration
    return { data: null } as { data: T };
  },
};
