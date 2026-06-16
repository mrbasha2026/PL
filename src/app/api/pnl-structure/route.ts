// P&L Structure API: sections, categories, line items (hierarchical CRUD)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
}

function sanitizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// GET — return full hierarchy
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const sections = await db.pnLSection.findMany({
    orderBy: { order: 'asc' },
    include: {
      categories: {
        orderBy: { order: 'asc' },
        include: {
          lineItems: { orderBy: { order: 'asc' } },
        },
      },
    },
  });

  return NextResponse.json({ sections });
}

// POST — create or update section / category / line item
// body: { level: 'section' | 'category' | 'item', ...data }
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const body = await req.json();
  const { level } = body;

  try {
    if (level === 'section') {
      const { name, nameAr, type = 'INCOME', order = 0 } = body;
      if (!name || !nameAr) return NextResponse.json({ error: 'الاسم بالعربية والإنجليزية مطلوب' }, { status: 400 });
      const section = await db.pnLSection.create({ data: { name, nameAr, type, order } });
      await db.auditLog.create({ data: { userId: session.user.id, action: 'pnl.section.create', entityId: section.id, metadata: JSON.stringify({ name }) } });
      return NextResponse.json({ section });
    }

    if (level === 'category') {
      const { sectionId, name, nameAr, order = 0, isSubtotal = false } = body;
      if (!sectionId || !name || !nameAr) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
      const category = await db.pnLCategory.create({ data: { sectionId, name, nameAr, order, isSubtotal } });
      await db.auditLog.create({ data: { userId: session.user.id, action: 'pnl.category.create', entityId: category.id, metadata: JSON.stringify({ name }) } });
      return NextResponse.json({ category });
    }

    if (level === 'item') {
      const { categoryId, name, nameAr, order = 0, description, isTotal = false, isSubtotal = false } = body;
      if (!categoryId || !name || !nameAr) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
      const item = await db.pnLLineItemDef.create({ data: { categoryId, name, nameAr, key: sanitizeKey(name), order, description, isTotal, isSubtotal } });
      await db.auditLog.create({ data: { userId: session.user.id, action: 'pnl.item.create', entityId: item.id, metadata: JSON.stringify({ name }) } });
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: 'مستوى غير معروف' }, { status: 400 });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'الاسم موجود بالفعل' }, { status: 400 });
    return NextResponse.json({ error: e?.message || 'فشل الإنشاء' }, { status: 500 });
  }
}

// PUT — update section / category / line item
export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const body = await req.json();
  const { level, id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  try {
    if (level === 'section') {
      const section = await db.pnLSection.update({ where: { id }, data: updates });
      return NextResponse.json({ section });
    }
    if (level === 'category') {
      const category = await db.pnLCategory.update({ where: { id }, data: updates });
      return NextResponse.json({ category });
    }
    if (level === 'item') {
      if (updates.name) updates.key = sanitizeKey(updates.name);
      const item = await db.pnLLineItemDef.update({ where: { id }, data: updates });
      return NextResponse.json({ item });
    }
    return NextResponse.json({ error: 'مستوى غير معروف' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل التحديث' }, { status: 500 });
  }
}

// DELETE — delete section / category / line item
export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const level = req.nextUrl.searchParams.get('level');
  const id = req.nextUrl.searchParams.get('id');
  if (!level || !id) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

  try {
    if (level === 'section') await db.pnLSection.delete({ where: { id } });
    else if (level === 'category') await db.pnLCategory.delete({ where: { id } });
    else if (level === 'item') await db.pnLLineItemDef.delete({ where: { id } });
    else return NextResponse.json({ error: 'مستوى غير معروف' }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل الحذف' }, { status: 500 });
  }
}
