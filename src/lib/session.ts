// Unified session helper — replaces getServerSession from NextAuth.
// Reads the `session_token` cookie set by /api/auth?action=login
// Returns the same shape as NextAuth's session for compatibility.

import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UserRepo, RolesConfigRepo, type Session, type SessionUser } from './db-repo';
import { getMergedRolePermissions, getMergedRoleNameAr, getMergedRoleColor, PERMISSION_KEYS } from './permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzwspnhvqimaojtdecwt.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6d3Nwbmh2cWltYW9qdGRlY3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYxNjA4MSwiZXhwIjoyMDk3MTkyMDgxfQ.ZpGvPWbxDJAg5UKxMqtO_ZdioX36EMKmLvEtPZOVPtk';
const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// In-memory cache for sessions (per-request) to avoid duplicate DB lookups
const sessionCache = new Map<string, { session: Session | null; expiry: number }>();

export async function getSession(req?: NextRequest | any): Promise<Session | null> {
  // Get session_token cookie from NextRequest or NextResponse cookies
  let token: string | undefined;
  if (req?.cookies?.get) {
    token = req.cookies.get('session_token')?.value;
  }
  if (!token) return null;

  // Check cache
  const cached = sessionCache.get(token);
  if (cached && cached.expiry > Date.now()) {
    return cached.session;
  }

  // Look up session in AuditLog table (sessions are stored as audit log entries)
  const { data, error } = await supabaseAdmin
    .from('AuditLog')
    .select('*')
    .eq('action', 'session.create')
    .eq('entityId', token)
    .maybeSingle();
  if (error || !data) {
    sessionCache.set(token, { session: null, expiry: Date.now() + 5000 });
    return null;
  }
  let parsed: any;
  try {
    parsed = JSON.parse(data.changes);
  } catch {
    sessionCache.set(token, { session: null, expiry: Date.now() + 5000 });
    return null;
  }
  if (new Date(parsed.expiresAt) < new Date()) {
    sessionCache.set(token, { session: null, expiry: Date.now() + 5000 });
    return null;
  }

  // Fetch user to get fresh permissions
  const user = await UserRepo.findById(parsed.userId);
  if (!user || !user.isActive) {
    sessionCache.set(token, { session: null, expiry: Date.now() + 5000 });
    return null;
  }

  // Compute permissions using merged roles
  const dbRolesConfig = await RolesConfigRepo.load().catch(() => null);
  const perms = getMergedRolePermissions(user.role, dbRolesConfig).filter((p) => PERMISSION_KEYS.includes(p));

  const session: Session = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || user.nameAr || user.email,
      role: user.role,
      roleNameAr: getMergedRoleNameAr(user.role, dbRolesConfig),
      roleColor: getMergedRoleColor(user.role, dbRolesConfig),
      permissions: perms,
      status: user.isActive ? 'active' : 'suspended',
    },
  };
  // Cache for 30 seconds
  sessionCache.set(token, { session, expiry: Date.now() + 30000 });
  return session;
}
