import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DEFAULT_ROLES } from '@/lib/permissions';
import { logAudit } from '@/lib/db-repo';

// GET /api/admin/settings
// System settings are not stored in DB (no SystemSetting table).
// They are read from env / config defaults. We expose them as read-only here.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('system.settings')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const settings = {
      'site.name': 'نظام التحليل المالي',
      'site.description': 'منصة شاملة لإدارة الشركات والمصروفات و P&L',
      'auth.allowSelfRegistration': 'false',
      'auth.defaultRole': 'viewer',
      'auth.sessionTimeoutMinutes': '10080', // 7 days
      'database.provider': 'supabase',
      'database.url': process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    };

    return NextResponse.json({
      settings,
      roles: DEFAULT_ROLES.map((r) => ({ name: r.name, nameAr: r.nameAr })),
      readOnly: true,
      note: 'الإعدادات مُعرَّفة في الكود وإعدادات الخادم. لتعديلها، عدّل ملف .env',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/admin/settings — currently read-only (no DB backing)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('system.settings')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    await logAudit({
      userId: session.user.id,
      action: 'system.settings_attempted_update',
      entityType: 'SystemSetting',
      changes: { note: 'Settings are read-only at runtime' },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json({
      success: false,
      error: 'الإعدادات تُدار عبر ملف البيئة .env. لتعديلها، تحدّث مع مدير الخادم.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
