/**
 * RequireRole Component
 * Implements role-based access control (RBAC)
 * Restricts access to components based on user roles
 */

import React from 'react';
import { usePermissions } from '@refinedev/core';
import { Navigate } from 'react-router-dom';
import { Spin, Result } from 'antd';
import { LockOutlined } from '@ant-design/icons';

// ================================
// Types
// ================================

/**
 * User roles in the system
 *
 * WebAdmin roles (can login to WebAdmin):
 * - admin: Full access (read, write, delete, user management)
 * - user: Can view and create records
 * - viewer: Read-only access
 *
 * Mobile-only roles (cannot login to WebAdmin):
 * - mobile_user: iOS app users (public users, cannot access WebAdmin)
 */
export type UserRole = 'admin' | 'user' | 'viewer' | 'mobile_user';

/**
 * Roles that are allowed to access WebAdmin
 */
export const WEB_ADMIN_ROLES: UserRole[] = ['admin', 'user', 'viewer'];

export interface RequireRoleProps {
  /**
   * List of roles that are allowed to access the component
   * User must have at least one of these roles
   */
  roles: UserRole[];

  /**
   * Child components to render if user has permission
   */
  children: React.ReactNode;

  /**
   * Where to redirect if user doesn't have permission
   * Default: '/unauthorized'
   */
  redirectTo?: string;

  /**
   * Whether to show unauthorized message inline instead of redirecting
   * Default: false
   */
  showInline?: boolean;
}

// ================================
// RequireRole Component
// ================================

/**
 * Wraps components that require specific roles to access
 *
 * @example
 * ```tsx
 * // Only admins can access
 * <RequireRole roles={['admin']}>
 *   <AdminDashboard />
 * </RequireRole>
 *
 * // Admins and users can access
 * <RequireRole roles={['admin', 'user']}>
 *   <UserContent />
 * </RequireRole>
 * ```
 */
export const RequireRole: React.FC<RequireRoleProps> = ({
  roles,
  children,
  redirectTo = '/unauthorized',
  showInline = false,
}) => {
  const { data: userRole, isLoading } = usePermissions<UserRole>();

  // Show loading spinner while checking permissions
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
        }}
      >
        <Spin size="large" tip="Checking permissions..." />
      </div>
    );
  }

  // Check if user has required role
  const hasPermission = userRole && roles.includes(userRole);

  if (!hasPermission) {
    console.warn(
      `🔒 [RequireRole] Access denied. Required roles: [${roles.join(', ')}], User role: ${userRole || 'none'}`
    );

    // Show inline unauthorized message
    if (showInline) {
      return (
        <Result
          status="403"
          icon={<LockOutlined />}
          title="Access Denied"
          subTitle={`You need one of the following roles to access this content: ${roles.join(', ')}`}
        />
      );
    }

    // Redirect to unauthorized page
    return <Navigate to={redirectTo} replace />;
  }

  // User has permission, render children
  return <>{children}</>;
};

// ================================
// Role Checking Utilities
// ================================

/**
 * Check if a role has permission for a specific action
 * Used for fine-grained permission checks
 */
export const hasRolePermission = (
  userRole: UserRole | null | undefined,
  allowedRoles: UserRole[]
): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Check if user is admin
 * Convenience function for common check
 */
export const isAdmin = (userRole: UserRole | null | undefined): boolean => {
  return userRole === 'admin';
};

/**
 * Check if user can perform write operations
 * Admins and users can write, viewers cannot
 */
export const canWrite = (userRole: UserRole | null | undefined): boolean => {
  return userRole === 'admin' || userRole === 'user';
};

/**
 * Check if user can only read
 * Viewers can only read
 */
export const isReadOnly = (userRole: UserRole | null | undefined): boolean => {
  return userRole === 'viewer';
};
