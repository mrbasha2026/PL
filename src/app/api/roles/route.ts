import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { PERMISSION_KEYS, PERMISSIONS } from '@/lib/permissions';

// GET /api/roles
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('roles.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const roles = await db.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        nameAr: r.nameAr,
        description: r.description,
        color: r.color,
        isSystem: r.isSystem,
        permissions: JSON.parse(r.permissionsJson || '[]'),
        usersCount: r._count.users,
        createdAt: r.createdAt,
      })),
      permissionCatalog: PERMISSIONS,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/roles — create custom role
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('roles.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية إنشاء الأدوار' }, { status: 403 });
    }

    const { name, nameAr, description, color, permissions } = await req.json();
    if (!name || !nameAr) {
      return NextResponse.json({ error: 'الاسم العربي والإنجليزي مطلوبان' }, { status: 400 });
    }

    // Sanitize permissions
    const validPerms = (permissions || []).filter((p: string) => PERMISSION_KEYS.includes(p));

    // Check name uniqueness
    const existingName = await db.role.findUnique({ where: { name } });
    if (existingName) return NextResponse.json({ error: 'الاسم الإنجليزي مستخدم' }, { status: 409 });
    const existingAr = await db.role.findUnique({ where: { nameAr } });
    if (existingAr) return NextResponse.json({ error: 'الاسم العربي مستخدم' }, { status: 409 });

    const role = await db.role.create({
      data: {
        name: name.startsWith('custom_') ? name : `custom_${name}`,
        nameAr,
        description: description || null,
        color: color || '#6366f1',
        isSystem: false,
        permissionsJson: JSON.stringify(validPerms),
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'role.create',
        targetType: 'Role',
        targetId: role.id,
        detailsJson: JSON.stringify({ name, nameAr, permissionsCount: validPerms.length }),
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      id: role.id,
      name: role.name,
      nameAr: role.nameAr,
      color: role.color,
      permissions: validPerms,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
