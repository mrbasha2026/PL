import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { BudgetRepo, logAudit } from '@/lib/db-repo';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('budgets.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية الحذف' }, { status: 403 });
    }
    const { id } = await params;
    await BudgetRepo.delete(id);
    await logAudit({
      userId: session.user.id,
      action: 'budget.delete',
      entityType: 'Budget',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
