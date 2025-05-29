// component/Common/AuthGuard.tsx (Updated with encryption access check)
"use client"

import React, { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/roles';

interface AuthGuardProps {
  children: ReactNode;
  requiredPermission?: keyof typeof ROLE_PERMISSIONS.admin;
  requiresEncryptionAccess?: boolean;
  fallbackUrl?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredPermission,
  requiresEncryptionAccess = false,
  fallbackUrl = '/wall-e'
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set that we're on the client side
    setIsClient(true);
    
    // Check if the user is authenticated
    if (status === 'unauthenticated') {
      router.push(`${fallbackUrl}?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    // Check permission if required and session is available
    if (status === 'authenticated' && session) {
      const userRole = (session.user?.role as UserRole) || 'finance'; // Default to lowest permission

      // No specific permission required, just authentication
      if (!requiredPermission && !requiresEncryptionAccess) {
        setAuthorized(true);
        return;
      }

      // Check if user has the required permission
      const hasPermission = requiredPermission ? ROLE_PERMISSIONS[userRole]?.[requiredPermission] : true;
      
      // Admin-only check for encryption access
      const hasEncryptionAccess = !requiresEncryptionAccess || userRole === 'admin';
      
      if (hasPermission && hasEncryptionAccess) {
        setAuthorized(true);
      } else {
        console.warn(`User ${session.user?.email} with role ${userRole} lacks permission: ${requiredPermission || 'encryption access'}`);
        router.push('/unauthorized');
      }
    }
  }, [session, status, router, requiredPermission, requiresEncryptionAccess, fallbackUrl]);

  // Show loading state during authentication check
  if (!isClient || status === 'loading' || !authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // User is authorized
  return <>{children}</>;
};