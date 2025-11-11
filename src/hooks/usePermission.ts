/**
 * usePermission Hook
 * Custom hook for programmatic permission checks
 * Provides easy access to user role and permission utilities
 */

import { usePermissions } from '@refinedev/core';
import { useMemo } from 'react';
import { UserRole, hasRolePermission, isAdmin, canWrite, isReadOnly } from '@/components/auth/RequireRole';

// ================================
// Types
// ================================

export interface PermissionState {
  /** Current user role */
  role: UserRole | null;

  /** Whether permission data is loading */
  isLoading: boolean;

  /** Check if user has any of the specified roles */
  hasRole: (roles: UserRole[]) => boolean;

  /** Check if user is admin */
  isAdmin: boolean;

  /** Check if user can perform write operations */
  canWrite: boolean;

  /** Check if user is read-only */
  isReadOnly: boolean;
}

// ================================
// usePermission Hook
// ================================

/**
 * Hook for checking user permissions
 *
 * @example
 * ```tsx
 * const { isAdmin, canWrite, hasRole } = usePermission();
 *
 * if (isAdmin) {
 *   // Show admin-only features
 * }
 *
 * if (canWrite) {
 *   // Enable edit/delete buttons
 * }
 *
 * if (hasRole(['admin', 'user'])) {
 *   // Show content for admin and user
 * }
 * ```
 */
export const usePermission = (): PermissionState => {
  const { data: role, isLoading } = usePermissions<UserRole>();

  // Memoize permission checks to avoid unnecessary recalculations
  const permissionState = useMemo<PermissionState>(() => {
    return {
      role: role || null,
      isLoading,
      hasRole: (roles: UserRole[]) => hasRolePermission(role, roles),
      isAdmin: isAdmin(role),
      canWrite: canWrite(role),
      isReadOnly: isReadOnly(role),
    };
  }, [role, isLoading]);

  return permissionState;
};

// ================================
// Action-based Permission Checks
// ================================

/**
 * Check if user can perform a specific action on a resource
 * This provides more granular control than role-based checks
 */
export interface ResourceAction {
  resource: string;
  action: 'list' | 'show' | 'create' | 'edit' | 'delete';
}

/**
 * Define permissions for each role and resource
 * This can be extended based on your application needs
 */
const ROLE_PERMISSIONS: Record<UserRole, Record<string, string[]>> = {
  admin: {
    scan_records: ['list', 'show', 'create', 'edit', 'delete'],
    users: ['list', 'show', 'create', 'edit', 'delete'],
    settings: ['list', 'show', 'edit'],
    dashboard: ['list', 'show'],
  },
  user: {
    scan_records: ['list', 'show', 'create'],
    users: ['show'],
    settings: ['show'],
    dashboard: ['show'],
  },
  viewer: {
    scan_records: ['list', 'show'],
    users: [],
    settings: [],
    dashboard: ['show'],
  },
  mobile_user: {
    scan_records: ['list', 'show', 'create'],
    users: [],
    settings: [],
    dashboard: [],
  },
};

/**
 * Check if user can perform an action on a resource
 */
export const canPerformAction = (
  role: UserRole | null | undefined,
  resource: string,
  action: string
): boolean => {
  if (!role) return false;

  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
};

/**
 * Hook for checking action-based permissions
 */
export const useActionPermission = (resource: string, action: string): boolean => {
  const { role } = usePermission();
  return useMemo(() => canPerformAction(role, resource, action), [role, resource, action]);
};
