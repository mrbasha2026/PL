'use client';

import { useSession } from 'next-auth/react';

/**
 * Convenience hook for client-side permission checks.
 * Returns the session plus helper functions.
 */
export function useAuth() {
  const { data: session, status, update } = useSession();

  const hasPermission = (perm: string): boolean => {
    if (!session?.user?.permissions) return false;
    return session.user.permissions.includes(perm);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (!session?.user?.permissions) return false;
    return perms.some((p) => session.user.permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (!session?.user?.permissions) return false;
    return perms.every((p) => session.user.permissions.includes(p));
  };

  const isAdmin = session?.user?.roleName === 'admin';

  return {
    session,
    status, // 'loading' | 'authenticated' | 'unauthenticated'
    update,
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
  };
}
