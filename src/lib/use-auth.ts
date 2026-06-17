'use client';

import { useAuth as useAuthContext } from './auth-context';

/**
 * Convenience hook for client-side permission checks.
 * Wraps the auth-context provider with permission helpers.
 * This replaces the old NextAuth useSession-based hook.
 */
export function useAuth() {
  const { user, loading } = useAuthContext();

  const hasPermission = (perm: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions.includes(perm);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    if (!user?.permissions) return false;
    return perms.some((p) => user.permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    if (!user?.permissions) return false;
    return perms.every((p) => user.permissions.includes(p));
  };

  const isAdmin = user?.role === 'admin';

  return {
    session: user ? { user } : null,
    status: loading ? 'loading' : (user ? 'authenticated' : 'unauthenticated'),
    update: async () => {},
    user,
    isAuthenticated: !!user,
    isLoading: loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
  };
}
