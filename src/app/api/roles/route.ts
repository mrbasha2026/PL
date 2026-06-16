import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DEFAULT_ROLES, PERMISSIONS, PERMISSION_KEYS } from '@/lib/permissions';
import { UserRepo } from '@/lib/db-repo';

// GET /api/roles — list all system roles (roles are defined in code, not DB)
// Returns the in-memory role catalog and permission catalog.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('roles.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const users = await UserRepo.list();
    const rolesWithCounts = DEFAULT_ROLES.map((r) => ({
      id: r.name,
      name: r.name,
      nameAr: r.nameAr,
      description: r.description,
      color: r.color,
      isSystem: r.isSystem,
      permissions: r.permissions,
      usersCount: users.filter((u) => u.role === r.name).length,
    }));

    return NextResponse.json({
      roles: rolesWithCounts,
      permissionCatalog: PERMISSIONS,
      permissionKeys: PERMISSION_KEYS,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/roles — currently a no-op since roles are defined in code
// Returns 200 with a note explaining the system is config-driven.
export async function POST(req: NextRequest) {
  return NextResponse.json({
    error: 'الأدوار مُعرَّفة في كود النظام. لتعديلها، عدّل ملف src/lib/permissions.ts',
    hint: 'Use the user PATCH endpoint to assign one of the existing roles to a user.',
    availableRoles: DEFAULT_ROLES.map((r) => r.name),
  }, { status: 200 });
}
