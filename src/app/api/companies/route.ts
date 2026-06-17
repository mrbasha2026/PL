import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CompanyRepo, HoldingGroupRepo, logAudit } from '@/lib/db-repo';

// GET /api/companies
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('companies.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const [companies, groups] = await Promise.all([
      CompanyRepo.list(),
      HoldingGroupRepo.list(),
    ]);

    return NextResponse.json({
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        holdingGroupId: c.holdingGroupId,
        parentId: c.parentId,
        type: c.type,
        currency: c.currency,
        industry: c.industry,
        registrationNo: c.registrationNo,
        ownership: c.ownership,
        isActive: c.isActive,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      holdingGroups: groups,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/companies
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('companies.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية إنشاء الشركات' }, { status: 403 });
    }

    const body = await req.json();
    const { name, nameAr, holdingGroupId, parentId, type, currency, industry, registrationNo, ownership, isActive } = body;
    if (!name) return NextResponse.json({ error: 'اسم الشركة مطلوب' }, { status: 400 });

    const company = await CompanyRepo.create({
      name,
      nameAr,
      holdingGroupId,
      parentId,
      type,
      currency,
      industry,
      registrationNo,
      ownership,
      isActive: isActive ?? true,
    });

    await logAudit({
      userId: session.user.id,
      action: 'company.create',
      entityType: 'Company',
      entityId: company.id,
      changes: { name, nameAr, type, industry },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
