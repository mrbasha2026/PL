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
  ArrowUpRight, ArrowDownRight, Building2, Info, AlertTriangle, Brain,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  periodToArabic,
  sortPeriods,
  CompanyGroup,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';
import { AIInsight } from '@/components/pnl/ClaudeInsight';

// --- Statistical helpers ---

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calcStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function calcZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// --- Types ---

type AnomalyStatus = 'normal' | 'deviation' | 'anomaly';

interface LineItemAnalysis {
  itemKey: string;
  nameAr: string;
  indent: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  description?: string;
  currentValue: number;
  currentPeriod: string;
  mean: number;
  stdDev: number;
  zScore: number;
  status: AnomalyStatus;
  momChange: number | null; // % change from previous period
  isLargeChange: boolean;   // exceeds 20% threshold
}

interface AnomalySummary {
  lineItem: string;
  nameAr: string;
  period: string;
  value: number;
  mean: number;
  zScore: number;
  status: AnomalyStatus;
  explanation: string;
}

// --- Thresholds ---
const ZSCORE_DEVIATION_THRESHOLD = 1.5; // > 1.5σ flagged as deviation
const ZSCORE_ANOMALY_THRESHOLD = 2.5;   // > 2.5σ flagged as anomaly
const MOM_CHANGE_THRESHOLD = 20;         // > 20% MoM change flagged

function getStatus(zScore: number): AnomalyStatus {
  const absZ = Math.abs(zScore);
  if (absZ >= ZSCORE_ANOMALY_THRESHOLD) return 'anomaly';
  if (absZ >= ZSCORE_DEVIATION_THRESHOLD) return 'deviation';
  return 'normal';
}

function getStatusBadge(status: AnomalyStatus) {
  switch (status) {
    case 'anomaly':
      return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">حالة شاذة</Badge>;
    case 'deviation':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">انحراف</Badge>;
    case 'normal':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">طبيعي</Badge>;
  }
}

function analyzeCompany(group: CompanyGroup): {
  analysis: LineItemAnalysis[];
  anomalies: AnomalySummary[];
} {
  const datasets = group.datasets;
  const analysis: LineItemAnalysis[] = [];
  const anomalies: AnomalySummary[] = [];

  if (datasets.length < 2) {
    // With only 1 period, we can't compute meaningful statistics
    // Still show the values but with no deviation data
    const ds = datasets[0];
    for (const item of PNL_LINE_ITEMS) {
      const key = getLineItemKey(item.name);
      const val = ds.data[key] || 0;
      analysis.push({
        itemKey: key,
        nameAr: item.nameAr,
        indent: item.indent || 0,
        isSubtotal: item.isSubtotal,
        isTotal: item.isTotal,
        description: item.description,
        currentValue: val,
        currentPeriod: ds.period,
        mean: val,
        stdDev: 0,
        zScore: 0,
        status: 'normal',
        momChange: null,
        isLargeChange: false,
      });
    }
    return { analysis, anomalies };
  }

  // Multiple periods: compute stats for each line item
  const lastDataset = datasets[datasets.length - 1];
  const prevDataset = datasets[datasets.length - 2];

  for (const item of PNL_LINE_ITEMS) {
    const key = getLineItemKey(item.name);
    const values = datasets.map(ds => ds.data[key] || 0);
    const mean = calcMean(values);
    const stdDev = calcStdDev(values, mean);
    const currentVal = lastDataset.data[key] || 0;
    const zScore = calcZScore(currentVal, mean, stdDev);
    const status = getStatus(zScore);

    // MoM change
    const prevVal = prevDataset.data[key] || 0;
    let momChange: number | null = null;
    let isLargeChange = false;
    if (prevVal !== 0) {
      momChange = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
      isLargeChange = Math.abs(momChange) > MOM_CHANGE_THRESHOLD;
    }

    analysis.push({
      itemKey: key,
      nameAr: item.nameAr,
      indent: item.indent || 0,
      isSubtotal: item.isSubtotal,
      isTotal: item.isTotal,
      description: item.description,
      currentValue: currentVal,
      currentPeriod: lastDataset.period,
      mean,
      stdDev,
      zScore,
      status,
      momChange,
      isLargeChange,
    });

    // Collect anomalies and significant deviations
    if (status === 'anomaly' || status === 'deviation') {
      const direction = currentVal > mean ? 'أعلى' : 'أقل';
      const sigmaLabel = status === 'anomaly' ? 'حالة شاذة' : 'انحراف';
      anomalies.push({
        lineItem: key,
        nameAr: item.nameAr,
        period: lastDataset.period,
        value: currentVal,
        mean,
        zScore,
        status,
        explanation: `${item.nameAr} — ${sigmaLabel}: القيمة ${direction} من المتوسط بمقدار ${Math.abs(zScore).toFixed(1)}σ`,
      });
    }

    // Also flag large MoM changes
    if (isLargeChange && momChange !== null) {
      const direction = momChange > 0 ? 'ارتفاع' : 'انخفاض';
      const alreadyFlagged = anomalies.some(a => a.lineItem === key);
      if (!alreadyFlagged) {
        anomalies.push({
          lineItem: key,
          nameAr: item.nameAr,
          period: lastDataset.period,
          value: currentVal,
          mean,
          zScore,
          status: 'deviation',
          explanation: `${item.nameAr} — تغير حاد: ${direction} بنسبة ${Math.abs(momChange).toFixed(1)}% عن الفترة السابقة`,
        });
      }
    }
  }

  return { analysis, anomalies };
}

function VarianceTable({ group, color }: { group: CompanyGroup; color: string }) {
  const { analysis, anomalies } = useMemo(() => analyzeCompany(group), [group]);
  const datasets = group.datasets;
  const hasMultiplePeriods = datasets.length >= 2;
  const currency = datasets[datasets.length - 1]?.currency || 'SAR';

  // Methodology note
  const methodologyNote = (
    <div className="border-t px-4 py-3 bg-muted/10">
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p>المتوسط (μ) = متوسط قيم البند عبر جميع الفترات المتاحة</p>
          <p>الانحراف المعياري (σ) = مقياس تشتت القيم عن المتوسط</p>
          <p>درجة الانحراف (Z-Score) = (القيمة الحالية - المتوسط) ÷ الانحراف المعياري</p>
          <p>🟢 طبيعي: |Z| &lt; 1.5σ — 🟡 انحراف: 1.5σ ≤ |Z| &lt; 2.5σ — 🔴 حالة شاذة: |Z| ≥ 2.5σ</p>
          <p>⚠️ التغير الحاد: تغير شهرى يزيد عن 20%</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-0">
      {!hasMultiplePeriods && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/50 border-b">
          <Info className="h-4 w-4 text-amber-600" />
          <span className="text-xs text-amber-700">
            فترة واحدة فقط — لا يمكن حساب الانحراف المعياري بدقة. يُنصح بإضافة فترات إضافية.
          </span>
        </div>
      )}

      {/* Anomalies summary card */}
      {anomalies.length > 0 && (
        <div className="px-4 py-3 border-b bg-red-50/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold text-red-700">
              تنبيهات ({anomalies.length})
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {anomalies.map((a, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 shrink-0">
                  {a.status === 'anomaly' ? (
                    <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] px-1">شاذة</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] px-1">انحراف</Badge>
                  )}
                </span>
                <span className="text-muted-foreground">{a.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column explanation */}
      <div className="px-4 py-2 bg-muted/5 border-b text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
        <span>📋 البند = اسم البند المالي</span>
        <span>💰 القيمة = المبلغ في آخر فترة</span>
        <span>📊 المتوسط = μ عبر الفترات</span>
        <span>📏 σ = الانحراف المعياري</span>
        <span>🔢 Z = درجة الانحراف</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10">
              <TableHead className="min-w-[200px] sticky right-0 bg-background z-10 text-xs font-bold border-l">
                البند المالي
              </TableHead>
              <TableHead className="min-w-[110px] text-center text-xs font-medium">
                القيمة الحالية
                <br />
                <span className="text-[10px] opacity-60 font-normal">{periodToArabic(datasets[datasets.length - 1]?.period || '')}</span>
              </TableHead>
              <TableHead className="min-w-[110px] text-center text-xs font-medium bg-muted/5">
                المتوسط (μ)
              </TableHead>
              <TableHead className="min-w-[90px] text-center text-xs font-medium bg-muted/5">
                الانحراف المعياري (σ)
              </TableHead>
              <TableHead className="min-w-[70px] text-center text-xs font-medium bg-muted/5">
                درجة Z
              </TableHead>
              <TableHead className="min-w-[80px] text-center text-xs font-medium bg-amber-50/50">
                التغير الشهري %
              </TableHead>
              <TableHead className="min-w-[70px] text-center text-xs font-medium">
                الحالة
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysis.map((row) => {
              const isSummary = row.isSubtotal || row.isTotal;
              const isHighlighted = row.status !== 'normal' || row.isLargeChange;

              return (
                <TableRow
                  key={row.itemKey}
                  className={`
                    ${isSummary ? 'bg-muted/15 font-bold' : ''}
                    ${row.status === 'anomaly' ? 'bg-red-50/30' : row.status === 'deviation' ? 'bg-amber-50/20' : ''}
                    hover:bg-muted/5 transition-colors
                  `}
                >
                  <TableCell className={`text-sm sticky right-0 bg-background z-10 border-l ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                    <span style={{ paddingRight: `${row.indent * 20}px` }}>
                      {row.nameAr}
                      {row.description && <InfoTooltip text={row.description} side="left" />}
                    </span>
                  </TableCell>
                  <TableCell className={`text-center tabular-nums text-sm ${row.currentValue < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                    {formatNumber(row.currentValue, currency)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm text-muted-foreground bg-muted/5">
                    {formatNumber(row.mean, currency)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">
                    {row.stdDev === 0 ? '—' : formatNumber(row.stdDev, currency)}
                  </TableCell>
                  <TableCell className={`text-center tabular-nums text-xs font-medium bg-muted/5 ${
                    Math.abs(row.zScore) >= ZSCORE_ANOMALY_THRESHOLD
                      ? 'text-red-600 font-bold'
                      : Math.abs(row.zScore) >= ZSCORE_DEVIATION_THRESHOLD
                        ? 'text-amber-600 font-bold'
                        : 'text-muted-foreground'
                  }`}>
                    {row.stdDev === 0 ? '—' : row.zScore.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums bg-amber-50/20">
                    {row.momChange !== null ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                        row.isLargeChange
                          ? row.momChange > 0 ? 'text-red-500' : 'text-red-500'
                          : row.momChange > 0 ? 'text-emerald-600' : row.momChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {row.momChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(row.momChange).toFixed(1)}%
                        {row.isLargeChange && <AlertTriangle className="h-3 w-3 ml-0.5" />}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(row.status)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {methodologyNote}

      {/* AI Variance Insight */}
      <AIInsight
        title={`تحليل AI الذكي — انحرافات ${group.name}`}
        icon={<Brain className="h-4 w-4" />}
        systemPrompt={`أنت محلل مالي متخصص في تحليل الانحرافات والإحصاء المالي. أجب بالعربية فقط.
بناءً على بيانات تحليل الانحرافات المقدمة، قدم تحليلاً يتضمن:
1. تفسير الحالات الشاذة والانحرافات المكتشفة
2. الأسباب المحتملة لكل انحراف كبير
3. هل الانحرافات تشير لمشكلة هيكلية أم ظرف مؤقت؟
4. توصيات للتعامل مع الحالات الشاذة
5. مؤشرات يجب مراقبتها في الفترات القادمة`}
        prompt={`بيانات تحليل الانحرافات للشركة: ${group.name}
العملة: ${currency}
عدد الفترات: ${datasets.length}

الحالات الشاذة والانحرافات المكتشفة:
${anomalies.length > 0 ? anomalies.map(a => `- ${a.explanation}`).join('\n') : 'لا توجد انحرافات كبيرة'}

أهم التغيرات الشهرية:
${analysis.filter(a => a.isLargeChange && a.momChange !== null).map(a => `- ${a.nameAr}: تغير ${a.momChange!.toFixed(1)}%`).join('\n') || 'لا توجد تغيرات حادة'}

ملخص إحصائي:
- إجمالي البنود: ${analysis.length}
- بنود طبيعية: ${analysis.filter(a => a.status === 'normal').length}
- انحرافات: ${analysis.filter(a => a.status === 'deviation').length}
- حالات شاذة: ${analysis.filter(a => a.status === 'anomaly').length}
- تغيرات حادة (>20%): ${analysis.filter(a => a.isLargeChange).length}`}
        maxTokens={2500}
        temperature={0.5}
      />
    </div>
  );
}

export function VarianceAnalysis() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض تحليل الانحرافات</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">يُنصح بتوفّر 3 فترات على الأقل لنتائج دقيقة</p>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 1) {
    const color = COMPANY_COLORS[0 % COMPANY_COLORS.length];
    return (
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3" style={{ backgroundColor: `${color}08` }}>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span style={{ color }}>{groups[0].name}</span>
            <Badge variant="outline" className="text-xs">تحليل الانحرافات</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <VarianceTable group={groups[0]} color={color} />
        </CardContent>
      </Card>
    );
  }

  // Multiple companies: tabs
  return (
    <Card className="shadow-sm overflow-hidden">
      <Tabs defaultValue={groups[0].name}>
        <TabsList className="w-full justify-start gap-1 rounded-none border-b bg-muted/30 p-1 overflow-x-auto flex-nowrap">
          {groups.map((group, gIdx) => {
            const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
            return (
              <TabsTrigger
                key={group.name}
                value={group.name}
                className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm shrink-0"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="max-w-[100px] truncate">{group.name}</span>
                <span className="text-[10px] opacity-50">({group.periods.length})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {groups.map((group, gIdx) => {
          const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
          return (
            <TabsContent key={group.name} value={group.name} className="m-0">
              <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ backgroundColor: `${color}06` }}>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <h3 className="text-sm font-bold" style={{ color }}>{group.name}</h3>
                <Badge variant="outline" className="text-[10px]">تحليل الانحرافات (Variance Analysis)</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {group.datasets.length} {group.datasets.length === 1 ? 'فترة' : group.datasets.length === 2 ? 'فترتان' : 'فترات'}
                </span>
              </div>
              <VarianceTable group={group} color={color} />
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
