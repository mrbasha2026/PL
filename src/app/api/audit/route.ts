// Audit Log API
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200');
  const action = req.nextUrl.searchParams.get('action');

  const where: any = {};
  if (action) where.action = action;

  const entries = await db.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ entries });
}
