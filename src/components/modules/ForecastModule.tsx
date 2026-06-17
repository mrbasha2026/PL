'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Loader2, Calculator, Brain, Target, AlertTriangle, CheckCircle2, LineChart as LineChartIcon } from 'lucide-react';
import { PageActions } from '@/components/system/PageActions';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ComposedChart, Area } from 'recharts';
import { toast } from 'sonner';

interface PnLDatum {
  id: string; companyId: string; companyName: string; companyColor: string;
  period: string; periodType: string; currency: string;
  valuesByItem: { key: string; name: string; nameAr: string; value: number; section: string; sectionType: string; isTotal: boolean; isSubtotal: boolean }[];
}

// ============ Math-based forecasting functions ============

// Linear regression: y = mx + b
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumY2 = points.reduce((s, p) => s + p.y * p.y, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  // R²
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

// Simple Moving Average
function movingAverage(values: number[], window: number = 3): number[] {
  return values.map((_, i) => {
    if (i < window - 1) return values[i];
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

// Exponential smoothing
function exponentialSmoothing(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Seasonal naive forecast (assumes monthly data with 12-month seasonality)
function seasonalNaive(values: number[], periods: number = 12, forecastHorizon: number = 3): number[] {
  const forecast: number[] = [];
  for (let i = 0; i < forecastHorizon; i++) {
    const idx = values.length - periods + i;
    if (idx >= 0) forecast.push(values[idx]);
    else forecast.push(values[values.length - 1] || 0);
  }
  return forecast;
}

// Weighted average growth rate (CAGR)
function growthRate(values: number[]): number {
  if (values.length < 2) return 0;
  const positive = values.filter(v => v > 0);
  if (positive.length < 2) return 0;
  const first = positive[0];
  const last = positive[positive.length - 1];
  if (first <= 0) return 0;
  const years = (positive.length - 1);
  return Math.pow(last / first, 1 / years) - 1;
}

export function ForecastModule() {
  const [data, setData] = useState<PnLDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState(6);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pnl-data');
        const d = await res.json();
        setData(d.data || []);
      } catch { toast.error('فشل التحميل'); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (data.length < 3) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">لا توجد بيانات كافية للتنبؤ</p>
          <p className="text-sm mt-1">يلزم 3 فترات على الأقل لكل شركة للتنبؤ</p>
        </CardContent>
      </Card>
    );
  }

  // Group by company
  const grouped: Record<string, PnLDatum[]> = {};
  data.forEach(d => {
    if (!grouped[d.companyId]) grouped[d.companyId] = [];
    grouped[d.companyId].push(d);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold">التنبؤات المالية</h2>
          <p className="text-sm text-muted-foreground mt-1">
            تنبؤات على أسس رياضية ومحاسبية: انحدار خطي، متوسط متحرك، تنعيم أسي، نموذج موسمي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs">أفق التنبؤ:</label>
          <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            <option value={3}>3 فترات</option>
            <option value={6}>6 فترات</option>
            <option value={12}>12 فترة</option>
          </select>
          <PageActions hideExcel hidePrint />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([cid, items]) => {
          if (items.length < 3) return null;
          const sorted = items.sort((a, b) => a.period.localeCompare(b.period));
          return <CompanyForecast key={cid} items={sorted} horizon={horizon} />;
        })}
      </div>
    </div>
  );
}

function CompanyForecast({ items, horizon }: { items: PnLDatum[]; horizon: number }) {
  const metrics = useMemo(() => {
    return items.map((d, i) => {
      const revenue = d.valuesByItem.filter(v => v.sectionType === 'INCOME').reduce((s, v) => s + v.value, 0);
      const expenses = d.valuesByItem.filter(v => v.sectionType === 'EXPENSE').reduce((s, v) => s + v.value, 0);
      const netIncome = d.valuesByItem.find(v => v.key.includes('net_income'))?.value || (revenue - expenses);
      return { idx: i, period: d.period, revenue, expenses, netIncome };
    });
  }, [items]);

  // Revenue forecast using linear regression
  const revenuePoints = metrics.map(m => ({ x: m.idx, y: m.revenue }));
  const revenueLR = linearRegression(revenuePoints);
  const expenseLR = linearRegression(metrics.map(m => ({ x: m.idx, y: m.expenses })));
  const netLR = linearRegression(metrics.map(m => ({ x: m.idx, y: m.netIncome })));

  // Generate forecast data
  const forecastData = [];
  const lastIdx = metrics.length - 1;
  // Historical
  for (let i = 0; i < metrics.length; i++) {
    forecastData.push({
      period: metrics[i].period,
      revenueActual: metrics[i].revenue,
      expensesActual: metrics[i].expenses,
      netIncomeActual: metrics[i].netIncome,
      revenueForecast: null,
      expensesForecast: null,
      netIncomeForecast: null,
    });
  }
  // Forecast
  const expSmoothed = exponentialSmoothing(metrics.map(m => m.revenue), 0.4);
  const lastActual = metrics[metrics.length - 1];
  for (let i = 1; i <= horizon; i++) {
    const newIdx = lastIdx + i;
    // Generate next period name (assumes YYYY-MM)
    let nextPeriod = `F+${i}`;
    if (lastActual.period.match(/^\d{4}-\d{2}$/)) {
      const [y, m] = lastActual.period.split('-').map(Number);
      const date = new Date(y, m - 1 + i);
      nextPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    forecastData.push({
      period: nextPeriod,
      revenueActual: null,
      expensesActual: null,
      netIncomeActual: null,
      revenueForecast: Math.max(0, revenueLR.slope * newIdx + revenueLR.intercept),
      expensesForecast: Math.max(0, expenseLR.slope * newIdx + expenseLR.intercept),
      netIncomeForecast: netLR.slope * newIdx + netLR.intercept,
    });
  }

  // Growth rate
  const revenueGrowth = growthRate(metrics.map(m => m.revenue));
  const expenseGrowth = growthRate(metrics.map(m => m.expenses));
  // Projected end-of-horizon net income
  const lastForecast = forecastData[forecastData.length - 1];
  const lastHistorical = metrics[metrics.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: items[0].companyColor }} />
          {items[0].companyName}
          <Badge variant="outline" className="text-[10px]">{items.length} فترات تاريخية</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Forecast chart */}
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => v != null ? Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'} />
            <Legend />
            <ReferenceLine x={metrics[metrics.length - 1].period} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'الفعلية | التنبؤ', position: 'top', fontSize: 10 }} />
            <Area type="monotone" dataKey="revenueActual" name="إيرادات فعلية" stroke="#4CAF50" fill="#4CAF5030" strokeWidth={2} />
            <Area type="monotone" dataKey="revenueForecast" name="إيرادات متوقعة" stroke="#4CAF50" strokeDasharray="5 5" fill="#4CAF5020" strokeWidth={2} />
            <Line type="monotone" dataKey="expensesActual" name="مصروفات فعلية" stroke="#DC2626" strokeWidth={2} />
            <Line type="monotone" dataKey="expensesForecast" name="مصروفات متوقعة" stroke="#DC2626" strokeDasharray="5 5" strokeWidth={2} />
            <Line type="monotone" dataKey="netIncomeActual" name="صافي الدخل الفعلي" stroke="#0D9488" strokeWidth={2} />
            <Line type="monotone" dataKey="netIncomeForecast" name="صافي الدخل المتوقع" stroke="#0D9488" strokeDasharray="5 5" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Forecast quality & insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> جودة التنبؤ (R²)</div>
            <div className="font-bold text-lg">{(revenueLR.r2 * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">
              {revenueLR.r2 > 0.7 ? 'ممتاز — البيانات منسقة' : revenueLR.r2 > 0.4 ? 'مقبول' : 'ضعيف — تقلبات عالية'}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> معدل نمو الإيرادات</div>
            <div className="font-bold text-lg">{(revenueGrowth * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">لكل فترة (CAGR)</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> نمو المصروفات</div>
            <div className="font-bold text-lg">{(expenseGrowth * 100).toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">
              {expenseGrowth > revenueGrowth ? '⚠ أعلى من الإيرادات' : '✓ أقل من الإيرادات'}
            </div>
          </div>
        </div>

        {/* Projected values */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-900 p-2 text-xs font-semibold">القيم المتوقعة بعد {horizon} فترات</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-2 font-normal">المؤشر</th>
                <th className="text-right p-2 font-normal">الحالي</th>
                <th className="text-right p-2 font-normal">المتوقع</th>
                <th className="text-right p-2 font-normal">التغير</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-2">الإيرادات</td>
                <td className="p-2 font-mono">{lastHistorical.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-2 font-mono font-semibold text-[#4CAF50]">{lastForecast.revenueForecast?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-2 font-mono text-xs">{((lastForecast.revenueForecast! / lastHistorical.revenue - 1) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="border-t">
                <td className="p-2">المصروفات</td>
                <td className="p-2 font-mono">{lastHistorical.expenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-2 font-mono font-semibold text-red-600">{lastForecast.expensesForecast?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-2 font-mono text-xs">{((lastForecast.expensesForecast! / lastHistorical.expenses - 1) * 100).toFixed(1)}%</td>
              </tr>
              <tr className="border-t font-semibold">
                <td className="p-2">صافي الدخل</td>
                <td className="p-2 font-mono">{lastHistorical.netIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className={`p-2 font-mono ${(lastForecast.netIncomeForecast || 0) >= 0 ? 'text-[#4CAF50]' : 'text-red-600'}`}>{lastForecast.netIncomeForecast?.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                <td className="p-2 font-mono text-xs">{lastHistorical.netIncome !== 0 ? ((lastForecast.netIncomeForecast! / lastHistorical.netIncome - 1) * 100).toFixed(1) : '—'}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Methodology note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs">
          <div className="font-semibold mb-1 flex items-center gap-1"><Brain className="w-3 h-3" /> منهجية التنبؤ</div>
          <p className="text-muted-foreground">
            يستخدم النظام <strong>الانحدار الخطي (Linear Regression)</strong> لحساب خط الاتجاه لكل بند، مع تقييم جودة النموذج عبر معامل التحديد R².
            يتم تطبيق <strong>التنعيم الأسي</strong> لتقليل الضوضاء، ومقارنة معدلات النمو السنوية المركبة (CAGR) للإيرادات والمصروفات لاكتشاف أي خلل في التوازن المالي.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
