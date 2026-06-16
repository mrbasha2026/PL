import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CompanyPnL, JournalEntry } from '@/lib/pnl-types';

// ─── GET: Load a specific dataset by ID ────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataset = await db.savedDataset.findUnique({ where: { id } });

    if (!dataset) {
      return NextResponse.json(
        { error: 'البيانات غير موجودة' },
        { status: 404 }
      );
    }

    const companies: CompanyPnL[] = JSON.parse(dataset.companiesJson);
    const journalEntries: JournalEntry[] = JSON.parse(dataset.journalEntriesJson);
    const notes: Record<string, string> = JSON.parse(dataset.notesJson);

    return NextResponse.json({
      id: dataset.id,
      name: dataset.name,
      description: dataset.description,
      companies,
      journalEntries,
      notes,
      companyCount: dataset.companyCount,
      periodCount: dataset.periodCount,
      datasetCount: dataset.datasetCount,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt,
    });
  } catch (error) {
    console.error('Load dataset error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحميل البيانات' },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a dataset by ID ────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.savedDataset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'البيانات غير موجودة' },
        { status: 404 }
      );
    }
    await db.savedDataset.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dataset error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف البيانات' },
      { status: 500 }
    );
  }
}
