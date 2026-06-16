'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Info, Tag } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getAllLineItems,
  getLineItemKey,
  COMPANY_COLORS,
  groupByPeriod,
  formatNumber,
  periodToArabic,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

export function PnLTable() {
  const { getFiltered, getAggregatedFiltered, dateRangeStart, dateRangeEnd, companies } = usePnLStore();
  const selected = getFiltered();
  const aggregated = getAggregatedFiltered();
  const isAggregated = !!(dateRangeStart && dateRangeEnd);

  // Get all line items including custom ones from the data
  const allLineItems = getAllLineItems(companies);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر شركة وفترة واحدة على الأقل من الفلاتر</h3>
        </CardContent>
      </Card>
    );
  }

  // Aggregated view: show one column per company with summed data
  if (isAggregated) {
    return (
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-l from-muted/60 to-muted/30 pb-3">
          <CardTitle className="text-base font-bold">قائمة الأرباح والخسائر — بيانات مجمّعة</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="min-w-[260px] font-bold bg-muted/30">البند المالي</TableHead>
                  {aggregated.map((agg, gIdx) => {
                    const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                    return (
                      <React.Fragment key={agg.companyName}>
                        <TableHead
                          className="min-w-[130px] text-center font-bold border-b"
                          style={{ color, backgroundColor: `${color}10` }}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                            {agg.companyName}
                          </div>
                          <div className="text-xs font-normal opacity-70 mt-0.5">
                            {agg.periodLabel} ({agg.periodCount} فترات)
                          </div>
                        </TableHead>
                        <TableHead
                          className="min-w-[70px] text-center text-[10px] font-medium border-b"
                          style={{ backgroundColor: `${color}08` }}
                        >
                          النسبة %
                        </TableHead>
                      </React.Fragment>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLineItems.map((item) => {
                  const key = item.isCustom ? item.name : getLineItemKey(item.name);
                  const isSummary = item.isSubtotal || item.isTotal;

                  return (
                    <TableRow
                      key={key}
                      className={`${isSummary ? 'bg-muted/30 font-bold' : ''} ${
                        item.category === 'profit' && !isSummary ? 'bg-emerald-50/30' : ''
                      } ${item.isCustom ? 'bg-blue-50/20' : ''} hover:bg-muted/10 transition-colors`}
                    >
                      <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <span style={{ paddingRight: `${(item.indent || 0) * 24}px` }}>
                          {item.nameAr}
                          {item.isCustom && (
                            <span className="mr-1.5 inline-flex items-center gap-0.5 text-[9px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                              <Tag className="h-2.5 w-2.5" />
                              مخصص
                            </span>
                          )}
                          {!item.isCustom && (
                            <span className="mr-1.5 text-xs opacity-50">({item.name})</span>
                          )}
                          {item.isCustom && item.nameEn && (
                            <span className="mr-1.5 text-xs opacity-50">({item.nameEn})</span>
                          )}
                          {item.description && <InfoTooltip text={item.description} side="left" />}
                        </span>
                      </TableCell>
                      {aggregated.map((agg) => {
                        const value = agg.aggregatedData[key] || 0;
                        const revenue = agg.aggregatedData['revenue'] || 0;
                        const pct = key === 'revenue'
                          ? revenue !== 0 ? '100.0%' : '—'
                          : revenue !== 0
                            ? `${((value / revenue) * 100).toFixed(1)}%`
                            : '—';
                        return (
                          <React.Fragment key={agg.companyName + key}>
                            <TableCell
                              className={`text-center tabular-nums text-sm ${
                                value < 0 ? 'text-red-600' : isSummary ? 'text-foreground font-bold' : ''
                              }`}
                            >
                              {formatNumber(value, agg.currency)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">
                              {pct}
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
          <div className="border-t px-4 py-3 bg-muted/10">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p>النسبة % = قيمة البند ÷ الإيرادات × 100 — القيم السلبية باللون الأحمر</p>
                <p>القيم المعروضة بالشكل المضغوط: K = ألف، M = مليون، B = مليار</p>
                <p>البنود المخصصة <Tag className="h-2.5 w-2.5 inline" /> مضافة من ملف Excel — يتم تصنيفها تلقائياً حسب الاسم</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Standard (non-aggregated) view — grouped by PERIOD, all companies side by side per month
  const periodGroups = groupByPeriod(selected);

  // Build a company index map for consistent color assignment
  const allCompanyNames = [...new Set(selected.map((c) => c.companyName))];
  const companyColorMap = new Map<string, string>();
  allCompanyNames.forEach((name, idx) => {
    companyColorMap.set(name, COMPANY_COLORS[idx % COMPANY_COLORS.length]);
  });

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="bg-gradient-to-l from-muted/60 to-muted/30 pb-3">
        <CardTitle className="text-base font-bold">قائمة الأرباح والخسائر — مقارنة شهرية بين الشركات</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {/* Period/Month Row — each period spans (numCompanies * 2) columns */}
              <TableRow className="bg-muted/20">
                <TableHead className="min-w-[260px] font-bold bg-muted/30" rowSpan={2}>
                  البند المالي
                </TableHead>
                {periodGroups.map((pg) => (
                  <TableHead
                    key={pg.period}
                    colSpan={pg.datasets.length * 2}
                    className="text-center font-bold border-b text-sm"
                    style={{ backgroundColor: '#f0fdf4' }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      📅 {pg.periodAr}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
              {/* Company Row — within each period, show each company */}
              <TableRow className="bg-muted/10">
                {periodGroups.map((pg) =>
                  pg.datasets.map((ds) => {
                    const color = companyColorMap.get(ds.companyName) || COMPANY_COLORS[0];
                    return (
                      <React.Fragment key={ds.id}>
                        <TableHead
                          className="min-w-[130px] text-center text-xs font-medium"
                          style={{ color, backgroundColor: `${color}10` }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                            {ds.companyName}
                          </div>
                          <span className="opacity-60 text-[10px]">{ds.currency}</span>
                        </TableHead>
                        <TableHead
                          className="min-w-[60px] text-center text-[10px] font-medium bg-muted/5"
                          style={{ backgroundColor: `${color}05` }}
                        >
                          النسبة %
                        </TableHead>
                      </React.Fragment>
                    );
                  })
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allLineItems.map((item) => {
                const key = item.isCustom ? item.name : getLineItemKey(item.name);
                const isSummary = item.isSubtotal || item.isTotal;

                return (
                  <TableRow
                    key={key}
                    className={`${isSummary ? 'bg-muted/30 font-bold' : ''} ${
                      item.category === 'profit' && !isSummary ? 'bg-emerald-50/30' : ''
                    } ${item.isCustom ? 'bg-blue-50/20' : ''} hover:bg-muted/10 transition-colors`}
                  >
                    <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span style={{ paddingRight: `${(item.indent || 0) * 24}px` }}>
                        {item.nameAr}
                        {item.isCustom && (
                          <span className="mr-1.5 inline-flex items-center gap-0.5 text-[9px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                            <Tag className="h-2.5 w-2.5" />
                            مخصص
                          </span>
                        )}
                        {!item.isCustom && (
                          <span className="mr-1.5 text-xs opacity-50">({item.name})</span>
                        )}
                        {item.isCustom && item.nameEn && (
                          <span className="mr-1.5 text-xs opacity-50">({item.nameEn})</span>
                        )}
                        {item.description && <InfoTooltip text={item.description} side="left" />}
                      </span>
                    </TableCell>
                    {periodGroups.map((pg) =>
                      pg.datasets.map((ds) => {
                        const value = ds.data[key] || 0;
                        const revenue = ds.data['revenue'] || 0;
                        const pct = key === 'revenue'
                          ? revenue !== 0 ? '100.0%' : '—'
                          : revenue !== 0
                            ? `${((value / revenue) * 100).toFixed(1)}%`
                            : '—';
                        return (
                          <React.Fragment key={ds.id + key}>
                            <TableCell
                              className={`text-center tabular-nums text-sm ${
                                value < 0 ? 'text-red-600' : isSummary ? 'text-foreground font-bold' : ''
                              }`}
                            >
                              {formatNumber(value, ds.currency)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">
                              {pct}
                            </TableCell>
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="border-t px-4 py-3 bg-muted/10">
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>الجدول مجمّع حسب الشهر — كل شهر يعرض جميع الشركات جنباً إلى جنب للمقارنة المباشرة</p>
              <p>النسبة % = قيمة البند ÷ الإيرادات × 100 — القيم السلبية باللون الأحمر</p>
              <p>القيم المعروضة بالشكل المضغوط: K = ألف، M = مليون، B = مليار</p>
              <p>البنود المخصصة <Tag className="h-2.5 w-2.5 inline" /> مضافة من ملف Excel — يتم تصنيفها تلقائياً حسب الاسم</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
