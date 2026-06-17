'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  twoFactorEnabled: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, totp?: string) => Promise<{ requires2FA?: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth?action=me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, totp?: string) => {
    const res = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'فشل تسجيل الدخول' };
    }
    if (data.requires2FA) {
      return { requires2FA: true };
    }
    if (data.user) {
      setUser(data.user);
      return {};
    }
    return { error: 'استجابة غير متوقعة' };
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth?action=logout', { method: 'POST' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Role-based permission helper
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'مدير عام',
  ADMIN: 'مدير',
  ACCOUNTANT: 'محاسب',
  ANALYST: 'محلل',
  VIEWER: 'مشاهد',
};

export const ROLE_ORDER = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'ANALYST', 'VIEWER'];

// Check if user has permission (simplified — actual permissions are in DB)
export function hasPermission(userRole: string, required: string): boolean {
  if (userRole === 'SUPER_ADMIN') return true;
  // Basic role hierarchy
  const roleLevel: Record<string, number> = {
    SUPER_ADMIN: 5, ADMIN: 4, ACCOUNTANT: 3, ANALYST: 2, VIEWER: 1,
  };
  const requiredLevel: Record<string, number> = {
    'admin': 4, 'write': 3, 'read': 1,
  };
  const userLevel = roleLevel[userRole] || 0;
  const needLevel = requiredLevel[required] || 0;
  return userLevel >= needLevel;
}
