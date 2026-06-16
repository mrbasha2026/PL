// P&L Data API: get and save P&L data (per company/period)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
}

// GET /api/pnl-data?companyId=xxx&period=xxx (single) OR /api/pnl-data (all)
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get('companyId');
  const period = req.nextUrl.searchParams.get('period');

  const where: any = {};
  if (companyId) where.companyId = companyId;
  if (period) where.period = period;

  const data = await db.pnLData.findMany({
    where,
    include: {
      company: { select: { id: true, name: true, nameEn: true, color: true, logoUrl: true, currency: true } },
      values: { include: { lineItem: { include: { category: { include: { section: true } } } } } },
    },
    orderBy: [{ companyId: 'asc' }, { period: 'asc' }],
  });

  // Restructure into a more usable format
  const result = data.map(d => ({
    id: d.id,
    companyId: d.companyId,
    companyName: d.company.name,
    companyNameEn: d.company.nameEn,
    companyColor: d.company.color,
    companyLogo: d.company.logoUrl,
    companyCurrency: d.company.currency,
    period: d.period,
    periodType: d.periodType,
    currency: d.currency,
    source: d.source,
    uploadedAt: d.createdAt,
    values: d.values.reduce((acc: Record<string, number>, v) => {
      acc[v.lineItem.key] = v.value;
      acc[v.lineItem.name] = v.value; // also by name for flexibility
      return acc;
    }, {}),
    valuesByItem: d.values.map(v => ({
      key: v.lineItem.key,
      name: v.lineItem.name,
      nameAr: v.lineItem.nameAr,
      value: v.value,
      section: v.lineItem.category.section.nameAr,
      sectionType: v.lineItem.category.section.type,
      category: v.lineItem.category.nameAr,
      isTotal: v.lineItem.isTotal,
      isSubtotal: v.lineItem.isSubtotal,
    })),
  }));

  return NextResponse.json({ data: result });
}

// POST — bulk upsert P&L data (from Excel upload or manual entry)
// body: { companyId, period, periodType, currency, source, values: { itemName|key: value, ... } }
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const body = await req.json();
  const { companyId, period, periodType = 'MONTHLY', currency = 'SAR', source = 'MANUAL', values } = body;

  if (!companyId || !period) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  }

  // Get all line item definitions to map names/keys to IDs
  const lineItems = await db.pnLLineItemDef.findMany({
    include: { category: { include: { section: true } } },
  });
  const itemByName: Record<string, string> = {};
  const itemByKey: Record<string, string> = {};
  for (const li of lineItems) {
    itemByName[li.name.toLowerCase()] = li.id;
    itemByKey[li.key] = li.id;
  }

  // Build values array — match by name OR key
  const dataValues: { lineItemId: string; value: number }[] = [];
  for (const [k, v] of Object.entries(values || {})) {
    const numVal = typeof v === 'string' ? parseFloat(v) : (v as number);
    if (numVal === undefined || numVal === null || isNaN(numVal)) continue;
    let itemId = itemByKey[k] || itemByName[k.toLowerCase()];
    if (!itemId) continue;
    dataValues.push({ lineItemId: itemId, value: numVal });
  }

  // Upsert PnLData + values
  const existing = await db.pnLData.findUnique({
    where: { companyId_period: { companyId, period } },
    include: { values: true },
  });

  let pnlData;
  if (existing) {
    // Delete old values
    await db.pnLDataValue.deleteMany({ where: { pnlDataId: existing.id } });
    pnlData = await db.pnLData.update({
      where: { id: existing.id },
      data: {
        periodType, currency, source,
        uploadedById: session.user.id,
        values: { create: dataValues },
      },
    });
  } else {
    pnlData = await db.pnLData.create({
      data: {
        companyId, period, periodType, currency, source,
        uploadedById: session.user.id,
        values: { create: dataValues },
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'pnl.data.save',
      entity: 'PnLData',
      entityId: pnlData.id,
      metadata: JSON.stringify({ companyId, period, source, valueCount: dataValues.length }),
    },
  });
  await db.activity.create({
    data: {
      userId: session.user.id,
      companyId,
      type: source === 'EXCEL' ? 'upload' : 'edit',
      message: `تم ${source === 'EXCEL' ? 'رفع' : 'إدخال'} بيانات P&L للفترة ${period}`,
    },
  });

  return NextResponse.json({ id: pnlData.id, count: dataValues.length });
}

// DELETE — remove P&L data for a company/period
export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  await db.pnLData.delete({ where: { id } });
  await db.auditLog.create({ data: { userId: session.user.id, action: 'pnl.data.delete', entityId: id } });
  return NextResponse.json({ ok: true });
}
