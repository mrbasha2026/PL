import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// GET /api/admin/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    // Any authenticated user can see basic stats; sensitive stats require users.view
    const canViewUsers = session.user.permissions.includes('users.view');

    const [totalUsers, activeUsers, totalRoles, totalSavedDatasets, totalAuditLogs] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: 'active' } }),
      db.role.count(),
      db.savedDataset.count(),
      db.auditLog.count(),
    ]);

    const result: any = {
      totalSavedDatasets,
      totalAuditLogs,
      serverTime: new Date().toISOString(),
    };

    if (canViewUsers) {
      result.totalUsers = totalUsers;
      result.activeUsers = activeUsers;
      result.suspendedUsers = totalUsers - activeUsers;
      result.totalRoles = totalRoles;

      // Recent logins (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result.recentLogins = await db.user.count({
        where: { lastLoginAt: { gte: sevenDaysAgo } },
      });

      // Users by role
      const usersByRole = await db.user.groupBy({
        by: ['roleId'],
        _count: { _all: true },
      });
      const roles = await db.role.findMany();
      result.usersByRole = usersByRole.map((r) => {
        const role = roles.find((x) => x.id === r.roleId);
        return {
          roleNameAr: role?.nameAr || '—',
          color: role?.color || '#64748b',
          count: r._count._all,
        };
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
