// lib/auth.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

/**
 * Get the user session from Next Auth
 * @param req Next.js request object
 * @returns User session or null if not authenticated
 */
export async function getSession(req?: NextRequest) {
  try {
    // Since we don't have exported authOptions, just call getServerSession directly
    const session = await getServerSession();
    return session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Check if a user has a specific permission
 * @param session User session
 * @param permission Permission to check
 * @returns Whether the user has the permission
 */
export async function hasPermission(
  session: any, 
  permission: string
): Promise<boolean> {
  // If no session, user doesn't have permission
  if (!session || !session.user || !session.user.role) {
    return false;
  }
  
  // Import roles dynamically to avoid circular dependencies
  const { ROLE_PERMISSIONS } = await import('./roles');
  
  // Check if the user's role has the permission
  const userRole = session.user.role;
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  
  if (!permissions) {
    return false;
  }
  
  return Boolean(permissions[permission as keyof typeof permissions]);
}

/**
 * Check if a user is an admin
 * @param session User session
 * @returns Whether the user is an admin
 */
export async function isAdmin(session: any): Promise<boolean> {
  if (!session || !session.user || !session.user.role) {
    return false;
  }
  
  return session.user.role === 'admin';
}