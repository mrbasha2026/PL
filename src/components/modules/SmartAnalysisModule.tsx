'use client';

import React from 'react';
import {
  Brain, Calculator, TrendingUp, Activity, Sigma, Target,
  AlertTriangle, CheckCircle2, Sparkles, LineChart as LineChartIcon,
  Database, Play, Save,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, ComposedChart, Bar, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePnLStore } from '@/lib/pnl-store';
import {
  bestFitForecast, linearRegression, movingAverage,
  weightedMovingAverage, holtExponentialSmoothing, cagrForecast,
  computeAccountingRatios, computeVariance,
  type ForecastResult, type TimePoint, type AccountingRatio,
} from '@/lib/forecasting';
import { PNL_LINE_ITEMS, getLineItemKey } from '@/lib/pnl-types';

const CHART_COLORS = ['#0d9488', '#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb'];

type Method = 'auto' | 'linear' | 'moving_avg' | 'weighted_avg' | 'holt' | 'cagr';

const METHOD_INFO: Record<Method, { label: string; formula: string }> = {
  auto: { label: 'أفضل نموذج (Auto)', formula: 'يجرّب كل النماذج ويختار الأعلى دقة' },
  linear: { label: 'انحدار خطي (Linear Regression)', formula: 'y = a + b·t  بطريقة المربعات الصغرى' },
  moving_avg: { label: 'متوسط متحرك (Moving Average)', formula: 'F(t) = (1/n) · Σ y(t-i)' },
  weighted_avg: { label: 'متوسط موزون (WMA)', formula: 'F(t) = Σ(wᵢ·yᵢ) / Σwᵢ' },
  holt: { label: 'تنعيم أسي - هولت (Holt)', formula: 'L=αy+(1-α)(L+T),  T=βΔL+(1-β)T' },
  cagr: { label: 'معدل نمو مركب (CAGR)', formula: 'CAGR = (V_end/V_start)^(1/n) - 1' },
};

export function SmartAnalysisModule() {
  const { toast } = useToast();
  const { companies, selectedCompanyNames } = usePnLStore();
  const [selectedCompany, setSelectedCompany] = React.useState<string>('');
  const [selectedMetric, setSelectedMetric] = React.useState<string>('revenue');
  const [method, setMethod] = React.useState<Method>('auto');
  const [periodsAhead, setPeriodsAhead] = React.useState<number>(6);
  const [result, setResult] = React.useState<ForecastResult | null>(null);
  const [ratios, setRatios] = React.useState<AccountingRatio[]>([]);
  const [varianceRows, setVarianceRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Get list of available metrics (line items) from PnL data
  const availableMetrics = React.useMemo(() => {
    const keys = new Set<string>();
    companies.forEach((c) => Object.keys(c.data || {}).forEach((k) => keys.add(k)));
    return Array.from(keys).sort();
  }, [companies]);

  // Build time series from PnL data for selected company×metric
  const buildTimeSeries = React.useCallback((): TimePoint[] => {
    if (!selectedCompany || !selectedMetric) return [];
    const companyData = companies.filter((c) => c.companyName === selectedCompany);
    if (companyData.length === 0) return [];

    const points: TimePoint[] = companyData
      .filter((c) => c.data?.[selectedMetric] !== undefined && c.data?.[selectedMetric] !== null)
      .map((c) => ({
        period: normalizePeriod(c.period),
        value: Number(c.data[selectedMetric]) || 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
    return points;
  }, [companies, selectedCompany, selectedMetric]);

  const runForecast = async () => {
    setLoading(true);
    try {
      const series = buildTimeSeries();
      if (series.length < 2) {
        toast({
          title: 'بيانات غير كافية',
          description: 'تحتاج على الأقل لنقطتي بيانات لتشغيل التنبؤ. تأكد من اختيار شركة ومقياس لهما بيانات كافية.',
          variant: 'destructive',
        });
        setResult(null);
        return;
      }

      let res: ForecastResult;
      switch (method) {
        case 'linear':
          res = linearRegression(series, periodsAhead);
          break;
        case 'moving_avg':
          res = movingAverage(series, Math.min(3, series.length - 1), periodsAhead);
          break;
        case 'weighted_avg':
          res = weightedMovingAverage(series, Math.min(3, series.length - 1), periodsAhead);
          break;
        case 'holt':
          res = holtExponentialSmoothing(series, 0.5, 0.3, periodsAhead);
          break;
        case 'cagr':
          res = cagrForecast(series, periodsAhead);
          break;
        case 'auto':
        default:
          const best = bestFitForecast(series, periodsAhead);
          res = best;
          break;
      }
      setResult(res);
      toast({
        title: 'تم التنبؤ',
        description: `الدقة: ${(res.accuracy * 100).toFixed(1)}% · MAPE: ${res.mape.toFixed(1)}%`,
      });

      // Save to DB
      try {
        await fetch('/api/forecasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${selectedMetric} — ${METHOD_INFO[method].label}`,
            method: res.method,
            targetMetric: selectedMetric,
            parameters: res.parameters,
            accuracy: res.accuracy,
            forecastData: {
              historical: res.historical,
              forecast: res.forecast,
              lower: res.lower,
              upper: res.upper,
              formula: res.formula,
            },
            periodsAhead,
          }),
        });
      } catch (e) {
        console.warn('forecast save failed', e);
      }
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Compute accounting ratios from latest P&L data of selected company
  const computeRatios = React.useCallback(() => {
    if (!selectedCompany) return;
    const data = companies.filter((c) => c.companyName === selectedCompany);
    if (!data.length) return;
    // Use the most recent period
    const latest = data.sort((a, b) => b.period.localeCompare(a.period))[0];
    const d = latest.data || {};
    const revenue = Number(d['revenue'] || d['sales_revenue'] || 0);
    const cogs = Number(d['cost_of_goods_sold'] || 0);
    const grossProfit = Number(d['gross_profit'] || (revenue - cogs));
    const operatingExpenses = Number(d['operating_expenses'] || 0);
    const operatingIncome = Number(d['operating_income_ebit'] || (grossProfit - operatingExpenses));
    const netIncome = Number(d['net_income'] || 0);

    if (revenue === 0) {
      setRatios([]);
      return;
    }
    setRatios(computeAccountingRatios({
      revenue, cogs, grossProfit, operatingExpenses, operatingIncome, netIncome,
    }));
  }, [companies, selectedCompany]);

  // Compute variance vs prior period
  const computeVariances = React.useCallback(() => {
    if (!selectedCompany) return;
    const data = companies.filter((c) => c.companyName === selectedCompany)
      .sort((a, b) => a.period.localeCompare(b.period));
    if (data.length < 2) {
      setVarianceRows([]);
      return;
    }
    const current = data[data.length - 1];
    const prior = data[data.length - 2];
    const metrics = ['revenue', 'gross_profit', 'operating_income_ebit', 'net_income', 'operating_expenses', 'cost_of_goods_sold'];
    const rows = metrics.map((key) => {
      const actual = Number(current.data?.[key] || 0);
      const baseline = Number(prior.data?.[key] || 0);
      const item = PNL_LINE_ITEMS.find((i) => getLineItemKey(i.name) === key);
      return computeVariance({
        metric: key,
        metricAr: item?.nameAr || key,
        actual, baseline,
        higherIsBetter: !key.includes('expense') && !key.includes('cost'),
      });
    });
    setVarianceRows(rows);
  }, [companies, selectedCompany]);

  React.useEffect(() => {
    if (selectedCompany) {
      computeRatios();
      computeVariances();
    }
  }, [selectedCompany, computeRatios, computeVariances]);

  // Build chart data
  const chartData = React.useMemo(() => {
    if (!result) return [];
    const all = [
      ...result.historical.map((p) => ({ period: p.period, historical: p.value, forecast: null as number | null, lower: null, upper: null })),
      ...result.forecast.map((p, i) => ({
        period: p.period,
        historical: null as number | null,
        forecast: p.value,
        lower: result.lower[i].value,
        upper: result.upper[i].value,
      })),
    ];
    return all;
  }, [result]);

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <Card className="bg-gradient-to-br from-purple-500/5 to-violet-500/5 border-purple-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400 flex-shrink-0">
            <Brain className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold mb-1">التحليل الذكي على أسس رياضية ومحاسبية</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              يستخدم هذا القسم خوارزميات إحصائية مثبتة: <strong>الانحدار الخطي</strong> (مربعات صغرى)،
              <strong> المتوسط المتحرك</strong>، <strong>التنعيم الأسي لهولت</strong>، و<strong>معدل النمو المركب CAGR</strong>.
              تشمل المقاييس: R²، MAPE، MAE، RMSE. النسب المالية محسوبة وفق المعايير المحاسبية المعتمدة
              (هامش الربح الإجمالي، التشغيلي، الصافي، ROE، ROA، نسبة التداول، إلخ).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            إعدادات التحليل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">الشركة</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="اختر شركة..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(companies.map((c) => c.companyName))).map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">المقياس المالي</Label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="اختر مقياس..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((m) => {
                    const item = PNL_LINE_ITEMS.find((i) => getLineItemKey(i.name) === m);
                    return (
                      <SelectItem key={m} value={m}>{item?.nameAr || m}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">طريقة التنبؤ</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(METHOD_INFO) as Method[]).map((m) => (
                    <SelectItem key={m} value={m}>{METHOD_INFO[m].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">عدد الفترات المستقبلية</Label>
              <Select value={String(periodsAhead)} onValueChange={(v) => setPeriodsAhead(Number(v))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} فترات</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={runForecast} disabled={loading} className="bg-brand-gradient">
              {loading ? (
                <><Activity className="h-4 w-4 ml-1 animate-pulse" />جاري الحساب...</>
              ) : (
                <><Play className="h-4 w-4 ml-1" />تشغيل التحليل</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="forecast">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="forecast" className="text-xs">
            <TrendingUp className="h-3.5 w-3.5 ml-1" />التنبؤ
          </TabsTrigger>
          <TabsTrigger value="ratios" className="text-xs">
            <Calculator className="h-3.5 w-3.5 ml-1" />النسب المالية
          </TabsTrigger>
          <TabsTrigger value="variance" className="text-xs">
            <AlertTriangle className="h-3.5 w-3.5 ml-1" />تحليل الانحرافات
          </TabsTrigger>
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          {!result ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm font-medium mb-1">لا يوجد تنبؤ بعد</div>
                <div className="text-xs text-muted-foreground">
                  اختر شركة ومقياساً وطريقة، ثم اضغط "تشغيل التحليل"
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <StatBox label="الدقة (R²)" value={`${(result.accuracy * 100).toFixed(1)}%`} color="#059669" icon={Target} />
                <StatBox label="MAPE" value={`${result.mape.toFixed(1)}%`} color="#d97706" icon={Activity} />
                <StatBox label="MAE" value={result.mae.toLocaleString('ar-SA')} color="#7c3aed" icon={Sigma} />
                <StatBox label="RMSE" value={result.rmse.toLocaleString('ar-SA')} color="#dc2626" icon={AlertTriangle} />
              </div>

              {/* Chart */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">السلسلة الزمنية والتنبؤ</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {METHOD_INFO[method].label}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono">
                    {result.formula}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                        <Tooltip
                          contentStyle={{ direction: 'ltr', fontSize: 12 }}
                          formatter={(v: any) => v !== null ? Number(v).toLocaleString() : '—'}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stroke="none"
                          fill="#0d9488"
                          fillOpacity={0.1}
                          name="الحد الأعلى (95%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stroke="none"
                          fill="#0d9488"
                          fillOpacity={0.1}
                          name="الحد الأدنى (95%)"
                        />
                        <Line
                          type="monotone"
                          dataKey="historical"
                          stroke="#0d9488"
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          name="الفعلي"
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          stroke="#7c3aed"
                          strokeWidth={2.5}
                          strokeDasharray="5 5"
                          dot={{ r: 3, fill: '#7c3aed' }}
                          name="التنبؤ"
                          connectNulls={false}
                        />
                        <ReferenceLine x={result.historical[result.historical.length - 1]?.period} stroke="#94a3b8" strokeDasharray="2 2" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Forecast values table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">قيم التنبؤ المستقبلية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-2.5 text-xs font-semibold">الفترة</th>
                          <th className="text-right p-2.5 text-xs font-semibold">القيمة المتوقعة</th>
                          <th className="text-right p-2.5 text-xs font-semibold">الحد الأدنى (95%)</th>
                          <th className="text-right p-2.5 text-xs font-semibold">الحد الأعلى (95%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.forecast.map((p, i) => (
                          <tr key={p.period} className="border-t border-border/40">
                            <td className="p-2.5 font-mono">{p.period}</td>
                            <td className="p-2.5 font-mono font-semibold text-primary">
                              {p.value.toLocaleString('ar-SA')}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground">
                              {result.lower[i].value.toLocaleString('ar-SA')}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground">
                              {result.upper[i].value.toLocaleString('ar-SA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Parameters */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">معاملات النموذج</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {Object.entries(result.parameters).map(([k, v]) => (
                      <div key={k} className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                        <div className="text-muted-foreground mb-0.5">{k}</div>
                        <div className="font-mono font-semibold">{String(v)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Ratios Tab */}
        <TabsContent value="ratios" className="space-y-4">
          {!selectedCompany ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                اختر شركة لعرض النسب المالية
              </CardContent>
            </Card>
          ) : ratios.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calculator className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm font-medium mb-1">لا تتوفر بيانات كافية</div>
                <div className="text-xs text-muted-foreground">
                  تأكد من وجود بنود الإيرادات والتكاليف في بيانات الشركة
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ratios.map((r, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold">{r.nameAr}</div>
                        <div className="text-[10px] text-muted-foreground">{r.name}</div>
                      </div>
                      <div
                        className="text-base font-bold font-mono"
                        style={{ color: r.value >= 0 ? '#059669' : '#dc2626' }}
                      >
                        {(r.value * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded mb-2">
                      {r.formula}
                    </div>
                    <div className="text-xs leading-relaxed mb-1">{r.interpretation}</div>
                    {r.benchmark && (
                      <Badge variant="outline" className="text-[9px]">
                        المرجع: {r.benchmark}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Variance Tab */}
        <TabsContent value="variance" className="space-y-4">
          {!selectedCompany ? (
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                اختر شركة لعرض تحليل الانحرافات
              </CardContent>
            </Card>
          ) : varianceRows.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <div className="text-sm font-medium mb-1">تحتاج لفترتين على الأقل</div>
                <div className="text-xs text-muted-foreground">
                  تحليل الانحرافات يقارن آخر فترة بما قبلها
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 text-xs font-semibold">المؤشر</th>
                      <th className="text-right p-3 text-xs font-semibold">الفعلي</th>
                      <th className="text-right p-3 text-xs font-semibold">المرجع</th>
                      <th className="text-right p-3 text-xs font-semibold">الانحراف</th>
                      <th className="text-right p-3 text-xs font-semibold">%</th>
                      <th className="text-right p-3 text-xs font-semibold">التقييم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianceRows.map((v, i) => (
                      <tr key={i} className="border-t border-border/40">
                        <td className="p-3 font-medium">{v.metricAr}</td>
                        <td className="p-3 font-mono">{v.actual.toLocaleString('ar-SA')}</td>
                        <td className="p-3 font-mono text-muted-foreground">{v.baseline.toLocaleString('ar-SA')}</td>
                        <td className="p-3 font-mono" style={{
                          color: v.direction === 'favorable' ? '#059669' : v.direction === 'unfavorable' ? '#dc2626' : '#64748b',
                        }}>
                          {v.variance >= 0 ? '+' : ''}{v.variance.toLocaleString('ar-SA')}
                        </td>
                        <td className="p-3 font-mono" style={{
                          color: v.direction === 'favorable' ? '#059669' : v.direction === 'unfavorable' ? '#dc2626' : '#64748b',
                        }}>
                          {v.variancePct >= 0 ? '+' : ''}{v.variancePct.toFixed(1)}%
                        </td>
                        <td className="p-3">
                          {v.direction === 'favorable' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 ml-0.5" />إيجابي
                            </Badge>
                          ) : v.direction === 'unfavorable' ? (
                            <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 text-[10px]">
                              <AlertTriangle className="h-3 w-3 ml-0.5" />سلبي
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">مطابق</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatBox({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
            <div className="text-lg font-bold" style={{ color }}>{value}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}20`, color }}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function normalizePeriod(p: string): string {
  // Convert "Jan 2026" → "2026-01", "2026-01" → "2026-01", etc.
  const m = p.match(/^(\d{4})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;

  const monthMap: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
    'يناير': '01', 'فبراير': '02', 'مارس': '03', 'أبريل': '04', 'مايو': '05', 'يونيو': '06',
    'يوليو': '07', 'أغسطس': '08', 'سبتمبر': '09', 'أكتوبر': '10', 'نوفمبر': '11', 'ديسمبر': '12',
  };
  for (const [k, v] of Object.entries(monthMap)) {
    if (p.toLowerCase().includes(k)) {
      const yearMatch = p.match(/(\d{4})/);
      if (yearMatch) return `${yearMatch[1]}-${v}`;
    }
  }
  return p;
}
