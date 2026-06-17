'use client';

import React from 'react';
import {
  LineChart as LineChartIcon, Trash2, Brain, Target, Activity,
  TrendingUp, Sigma, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

interface ForecastModel {
  id: string;
  name: string;
  method: string;
  targetMetric: string;
  parameters: string;
  accuracy: number;
  forecastData: string;
  periodsAhead: number;
  isActive: boolean;
  createdAt: string;
}

const METHOD_LABELS: Record<string, string> = {
  linear_regression: 'انحدار خطي',
  moving_average: 'متوسط متحرك',
  weighted_moving_average: 'متوسط موزون',
  holt_exponential: 'تنعيم هولت الأسي',
  cagr: 'معدل نمو مركب',
};

export function ForecastsModule() {
  const { toast } = useToast();
  const [models, setModels] = React.useState<ForecastModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewingModel, setViewingModel] = React.useState<ForecastModel | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/forecasts');
      const data = await res.json();
      if (data.models) setModels(data.models);
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحميل', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي النماذج" value={models.length} icon={LineChartIcon} color="#2563eb" />
        <SummaryCard label="نشطة" value={models.filter(m => m.isActive).length} icon={CheckCircle2} color="#059669" />
        <SummaryCard label="متوسط الدقة" value={`${(models.reduce((s, m) => s + (m.accuracy || 0), 0) / Math.max(1, models.length) * 100).toFixed(1)}%`} icon={Target} color="#7c3aed" />
        <SummaryCard label="طرق مستخدمة" value={new Set(models.map(m => m.method)).size} icon={Brain} color="#d97706" />
      </div>

      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Brain className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            يتم إنشاء نماذج التنبؤ من قسم "التحليل الذكي". كل تنبؤ يُحفظ تلقائياً مع معاملاته ودقته
            (R²، MAPE، MAE، RMSE) ليتمكن الفريق من مراجعته ومقارنته لاحقاً.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : models.length === 0 ? (
            <div className="p-12 text-center">
              <LineChartIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد نماذج تنبؤ</div>
              <div className="text-xs text-muted-foreground">شغّل أول تنبؤ من قسم "التحليل الذكي"</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم النموذج</TableHead>
                  <TableHead className="text-right">الطريقة</TableHead>
                  <TableHead className="text-right">المقياس</TableHead>
                  <TableHead className="text-right">الدقة</TableHead>
                  <TableHead className="text-right">الفترات</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setViewingModel(m)}>
                    <TableCell className="text-sm font-medium">{m.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{METHOD_LABELS[m.method] || m.method}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{m.targetMetric}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(m.accuracy || 0) * 100}%`,
                              background: m.accuracy >= 0.7 ? '#059669' : m.accuracy >= 0.4 ? '#d97706' : '#dc2626',
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono">{((m.accuracy || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{m.periodsAhead}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={async () => {
                          if (!confirm('حذف هذا النموذج؟')) return;
                          await fetch(`/api/forecasts/${m.id}`, { method: 'DELETE' });
                          toast({ title: 'تم الحذف' });
                          load();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View dialog */}
      {viewingModel && (
        <ForecastDetailDialog
          model={viewingModel}
          open={!!viewingModel}
          onOpenChange={(open) => !open && setViewingModel(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
            <div className="text-lg font-bold">{value}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}20`, color }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ForecastDetailDialog({
  model, open, onOpenChange,
}: {
  model: ForecastModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  let parsed: any = null;
  let params: any = {};
  try {
    parsed = JSON.parse(model.forecastData);
    params = JSON.parse(model.parameters);
  } catch {}

  const chartData = [
    ...(parsed?.historical || []).map((p: any) => ({
      period: p.period, historical: p.value, forecast: null,
    })),
    ...(parsed?.forecast || []).map((p: any) => ({
      period: p.period, historical: null, forecast: p.value,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">{model.name}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>إغلاق</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatBox label="الدقة (R²)" value={`${(model.accuracy * 100).toFixed(1)}%`} icon={Target} />
          <StatBox label="الطريقة" value={METHOD_LABELS[model.method] || model.method} icon={Brain} />
          <StatBox label="الفترات" value={String(model.periodsAhead)} icon={Activity} />
          <StatBox label="المقياس" value={model.targetMetric} icon={Sigma} />
        </div>

        {parsed?.formula && (
          <div className="mb-4 p-3 rounded-xl bg-muted/40 border border-border/40">
            <div className="text-[10px] text-muted-foreground mb-1">الصيغة الرياضية</div>
            <code className="text-xs font-mono">{parsed.formula}</code>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="h-[300px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ direction: 'ltr', fontSize: 11 }}
                  formatter={(v: any) => v !== null ? Number(v).toLocaleString() : '—'}
                />
                <Line type="monotone" dataKey="historical" stroke="#0d9488" strokeWidth={2} name="الفعلي" connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" name="التنبؤ" connectNulls={false} />
                {parsed?.historical?.length > 0 && (
                  <ReferenceLine x={parsed.historical[parsed.historical.length - 1].period} stroke="#94a3b8" strokeDasharray="2 2" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {Object.keys(params).length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-2">معاملات النموذج</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(params).map(([k, v]) => (
                <div key={k} className="p-2 rounded-lg bg-muted/30 border border-border/40">
                  <div className="text-[10px] text-muted-foreground">{k}</div>
                  <div className="text-xs font-mono font-semibold">{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}
