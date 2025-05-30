// src/lib/Permissions.ts
import { useSession } from 'next-auth/react';
import { ROLE_PERMISSIONS, UserRole, RolePermissions } from './roles';

export function usePermissions(): RolePermissions {
  const { data: session } = useSession();
  const userRole = (session?.user?.role as UserRole) || 'finance';
  
  return ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.finance; 
}