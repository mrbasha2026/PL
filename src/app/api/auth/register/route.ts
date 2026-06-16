import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRepo, logAudit } from '@/lib/db-repo';
import { DEFAULT_ROLES } from '@/lib/permissions';

// POST /api/auth/register
// - Admin can register new users (requires users.create permission)
// - Self-registration disabled by default (no SystemSetting table available)
//   To enable: an admin must call with a session.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, nameAr, password, role } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    // If no session → check if it's the first user being created (bootstrap admin)
    // First user becomes admin automatically.
    const allUsers = await UserRepo.list();
    const isFirstUser = allUsers.length === 0;

    let assignedRole = role;
    let isSelfRegistration = false;

    if (!session && !isFirstUser) {
      // No self-registration allowed without an admin session
      return NextResponse.json({ error: 'التسجيل الذاتي معطّل — تواصل مع المدير' }, { status: 403 });
    }

    if (isFirstUser) {
      // Bootstrap: first user is admin
      assignedRole = 'admin';
      isSelfRegistration = true;
    } else if (session) {
      if (!session.user.permissions.includes('users.create')) {
        return NextResponse.json({ error: 'لا تملك صلاحية إنشاء مستخدمين' }, { status: 403 });
      }
      if (!assignedRole) {
        return NextResponse.json({ error: 'الدور مطلوب' }, { status: 400 });
      }
    }

    const roleDef = DEFAULT_ROLES.find((r) => r.name === assignedRole);
    if (!roleDef) {
      return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await UserRepo.findByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserRepo.create({
      email: normalizedEmail,
      name: name || null,
      nameAr: nameAr || null,
      passwordHash,
      role: assignedRole,
      isActive: true,
    });

    if (session) {
      await logAudit({
        userId: session.user.id,
        action: 'user.create',
        entityType: 'User',
        entityId: user.id,
        changes: { email: user.email, name: user.name, role: assignedRole },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
    } else {
      await logAudit({
        userId: user.id,
        action: 'auth.bootstrap',
        entityType: 'User',
        entityId: user.id,
        changes: { email: user.email, role: assignedRole, note: 'First user — auto-admin' },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleNameAr: roleDef.nameAr,
      selfRegistered: isSelfRegistration,
      isFirstUser,
    }, { status: 201 });
  } catch (e: any) {
    console.error('register error', e);
    return NextResponse.json({ error: e.message || 'حدث خطأ' }, { status: 500 });
  }
}
