// Auth API: handles login, logout, session validation, 2FA
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, verifyTOTP, generateTOTPSecret, generateOTPAuthURL } from '@/lib/auth-utils';
import { randomBytes } from 'crypto';

// Session token expiration: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

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

    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'بيانات الدخول غير صحيحة' }, { status: 401 });
    }

    // If 2FA enabled, require TOTP
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!totp) {
        return NextResponse.json({ requires2FA: true, message: 'يرجى إدخال رمز التحقق الثنائي' }, { status: 200 });
      }
      if (!verifyTOTP(user.twoFactorSecret, totp)) {
        return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 401 });
      }
    }

    // Create session
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
    await db.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expiresAt,
        data: JSON.stringify({ role: user.role, name: user.name, email: user.email }),
      },
    });

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Audit log
    await db.auditLog.create({
      data: { userId: user.id, action: 'auth.login', ip: req.headers.get('x-forwarded-for') || 'unknown' },
    });

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, image: user.image },
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
    if (token) {
      await db.session.deleteMany({ where: { sessionToken: token } }).catch(() => {});
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('session_token');
    return res;
  }

  // ============ ME (current user) ============
  if (action === 'me') {
    const token = req.cookies.get('session_token')?.value;
    if (!token) return NextResponse.json({ user: null }, { status: 200 });
    const session = await db.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
    if (!session || session.expiresAt < new Date() || !session.user.isActive) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        image: session.user.image,
        twoFactorEnabled: session.user.twoFactorEnabled,
      },
    });
  }

  // ============ SETUP 2FA ============
  if (action === '2fa-setup') {
    const token = req.cookies.get('session_token')?.value;
    const session = await db.session.findUnique({ where: { sessionToken: token || '' }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    const secret = generateTOTPSecret();
    const otpauthUrl = generateOTPAuthURL(secret, session.user.email);
    // Save secret temporarily (not enabled yet — user must verify a code first)
    await db.user.update({ where: { id: session.user.id }, data: { twoFactorSecret: secret } });
    return NextResponse.json({ secret, otpauthUrl });
  }

  // ============ ENABLE 2FA (after verifying a code) ============
  if (action === '2fa-enable') {
    const token = req.cookies.get('session_token')?.value;
    const { totp } = body;
    const session = await db.session.findUnique({ where: { sessionToken: token || '' }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    if (!session.user.twoFactorSecret) {
      return NextResponse.json({ error: 'يرجى إعداد 2FA أولاً' }, { status: 400 });
    }
    if (!verifyTOTP(session.user.twoFactorSecret, totp)) {
      return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
    }
    await db.user.update({ where: { id: session.user.id }, data: { twoFactorEnabled: true } });
    return NextResponse.json({ ok: true });
  }

  // ============ DISABLE 2FA ============
  if (action === '2fa-disable') {
    const token = req.cookies.get('session_token')?.value;
    const { totp } = body;
    const session = await db.session.findUnique({ where: { sessionToken: token || '' }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    if (session.user.twoFactorEnabled && session.user.twoFactorSecret) {
      if (!verifyTOTP(session.user.twoFactorSecret, totp)) {
        return NextResponse.json({ error: 'رمز التحقق غير صحيح' }, { status: 400 });
      }
    }
    await db.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  // GET = me
  return POST(new NextRequest(new URL('/api/auth?action=me', req.url), req));
}
