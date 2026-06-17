import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { CompanyRepo, HoldingGroupRepo, logAudit } from '@/lib/db-repo';
import { getCompanyColor, getCompanyLogo, encodeBranding } from '@/lib/db-types';

// GET /api/companies
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
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
        // Expose branding (color + logoUrl) — uses native columns or JSON fallback
        color: getCompanyColor(c),
        logoUrl: getCompanyLogo(c),
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
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('companies.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية إنشاء الشركات' }, { status: 403 });
    }

    const body = await req.json();

    // Handle holding group create/update (single holding company)
    if (body.isHoldingGroup) {
      const existingGroups = await HoldingGroupRepo.list();
      const updateId = body.updateId as string | undefined;

      if (updateId && existingGroups.some((g) => g.id === updateId)) {
        // Update existing holding group
        const updated = await HoldingGroupRepo.update(updateId, {
          name: body.name,
          nameAr: body.nameAr,
          description: body.description,
          currency: body.currency,
          logo: body.logo,
        });
        await logAudit({
          userId: session.user.id,
          action: 'holding.update',
          entityType: 'HoldingGroup',
          entityId: updateId,
          changes: { name: body.name, nameAr: body.nameAr },
          ipAddress: req.headers.get('x-forwarded-for') || null,
          userAgent: req.headers.get('user-agent') || null,
        });
        return NextResponse.json(updated);
      }

      // Enforce: only ONE holding group allowed
      if (existingGroups.length > 0) {
        return NextResponse.json(
          { error: 'يوجد بالفعل شركة قابضة. النظام يدعم شركة قابضة واحدة فقط.' },
          { status: 400 }
        );
      }
      const created = await HoldingGroupRepo.create({
        name: body.name || 'الشركة القابضة',
        nameAr: body.nameAr,
        description: body.description,
        currency: body.currency || 'SAR',
        logo: body.logo,
      });
      await logAudit({
        userId: session.user.id,
        action: 'holding.create',
        entityType: 'HoldingGroup',
        entityId: created.id,
        changes: { name: body.name },
        ipAddress: req.headers.get('x-forwarded-for') || null,
        userAgent: req.headers.get('user-agent') || null,
      });
      return NextResponse.json(created, { status: 201 });
    }

    // Normal company creation
    const { name, nameAr, holdingGroupId, parentId, type, currency, industry, ownership, isActive } = body;
    // Branding fields — stored in registrationNo as JSON (or native columns if migration was run)
    const color = body.color as string | undefined;
    const logoUrl = body.logoUrl as string | undefined;
    const registrationNo = body.registrationNo as string | undefined;
    if (!name) return NextResponse.json({ error: 'اسم الشركة مطلوب' }, { status: 400 });

    // Encode branding into registrationNo (JSON format) — works with or without migration
    const encodedRegNo = encodeBranding({ color, logoUrl, regNo: registrationNo });

    const company = await CompanyRepo.create({
      name,
      nameAr,
      holdingGroupId,
      parentId,
      type,
      currency,
      industry,
      registrationNo: encodedRegNo,
      // Also pass color/logoUrl directly — if columns exist, they'll be saved; otherwise ignored
      color,
      logoUrl,
      ownership,
      isActive: isActive ?? true,
    });

    await logAudit({
      userId: session.user.id,
      action: 'company.create',
      entityType: 'Company',
      entityId: company.id,
      changes: { name, nameAr, type, industry, color, logoUrl },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
