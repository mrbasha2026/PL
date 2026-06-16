import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { PERMISSION_KEYS } from '@/lib/permissions';

// PATCH /api/roles/[id] — update role (name, nameAr, description, color, permissions)
// System roles can only have their permissions and color updated, not name/nameAr
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('roles.edit')) {
      return NextResponse.json({ error: 'لا تملك صلاحية تعديل الأدوار' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, nameAr, description, color, permissions } = body;

    const existing = await db.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    const data: any = {};
    if (color !== undefined) data.color = color;
    if (description !== undefined) data.description = description || null;
    if (permissions !== undefined) {
      data.permissionsJson = JSON.stringify(
        permissions.filter((p: string) => PERMISSION_KEYS.includes(p))
      );
    }
    // Only allow name changes for non-system roles
    if (!existing.isSystem) {
      if (name !== undefined) {
        const conflict = await db.role.findUnique({ where: { name } });
        if (conflict && conflict.id !== id) {
          return NextResponse.json({ error: 'الاسم الإنجليزي مستخدم' }, { status: 409 });
        }
        data.name = name.startsWith('custom_') ? name : `custom_${name}`;
      }
      if (nameAr !== undefined) {
        const conflict = await db.role.findUnique({ where: { nameAr } });
        if (conflict && conflict.id !== id) {
          return NextResponse.json({ error: 'الاسم العربي مستخدم' }, { status: 409 });
        }
        data.nameAr = nameAr;
      }
    }

    const role = await db.role.update({ where: { id }, data });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'role.update',
        targetType: 'Role',
        targetId: role.id,
        detailsJson: JSON.stringify({ changedFields: Object.keys(data) }),
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      id: role.id,
      name: role.name,
      nameAr: role.nameAr,
      color: role.color,
      description: role.description,
      permissions: JSON.parse(role.permissionsJson || '[]'),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/roles/[id] — only custom roles can be deleted (must have 0 users)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('roles.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية حذف الأدوار' }, { status: 403 });
    }

    const { id } = await params;
    const role = await db.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    if (role.isSystem) {
      return NextResponse.json({ error: 'لا يمكن حذف الأدوار النظامية' }, { status: 400 });
    }
    if (role._count.users > 0) {
      return NextResponse.json({ error: `لا يمكن حذف دور مرتبط بـ ${role._count.users} مستخدم` }, { status: 400 });
    }

    await db.role.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'role.delete',
        targetType: 'Role',
        targetId: id,
        detailsJson: JSON.stringify({ name: role.name, nameAr: role.nameAr }),
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
