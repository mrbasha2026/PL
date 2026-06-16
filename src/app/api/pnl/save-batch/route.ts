import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PnLRepo, CompanyRepo, logAudit } from '@/lib/db-repo';
import type { PnLDatasetData, PnLLineItem } from '@/lib/db-types';

// POST /api/pnl/save-batch
// Body: { records: [{ companyName, period, currency, lineItems: [{name, key, category, subCategory, amount, sortOrder}] }] }
// Stores P&L data into the PnLDataset table (one row per company×period).
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('pnl.upload')) {
      return NextResponse.json({ error: 'لا تملك صلاحية رفع بيانات P&L' }, { status: 403 });
    }

    const body = await req.json();
    const records: Array<{
      companyName: string;
      period: string;
      currency?: string;
      lineItems: PnLLineItem[];
      periodType?: string;
      fileName?: string;
    }> = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للحفظ' }, { status: 400 });
    }

    // Normalize period to YYYY-MM if possible
    const normalizePeriod = (p: string): string => {
      const m = p.match(/^(\d{4})[-/](\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
      return p;
    };

    let savedCount = 0;
    const companyNames = new Set<string>();
    for (const r of records) {
      const period = normalizePeriod(r.period);
      // Upsert company by name (auto-create if missing)
      const company = await CompanyRepo.upsertByName(r.companyName);
      companyNames.add(r.companyName);

      const data: PnLDatasetData = {
        lineItems: r.lineItems,
        meta: {
          source: 'excel',
          periodType: r.periodType ?? 'monthly',
          fileName: r.fileName,
          uploadedAt: new Date().toISOString(),
        },
      };

      await PnLRepo.upsert({
        companyName: r.companyName,
        period,
        data,
        companyId: company.id,
        currency: r.currency ?? 'SAR',
        uploadedBy: session.user.id,
        source: 'excel',
      });
      savedCount++;
    }

    await logAudit({
      userId: session.user.id,
      action: 'pnl.upload',
      entityType: 'PnLDataset',
      changes: { recordsSaved: savedCount, companies: Array.from(companyNames) },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      success: true,
      savedCount,
      companies: Array.from(companyNames),
    });
  } catch (e: any) {
    console.error('pnl save-batch error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/pnl/save-batch — list all stored P&L datasets
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('pnl.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const datasets = await PnLRepo.list();
    return NextResponse.json({
      datasets: datasets.map((d) => ({
        id: d.id,
        companyName: d.companyName,
        period: d.period,
        currency: d.currency,
        source: d.source,
        uploadedBy: d.uploadedBy,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        parsed: PnLRepo.parseData(d),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
