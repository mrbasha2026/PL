import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { CategoryRepo, logAudit } from '@/lib/db-repo';

// GET /api/categories
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const categories = await CategoryRepo.list();
    return NextResponse.json({ categories });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('expenses.categories')) {
      return NextResponse.json({ error: 'لا تملك صلاحية إدارة التصنيفات' }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
    const category = await CategoryRepo.create(body);
    await logAudit({
      userId: session.user.id,
      action: 'category.create',
      entityType: 'ExpenseCategory',
      entityId: category.id,
      changes: { name: body.name },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
