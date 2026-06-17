import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { UserRepo, logAudit } from '@/lib/db-repo';
import { DEFAULT_ROLES } from '@/lib/permissions';

// GET /api/users — list all users (requires users.view)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية عرض المستخدمين' }, { status: 403 });
    }

    const users = await UserRepo.list();

    return NextResponse.json({
      users: users.map((u) => {
        const roleDef = DEFAULT_ROLES.find((r) => r.name === u.role);
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          nameAr: u.nameAr,
          role: u.role,
          roleNameAr: roleDef?.nameAr ?? u.role,
          roleColor: roleDef?.color ?? '#64748b',
          isActive: u.isActive,
          status: u.isActive ? 'active' : 'suspended',
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      }),
      roles: DEFAULT_ROLES.map((r) => ({
        name: r.name,
        nameAr: r.nameAr,
        description: r.description,
        color: r.color,
        isSystem: r.isSystem,
        permissions: r.permissions,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/users — admin creates user (requires users.create)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية إنشاء مستخدمين' }, { status: 403 });
    }

    const { email, name, nameAr, password, role, isActive } = await req.json();
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'البريد، كلمة المرور، والدور مطلوبة' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const roleDef = DEFAULT_ROLES.find((r) => r.name === role);
    if (!roleDef) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserRepo.findByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserRepo.create({
      email: normalizedEmail,
      name: name || null,
      nameAr: nameAr || null,
      passwordHash,
      role,
      isActive: isActive ?? true,
    });

    await logAudit({
      userId: session.user.id,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      changes: { email: user.email, name: user.name, role },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleNameAr: roleDef.nameAr,
      roleColor: roleDef.color,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
