/**
 * Mock Data for Development
 * Used until Firebase Firestore connection is established
 */

import { ScanRecord, User, DashboardStats, UserCostStats } from '@/types';
import { enrichedMockScanRecords } from './enrichedScanRecords';

// ================================
// Export enriched mock data as main data source
// ================================

/**
 * Use enriched mock data (60+ records across 30 days) for realistic Dashboard
 * Switch to originalMockScanRecords (defined below) for minimal data
 */
export const mockScanRecords = enrichedMockScanRecords;

// ================================
// Mock Users
// ================================

export const mockUsers: User[] = [
  {
    id: 'user-001',
    email: 'john@example.com',
    username: 'john_doe',
    emailVerified: true,
    createdAt: new Date('2025-10-01'),
    lastLoginAt: new Date('2025-11-03'),
  },
  {
    id: 'user-002',
    email: 'jane@example.com',
    username: 'jane_smith',
    emailVerified: true,
    createdAt: new Date('2025-10-15'),
    lastLoginAt: new Date('2025-11-02'),
  },
  {
    id: 'user-003',
    email: 'bob@example.com',
    username: 'bob_wilson',
    emailVerified: false,
    createdAt: new Date('2025-10-20'),
    lastLoginAt: new Date('2025-11-01'),
  },
  {
    id: 'user-004',
    email: 'alice@example.com',
    username: 'alice_johnson',
    emailVerified: true,
    createdAt: new Date('2025-10-05'),
    lastLoginAt: new Date('2025-11-03'),
  },
  {
    id: 'user-005',
    email: 'charlie@example.com',
    username: 'charlie_brown',
    emailVerified: true,
    createdAt: new Date('2025-10-10'),
    lastLoginAt: new Date('2025-11-02'),
  },
];

// ================================
// Mock Scan Records (Original - 8 records)
// ================================

/**
 * Original mock data with 8 records
 * Available for switching back to minimal data if needed
 */
export const originalMockScanRecords: ScanRecord[] = [
  // User 1 - AI Completed
  {
    id: 'scan-001',
    username: 'john_doe',
    userId: 'user-001',
    timestamp: new Date('2025-11-03T10:30:00'),
    uploadTimestamp: new Date('2025-11-03T10:31:00'),
    merchant: 'Walmart',
    barcode: '012345678912',
    latitude: 37.7749,
    longitude: -122.4194,
    storeLocation: 'San Francisco Store',
    imageFilename: 'walmart_bananas_001.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/FFE135/000000?text=Organic+Bananas',
    aiProcessed: true,
    aiError: undefined,
    aiResult: {
      title: 'Organic Bananas',
      price: '$2.99',
      category: 'Fresh Produce',
      brand: 'Great Value',
      size: '3 lbs',
      description: 'Fresh organic bananas from Ecuador',
      confidence: 0.92,
      processedAt: new Date('2025-11-03T10:31:30'),
      metadata: { source: 'gpt-4o', version: '2024-11' },
    },
    aiCost: {
      totalCostUsd: 0.0052,
      inputTokens: 1150,
      outputTokens: 85,
      totalTokens: 1235,
      processingTimeMs: 2340,
      model: 'gpt-4o',
    },
  },

  // User 1 - AI Completed
  {
    id: 'scan-002',
    username: 'john_doe',
    userId: 'user-001',
    timestamp: new Date('2025-11-03T11:15:00'),
    uploadTimestamp: new Date('2025-11-03T11:16:00'),
    merchant: 'Target',
    barcode: '987654321098',
    latitude: 37.7849,
    longitude: -122.4094,
    storeLocation: 'Downtown Target',
    imageFilename: 'target_milk_002.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/CC0000/FFFFFF?text=Horizon+Organic+Milk',
    aiProcessed: true,
    aiError: undefined,
    aiResult: {
      title: 'Horizon Organic Whole Milk',
      price: '$4.99',
      category: 'Dairy',
      brand: 'Horizon Organic',
      size: '1 Gallon',
      description: 'Organic whole milk, vitamin D added',
      confidence: 0.88,
      processedAt: new Date('2025-11-03T11:16:45'),
      metadata: { source: 'gpt-4o', version: '2024-11' },
    },
    aiCost: {
      totalCostUsd: 0.0048,
      inputTokens: 1080,
      outputTokens: 92,
      totalTokens: 1172,
      processingTimeMs: 2180,
      model: 'gpt-4o',
    },
  },

  // User 2 - AI Pending
  {
    id: 'scan-003',
    username: 'jane_smith',
    userId: 'user-002',
    timestamp: new Date('2025-11-03T09:45:00'),
    uploadTimestamp: new Date('2025-11-03T09:46:00'),
    merchant: 'Costco',
    barcode: '555666777888',
    latitude: undefined,
    longitude: undefined,
    storeLocation: undefined,
    imageFilename: 'costco_bread_003.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/0051BA/FFFFFF?text=Processing...',
    aiProcessed: false,
    aiError: undefined,
    aiResult: undefined,
    aiCost: undefined,
  },

  // User 2 - AI Failed
  {
    id: 'scan-004',
    username: 'jane_smith',
    userId: 'user-002',
    timestamp: new Date('2025-11-03T08:20:00'),
    uploadTimestamp: new Date('2025-11-03T08:21:00'),
    merchant: 'Whole Foods',
    barcode: '111222333444',
    latitude: 37.7949,
    longitude: -122.3994,
    storeLocation: 'Union Square',
    imageFilename: 'wholefoods_cheese_004.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/00843D/FFFFFF?text=Image+Too+Blurry',
    aiProcessed: false,
    aiError: 'Image quality too low - barcode area is blurry and unreadable',
    aiResult: undefined,
    aiCost: {
      totalCostUsd: 0.0015,
      inputTokens: 450,
      outputTokens: 0,
      totalTokens: 450,
      processingTimeMs: 1200,
      model: 'gpt-4o',
    },
  },

  // User 3 - AI Completed
  {
    id: 'scan-005',
    username: 'bob_wilson',
    userId: 'user-003',
    timestamp: new Date('2025-11-02T16:30:00'),
    uploadTimestamp: new Date('2025-11-02T16:31:00'),
    merchant: 'Safeway',
    barcode: '222333444555',
    latitude: 37.8049,
    longitude: -122.3894,
    storeLocation: 'Marina District',
    imageFilename: 'safeway_cereal_005.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/FF0000/FFFFFF?text=Cheerios',
    aiProcessed: true,
    aiError: undefined,
    aiResult: {
      title: 'Cheerios Original',
      price: '$3.49',
      category: 'Breakfast Cereal',
      brand: 'General Mills',
      size: '12 oz',
      description: 'Whole grain oat cereal',
      confidence: 0.95,
      processedAt: new Date('2025-11-02T16:32:10'),
      metadata: { source: 'gpt-4o', version: '2024-11' },
    },
    aiCost: {
      totalCostUsd: 0.0055,
      inputTokens: 1200,
      outputTokens: 95,
      totalTokens: 1295,
      processingTimeMs: 2450,
      model: 'gpt-4o',
    },
  },

  // User 3 - AI Completed (Low Confidence)
  {
    id: 'scan-006',
    username: 'bob_wilson',
    userId: 'user-003',
    timestamp: new Date('2025-11-02T15:10:00'),
    uploadTimestamp: new Date('2025-11-02T15:11:00'),
    merchant: 'Walmart',
    barcode: '333444555666',
    latitude: undefined,
    longitude: undefined,
    storeLocation: undefined,
    imageFilename: 'walmart_crackers_006.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/FFE135/000000?text=Crackers',
    aiProcessed: true,
    aiError: undefined,
    aiResult: {
      title: 'Ritz Crackers',
      price: '$2.79',
      category: 'Snacks',
      brand: 'Nabisco',
      size: '13.7 oz',
      description: 'Buttery round crackers',
      confidence: 0.65,
      processedAt: new Date('2025-11-02T15:12:05'),
      metadata: { source: 'gpt-4o', version: '2024-11' },
    },
    aiCost: {
      totalCostUsd: 0.0042,
      inputTokens: 980,
      outputTokens: 78,
      totalTokens: 1058,
      processingTimeMs: 2100,
      model: 'gpt-4o',
    },
  },

  // User 1 - AI Pending
  {
    id: 'scan-007',
    username: 'john_doe',
    userId: 'user-001',
    timestamp: new Date('2025-11-03T14:00:00'),
    uploadTimestamp: new Date('2025-11-03T14:01:00'),
    merchant: 'Target',
    barcode: '444555666777',
    latitude: 37.7749,
    longitude: -122.4194,
    storeLocation: 'San Francisco Store',
    imageFilename: 'target_pasta_007.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/CC0000/FFFFFF?text=Processing...',
    aiProcessed: false,
    aiError: undefined,
    aiResult: undefined,
    aiCost: undefined,
  },

  // User 2 - AI Completed
  {
    id: 'scan-008',
    username: 'jane_smith',
    userId: 'user-002',
    timestamp: new Date('2025-11-01T12:30:00'),
    uploadTimestamp: new Date('2025-11-01T12:31:00'),
    merchant: 'Costco',
    barcode: '666777888999',
    latitude: 37.7649,
    longitude: -122.4294,
    storeLocation: 'SoMa Location',
    imageFilename: 'costco_coffee_008.jpg',
    imageUrl: 'https://via.placeholder.com/400x300/0051BA/FFFFFF?text=Starbucks+Coffee',
    aiProcessed: true,
    aiError: undefined,
    aiResult: {
      title: 'Starbucks Pike Place Roast',
      price: '$12.99',
      category: 'Coffee',
      brand: 'Starbucks',
      size: '28 oz',
      description: 'Medium roast ground coffee',
      confidence: 0.89,
      processedAt: new Date('2025-11-01T12:32:20'),
      metadata: { source: 'gpt-4o', version: '2024-11' },
    },
    aiCost: {
      totalCostUsd: 0.0050,
      inputTokens: 1120,
      outputTokens: 88,
      totalTokens: 1208,
      processingTimeMs: 2280,
      model: 'gpt-4o',
    },
  },
];

// ================================
// Mock Dashboard Statistics
// ================================

export const mockDashboardStats: DashboardStats = {
  totalRecords: 8,
  aiCompleted: 5,
  aiPending: 2,
  aiFailed: 1,
  totalUsers: 3,
  totalAICostUsd: 0.0262, // Sum of all AI costs
  avgCostPerRecord: 0.0044,
  totalTokens: 7418,
};

// ================================
// Mock User Cost Statistics
// ================================

export const mockUserCostStats: UserCostStats[] = [
  {
    userId: 'user-001',
    username: 'john_doe',
    recordCount: 3,
    totalCostUsd: 0.0100,
    avgCostPerRecord: 0.0050,
    totalTokens: 2407,
    lastUploadDate: new Date('2025-11-03T14:01:00'),
  },
  {
    userId: 'user-002',
    username: 'jane_smith',
    recordCount: 3,
    totalCostUsd: 0.0065,
    avgCostPerRecord: 0.0032,
    totalTokens: 1658,
    lastUploadDate: new Date('2025-11-03T09:46:00'),
  },
  {
    userId: 'user-003',
    username: 'bob_wilson',
    recordCount: 2,
    totalCostUsd: 0.0097,
    avgCostPerRecord: 0.0049,
    totalTokens: 2353,
    lastUploadDate: new Date('2025-11-02T16:31:00'),
  },
];

// ================================
// Mock Data Utilities
// ================================

/**
 * Get scan record by ID
 */
export const getMockScanRecordById = (id: string): ScanRecord | undefined => {
  return mockScanRecords.find((record) => record.id === id);
};

/**
 * Get scan records by user ID
 */
export const getMockScanRecordsByUserId = (userId: string): ScanRecord[] => {
  return mockScanRecords.filter((record) => record.userId === userId);
};

/**
 * Get user by ID
 */
export const getMockUserById = (id: string): User | undefined => {
  return mockUsers.find((user) => user.id === id);
};

/**
 * Search scan records
 */
export const searchMockScanRecords = (keyword: string): ScanRecord[] => {
  const lowerKeyword = keyword.toLowerCase();
  return mockScanRecords.filter(
    (record) =>
      record.barcode.toLowerCase().includes(lowerKeyword) ||
      record.merchant.toLowerCase().includes(lowerKeyword) ||
      record.username.toLowerCase().includes(lowerKeyword) ||
      record.aiResult?.title?.toLowerCase().includes(lowerKeyword) ||
      record.aiResult?.brand?.toLowerCase().includes(lowerKeyword)
  );
};
