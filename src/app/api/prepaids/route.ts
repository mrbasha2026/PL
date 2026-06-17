import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { PrepaidRepo, logAudit } from '@/lib/db-repo';

// GET /api/prepaids
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('prepaid.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const prepaids = await PrepaidRepo.list();
    return NextResponse.json({ prepaids });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/prepaids
// NOTE: Per user request, only startDate + endDate are required.
// months/monthlyAmount are auto-calculated server-side.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('prepaid.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name || !body.totalAmount || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: 'الاسم، المبلغ، تاريخ البداية والنهاية مطلوبة' }, { status: 400 });
    }
    if (new Date(body.endDate) <= new Date(body.startDate)) {
      return NextResponse.json({ error: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' }, { status: 400 });
    }

    const prepaid = await PrepaidRepo.create({
      name: body.name,
      nameAr: body.nameAr,
      totalAmount: Number(body.totalAmount),
      currency: body.currency,
      startDate: body.startDate,
      endDate: body.endDate,
      companyId: body.companyId,
      categoryId: body.categoryId,
      vendor: body.vendor,
      description: body.description,
      createdBy: session.user.id,
    });

    await logAudit({
      userId: session.user.id,
      action: 'prepaid.create',
      entityType: 'PrepaidExpense',
      entityId: prepaid.id,
      changes: { name: body.name, totalAmount: body.totalAmount, startDate: body.startDate, endDate: body.endDate },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(prepaid, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
