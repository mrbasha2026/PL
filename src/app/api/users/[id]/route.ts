import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { UserRepo, logAudit } from '@/lib/db-repo';
import { DEFAULT_ROLES } from '@/lib/permissions';

// GET /api/users/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const { id } = await params;

    if (session.user.id !== id && !session.user.permissions.includes('users.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const user = await UserRepo.findById(id);
    if (!user) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    const roleDef = DEFAULT_ROLES.find((r) => r.name === user.role);
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      nameAr: user.nameAr,
      role: user.role,
      roleNameAr: roleDef?.nameAr ?? user.role,
      roleColor: roleDef?.color ?? '#64748b',
      isActive: user.isActive,
      status: user.isActive ? 'active' : 'suspended',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/users/[id] — update user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const { name, nameAr, status, role, password } = body;

    const isSelf = session.user.id === id;
    const canEditOthers = session.user.permissions.includes('users.edit');

    if (!isSelf && !canEditOthers) {
      return NextResponse.json({ error: 'لا تملك صلاحية تعديل المستخدمين' }, { status: 403 });
    }

    const existing = await UserRepo.findById(id);
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    if (isSelf && status === 'suspended') {
      return NextResponse.json({ error: 'لا يمكنك إيقاف حسابك الحالي' }, { status: 400 });
    }

    const patch: any = {};
    if (name !== undefined) patch.name = name || null;
    if (nameAr !== undefined) patch.nameAr = nameAr || null;
    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
      }
      patch.passwordHash = await bcrypt.hash(password, 10);
    }
    if (canEditOthers) {
      if (status !== undefined) patch.isActive = status === 'active';
      if (role !== undefined) {
        const roleDef = DEFAULT_ROLES.find((r) => r.name === role);
        if (!roleDef) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });
        patch.role = role;
      }
    }

    const user = await UserRepo.update(id, patch);
    const roleDef = DEFAULT_ROLES.find((r) => r.name === user.role);

    await logAudit({
      userId: session.user.id,
      action: 'user.update',
      entityType: 'User',
      entityId: user.id,
      changes: { changedFields: Object.keys(patch) },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleNameAr: roleDef?.nameAr ?? user.role,
      roleColor: roleDef?.color ?? '#64748b',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية حذف المستخدمين' }, { status: 403 });
    }

    const { id } = await params;
    if (session.user.id === id) {
      return NextResponse.json({ error: 'لا يمكنك حذف حسابك الحالي' }, { status: 400 });
    }

    const existing = await UserRepo.findById(id);
    if (!existing) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });

    await UserRepo.delete(id);

    await logAudit({
      userId: session.user.id,
      action: 'user.delete',
      entityType: 'User',
      entityId: id,
      changes: { email: existing.email },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
