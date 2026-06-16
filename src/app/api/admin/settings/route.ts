import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/admin/settings — list all settings (requires system.settings)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('system.settings')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const settings = await db.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));

    // Also include roles list (for default role dropdown)
    const roles = await db.role.findMany({ select: { id: true, nameAr: true, name: true } });

    return NextResponse.json({ settings: settingsMap, roles });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/admin/settings — update one or more settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('system.settings')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body as { settings: Record<string, string> };
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    // Validate known keys
    const allowedKeys = new Set([
      'site.name',
      'site.description',
      'auth.allowSelfRegistration',
      'auth.defaultRoleId',
      'auth.sessionTimeoutMinutes',
    ]);

    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.has(key)) continue;
      await db.systemSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'system.settings_update',
        targetType: 'SystemSetting',
        detailsJson: JSON.stringify({ changedKeys: Object.keys(settings) }),
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
