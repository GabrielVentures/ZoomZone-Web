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
import { cacheManager } from '@/utils/cacheManager';
import { ERROR_MESSAGES } from '@/constants/app';
import { cursorManager, PageCursor } from '@/utils/cursorManager';
import { retryManager } from '@/utils/retryManager';
import { requestDeduplicator } from '@/utils/requestDeduplicator';

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
      unit_price: aiResultData.unit_price,
      count: aiResultData.count,
      size: aiResultData.size,
      unit: aiResultData.unit,
      category: aiResultData.category,
      brand: aiResultData.brand,
      label_date: aiResultData.label_date,
      expiration_date: aiResultData.expiration_date,
      promotion: aiResultData.promotion,
      description: aiResultData.description,
      barcode_full: aiResultData.barcode_full,
      barcode_shelf_tag: aiResultData.barcode_shelf_tag,
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
    barcode_full: data.Barcode_Full || data.barcode_full,
    barcode_shelf_tag: data.Barcode_ShelfTag || data.barcode_shelf_tag,
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
 * Check if error indicates cursor is invalid/expired
 */
const isCursorInvalidError = (error: any): boolean => {
  const errorMessage = error?.message || '';
  return (
    errorMessage.includes('cursor') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('expired')
  );
};

/**
 * Load cursors sequentially from page 1 up to target page
 * Used for forward navigation or recovery
 */
const loadCursorsUpToPage = async (
  collectionRef: any,
  sessionId: string,
  targetPage: number,
  pageSize: number,
  filters?: CrudFilter[],
  sorters?: Array<{ field: string; order: 'asc' | 'desc' }>
): Promise<PageCursor | null> => {
  console.log(`🔄 [FirestoreProvider] Loading cursors from page 1 to ${targetPage}...`);

  let currentPage = 1;
  let lastCursor: QueryDocumentSnapshot | undefined = undefined;

  while (currentPage <= targetPage) {
    // Build query constraints for current page
    const constraints = buildQueryConstraints(filters, sorters, { pageSize }, lastCursor);
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    const hasNextPage = snapshot.docs.length === pageSize;
    const endCursor = (snapshot.docs[snapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData, DocumentData>) || undefined;

    // Save cursor for this page
    const pageCursor: PageCursor = {
      pageNumber: currentPage,
      pageSize,
      startCursor: lastCursor,
      endCursor,
      hasNextPage,
      recordCount: snapshot.docs.length,
    };

    cursorManager.saveCursor(sessionId, pageCursor);

    if (currentPage === targetPage) {
      return pageCursor;
    }

    // Move to next page
    lastCursor = endCursor;
    currentPage++;

    // Stop if no more pages
    if (!hasNextPage) {
      console.log(`⏹️ [FirestoreProvider] Reached last page at ${currentPage - 1}`);
      return null;
    }
  }

  return null;
};

/**
 * Load cursors from a cached page forward to target page
 * Used for smart recovery from nearest cached page
 */
const loadCursorsFromPage = async (
  collectionRef: any,
  sessionId: string,
  startPage: number,
  targetPage: number,
  pageSize: number,
  filters?: CrudFilter[],
  sorters?: Array<{ field: string; order: 'asc' | 'desc' }>
): Promise<PageCursor | null> => {
  console.log(`🔄 [FirestoreProvider] Loading cursors from page ${startPage} to ${targetPage}...`);

  // Get start cursor
  const startCursor = cursorManager.getCursor(sessionId, startPage);
  if (!startCursor) {
    console.warn(`⚠️ [FirestoreProvider] Start page ${startPage} cursor not found`);
    return null;
  }

  let currentPage = startPage + 1;
  let lastCursor = startCursor.endCursor;

  while (currentPage <= targetPage && lastCursor) {
    // Build query constraints for current page
    const constraints = buildQueryConstraints(filters, sorters, { pageSize }, lastCursor);
    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    const hasNextPage = snapshot.docs.length === pageSize;
    const endCursor = (snapshot.docs[snapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData, DocumentData>) || undefined;

    // Save cursor for this page
    const pageCursor: PageCursor = {
      pageNumber: currentPage,
      pageSize,
      startCursor: lastCursor,
      endCursor,
      hasNextPage,
      recordCount: snapshot.docs.length,
    };

    cursorManager.saveCursor(sessionId, pageCursor);

    if (currentPage === targetPage) {
      return pageCursor;
    }

    // Move to next page
    lastCursor = endCursor;
    currentPage++;

    // Stop if no more pages
    if (!hasNextPage) {
      console.log(`⏹️ [FirestoreProvider] Reached last page at ${currentPage - 1}`);
      return null;
    }
  }

  return null;
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
   * Now with proper cursor-based pagination support
   */
  getList: async ({ resource, pagination, filters, sorters }) => {
    console.log('🔥 [FirestoreProvider] getList:', { resource, pagination, filters, sorters });

    const currentPage = pagination?.current || 1;
    const pageSize = pagination?.pageSize || 20;

    // Generate session ID for cursor management
    const session = cursorManager.getOrCreateSession(filters, sorters);
    const sessionId = session.sessionId;

    console.log(`📍 [FirestoreProvider] Page ${currentPage}, Size ${pageSize}, Session: ${sessionId.substring(0, 30)}...`);

    try {
      // Use request deduplicator to prevent duplicate concurrent requests
      const dedupeKey = `getList_${resource}_${sessionId}_page_${currentPage}`;

      return await requestDeduplicator.execute(dedupeKey, async () => {
        // Use retry manager for network resilience
        return await retryManager.executeOrThrow(async () => {
          const collectionRef = collection(db, resource);

          // ============================================
          // Step 1: Check if we have cached cursor for this page
          // ============================================
          let pageCursor = cursorManager.getCursor(sessionId, currentPage);
          let querySnapshot: any;

          if (pageCursor) {
            // ============================================
            // Happy path: Use cached cursor
            // ============================================
            console.log(`✅ [FirestoreProvider] Using cached cursor for page ${currentPage}`);

            try {
              const constraints = buildQueryConstraints(
                filters,
                sorters,
                { pageSize },
                pageCursor.startCursor
              );
              const q = query(collectionRef, ...constraints);
              querySnapshot = await getDocs(q);
            } catch (error) {
              // Cursor might be invalid/expired, try recovery
              if (isCursorInvalidError(error)) {
                console.warn(`⚠️ [FirestoreProvider] Cursor invalid, attempting recovery...`);
                pageCursor = null; // Force recovery below
              } else {
                throw error;
              }
            }
          }

          if (!pageCursor) {
            // ============================================
            // Recovery path: Need to load cursors
            // ============================================

            // Strategy 1: Check if we have any nearby cached page
            const nearestCachedPage = cursorManager.findNearestCachedPage(sessionId, currentPage);

            if (nearestCachedPage && nearestCachedPage > 0) {
              // Strategy 1A: Smart recovery from nearest cached page
              console.log(`🔄 [FirestoreProvider] Smart recovery from page ${nearestCachedPage} to ${currentPage}`);
              pageCursor = await loadCursorsFromPage(
                collectionRef,
                sessionId,
                nearestCachedPage,
                currentPage,
                pageSize,
                filters,
                sorters
              );
            } else {
              // Strategy 1B: Full recovery from page 1
              console.log(`🔄 [FirestoreProvider] Full recovery from page 1 to ${currentPage}`);
              pageCursor = await loadCursorsUpToPage(
                collectionRef,
                sessionId,
                currentPage,
                pageSize,
                filters,
                sorters
              );
            }

            // After recovery, execute final query for target page
            if (pageCursor) {
              const constraints = buildQueryConstraints(
                filters,
                sorters,
                { pageSize },
                pageCursor.startCursor
              );
              const q = query(collectionRef, ...constraints);
              querySnapshot = await getDocs(q);
            } else {
              // No cursor available (maybe beyond last page)
              console.warn(`⚠️ [FirestoreProvider] No cursor available for page ${currentPage}`);
              return {
                data: [],
                total: session.estimatedTotal || 0,
              };
            }
          }

          // ============================================
          // Step 2: Map documents
          // ============================================
          const data = querySnapshot.docs.map((doc: QueryDocumentSnapshot) => {
            if (resource === 'scan_records') {
              return mapFirestoreToScanRecord(doc.id, doc.data());
            }
            return { id: doc.id, ...doc.data() };
          });

          // ============================================
          // Step 3: Handle client-side search filter
          // ============================================
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

          // ============================================
          // Step 4: Update cursor cache with fresh data
          // ============================================
          const hasNextPage = querySnapshot.docs.length === pageSize;
          const endCursor = querySnapshot.docs[querySnapshot.docs.length - 1] || undefined;

          const newPageCursor: PageCursor = {
            pageNumber: currentPage,
            pageSize,
            startCursor: pageCursor?.startCursor || undefined,
            endCursor,
            hasNextPage,
            recordCount: querySnapshot.docs.length,
          };

          cursorManager.saveCursor(sessionId, newPageCursor);

          // ============================================
          // Step 5: Calculate total count
          // ============================================
          let total: number;

          if (session.estimatedTotal !== null) {
            // We already have accurate total from reaching last page before
            total = session.estimatedTotal;
          } else if (!hasNextPage && querySnapshot.docs.length < pageSize) {
            // This is the last page - calculate accurate total
            total = (currentPage - 1) * pageSize + querySnapshot.docs.length;
            console.log(`📊 [FirestoreProvider] Reached last page, accurate total: ${total}`);
          } else {
            // Estimate based on current position
            // Conservative estimate: assume at least 2 more pages
            total = currentPage * pageSize + pageSize * 2;
            console.log(`📊 [FirestoreProvider] Estimated total: ${total}`);
          }

          console.log(`✅ [FirestoreProvider] Loaded page ${currentPage}: ${filteredData.length} records, hasNext: ${hasNextPage}`);

          const result = {
            data: filteredData,
            total,
          };

          return result as { data: any[]; total: number };
        });
      });
    } catch (error) {
      console.error(`❌ [FirestoreProvider] getList failed:`, error);
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
   * Get multiple resources by IDs
   * Used for batch export/operations on cross-page selections
   */
  getMany: async ({ resource, ids }) => {
    console.log('🔥 [FirestoreProvider] getMany:', { resource, ids: ids.length });

    try {
      // Firestore has a limit of 10 docs per getDoc batch, so we need to batch them
      const BATCH_SIZE = 10;
      const batches: any[][] = [];

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        batches.push(ids.slice(i, i + BATCH_SIZE));
      }

      const allDocs: any[] = [];

      for (const batch of batches) {
        const docPromises = batch.map(async (id) => {
          const docRef = doc(db, resource, id as string);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            console.warn(`⚠️ [FirestoreProvider] Document not found: ${id}`);
            return null;
          }

          const data = docSnap.data();

          // Map Firestore data to ScanRecord format
          if (resource === 'scan_records') {
            return mapFirestoreToScanRecord(docSnap.id, data);
          }

          return {
            id: docSnap.id,
            ...data,
          };
        });

        const batchResults = await Promise.all(docPromises);
        allDocs.push(...batchResults.filter(doc => doc !== null));
      }

      console.log(`✅ [FirestoreProvider] Fetched ${allDocs.length}/${ids.length} documents`);

      return { data: allDocs };
    } catch (error) {
      throw handleFirestoreError(error, 'getMany');
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
