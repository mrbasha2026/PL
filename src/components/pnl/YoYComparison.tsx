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
  ArrowUpRight, ArrowDownRight, Minus, Building2, Info,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  periodToArabic,
  parsePeriod,
  sortPeriods,
  CompanyGroup,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

// A "year-over-year pair": two periods that share the same month but different years
interface YoYPair {
  monthName: string;       // e.g. "Jan"
  monthAr: string;         // e.g. "يناير"
  monthNum: number;        // e.g. 1
  periods: {
    period: string;
    year: number;
    dataset: { data: Record<string, number>; currency: string };
  }[];
}

// Find YoY pairs within a company's datasets
function findYoYPairs(group: CompanyGroup): YoYPair[] {
  // Group datasets by month number
  const byMonth = new Map<number, { period: string; year: number; dataset: typeof group.datasets[0] }[]>();

  for (const ds of group.datasets) {
    const parsed = parsePeriod(ds.period);
    if (!parsed) continue;
    const { month, year } = parsed;
    const existing = byMonth.get(month) || [];
    existing.push({ period: ds.period, year, dataset: ds });
    byMonth.set(month, existing);
  }

  // Build Arabic month name map
  const ARABIC_MONTH_NAMES: Record<number, string> = {
    1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل',
    5: 'مايو', 6: 'يونيو', 7: 'يوليو', 8: 'أغسطس',
    9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
  };

  const EN_MONTH_NAMES: Record<number, string> = {
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
    5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
    9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
  };

  const pairs: YoYPair[] = [];

  for (const [monthNum, entries] of byMonth) {
    if (entries.length < 2) continue; // need at least 2 years to compare

    // Sort by year ascending
    const sorted = [...entries].sort((a, b) => a.year - b.year);

    pairs.push({
      monthName: EN_MONTH_NAMES[monthNum] || `Month ${monthNum}`,
      monthAr: ARABIC_MONTH_NAMES[monthNum] || `شهر ${monthNum}`,
      monthNum,
      periods: sorted.map(e => ({
        period: e.period,
        year: e.year,
        dataset: { data: e.dataset.data, currency: e.dataset.currency },
      })),
    });
  }

  // Sort pairs by month number
  pairs.sort((a, b) => a.monthNum - b.monthNum);

  return pairs;
}

function YoYTable({ group, color }: { group: CompanyGroup; color: string }) {
  const yoyPairs = useMemo(() => findYoYPairs(group), [group]);

  // Methodology note
  const methodologyNote = (
    <div className="border-t px-4 py-3 bg-muted/10">
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p>مقارنة سنوية: نفس الشهر عبر سنوات مختلفة (مثال: يناير 2025 مقابل يناير 2026)</p>
          <p>التغير % = ((قيمة السنة الحالية - السنة السابقة) ÷ |السنة السابقة|) × 100</p>
          <p>🟢 ارتفاع إيجابي — 🔴 انخفاض سلبي — القيم السالبة بالأحمر</p>
        </div>
      </div>
    </div>
  );

  if (yoyPairs.length === 0) {
    // Check if there's only a single year of data
    const years = new Set(group.datasets.map(ds => parsePeriod(ds.period)?.year).filter(Boolean));
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4 py-6 text-muted-foreground">
          <Info className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">لا تتوفر بيانات مقارنة سنوية</p>
            <p className="text-xs mt-1">
              {years.size <= 1
                ? 'يجب توفر بيانات لنفس الشهر في سنتين مختلفتين على الأقل لإجراء المقارنة السنوية'
                : 'لا توجد أشهر مشتركة بين السنوات المتاحة'}
            </p>
          </div>
        </div>

        {/* Still show the values in a simple table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="min-w-[200px] text-xs font-bold">البند المالي</TableHead>
                {sortPeriods(group.periods).map(p => (
                  <TableHead key={p} className="min-w-[120px] text-center text-xs font-medium">
                    {periodToArabic(p)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PNL_LINE_ITEMS.map(item => {
                const key = getLineItemKey(item.name);
                const isSummary = item.isSubtotal || item.isTotal;
                return (
                  <TableRow key={key} className={`${isSummary ? 'bg-muted/20 font-bold' : ''} hover:bg-muted/5`}>
                    <TableCell className={`text-sm ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                      <span style={{ paddingRight: `${(item.indent || 0) * 20}px` }}>
                        {item.nameAr}
                      </span>
                    </TableCell>
                    {group.datasets.map(ds => {
                      const val = ds.data[key] || 0;
                      return (
                        <TableCell key={ds.id} className={`text-center tabular-nums text-sm ${val < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                          {formatNumber(val, ds.currency)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {methodologyNote}
      </div>
    );
  }

  return (
    <div>
      {/* Column explanation */}
      <div className="px-4 py-2 bg-muted/5 border-b text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
        <span>📋 البند المالي = اسم البند بالعربية</span>
        <span>💰 القيمة = المبلغ بالعملة</span>
        <span>📈 التغير % = التغير عن نفس الشهر في السنة السابقة</span>
        <span>🔄 المقارنة السنوية = نفس الشهر عبر سنوات مختلفة</span>
      </div>

      {/* Render one section per YoY pair (per month) */}
      {yoyPairs.map(pair => (
        <div key={pair.monthNum}>
          {/* Month header */}
          <div className="px-4 py-2 bg-muted/10 border-b flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color }}>{pair.monthAr}</span>
            <Badge variant="outline" className="text-[10px]">
              مقارنة {pair.periods.length} سنوات
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {pair.periods.map(p => p.year).join(' ← ')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/5">
                  <TableHead className="min-w-[200px] sticky right-0 bg-background z-10 text-xs font-bold border-l" rowSpan={2}>
                    البند المالي
                  </TableHead>
                  {/* First year in pair */}
                  <TableHead className="min-w-[110px] text-center text-xs font-medium border-b" rowSpan={2}>
                    {periodToArabic(pair.periods[0].period)}
                    <br />
                    <span className="text-[10px] opacity-60">{pair.periods[0].dataset.currency}</span>
                  </TableHead>
                  {/* Subsequent years: value + YoY change */}
                  {pair.periods.slice(1).map((p, i) => (
                    <React.Fragment key={p.period}>
                      <TableHead className="min-w-[110px] text-center text-xs font-medium border-b" rowSpan={2}>
                        {periodToArabic(p.period)}
                        <br />
                        <span className="text-[10px] opacity-60">{p.dataset.currency}</span>
                      </TableHead>
                      <TableHead className="min-w-[70px] text-center text-[10px] font-medium bg-amber-50/50 border-b" rowSpan={2}>
                        التغير %
                        <br />
                        <span className="opacity-60">vs {pair.periods[i].year}</span>
                      </TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PNL_LINE_ITEMS.map(item => {
                  const key = getLineItemKey(item.name);
                  const isSummary = item.isSubtotal || item.isTotal;

                  return (
                    <TableRow key={key + pair.monthNum} className={`${isSummary ? 'bg-muted/15 font-bold' : ''} hover:bg-muted/5 transition-colors`}>
                      <TableCell className={`text-sm sticky right-0 bg-background z-10 border-l ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                        <span style={{ paddingRight: `${(item.indent || 0) * 20}px` }}>
                          {item.nameAr}
                          {item.description && <InfoTooltip text={item.description} side="left" />}
                        </span>
                      </TableCell>
                      {/* First year value */}
                      {(() => {
                        const val = pair.periods[0].dataset.data[key] || 0;
                        return (
                          <TableCell className={`text-center tabular-nums text-sm ${val < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                            {formatNumber(val, pair.periods[0].dataset.currency)}
                          </TableCell>
                        );
                      })()}
                      {/* Subsequent years: value + YoY change */}
                      {pair.periods.slice(1).map((p, i) => {
                        const currVal = p.dataset.data[key] || 0;
                        const prevVal = pair.periods[i].dataset.data[key] || 0;
                        const diff = currVal - prevVal;
                        const pctChange = prevVal !== 0 ? ((diff / Math.abs(prevVal)) * 100) : null;

                        return (
                          <React.Fragment key={p.period + key}>
                            <TableCell className={`text-center tabular-nums text-sm ${currVal < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                              {formatNumber(currVal, p.dataset.currency)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums bg-amber-50/20">
                              {pctChange !== null ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                                  pctChange > 0 ? 'text-emerald-600' : pctChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                                }`}>
                                  {pctChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : pctChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                  {Math.abs(pctChange).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      {methodologyNote}
    </div>
  );
}

export function YoYComparison() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض المقارنة السنوية</h3>
          <p className="text-sm text-muted-foreground/70 mt-2">يجب توفر بيانات لنفس الشهر في سنتين مختلفتين على الأقل</p>
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
            <Badge variant="outline" className="text-xs">مقارنة سنوية (YoY)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <YoYTable group={groups[0]} color={color} />
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
                <Badge variant="outline" className="text-[10px]">مقارنة سنوية (Year-over-Year)</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {group.datasets.length} {group.datasets.length === 1 ? 'فترة' : group.datasets.length === 2 ? 'فترتان' : 'فترات'}
                </span>
              </div>
              <YoYTable group={group} color={color} />
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
