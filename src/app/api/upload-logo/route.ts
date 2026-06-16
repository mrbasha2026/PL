// Upload company logo - stores in public/logos/ folder (Supabase Storage alternative)
// In production with Supabase Storage configured, this can be migrated to use Supabase buckets
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

async function getSession(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { sessionToken: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(session.user.role)) {
    return NextResponse.json({ error: 'صلاحية غير كافية' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const companyId = formData.get('companyId') as string;
  if (!file || !companyId) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

  // Validate file type
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'نوع الملف غير مدعوم. يسمح بـ PNG, JPEG, WebP, SVG' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'حجم الملف يتجاوز 5 ميجابايت' }, { status: 400 });
  }

  // Save to public/logos/
  const ext = file.name.split('.').pop() || 'png';
  const filename = `logo-${companyId}-${randomBytes(4).toString('hex')}.${ext}`;
  const logosDir = path.join(process.cwd(), 'public', 'logos');
  await mkdir(logosDir, { recursive: true });
  const filePath = path.join(logosDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const logoUrl = `/logos/${filename}`;
  await db.company.update({ where: { id: companyId }, data: { logoUrl } });
  await db.auditLog.create({ data: { userId: session.user.id, action: 'company.logo', entityId: companyId, metadata: JSON.stringify({ logoUrl }) } });

  return NextResponse.json({ logoUrl });
}
