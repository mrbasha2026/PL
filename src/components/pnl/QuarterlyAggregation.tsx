'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpRight, ArrowDownRight, Minus, Building2, Info, Layers } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  periodToArabic,
  parsePeriod,
  aggregatePeriods,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

const MONTH_TO_QUARTER: Record<number, string> = {
  1: 'Q1', 2: 'Q1', 3: 'Q1',
  4: 'Q2', 5: 'Q2', 6: 'Q2',
  7: 'Q3', 8: 'Q3', 9: 'Q3',
  10: 'Q4', 11: 'Q4', 12: 'Q4',
};

const QUARTER_AR: Record<string, string> = {
  'Q1': 'الربع الأول',
  'Q2': 'الربع الثاني',
  'Q3': 'الربع الثالث',
  'Q4': 'الربع الرابع',
};

interface QuarterData {
  quarterKey: string;  // e.g. "Q1 2026"
  quarterLabel: string; // e.g. "الربع الأول 2026"
  data: Record<string, number>;
  currency: string;
  monthCount: number; // how many months were aggregated
}

interface YearQuarterData {
  year: number;
  quarters: QuarterData[];
  yearTotal: Record<string, number>;
  currency: string;
}

function getQuarterKey(year: number, quarter: string): string {
  return `${quarter} ${year}`;
}

function getQuarterArabic(quarter: string): string {
  return QUARTER_AR[quarter] || quarter;
}

function buildQuarterlyData(datasets: { period: string; data: Record<string, number>; currency: string }[]): YearQuarterData[] {
  // Group datasets by (year, quarter)
  const quarterMap = new Map<string, { datasets: { period: string; data: Record<string, number>; currency: string }[]; year: number; quarter: string }>();

  datasets.forEach((ds) => {
    const parsed = parsePeriod(ds.period);
    if (!parsed) return;
    const { year, month } = parsed;
    const quarter = MONTH_TO_QUARTER[month];
    if (!quarter) return;
    const key = getQuarterKey(year, quarter);
    if (!quarterMap.has(key)) {
      quarterMap.set(key, { datasets: [], year, quarter });
    }
    quarterMap.get(key)!.datasets.push(ds);
  });

  // Group by year
  const yearMap = new Map<number, QuarterData[]>();
  const yearCurrencyMap = new Map<number, string>();

  quarterMap.forEach((val, key) => {
    const { year, quarter, datasets: qDatasets } = val;
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    const aggregated = aggregatePeriods(qDatasets.map(d => ({ ...d, id: '', companyName: '', period: d.period })));
    const currency = qDatasets[0]?.currency || 'SAR';

    if (!yearCurrencyMap.has(year)) {
      yearCurrencyMap.set(year, currency);
    }

    yearMap.get(year)!.push({
      quarterKey: key,
      quarterLabel: `${getQuarterArabic(quarter)} ${year}`,
      data: aggregated,
      currency,
      monthCount: qDatasets.length,
    });
  });

  // Sort quarters within each year
  const result: YearQuarterData[] = [];
  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);

  sortedYears.forEach((year) => {
    const quarters = yearMap.get(year)!;
    quarters.sort((a, b) => {
      const qOrder: Record<string, number> = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
      const qa = a.quarterKey.split(' ')[0];
      const qb = b.quarterKey.split(' ')[0];
      return (qOrder[qa] || 0) - (qOrder[qb] || 0);
    });

    // Compute year total by aggregating all quarter data
    const allQuarterDatasets: { period: string; data: Record<string, number>; currency: string }[] = [];
    quarterMap.forEach((val) => {
      if (val.year === year) {
        val.datasets.forEach(d => allQuarterDatasets.push(d));
      }
    });
    const yearTotal = aggregatePeriods(allQuarterDatasets.map(d => ({ ...d, id: '', companyName: '', period: d.period })));

    result.push({
      year,
      quarters,
      yearTotal,
      currency: yearCurrencyMap.get(year) || 'SAR',
    });
  });

  return result;
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-muted-foreground text-xs">—</span>;
  if (previous === 0) return <span className="text-muted-foreground text-xs">—</span>;

  const change = ((current - previous) / Math.abs(previous)) * 100;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
      change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
    }`}>
      {change > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : change < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function QuarterlyTable({
  yearlyData,
  color,
  companyName,
}: {
  yearlyData: YearQuarterData[];
  color: string;
  companyName: string;
}) {
  // Check if multiple years exist for YoY comparison
  const hasMultipleYears = yearlyData.length > 1;

  return (
    <div className="space-y-6">
      {yearlyData.map((yd) => (
        <div key={yd.year}>
          <div className="px-4 py-2 border-b bg-muted/5 flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color }}>{companyName}</span>
            <Badge variant="outline" className="text-[10px]">{yd.year}</Badge>
            <span className="text-[10px] text-muted-foreground">
              {yd.quarters.reduce((acc, q) => acc + q.monthCount, 0)} شهر
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10">
                  <TableHead className="min-w-[200px] text-xs font-bold sticky right-0 bg-background z-10 border-l">
                    البند المالي
                  </TableHead>
                  {yd.quarters.map((q) => (
                    <React.Fragment key={q.quarterKey}>
                      <TableHead className="min-w-[120px] text-center text-xs font-medium">
                        {q.quarterLabel}
                        <br />
                        <span className="text-[10px] opacity-60">({q.monthCount} أشهر)</span>
                      </TableHead>
                      <TableHead className="min-w-[60px] text-center text-[10px] font-medium bg-muted/5">
                        النسبة %
                      </TableHead>
                    </React.Fragment>
                  ))}
                  <TableHead className="min-w-[120px] text-center text-xs font-bold bg-teal-50/50">
                    المجموع
                    <br />
                    <span className="text-[10px] font-normal opacity-60">{yd.year}</span>
                  </TableHead>
                  <TableHead className="min-w-[60px] text-center text-[10px] font-medium bg-teal-50/30">
                    النسبة %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PNL_LINE_ITEMS.map((item) => {
                  const key = getLineItemKey(item.name);
                  const isSummary = item.isSubtotal || item.isTotal;

                  return (
                    <TableRow
                      key={key}
                      className={`${isSummary ? 'bg-muted/15 font-bold' : ''} hover:bg-muted/5 transition-colors`}
                    >
                      <TableCell className={`text-sm sticky right-0 bg-background z-10 border-l ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                        <span style={{ paddingRight: `${(item.indent || 0) * 20}px` }}>
                          {item.nameAr}
                          {item.description && <InfoTooltip text={item.description} side="left" />}
                        </span>
                      </TableCell>
                      {yd.quarters.map((q) => {
                        const value = q.data[key] || 0;
                        const revenue = q.data['revenue'] || 0;
                        const pct = key === 'revenue'
                          ? revenue !== 0 ? '100.0%' : '—'
                          : revenue !== 0 ? `${((value / revenue) * 100).toFixed(1)}%` : '—';

                        return (
                          <React.Fragment key={q.quarterKey + key}>
                            <TableCell className={`text-center tabular-nums text-sm ${
                              value < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''
                            }`}>
                              {formatNumber(value, q.currency)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">
                              {pct}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                      {/* Year total */}
                      {(() => {
                        const totalValue = yd.yearTotal[key] || 0;
                        const totalRevenue = yd.yearTotal['revenue'] || 0;
                        const totalPct = key === 'revenue'
                          ? totalRevenue !== 0 ? '100.0%' : '—'
                          : totalRevenue !== 0 ? `${((totalValue / totalRevenue) * 100).toFixed(1)}%` : '—';

                        return (
                          <>
                            <TableCell className={`text-center tabular-nums text-sm bg-teal-50/20 ${
                              totalValue < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''
                            }`}>
                              {formatNumber(totalValue, yd.currency)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-teal-50/10">
                              {totalPct}
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Quarter-over-quarter change summary */}
          {yd.quarters.length > 1 && (
            <div className="px-4 py-3 border-t bg-muted/5">
              <p className="text-[10px] font-bold text-muted-foreground mb-2">📈 التغير ربع السنوي (QoQ)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {yd.quarters.slice(1).map((q, i) => {
                  const prevQ = yd.quarters[i];
                  const currRevenue = q.data['revenue'] || 0;
                  const prevRevenue = prevQ.data['revenue'] || 0;
                  const currNet = q.data['net_income'] || 0;
                  const prevNet = prevQ.data['net_income'] || 0;

                  return (
                    <div key={q.quarterKey} className="rounded-lg border bg-background p-2">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {prevQ.quarterLabel.split(' ').slice(0, 2).join(' ')} → {q.quarterLabel.split(' ').slice(0, 2).join(' ')}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">الإيرادات</span>
                          <ChangeIndicator current={currRevenue} previous={prevRevenue} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">صافي الدخل</span>
                          <ChangeIndicator current={currNet} previous={prevNet} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* YoY comparison if multiple years */}
      {hasMultipleYears && (
        <div className="px-4 py-3 border-t bg-emerald-50/20">
          <p className="text-[10px] font-bold text-emerald-800 mb-2">🔄 المقارنة السنوية (YoY) — نفس الربع بين السنوات</p>
          <div className="space-y-2">
            {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => {
              const quarterDataAcrossYears = yearlyData.map((yd) => {
                const qData = yd.quarters.find((q) => q.quarterKey.startsWith(quarter));
                return qData ? { year: yd.year, data: qData.data, currency: qData.currency } : null;
              }).filter(Boolean) as Array<{ year: number; data: Record<string, number>; currency: string }>;

              if (quarterDataAcrossYears.length < 2) return null;

              return (
                <div key={quarter} className="rounded-lg border bg-background p-2">
                  <p className="text-[10px] font-bold text-muted-foreground mb-1.5">
                    {getQuarterArabic(quarter)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {quarterDataAcrossYears.slice(1).map((curr, i) => {
                      const prev = quarterDataAcrossYears[i];
                      return (
                        <div key={`${quarter}-${curr.year}`} className="text-[10px]">
                          <span className="text-muted-foreground">{prev.year} → {curr.year}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span>الإيرادات:</span>
                            <ChangeIndicator current={curr.data['revenue'] || 0} previous={prev.data['revenue'] || 0} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span>صافي الدخل:</span>
                            <ChangeIndicator current={curr.data['net_income'] || 0} previous={prev.data['net_income'] || 0} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuarterlyAggregation() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض التجميع الربعي</h3>
          <p className="text-sm text-muted-foreground mt-1">يتم تجميع البيانات الشهرية تلقائياً في أرباع سنوية</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {groups.slice(0, 3).map((group, gIdx) => {
          const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
          const yearlyData = buildQuarterlyData(group.datasets);
          const totalQuarters = yearlyData.reduce((acc, yd) => acc + yd.quarters.length, 0);
          const totalRevenue = yearlyData.reduce((acc, yd) => acc + (yd.yearTotal['revenue'] || 0), 0);

          return (
            <Card key={group.name} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-bold" style={{ color }}>{group.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-lg font-bold">{totalQuarters}</p>
                    <p className="text-[10px] text-muted-foreground">أرباع سنوية</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{formatNumber(totalRevenue, 'SAR')}</p>
                    <p className="text-[10px] text-muted-foreground">إجمالي الإيرادات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quarterly Tables per Company */}
      {groups.length === 1 ? (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3" style={{ backgroundColor: `${COMPANY_COLORS[0]}08` }}>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-teal-600" />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COMPANY_COLORS[0] }} />
              <span style={{ color: COMPANY_COLORS[0] }}>{groups[0].name}</span>
              <Badge variant="outline" className="text-xs">تجميع ربع سنوي</Badge>
              <InfoTooltip text="يتم تجميع البيانات الشهرية تلقائياً في أرباع سنوية: Q1 (يناير-مارس)، Q2 (أبريل-يونيو)، Q3 (يوليو-سبتمبر)، Q4 (أكتوبر-ديسمبر) — Monthly data is automatically aggregated into quarterly summaries." side="left" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <QuarterlyTable
              yearlyData={buildQuarterlyData(groups[0].datasets)}
              color={COMPANY_COLORS[0]}
              companyName={groups[0].name}
            />
          </CardContent>
        </Card>
      ) : (
        groups.map((group, gIdx) => {
          const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
          const yearlyData = buildQuarterlyData(group.datasets);

          return (
            <Card key={group.name} className="shadow-sm overflow-hidden">
              <CardHeader className="pb-3" style={{ backgroundColor: `${color}08` }}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-teal-600" />
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span style={{ color }}>{group.name}</span>
                  <Badge variant="outline" className="text-xs">تجميع ربع سنوي</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {group.datasets.length} شهر · {yearlyData.reduce((acc, yd) => acc + yd.quarters.length, 0)} أرباع
                  </span>
                  <InfoTooltip text="يتم تجميع البيانات الشهرية تلقائياً في أرباع سنوية: Q1 (يناير-مارس)، Q2 (أبريل-يونيو)، Q3 (يوليو-سبتمبر)، Q4 (أكتوبر-ديسمبر)" side="left" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <QuarterlyTable
                  yearlyData={yearlyData}
                  color={color}
                  companyName={group.name}
                />
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Methodology footer */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>🔄 التجميع الربعي: Q1 = يناير+فبراير+مارس، Q2 = أبريل+مايو+يونيو، Q3 = يوليو+أغسطس+سبتمبر، Q4 = أكتوبر+نوفمبر+ديسمبر</p>
              <p>📈 التغير ربع سنوي (QoQ): مقارنة كل ربع مع الربع السابق من نفس السنة</p>
              <p>🔄 المقارنة السنوية (YoY): مقارنة نفس الربع بين سنوات مختلفة</p>
              <p>النسبة % = قيمة البند ÷ الإيرادات × 100 — المجموع = إجمالي قيم السنة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
