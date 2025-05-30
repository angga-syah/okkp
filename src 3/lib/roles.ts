// src/lib/roles.ts
export type UserRole = 'admin' | 'finance' | 'content_editor';

export interface RolePermissions {
  canViewDashboard: boolean;
  canEditOrders: boolean;
  canDeleteOrders: boolean;
  canExportData: boolean;
  canUploadResults: boolean;
  canRequestRevision: boolean;
  canAddAdmin: boolean;
  canChangeStatus: boolean;
  canManageContent: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canEditOrders: true,
    canDeleteOrders: true,
    canExportData: true,
    canUploadResults: true,
    canRequestRevision: true,
    canAddAdmin: true,
    canChangeStatus: true,
    canManageContent: false 
  },
  finance: {
    canViewDashboard: true,
    canEditOrders: false,
    canDeleteOrders: false,
    canExportData: true,
    canUploadResults: false,
    canRequestRevision: false,
    canAddAdmin: false,
    canChangeStatus: false,
    canManageContent: false
  },
  content_editor: {
    canViewDashboard: true,
    canEditOrders: false,
    canDeleteOrders: false,
    canExportData: false,
    canUploadResults: false,
    canRequestRevision: false,
    canAddAdmin: false,
    canChangeStatus: false,
    canManageContent: true
  }
};

// Helper function to check if a role exists
export function isValidRole(role: string): role is UserRole {
  return ['admin', 'finance', 'content_editor'].includes(role);
}

// Helper function to get permissions for a role
export function getPermissionsForRole(role: UserRole): RolePermissions {
  const permissions = ROLE_PERMISSIONS[role];
  
  if (!permissions) {
    // Opsi 1: Throw error (hanya jika dipanggil dari kode yang menangani error)
    throw new Error(`Invalid role: ${role}. Please contact administrator.`);
    
    // Opsi 2: Log warning dan return permissions kosong dengan semua izin false
    // console.warn(`Invalid role detected: ${role}. User should contact administrator.`);
    // return {
    //   canViewDashboard: false,
    //   canEditOrders: false,
    //   canDeleteOrders: false,
    //   canExportData: false,
    //   canUploadResults: false,
    //   canRequestRevision: false,
    //   canAddAdmin: false,
    //   canChangeStatus: false,
    //   canManageContent: false
    // };
  }
  
  return permissions;
}