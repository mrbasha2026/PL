import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { CategoryRepo, logAudit } from '@/lib/db-repo';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('expenses.categories')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const category = await CategoryRepo.update(id, body);
    await logAudit({
      userId: session.user.id,
      action: 'category.update',
      entityType: 'ExpenseCategory',
      entityId: id,
      changes: { updatedFields: Object.keys(body) },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json(category);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('expenses.categories')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const { id } = await params;
    await CategoryRepo.delete(id);
    await logAudit({
      userId: session.user.id,
      action: 'category.delete',
      entityType: 'ExpenseCategory',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
