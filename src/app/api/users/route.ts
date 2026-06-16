import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/users — list all users (requires users.view)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية عرض المستخدمين' }, { status: 403 });
    }

    const users = await db.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        status: u.status,
        avatarUrl: u.avatarUrl,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        role: {
          id: u.role.id,
          name: u.role.name,
          nameAr: u.role.nameAr,
          color: u.role.color,
          isSystem: u.role.isSystem,
        },
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/users — admin creates user (requires users.create)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية إنشاء مستخدمين' }, { status: 403 });
    }

    const { email, name, password, roleId, status } = await req.json();
    if (!email || !password || !roleId) {
      return NextResponse.json({ error: 'البريد، كلمة المرور، والدور مطلوبة' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const role = await db.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'البريد الإلكتروني مستخدم' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        passwordHash,
        roleId,
        status: status || 'active',
      },
      include: { role: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'user.create',
        targetType: 'User',
        targetId: user.id,
        detailsJson: JSON.stringify({ email: user.email, name: user.name, roleId }),
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
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
