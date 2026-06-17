import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ForecastRepo, logAudit } from '@/lib/db-repo';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('forecasts.view')) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }
    const models = await ForecastRepo.list();
    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    if (!session.user.permissions.includes('forecasts.run')) {
      return NextResponse.json({ error: 'لا تملك صلاحية تشغيل التنبؤ' }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name || !body.method || !body.targetMetric || !body.forecastData) {
      return NextResponse.json({ error: 'الاسم، الطريقة، المقياس، وبيانات التنبؤ مطلوبة' }, { status: 400 });
    }
    const model = await ForecastRepo.save({
      name: body.name,
      method: body.method,
      targetMetric: body.targetMetric,
      parameters: body.parameters ?? {},
      accuracy: body.accuracy ?? 0,
      forecastData: body.forecastData,
      periodsAhead: body.periodsAhead ?? 6,
      companyId: body.companyId,
      isActive: true,
    });
    await logAudit({
      userId: session.user.id,
      action: 'forecast.create',
      entityType: 'ForecastModel',
      entityId: model.id,
      changes: { name: body.name, method: body.method, targetMetric: body.targetMetric, accuracy: body.accuracy },
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent') || null,
    });
    return NextResponse.json(model, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
