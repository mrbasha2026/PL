'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Building2, Info, AlertTriangle, Brain } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  formatCompact,
  periodToArabic,
  parsePeriod,
  ARABIC_MONTHS,
  CompanyGroup,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';
import { ClaudeInsight } from '@/components/pnl/ClaudeInsight';

// ─── Linear Regression Helper ───────────────────────────────────────────────
function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  // R-squared
  const yMean = sumY / n;
  const ssTotal = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssResidual = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const rSquared = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;
  return { slope, intercept, rSquared };
}

// ─── Period Projection ───────────────────────────────────────────────────────
const MONTH_KEYS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function projectPeriods(lastPeriod: string, count: number): string[] {
  const parsed = parsePeriod(lastPeriod);
  if (!parsed) return [];

  const results: string[] = [];
  let { year, month } = parsed;

  for (let i = 0; i < count; i++) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const monthKey = MONTH_KEYS_EN[month - 1];
    results.push(`${monthKey} ${year}`);
  }
  return results;
}

// ─── Confidence Level ────────────────────────────────────────────────────────
function getConfidenceLevel(rSquared: number): { label: string; color: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (rSquared > 0.8) return { label: 'ثقة عالية', color: 'text-emerald-600', variant: 'default' };
  if (rSquared >= 0.5) return { label: 'ثقة متوسطة', color: 'text-amber-600', variant: 'secondary' };
  return { label: 'ثقة منخفضة', color: 'text-red-500', variant: 'destructive' };
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ForecastResult {
  key: string;
  nameAr: string;
  isSubtotal: boolean;
  isTotal: boolean;
  indent: number;
  historical: number[];
  forecasted: number[];
  rSquared: number;
  slope: number;
  regression: { slope: number; intercept: number; rSquared: number };
}

interface CompanyForecast {
  companyName: string;
  historicalPeriods: string[];
  forecastPeriods: string[];
  allPeriods: string[];
  allPeriodsAr: string[];
  results: ForecastResult[];
}

// ─── Core Forecasting Logic ─────────────────────────────────────────────────
function computeForecasts(group: CompanyGroup): CompanyForecast | null {
  if (group.datasets.length < 2) return null;

  const historicalPeriods = group.datasets.map((d) => d.period);
  const lastPeriod = historicalPeriods[historicalPeriods.length - 1];
  const forecastPeriods = projectPeriods(lastPeriod, 3);

  if (forecastPeriods.length === 0) return null;

  const allPeriods = [...historicalPeriods, ...forecastPeriods];
  const allPeriodsAr = allPeriods.map((p, idx) => {
    if (idx >= historicalPeriods.length) {
      const arBase = periodToArabic(p);
      return `${arBase} (تنبؤ)`;
    }
    return periodToArabic(p);
  });

  const results: ForecastResult[] = PNL_LINE_ITEMS.map((item) => {
    const key = getLineItemKey(item.name);

    // Build regression points from historical data
    const points = group.datasets.map((ds, idx) => ({
      x: idx,
      y: ds.data[key] || 0,
    }));

    const regression = linearRegression(points);

    // Generate forecasted values
    const forecasted: number[] = [];
    for (let i = 0; i < forecastPeriods.length; i++) {
      const xVal = historicalPeriods.length + i;
      const predicted = regression.slope * xVal + regression.intercept;
      forecasted.push(Math.round(predicted));
    }

    const historical = group.datasets.map((ds) => ds.data[key] || 0);

    return {
      key,
      nameAr: item.nameAr,
      isSubtotal: item.isSubtotal || false,
      isTotal: item.isTotal || false,
      indent: item.indent || 0,
      historical,
      forecasted,
      rSquared: regression.rSquared,
      slope: regression.slope,
      regression,
    };
  });

  return {
    companyName: group.name,
    historicalPeriods,
    forecastPeriods,
    allPeriods,
    allPeriodsAr,
    results,
  };
}

// ─── Forecast Table ─────────────────────────────────────────────────────────
function ForecastTable({ forecast, currency }: { forecast: CompanyForecast; currency: string }) {
  const { historicalPeriods, forecastPeriods, allPeriodsAr, results } = forecast;

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10">
              <TableHead className="min-w-[180px] sticky right-0 bg-background z-10 text-xs font-bold border-l">
                البند المالي
              </TableHead>
              {historicalPeriods.map((_, i) => (
                <TableHead key={`hist-${i}`} className="min-w-[110px] text-center text-xs font-medium">
                  {allPeriodsAr[i]}
                </TableHead>
              ))}
              {forecastPeriods.map((_, i) => (
                <TableHead
                  key={`fc-${i}`}
                  className="min-w-[110px] text-center text-xs font-medium bg-indigo-50/60"
                >
                  {allPeriodsAr[historicalPeriods.length + i]}
                </TableHead>
              ))}
              <TableHead className="min-w-[90px] text-center text-[10px] font-medium bg-muted/5">
                R²
              </TableHead>
              <TableHead className="min-w-[90px] text-center text-[10px] font-medium bg-muted/5">
                مستوى الثقة
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((row) => {
              const isSummary = row.isSubtotal || row.isTotal;
              const confidence = getConfidenceLevel(row.rSquared);

              return (
                <TableRow
                  key={row.key}
                  className={`${isSummary ? 'bg-muted/15 font-bold' : ''} hover:bg-muted/5 transition-colors`}
                >
                  <TableCell
                    className={`text-sm sticky right-0 bg-background z-10 border-l ${
                      isSummary ? 'font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    <span style={{ paddingRight: `${row.indent * 20}px` }}>
                      {row.nameAr}
                    </span>
                  </TableCell>

                  {/* Historical values */}
                  {row.historical.map((val, i) => (
                    <TableCell
                      key={`h-${i}`}
                      className={`text-center tabular-nums text-sm ${
                        val < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''
                      }`}
                    >
                      {formatNumber(val, currency)}
                    </TableCell>
                  ))}

                  {/* Forecasted values */}
                  {row.forecasted.map((val, i) => (
                    <TableCell
                      key={`f-${i}`}
                      className={`text-center tabular-nums text-sm italic bg-indigo-50/30 ${
                        val < 0 ? 'text-red-600' : 'text-indigo-700'
                      }`}
                    >
                      {formatNumber(val, currency)}
                    </TableCell>
                  ))}

                  {/* R² */}
                  <TableCell className="text-center tabular-nums text-xs bg-muted/5">
                    {row.rSquared.toFixed(3)}
                  </TableCell>

                  {/* Confidence */}
                  <TableCell className="text-center bg-muted/5">
                    <Badge
                      variant={confidence.variant}
                      className={`text-[10px] px-1.5 py-0 ${confidence.color}`}
                    >
                      {confidence.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Methodology note */}
      <div className="border-t px-4 py-3 bg-muted/10">
        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p>الانحدار الخطي: y = mx + b حيث x = رقم الفترة (0, 1, 2, ...) و y = قيمة البند المالي</p>
            <p>R² = 1 - (SS_residual / SS_total) — يقيس مدى ملاءمة خط الانحدار للبيانات</p>
            <p>القيم المتوقعة باللون الأزرق المائل — القيم السالبة بالأحمر</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Forecast Chart ─────────────────────────────────────────────────────────
function ForecastChart({ forecast }: { forecast: CompanyForecast }) {
  const { historicalPeriods, forecastPeriods, allPeriods, allPeriodsAr, results } = forecast;

  // We show Revenue and Net Income trend lines
  const chartItems = [
    { key: 'revenue', label: 'الإيرادات', labelForecast: 'الإيرادات (تنبؤ)' },
    { key: 'net_income', label: 'صافي الدخل', labelForecast: 'صافي الدخل (تنبؤ)' },
  ];

  // Build chart data: each entry is a period with historical + forecast values
  const chartData = allPeriods.map((period, idx) => {
    const entry: Record<string, string | number> = {
      period: allPeriodsAr[idx],
      isForecast: idx >= historicalPeriods.length ? 1 : 0,
    };

    chartItems.forEach((ci) => {
      const result = results.find((r) => r.key === ci.key);
      if (!result) return;

      if (idx < historicalPeriods.length) {
        // Historical: put value in the solid-line key; null for forecast key
        entry[ci.key] = result.historical[idx] || 0;
        entry[`${ci.key}_forecast`] = idx === historicalPeriods.length - 1 ? result.historical[idx] || 0 : null;
      } else {
        // Forecast: null for solid-line key (except first forecast point connects), value in forecast key
        const fcIdx = idx - historicalPeriods.length;
        entry[ci.key] = null;
        if (fcIdx === 0) {
          // Connect the forecast line to the last historical point
          entry[`${ci.key}_forecast`] = result.historical[historicalPeriods.length - 1] || 0;
        } else {
          entry[`${ci.key}_forecast`] = result.forecasted[fcIdx - 1] ?? null;
        }
      }
    });

    return entry;
  });

  // Adjust: make the forecast line connect properly
  // For each chart item, the last historical point should be in both keys so lines connect
  chartData.forEach((entry, idx) => {
    if (idx === historicalPeriods.length - 1) {
      chartItems.forEach((ci) => {
        const result = results.find((r) => r.key === ci.key);
        if (result) {
          entry[`${ci.key}_forecast`] = result.historical[idx] || 0;
        }
      });
    }
    if (idx === historicalPeriods.length) {
      chartItems.forEach((ci) => {
        const result = results.find((r) => r.key === ci.key);
        if (result) {
          entry[ci.key] = null;
          entry[`${ci.key}_forecast`] = result.forecasted[0] ?? null;
        }
      });
    }
  });

  const CHART_COLORS = ['#0d9488', '#d97706']; // teal for revenue, amber for net income

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          الإيرادات وصافي الدخل — تاريخي + تنبؤي
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11 }}
              tickFormatter={(val: string) => {
                // Shorten forecast labels
                if (val.includes('(تنبؤ)')) {
                  return val.replace('(تنبؤ)', '★');
                }
                return val;
              }}
            />
            <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (value === null || value === undefined) return '—';
                return formatCompact(value);
              }}
              labelFormatter={(label: string) => label}
            />
            <Legend />

            {/* Historical lines (solid) */}
            {chartItems.map((ci, idx) => (
              <Line
                key={ci.key}
                type="monotone"
                dataKey={ci.key}
                name={ci.label}
                stroke={CHART_COLORS[idx]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: CHART_COLORS[idx] }}
                connectNulls={false}
              />
            ))}

            {/* Forecast lines (dashed) */}
            {chartItems.map((ci, idx) => (
              <Line
                key={`${ci.key}_forecast`}
                type="monotone"
                dataKey={`${ci.key}_forecast`}
                name={ci.labelForecast}
                stroke={CHART_COLORS[idx]}
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ r: 3, fill: CHART_COLORS[idx], stroke: CHART_COLORS[idx] }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Chart legend supplement */}
        <div className="flex items-center justify-center gap-6 mt-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 bg-teal-600" />
            خط متصل = تاريخي
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5 border-t-2 border-dashed border-teal-600" />
            خط متقطع = تنبؤي
          </span>
          <span className="flex items-center gap-1.5">
            ★ = فترة تنبؤية
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Single Company Forecast View ───────────────────────────────────────────
function CompanyForecastView({
  group,
  color,
  companyIdx,
}: {
  group: CompanyGroup;
  color: string;
  companyIdx: number;
}) {
  const forecast = useMemo(() => computeForecasts(group), [group]);

  if (!forecast) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <AlertTriangle className="mb-3 h-10 w-10 text-amber-400/50" />
        <p className="text-sm font-medium">تحتاج فترتان على الأقل لإجراء التنبؤ</p>
        <p className="text-xs mt-1">الشركة &quot;{group.name}&quot; لديها فترة واحدة فقط</p>
      </div>
    );
  }

  const currency = group.datasets[0]?.currency || 'SAR';
  const avgRSquared = forecast.results.reduce((s, r) => s + r.rSquared, 0) / forecast.results.length;
  const overallConfidence = getConfidenceLevel(avgRSquared);

  return (
    <div className="space-y-5">
      {/* Summary metrics */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-bold" style={{ color }}>
            {group.name}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {forecast.historicalPeriods.length} فترات تاريخية
        </Badge>
        <Badge variant="outline" className="text-[10px] bg-indigo-50/50 text-indigo-700">
          {forecast.forecastPeriods.length} فترات تنبؤية
        </Badge>
        <Badge
          variant={overallConfidence.variant}
          className={`text-[10px] ${overallConfidence.color}`}
        >
          ثقة إجمالية: {overallConfidence.label} (R² = {avgRSquared.toFixed(2)})
        </Badge>
      </div>

      {/* Forecast Chart */}
      <ForecastChart forecast={forecast} />

      {/* Forecast Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-2" style={{ backgroundColor: `${color}08` }}>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span style={{ color }}>{group.name}</span>
            <Badge variant="outline" className="text-xs">جدول التنبؤات</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ForecastTable forecast={forecast} currency={currency} />
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
        <div>
          <p className="font-bold mb-0.5">تنبيه</p>
          <p>التنبؤات مبنية على الاتجاهات التاريخية وقد لا تعكس الأداء الفعلي. الانحدار الخطي يفترض علاقة خطية وقد لا يلتقط التغيرات الموسمية أو الهيكلية.</p>
        </div>
      </div>

      {/* Methodology footnote */}
      <div className="text-[10px] text-muted-foreground/60 px-1 pb-2">
        <p>المنهجية: الانحدار الخطي البسيط (Simple Linear Regression) — y = mx + b</p>
        <p>القيود: لا يراعي الموسمية، التضخم، التغيرات الهيكلية، أو الأحداث الاستثنائية</p>
        <p>القيم المتوقعة قد تكون سالبة أو غير منطقية لبعض البنود — يرجى المراجعة قبل اتخاذ أي قرار</p>
      </div>

      {/* Claude AI Forecast Insight */}
      <ClaudeInsight
        title={`تحليل Claude الذكي — تنبؤات ${group.name}`}
        icon={<Brain className="h-4 w-4" />}
        systemPrompt={`أنت محلل مالي متخصص في التنبؤ والتحليل التوقعي. أجب بالعربية فقط.
بناءً على بيانات التنبؤات المالية المقدمة، قدم تحليلاً يتضمن:
1. تقييم موثوقية التنبؤات بناءً على قيم R²
2. أهم المخاطر التي قد تؤثر على دقة التنبؤات
3. توقعاتك أنت بناءً على الأنماط المرئية في البيانات
4. عوامل خارجية قد تغير مسار الأداء
5. توصيات عملية لتحسين دقة التنبؤات المستقبلية`}
        prompt={`بيانات التنبؤات المالية للشركة: ${group.name}
العملة: ${currency}
عدد الفترات التاريخية: ${forecast.historicalPeriods.length}
عدد الفترات التنبؤية: ${forecast.forecastPeriods.length}
متوسط R²: ${avgRSquared.toFixed(3)}
مستوى الثقة الإجمالي: ${overallConfidence.label}

أهم بنود التنبؤ:
${forecast.results.filter(r => r.key === 'revenue' || r.key === 'net_income' || r.key === 'gross_profit' || r.key === 'operating_income_ebit').map(r => {
  const dir = r.slope > 0 ? 'صاعد' : r.slope < 0 ? 'هابط' : 'ثابت';
  return `${r.nameAr}: اتجاه ${dir}، R²=${r.rSquared.toFixed(3)}، القيمة التاريخية الأخيرة=${r.historical[r.historical.length-1]}، التنبؤ=${r.forecasted.join(', ')}`;
}).join('\n')}

الفترات التاريخية: ${forecast.historicalPeriods.join(' → ')}
الفترات التنبؤية: ${forecast.forecastPeriods.join(' → ')}`}
        maxTokens={2500}
        temperature={0.5}
      />
    </div>
  );
}

// ─── Main Exported Component ─────────────────────────────────────────────────
export function Forecasting() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            اختر بيانات لعرض التنبؤات المالية
          </h3>
          <p className="mt-2 text-sm text-muted-foreground/60">
            تحتاج فترتان على الأقل لكل شركة لإجراء التنبؤ بالانحدار الخطي
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if any company has >= 2 periods
  const eligibleGroups = groups.filter((g) => g.datasets.length >= 2);
  if (eligibleGroups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-amber-400/40" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            لا توجد بيانات كافية للتنبؤ
          </h3>
          <p className="mt-2 text-sm text-muted-foreground/60">
            تحتاج كل شركة فترتان على الأقل لإجراء الانحدار الخطي
          </p>
        </CardContent>
      </Card>
    );
  }

  // Single eligible company: no tabs needed
  if (eligibleGroups.length === 1) {
    const group = eligibleGroups[0];
    const color = COMPANY_COLORS[groups.indexOf(group) % COMPANY_COLORS.length];
    return (
      <div dir="rtl">
        <CompanyForecastView group={group} color={color} companyIdx={0} />
      </div>
    );
  }

  // Multiple eligible companies: tabs
  return (
    <div dir="rtl">
      <Card className="shadow-sm overflow-hidden">
        <Tabs defaultValue={eligibleGroups[0].name}>
          <TabsList className="w-full justify-start gap-1 rounded-none border-b bg-muted/30 p-1 overflow-x-auto flex-nowrap">
            {eligibleGroups.map((group) => {
              const gIdx = groups.indexOf(group);
              const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
              const forecast = computeForecasts(group);
              const avgRSquared = forecast
                ? forecast.results.reduce((s, r) => s + r.rSquared, 0) / forecast.results.length
                : 0;
              const confidence = getConfidenceLevel(avgRSquared);

              return (
                <TabsTrigger
                  key={group.name}
                  value={group.name}
                  className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm shrink-0"
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="max-w-[100px] truncate">{group.name}</span>
                  <Badge
                    variant={confidence.variant}
                    className={`text-[8px] px-1 py-0 leading-none ${confidence.color}`}
                  >
                    R²={avgRSquared.toFixed(1)}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {eligibleGroups.map((group) => {
            const gIdx = groups.indexOf(group);
            const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
            return (
              <TabsContent key={group.name} value={group.name} className="m-0">
                <CardContent className="p-4">
                  <CompanyForecastView group={group} color={color} companyIdx={gIdx} />
                </CardContent>
              </TabsContent>
            );
          })}
        </Tabs>
      </Card>
    </div>
  );
}
