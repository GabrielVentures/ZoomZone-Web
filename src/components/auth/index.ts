/**
 * Auth Components and Utilities
 * Centralized exports for authentication and authorization
 */

// Components
export { RequireRole } from './RequireRole';
export type { RequireRoleProps, UserRole } from './RequireRole';

// Role checking utilities
export {
  hasRolePermission,
  isAdmin,
  canWrite,
  isReadOnly,
} from './RequireRole';

// Hooks
export { usePermission, useActionPermission, canPerformAction } from '../../hooks/usePermission';
export type { PermissionState, ResourceAction } from '../../hooks/usePermission';
