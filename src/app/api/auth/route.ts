// Auth API: handles login, logout, session validation
// Uses Supabase REST API via db-repo (NOT Prisma — Prisma has connection issues in this env)
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserRepo, logAudit, RolesConfigRepo, TwoFactorRepo } from '@/lib/db-repo';
import { verifyTOTP } from '@/lib/auth-utils';
import { getMergedRolePermissions, getMergedRoleNameAr, getMergedRoleColor, PERMISSION_KEYS } from '@/lib/permissions';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Session token expiration: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// We store sessions in Supabase AuditLog table as a workaround (since we don't have
// a dedicated Session table accessible via REST). Format:
// action: 'session.create' / 'session.delete'
// entityType: 'Session'
// entityId: sessionToken
// changes: { userId, expiresAt, data }
// We'll query AuditLog entries with action='session.create' to validate sessions.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzwspnhvqimaojtdecwt.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6d3Nwbmh2cWltYW9qdGRlY3d0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTYxNjA4MSwiZXhwIjoyMDk3MTkyMDgxfQ.ZpGvPWbxDJAg5UKxMqtO_ZdioX36EMKmLvEtPZOVPtk';
const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Session storage helpers (using AuditLog table)
async function createSession(userId: string, role: string, name: string, email: string): Promise<string> {
  const sessionToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  await supabaseAdmin.from('AuditLog').insert({
    id: uuidv4(),
    userId,
    action: 'session.create',
    entityType: 'Session',
    entityId: sessionToken,
    changes: JSON.stringify({ userId, expiresAt: expiresAt.toISOString(), data: { role, name, email } }),
    ipAddress: null,
    userAgent: null,
    createdAt: new Date().toISOString(),
  });
  return sessionToken;
}

async function getSession(sessionToken: string) {
  if (!sessionToken) return null;
  const { data, error } = await supabaseAdmin
    .from('AuditLog')
    .select('*')
    .eq('action', 'session.create')
    .eq('entityId', sessionToken)
    .maybeSingle();
  if (error || !data) return null;
  try {
    const changes = JSON.parse(data.changes);
    if (new Date(changes.expiresAt) < new Date()) return null; // expired
    return { ...data, parsed: changes };
  } catch { return null; }
}

async function deleteSession(sessionToken: string): Promise<void> {
  await supabaseAdmin.from('AuditLog').delete().eq('action', 'session.create').eq('entityId', sessionToken);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'login';
  const body = await req.json().catch(() => ({}));

  // ============ LOGIN ============
  if (action === 'login') {
    const { email, password, totp } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' }, { status: 400 });
    }

    const user = await UserRepo.findByEmail(email.toLowerCase().trim());
    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    if (!await bcrypt.compare(password, user.passwordHash)) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    // Check 2FA via TwoFactorRepo (HoldingGroup.description JSON storage)
    const totpSecret = await TwoFactorRepo.getSecret(user.id).catch(() => null);
    const has2FA = !!totpSecret && !totpSecret.startsWith('pending:');
    if (has2FA) {
      if (!totp) {
        return NextResponse.json({ requires2FA: true, message: 'يرجى إدخال رمز التحقق الثنائي' }, { status: 200 });
      }
      if (!verifyTOTP(totpSecret!, totp)) {
        return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 401 });
      }
    }

    // Touch login timestamp
    await UserRepo.touchLogin(user.id);

    // Create session
    const sessionToken = await createSession(user.id, user.role, user.name || '', user.email);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

    // Load roles config for proper permission computation
    const dbRolesConfig = await RolesConfigRepo.load().catch(() => null);
    const perms = getMergedRolePermissions(user.role, dbRolesConfig).filter((p) => PERMISSION_KEYS.includes(p));

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      changes: { email: user.email, role: user.role },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.nameAr,
        role: user.role,
        roleNameAr: getMergedRoleNameAr(user.role, dbRolesConfig),
        roleColor: getMergedRoleColor(user.role, dbRolesConfig),
        permissions: perms,
        status: user.isActive ? 'active' : 'suspended',
      },
    });
    res.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
    return res;
  }

  // ============ LOGOUT ============
  if (action === 'logout') {
    const token = req.cookies.get('session_token')?.value;
    if (token) await deleteSession(token).catch(() => {});
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('session_token');
    return res;
  }

  // ============ ME (current user) ============
  if (action === 'me') {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });
    const session = await getSession(token);
    if (!session) return NextResponse.json({ user: null }, { status: 200 });
    const user = await UserRepo.findById(session.parsed.userId);
    if (!user || !user.isActive) return NextResponse.json({ user: null }, { status: 200 });

    const dbRolesConfig = await RolesConfigRepo.load().catch(() => null);
    const perms = getMergedRolePermissions(user.role, dbRolesConfig).filter((p) => PERMISSION_KEYS.includes(p));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.nameAr,
        role: user.role,
        roleNameAr: getMergedRoleNameAr(user.role, dbRolesConfig),
        roleColor: getMergedRoleColor(user.role, dbRolesConfig),
        permissions: perms,
        status: user.isActive ? 'active' : 'suspended',
      },
    });
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  // GET = me
  return POST(new NextRequest(new URL('/api/auth?action=me', req.url), req));
}
