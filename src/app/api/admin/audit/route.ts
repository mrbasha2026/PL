import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { AuditRepo, UserRepo } from '@/lib/db-repo';

// GET /api/admin/audit — paginated audit log (requires system.audit)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('system.audit')) {
      return NextResponse.json({ error: 'لا تملك صلاحية عرض سجل التدقيق' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '50')));
    const actionFilter = url.searchParams.get('action');
    const userIdFilter = url.searchParams.get('userId');

    // Fetch more than needed so we can filter in memory (PostgREST doesn't have full-text search easily)
    const allLogs = await AuditRepo.list(500);
    let logs = allLogs;
    if (actionFilter) logs = logs.filter((l) => l.action.includes(actionFilter));
    if (userIdFilter) logs = logs.filter((l) => l.userId === userIdFilter);

    const total = logs.length;
    const paged = logs.slice((page - 1) * limit, page * limit);

    // Resolve users
    const userIds = [...new Set(paged.map((l) => l.userId).filter(Boolean))] as string[];
    const users: Record<string, { email: string; name: string | null }> = {};
    if (userIds.length) {
      for (const id of userIds) {
        const u = await UserRepo.findById(id);
        if (u) users[id] = { email: u.email, name: u.name };
      }
    }

    return NextResponse.json({
      logs: paged.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.changes ? safeParse(l.changes) : {},
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        createdAt: l.createdAt,
        user: l.userId ? users[l.userId] ?? null : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}
