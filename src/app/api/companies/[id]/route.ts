import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { CompanyRepo, logAudit } from '@/lib/db-repo';
import { encodeBranding } from '@/lib/db-types';

// GET /api/companies/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const { id } = await params;
    const company = await CompanyRepo.findById(id);
    if (!company) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
    return NextResponse.json(company);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/companies/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('companies.edit')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();

    // Encode branding (color + logoUrl + regNo) into registrationNo as JSON fallback
    const { color, logoUrl, registrationNo, ...rest } = body;
    if (color !== undefined || logoUrl !== undefined || registrationNo !== undefined) {
      // Fetch existing company to merge with current branding values
      const existing = await CompanyRepo.findById(id);
      const existingRegNo = existing?.registrationNo || null;
      let existingBrand = { regNo: null as string | null, color: null as string | null, logoUrl: null as string | null };
      if (existingRegNo) {
        try {
          const parsed = JSON.parse(existingRegNo);
          if (parsed && typeof parsed === 'object') existingBrand = parsed;
        } catch { existingBrand.regNo = existingRegNo; }
      }
      const encoded = encodeBranding({
        color: color !== undefined ? color : existingBrand.color,
        logoUrl: logoUrl !== undefined ? logoUrl : existingBrand.logoUrl,
        regNo: registrationNo !== undefined ? registrationNo : existingBrand.regNo,
      });
      body.registrationNo = encoded;
    }
    // Also pass color/logoUrl directly — if columns exist in DB, they'll be saved
    if (color !== undefined) body.color = color;
    if (logoUrl !== undefined) body.logoUrl = logoUrl;

    const company = await CompanyRepo.update(id, body);
    await logAudit({
      userId: session.user.id,
      action: 'company.update',
      entityType: 'Company',
      entityId: id,
      changes: { updatedFields: Object.keys(body) },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json(company);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/companies/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('companies.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية الحذف' }, { status: 403 });
    }
    const { id } = await params;
    await CompanyRepo.delete(id);
    await logAudit({
      userId: session.user.id,
      action: 'company.delete',
      entityType: 'Company',
      entityId: id,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
