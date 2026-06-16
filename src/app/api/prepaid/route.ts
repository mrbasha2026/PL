// Prepaid Expenses API
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
}

function computeMonths(start: string | Date, end: string | Date): number {
  const s = new Date(start);
  const e = new Date(end);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  return Math.max(1, months);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get('companyId');
  const where: any = {};
  if (companyId) where.companyId = companyId;

  const items = await db.prepaidExpense.findMany({
    where,
    include: { company: { select: { id: true, name: true, color: true } } },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const body = await req.json();
  const { id, companyId, categoryName, description, amount, currency = 'SAR', startDate, endDate, notes } = body;

  if (!companyId || !categoryName || !description || amount == null || !startDate || !endDate) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' }, { status: 400 });
  }

  const totalMonths = computeMonths(startDate, endDate);
  const monthlyAmount = amount / totalMonths;

  if (id) {
    const updated = await db.prepaidExpense.update({
      where: { id },
      data: { companyId, categoryName, description, amount, currency, startDate: new Date(startDate), endDate: new Date(endDate), monthlyAmount, totalMonths, notes, enteredById: session.user.id },
    });
    await db.auditLog.create({ data: { userId: session.user.id, action: 'prepaid.update', entityId: id, metadata: JSON.stringify({ amount, totalMonths }) } });
    return NextResponse.json({ item: updated });
  }

  const item = await db.prepaidExpense.create({
    data: { companyId, categoryName, description, amount, currency, startDate: new Date(startDate), endDate: new Date(endDate), monthlyAmount, totalMonths, notes, enteredById: session.user.id },
  });
  await db.auditLog.create({ data: { userId: session.user.id, action: 'prepaid.create', entityId: item.id, metadata: JSON.stringify({ amount, totalMonths }) } });
  await db.activity.create({ data: { userId: session.user.id, companyId, type: 'create', message: `تم إضافة مصروف مقدم: ${description}` } });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
  await db.prepaidExpense.delete({ where: { id } });
  await db.auditLog.create({ data: { userId: session.user.id, action: 'prepaid.delete', entityId: id } });
  return NextResponse.json({ ok: true });
}
