import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { CompanyPnL, JournalEntry } from '@/lib/pnl-types';

// ─── GET: List all saved datasets (requires save.view) ──────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('save.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const datasets = await db.savedDataset.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        companyCount: true,
        periodCount: true,
        datasetCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ datasets });
  } catch (error) {
    console.error('List saved datasets error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب البيانات المحفوظة' },
      { status: 500 }
    );
  }
}

// ─── POST: Save a new dataset (or update existing by name) (requires save.create) ────
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('save.create')) {
      return NextResponse.json({ error: 'لا تملك صلاحية الحفظ' }, { status: 403 });
    }
    const body = await request.json();
    const { name, description, companies, journalEntries, notes } = body as {
      name: string;
      description?: string;
      companies: CompanyPnL[];
      journalEntries: JournalEntry[];
      notes: Record<string, string>;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'الاسم مطلوب' },
        { status: 400 }
      );
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { error: 'لا توجد بيانات لحفظها' },
        { status: 400 }
      );
    }

    const companyNames = new Set(companies.map((c) => c.companyName));
    const periods = new Set(companies.map((c) => c.period));

    // Check if a dataset with the same name already exists — update it
    const existing = await db.savedDataset.findFirst({
      where: { name: name.trim() },
    });

    const data = {
      name: name.trim(),
      description: description?.trim() || null,
      companiesJson: JSON.stringify(companies),
      journalEntriesJson: JSON.stringify(journalEntries || []),
      notesJson: JSON.stringify(notes || {}),
      companyCount: companyNames.size,
      periodCount: periods.size,
      datasetCount: companies.length,
      ownerId: session!.user.id,
    };

    let saved;
    if (existing) {
      // Only the owner or admin can update
      if (existing.ownerId && existing.ownerId !== session!.user.id && !session!.user.permissions.includes('save.delete')) {
        return NextResponse.json({ error: 'لا تملك صلاحية تعديل هذا المخزن' }, { status: 403 });
      }
      saved = await db.savedDataset.update({
        where: { id: existing.id },
        data,
      });
    } else {
      saved = await db.savedDataset.create({ data });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session!.user.id,
        action: existing ? 'dataset.update' : 'dataset.create',
        targetType: 'SavedDataset',
        targetId: saved.id,
        detailsJson: JSON.stringify({ name: saved.name }),
      },
    });

    return NextResponse.json({
      success: true,
      id: saved.id,
      name: saved.name,
      action: existing ? 'updated' : 'created',
    });
  } catch (error) {
    console.error('Save dataset error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حفظ البيانات' },
      { status: 500 }
    );
  }
}
