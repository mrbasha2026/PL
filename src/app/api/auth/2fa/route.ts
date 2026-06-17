import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { TwoFactorRepo, logAudit } from '@/lib/db-repo';
import { generateTOTPSecret, verifyTOTP, generateOTPAuthURL } from '@/lib/auth-utils';

// POST /api/auth/2fa — setup or verify or disable 2FA
// Body: { action: 'setup' | 'verify' | 'disable', code?: string }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    }

    const body = await req.json();
    const { action, code } = body;
    const userId = session.user.id;
    const email = session.user.email || '';

    // Action: setup — generate a new TOTP secret and return QR code URI
    if (action === 'setup') {
      // Don't allow setup if already enabled (must disable first)
      const existing = await TwoFactorRepo.getSecret(userId);
      if (existing) {
        return NextResponse.json({ error: 'المصادقة الثنائية مفعّلة بالفعل — عطّلها أولاً لإعادة الإعداد' }, { status: 400 });
      }
      const secret = generateTOTPSecret();
      const uri = generateOTPAuthURL(secret, email, 'Dealz Tree');
      // Store as pending — not yet verified
      await TwoFactorRepo.setSecret(userId, `pending:${secret}`);
      return NextResponse.json({
        secret,
        uri,
        message: 'امسح QR code بتطبيق المصادقة (Google Authenticator / Authy) ثم أدخل الرمز المولّد',
      });
    }

    // Action: verify — confirm the user can generate correct TOTP codes
    if (action === 'verify') {
      if (!code) return NextResponse.json({ error: 'الرمز مطلوب' }, { status: 400 });
      const stored = await TwoFactorRepo.getSecret(userId);
      if (!stored) return NextResponse.json({ error: 'لا يوجد إعداد قيد التقدم' }, { status: 400 });
      if (!stored.startsWith('pending:')) {
        return NextResponse.json({ error: 'المصادقة الثنائية مفعّلة بالفعل' }, { status: 400 });
      }
      const secret = stored.replace('pending:', '');
      if (!verifyTOTP(secret, code)) {
        return NextResponse.json({ error: 'الرمز غير صحيح — حاول مرة أخرى' }, { status: 400 });
      }
      // Promote from pending to active
      await TwoFactorRepo.setSecret(userId, secret);
      await logAudit({
        userId,
        action: 'auth.2fa.enable',
        entityType: 'User',
        entityId: userId,
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
      return NextResponse.json({ success: true, message: 'تم تفعيل المصادقة الثنائية بنجاح' });
    }

    // Action: disable — remove TOTP secret (requires current code)
    if (action === 'disable') {
      if (!code) return NextResponse.json({ error: 'أدخل رمز المصادقة الحالي لتعطيل 2FA' }, { status: 400 });
      const stored = await TwoFactorRepo.getSecret(userId);
      if (!stored) return NextResponse.json({ error: 'المصادقة الثنائية غير مفعّلة' }, { status: 400 });
      const secret = stored.startsWith('pending:') ? stored.replace('pending:', '') : stored;
      if (!verifyTOTP(secret, code)) {
        return NextResponse.json({ error: 'الرمز غير صحيح' }, { status: 400 });
      }
      await TwoFactorRepo.clearSecret(userId);
      await logAudit({
        userId,
        action: 'auth.2fa.disable',
        entityType: 'User',
        entityId: userId,
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
      return NextResponse.json({ success: true, message: 'تم تعطيل المصادقة الثنائية' });
    }

    // Action: status — check if 2FA is enabled for current user
    if (action === 'status') {
      const stored = await TwoFactorRepo.getSecret(userId);
      const isEnabled = !!stored && !stored.startsWith('pending:');
      const isPending = !!stored && stored.startsWith('pending:');
      return NextResponse.json({ enabled: isEnabled, pending: isPending });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/auth/2fa — check 2FA status for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    }
    const stored = await TwoFactorRepo.getSecret(session.user.id);
    const isEnabled = !!stored && !stored.startsWith('pending:');
    const isPending = !!stored && stored.startsWith('pending:');
    return NextResponse.json({ enabled: isEnabled, pending: isPending });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
