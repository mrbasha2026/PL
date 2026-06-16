import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { CompanyPnL, JournalEntry } from '@/lib/pnl-types';

// ─── GET: Load a specific dataset by ID (requires save.view) ──────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('save.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
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
      ownerId: dataset.ownerId,
      isOwner: dataset.ownerId === session.user.id,
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

// ─── DELETE: Delete a dataset by ID (requires save.delete, owner or admin) ─
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('save.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية الحذف' }, { status: 403 });
    }
    const { id } = await params;
    const existing = await db.savedDataset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'البيانات غير موجودة' },
        { status: 404 }
      );
    }
    // Only owner or admin (with save.delete) can delete
    if (existing.ownerId && existing.ownerId !== session.user.id && !session.user.permissions.includes('users.delete')) {
      return NextResponse.json({ error: 'لا تملك صلاحية حذف هذا المخزن' }, { status: 403 });
    }
    await db.savedDataset.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'dataset.delete',
        targetType: 'SavedDataset',
        targetId: id,
        detailsJson: JSON.stringify({ name: existing.name }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dataset error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف البيانات' },
      { status: 500 }
    );
  }
}
