import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExpenseRepo, logAudit } from '@/lib/db-repo';

// GET /api/expenses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('expenses.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId') || undefined;
    const categoryId = url.searchParams.get('categoryId') || undefined;
    const periodFrom = url.searchParams.get('periodFrom') || undefined;
    const periodTo = url.searchParams.get('periodTo') || undefined;
    const limit = Number(url.searchParams.get('limit') || '1000');

    const expenses = await ExpenseRepo.list({ companyId, categoryId, periodFrom, periodTo, limit });
    return NextResponse.json({ expenses });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('expenses.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const body = await req.json();
    const expense = await ExpenseRepo.create({
      ...body,
      approvedBy: session.user.id,
    });
    await logAudit({
      userId: session.user.id,
      action: 'expense.create',
      entityType: 'Expense',
      entityId: expense.id,
      changes: { amount: expense.amount, companyId: expense.companyId, categoryId: expense.categoryId },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
