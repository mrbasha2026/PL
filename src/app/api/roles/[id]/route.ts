import { NextRequest, NextResponse } from 'next/server';
// Roles are defined in code at src/lib/permissions.ts (DEFAULT_ROLES).
// This dynamic route is kept for compatibility but returns the role by name.
import { DEFAULT_ROLES } from '@/lib/permissions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = DEFAULT_ROLES.find((r) => r.name === id || r.nameAr === id);
  if (!role) return NextResponse.json({ error: 'الدور غير موجود' }, { status: 404 });
  return NextResponse.json(role);
}

export async function PATCH(_req: NextRequest) {
  return NextResponse.json({
    error: 'الأدوار مُعرَّفة في كود النظام ولا يمكن تعديلها عبر API.',
  }, { status: 405 });
}

export async function DELETE(_req: NextRequest) {
  return NextResponse.json({
    error: 'لا يمكن حذف أدوار النظام.',
  }, { status: 405 });
}
