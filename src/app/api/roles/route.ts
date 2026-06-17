import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  PERMISSION_GROUPS,
  DEFAULT_ROLES,
  getMergedRoles,
} from '@/lib/permissions';
import { UserRepo, RolesConfigRepo, logAudit, type CustomRole, type RoleOverride } from '@/lib/db-repo';
import { v4 as uuidv4 } from 'uuid';

// GET /api/roles — list all roles (DEFAULT_ROLES + DB overrides + DB custom roles)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('roles.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const dbConfig = await RolesConfigRepo.load().catch(() => ({ overrides: [], customRoles: [] }));
    const users = await UserRepo.list();
    const mergedRoles = getMergedRoles(dbConfig);

    const rolesWithCounts = mergedRoles.map((r) => ({
      id: r.isSystem ? r.name : (dbConfig.customRoles.find((c) => c.name === r.name)?.id || r.name),
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
      permissionGroups: PERMISSION_GROUPS,
      permissionKeys: PERMISSION_KEYS,
      canEdit: session.user.permissions.includes('users.edit'),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/roles — create a new custom role OR update an existing role's permissions
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.edit')) {
      return NextResponse.json({ error: 'لا تملك صلاحية تعديل الأدوار' }, { status: 403 });
    }

    const body = await req.json();
    const { action, name, nameAr, description, color, permissions, id } = body;

    // Action: create_custom — create a new custom role
    if (action === 'create_custom' || (!action && name && !id)) {
      if (!name || !nameAr) {
        return NextResponse.json({ error: 'الاسم بالعربي والإنجليزي مطلوبان' }, { status: 400 });
      }
      // Validate permissions
      const validPerms = (permissions || []).filter((p: string) => PERMISSION_KEYS.includes(p));
      const newRole: CustomRole = {
        id: uuidv4(),
        name: name.toLowerCase().replace(/\s+/g, '_'),
        nameAr,
        description: description || 'دور مخصص',
        color: color || '#64748b',
        permissions: validPerms,
        isSystem: false,
      };
      await RolesConfigRepo.addCustomRole(newRole);
      await logAudit({
        userId: session.user.id,
        action: 'role.create',
        entityType: 'Role',
        entityId: newRole.id,
        changes: { name: newRole.name, nameAr, permissions: validPerms },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
      return NextResponse.json(newRole, { status: 201 });
    }

    // Action: update — update an existing role (system or custom)
    if (action === 'update' || (id && permissions)) {
      if (!name) return NextResponse.json({ error: 'اسم الدور مطلوب' }, { status: 400 });
      const validPerms = (permissions || []).filter((p: string) => PERMISSION_KEYS.includes(p));

      // Check if it's a system role
      const isSystem = DEFAULT_ROLES.some((r) => r.name === name);

      if (isSystem) {
        // System roles can't have their name/color changed, only permissions via override
        const override: RoleOverride = {
          name,
          permissions: validPerms,
          ...(nameAr ? { nameAr } : {}),
          ...(color ? { color } : {}),
          ...(description ? { description } : {}),
        };
        await RolesConfigRepo.setOverride(override);
        await logAudit({
          userId: session.user.id,
          action: 'role.update',
          entityType: 'Role',
          entityId: name,
          changes: { permissions: validPerms },
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
        });
        return NextResponse.json({ success: true, message: 'تم تحديث صلاحيات الدور' });
      } else {
        // Custom role — update directly
        if (!id) return NextResponse.json({ error: 'معرف الدور مطلوب' }, { status: 400 });
        await RolesConfigRepo.updateCustomRole(id, {
          nameAr,
          description,
          color,
          permissions: validPerms,
        });
        await logAudit({
          userId: session.user.id,
          action: 'role.update',
          entityType: 'Role',
          entityId: id,
          changes: { nameAr, permissions: validPerms },
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
        });
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/roles?id=...&name=... — delete a custom role (system roles cannot be deleted)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('users.edit')) {
      return NextResponse.json({ error: 'لا تملك صلاحية حذف الأدوار' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ error: 'معرف أو اسم الدور مطلوب' }, { status: 400 });
    }

    // Check if it's a system role
    const roleName = name || '';
    if (roleName && DEFAULT_ROLES.some((r) => r.name === roleName)) {
      return NextResponse.json({ error: 'لا يمكن حذف أدوار النظام الأساسية' }, { status: 400 });
    }

    if (id) {
      await RolesConfigRepo.deleteCustomRole(id);
      await logAudit({
        userId: session.user.id,
        action: 'role.delete',
        entityType: 'Role',
        entityId: id,
        changes: { name: roleName },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
