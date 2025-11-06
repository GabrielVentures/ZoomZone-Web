/**
 * Mock Data Provider for Refine
 * Simulates Firebase Firestore until real connection is established
 */

import { DataProvider, LogicalFilter, CrudFilter } from '@refinedev/core';
import {
  mockScanRecords,
  mockUsers,
  mockDashboardStats,
  mockUserCostStats,
  getMockScanRecordById,
  searchMockScanRecords,
} from '@/mocks/scanRecords';

// Debug: Log data on module load
console.log('🚀 [MockProvider] Module loaded');
console.log(`🚀 [MockProvider] mockScanRecords.length = ${mockScanRecords.length}`);
console.log(`🚀 [MockProvider] First record:`, mockScanRecords[0]);

/**
 * Type guard to check if filter is a LogicalFilter
 */
const isLogicalFilter = (filter: CrudFilter): filter is LogicalFilter => {
  return 'field' in filter;
};

/**
 * Mock data provider that simulates Firestore operations
 */
export const mockDataProvider: DataProvider = {
  // Get list of resources
  getList: async ({ resource, pagination, filters, sorters }) => {
    console.log('📦 [MockProvider] getList:', { resource, pagination, filters, sorters });

    // Handle different resources
    switch (resource) {
      case 'scan_records': {
        let data = [...mockScanRecords];

        // Apply filters
        if (filters && filters.length > 0) {
          filters.forEach((filter) => {
            if (!isLogicalFilter(filter)) return;

            if (filter.field === 'q' && filter.value) {
              // Search
              data = searchMockScanRecords(filter.value as string);
            } else if (filter.field === 'aiStatus' && filter.value) {
              // Filter by AI status
              data = data.filter((record) => {
                if (filter.value === 'completed') return record.aiProcessed && record.aiResult;
                if (filter.value === 'pending') return !record.aiProcessed && !record.aiError;
                if (filter.value === 'failed') return !record.aiProcessed && record.aiError;
                return true;
              });
            } else if (filter.field === 'merchant' && filter.value) {
              // Filter by merchant
              data = data.filter((record) => record.merchant === filter.value);
            } else if (filter.field === 'username' && filter.value) {
              // Filter by username
              data = data.filter((record) => record.username === filter.value);
            }
          });
        }

        // Apply sorting
        if (sorters && sorters.length > 0) {
          const sorter = sorters[0];
          data.sort((a, b) => {
            const aValue = a[sorter.field as keyof typeof a];
            const bValue = b[sorter.field as keyof typeof b];

            if (aValue instanceof Date && bValue instanceof Date) {
              return sorter.order === 'asc'
                ? aValue.getTime() - bValue.getTime()
                : bValue.getTime() - aValue.getTime();
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return sorter.order === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            }

            return 0;
          });
        }

        // Apply pagination
        const { current = 1, pageSize = 10 } = pagination || {};
        const start = (current - 1) * pageSize;
        const end = start + pageSize;
        const paginatedData = data.slice(start, end);

        return {
          data: paginatedData as any,
          total: data.length,
        };
      }

      case 'users': {
        const { current = 1, pageSize = 10 } = pagination || {};
        const start = (current - 1) * pageSize;
        const end = start + pageSize;

        return {
          data: mockUsers.slice(start, end) as any,
          total: mockUsers.length,
        };
      }

      case 'user_cost_stats': {
        const { current = 1, pageSize = 10 } = pagination || {};
        const start = (current - 1) * pageSize;
        const end = start + pageSize;

        return {
          data: mockUserCostStats.slice(start, end) as any,
          total: mockUserCostStats.length,
        };
      }

      default:
        return {
          data: [] as any,
          total: 0,
        };
    }
  },

  // Get one resource by ID
  getOne: async ({ resource, id }) => {
    console.log('📦 [MockProvider] getOne:', { resource, id });

    switch (resource) {
      case 'scan_records': {
        const record = getMockScanRecordById(id as string);
        if (!record) {
          throw new Error(`Scan record with ID ${id} not found`);
        }
        return { data: record as any };
      }

      case 'users': {
        const user = mockUsers.find((u) => u.id === id);
        if (!user) {
          throw new Error(`User with ID ${id} not found`);
        }
        return { data: user as any };
      }

      default:
        throw new Error(`Resource ${resource} not found`);
    }
  },

  // Create a new resource
  create: async ({ resource, variables }) => {
    console.log('📦 [MockProvider] create:', { resource, variables });

    // Mock creation - just return the variables with a generated ID
    return {
      data: {
        id: `mock-${Date.now()}`,
        ...variables,
      } as any,
    };
  },

  // Update a resource
  update: async ({ resource, id, variables }) => {
    console.log('📦 [MockProvider] update:', { resource, id, variables });

    // Mock update - just return the variables
    return {
      data: {
        id,
        ...variables,
      } as any,
    };
  },

  // Delete a resource
  deleteOne: async ({ resource, id }) => {
    console.log('📦 [MockProvider] deleteOne:', { resource, id });

    // Mock delete - just return the ID
    return {
      data: { id } as any,
    };
  },

  // Get API URL
  getApiUrl: () => 'https://mock-api.shelftag-snap.com',

  // Custom method - Get dashboard statistics
  custom: async ({ url, method, payload }) => {
    console.log('📦 [MockProvider] custom:', { url, method, payload });

    if (url === '/dashboard/stats') {
      return {
        data: mockDashboardStats as any,
      };
    }

    if (url === '/dashboard/user-costs') {
      return {
        data: mockUserCostStats as any,
      };
    }

    throw new Error(`Custom endpoint ${url} not implemented in mock provider`);
  },
};
