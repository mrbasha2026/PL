import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { PERMISSION_KEYS } from '@/lib/permissions';

// POST /api/auth/register
// - Admin can register new users (requires users.create permission)
// - Self-registration only if system setting "auth.allowSelfRegistration" = "true"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, password, roleId } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const allowSelfReg = await db.systemSetting.findUnique({ where: { key: 'auth.allowSelfRegistration' } });
    const selfRegEnabled = allowSelfReg?.value === 'true';

    let assignedRoleId = roleId;
    let isSelfRegistration = false;

    if (!session) {
      // Self-registration path
      if (!selfRegEnabled) {
        return NextResponse.json({ error: 'التسجيل الذاتي معطّل — تواصل مع المدير' }, { status: 403 });
      }
      // Use default role
      const defaultRoleSetting = await db.systemSetting.findUnique({ where: { key: 'auth.defaultRoleId' } });
      if (!defaultRoleSetting?.value) {
        return NextResponse.json({ error: 'إعداد النظام غير مكتمل' }, { status: 500 });
      }
      assignedRoleId = defaultRoleSetting.value;
      isSelfRegistration = true;
    } else {
      // Admin/manager creating user
      if (!session.user.permissions.includes('users.create')) {
        return NextResponse.json({ error: 'لا تملك صلاحية إنشاء مستخدمين' }, { status: 403 });
      }
      if (!assignedRoleId) {
        return NextResponse.json({ error: 'الدور مطلوب' }, { status: 400 });
      }
    }

    // Validate role exists
    const role = await db.role.findUnique({ where: { id: assignedRoleId } });
    if (!role) {
      return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });
    }

    // Check email not taken
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        passwordHash,
        roleId: assignedRoleId,
        status: 'active',
      },
      include: { role: true },
    });

    // Audit log
    if (session) {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'user.create',
          targetType: 'User',
          targetId: user.id,
          detailsJson: JSON.stringify({ email: user.email, name: user.name, roleId: user.roleId }),
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
        },
      });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roleNameAr: user.role.nameAr,
      status: user.status,
      selfRegistered: isSelfRegistration,
    }, { status: 201 });
  } catch (e: any) {
    console.error('register error', e);
    return NextResponse.json({ error: e.message || 'حدث خطأ' }, { status: 500 });
  }
}
