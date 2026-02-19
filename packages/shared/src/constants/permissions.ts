export type AccessLevel = 'FULL' | 'CREATE_EDIT' | 'VIEW' | 'NONE';

export interface PermissionMatrix {
  [module: string]: {
    [role: string]: AccessLevel;
  };
}

/**
 * Role-based access control permission matrix.
 *
 * This is the single source of truth — shared between backend (guard enforcement)
 * and frontend (UI rendering). Do not duplicate; import from @exim/shared.
 *
 * Access levels:
 *   FULL        — read, create, edit, delete, admin actions
 *   CREATE_EDIT — read, create, edit (no delete or admin)
 *   VIEW        — read-only
 *   NONE        — no access (UI hidden, API returns 403)
 */
export const PERMISSION_MATRIX: PermissionMatrix = {
  dashboard: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'VIEW',
    EXPORT_MANAGER: 'VIEW',
    IMPORT_MANAGER: 'VIEW',
    SALES_MANAGER: 'VIEW',
    PURCHASE_MANAGER: 'VIEW',
    INVENTORY_MANAGER: 'VIEW',
    DATA_ENTRY: 'VIEW',
    VIEWER: 'VIEW',
  },
  exports: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'VIEW',
    EXPORT_MANAGER: 'FULL',
    IMPORT_MANAGER: 'VIEW',
    SALES_MANAGER: 'CREATE_EDIT',
    PURCHASE_MANAGER: 'NONE',
    INVENTORY_MANAGER: 'VIEW',
    DATA_ENTRY: 'CREATE_EDIT',
    VIEWER: 'VIEW',
  },
  imports: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'VIEW',
    EXPORT_MANAGER: 'VIEW',
    IMPORT_MANAGER: 'FULL',
    SALES_MANAGER: 'NONE',
    PURCHASE_MANAGER: 'CREATE_EDIT',
    INVENTORY_MANAGER: 'VIEW',
    DATA_ENTRY: 'CREATE_EDIT',
    VIEWER: 'VIEW',
  },
  payments: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'FULL',
    EXPORT_MANAGER: 'VIEW',
    IMPORT_MANAGER: 'VIEW',
    SALES_MANAGER: 'VIEW',
    PURCHASE_MANAGER: 'VIEW',
    INVENTORY_MANAGER: 'NONE',
    DATA_ENTRY: 'NONE',
    VIEWER: 'VIEW',
  },
  reports: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'FULL',
    EXPORT_MANAGER: 'VIEW',
    IMPORT_MANAGER: 'VIEW',
    SALES_MANAGER: 'VIEW',
    PURCHASE_MANAGER: 'VIEW',
    INVENTORY_MANAGER: 'VIEW',
    DATA_ENTRY: 'NONE',
    VIEWER: 'VIEW',
  },
  settings: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'NONE',
    EXPORT_MANAGER: 'NONE',
    IMPORT_MANAGER: 'NONE',
    SALES_MANAGER: 'NONE',
    PURCHASE_MANAGER: 'NONE',
    INVENTORY_MANAGER: 'NONE',
    DATA_ENTRY: 'NONE',
    VIEWER: 'NONE',
  },
  users: {
    ADMIN: 'FULL',
    ACCOUNTANT: 'NONE',
    EXPORT_MANAGER: 'NONE',
    IMPORT_MANAGER: 'NONE',
    SALES_MANAGER: 'NONE',
    PURCHASE_MANAGER: 'NONE',
    INVENTORY_MANAGER: 'NONE',
    DATA_ENTRY: 'NONE',
    VIEWER: 'NONE',
  },
};

export const ALL_ROLES = [
  'ADMIN', 'ACCOUNTANT', 'EXPORT_MANAGER', 'IMPORT_MANAGER',
  'SALES_MANAGER', 'PURCHASE_MANAGER', 'INVENTORY_MANAGER', 'DATA_ENTRY', 'VIEWER',
] as const;

export const ALL_MODULES = [
  'dashboard', 'exports', 'imports', 'payments', 'reports', 'settings', 'users',
] as const;
