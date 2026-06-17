'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth-context';

/**
 * Wraps the app with our custom AuthProvider (replaces NextAuth SessionProvider).
 * Auth state is fetched from /api/auth?action=me on mount and held in context.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
