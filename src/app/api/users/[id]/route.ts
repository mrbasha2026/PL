import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const { id } = await params;

    // Users can view their own profile; others require users.view
    if (session.user.id !== id && !session.user.permissions.includes('users.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role: {
        id: user.role.id,
        name: user.role.name,
        nameAr: user.role.nameAr,
        color: user.role.color,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/users/[id] — update user (name, status, roleId, password)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const { name, status, roleId, password, avatarUrl } = body;

    const isSelf = session.user.id === id;
    const canEditOthers = session.user.permissions.includes('users.edit');

    // Self can only update own name/avatar/password; cannot change own role/status
    if (!isSelf && !canEditOthers) {
      return NextResponse.json({ error: 'لا تملك صلاحية تعديل المستخدمين' }, { status: 403 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    // Prevent self-lockout: don't allow admin to suspend themselves or remove own admin role
    if (isSelf && status === 'suspended') {
      return NextResponse.json({ error: 'لا يمكنك إيقاف حسابك الحالي' }, { status: 400 });
    }

    const data: any = {};
    if (name !== undefined) data.name = name || null;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    // Only users.edit can change role/status
    if (canEditOthers) {
      if (status !== undefined) data.status = status;
      if (roleId !== undefined) {
        const role = await db.role.findUnique({ where: { id: roleId } });
        if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });
        data.roleId = roleId;
      }
    }

    const user = await db.user.update({
      where: { id },
      data,
      include: { role: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'user.update',
        targetType: 'User',
        targetId: user.id,
        detailsJson: JSON.stringify({ changedFields: Object.keys(data) }),
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      role: { id: user.role.id, nameAr: user.role.nameAr, color: user.role.color },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية حذف المستخدمين' }, { status: 403 });
    }

    const { id } = await params;
    if (session.user.id === id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    await db.user.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'user.delete',
        targetType: 'User',
        targetId: id,
        detailsJson: JSON.stringify({ email: existing.email }),
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
