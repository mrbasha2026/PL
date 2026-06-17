import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { BudgetRepo, logAudit } from '@/lib/db-repo';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('budgets.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const budgets = await BudgetRepo.list();
    return NextResponse.json({ budgets });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('budgets.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const body = await req.json();
    if (!body.year || !body.data) {
      return NextResponse.json({ error: 'السنة والبيانات مطلوبة' }, { status: 400 });
    }
    const budget = await BudgetRepo.save({
      companyId: body.companyId,
      year: Number(body.year),
      period: body.period,
      data: body.data,
      notes: body.notes,
      isApproved: body.isApproved ?? false,
    });
    await logAudit({
      userId: session.user.id,
      action: 'budget.create',
      entityType: 'Budget',
      entityId: budget.id,
      changes: { year: body.year, companyId: body.companyId },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json(budget, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
