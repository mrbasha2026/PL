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
import { Building2 } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
} from '@/lib/pnl-types';

export function PnLTable() {
  const { getFiltered, getAggregatedFiltered, dateRangeStart, dateRangeEnd } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);
  const aggregated = getAggregatedFiltered();
  const isAggregated = !!(dateRangeStart && dateRangeEnd);

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
                {PNL_LINE_ITEMS.map((item) => {
                  const key = getLineItemKey(item.name);
                  const isSummary = item.isSubtotal || item.isTotal;

                  return (
                    <TableRow
                      key={key}
                      className={`${isSummary ? 'bg-muted/30 font-bold' : ''} ${
                        item.category === 'profit' && !isSummary ? 'bg-emerald-50/30' : ''
                      } hover:bg-muted/10 transition-colors`}
                    >
                      <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                        <span style={{ paddingRight: `${(item.indent || 0) * 24}px` }}>
                          {item.nameAr}
                          <span className="mr-1.5 text-xs opacity-50">({item.name})</span>
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
        </CardContent>
      </Card>
    );
  }

  // Standard (non-aggregated) view
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="bg-gradient-to-l from-muted/60 to-muted/30 pb-3">
        <CardTitle className="text-base font-bold">قائمة الأرباح والخسائر — مقارنة متعددة الفترات</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {/* Company Name Row */}
              <TableRow className="bg-muted/20">
                <TableHead className="min-w-[260px] font-bold bg-muted/30" rowSpan={2}>
                  البند المالي
                </TableHead>
                {groups.map((group, gIdx) => {
                  const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                  return (
                    <TableHead
                      key={group.name}
                      colSpan={group.datasets.length * 2}
                      className="text-center font-bold border-b"
                      style={{ color, backgroundColor: `${color}10` }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                        {group.name}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
              {/* Period Row */}
              <TableRow className="bg-muted/10">
                {groups.map((group) =>
                  group.datasets.map((ds) => (
                    <React.Fragment key={ds.id}>
                      <TableHead className="min-w-[130px] text-center text-xs font-medium">
                        {ds.period}
                        <br />
                        <span className="opacity-60">{ds.currency}</span>
                      </TableHead>
                      <TableHead className="min-w-[60px] text-center text-[10px] font-medium bg-muted/5">
                        النسبة %
                      </TableHead>
                    </React.Fragment>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PNL_LINE_ITEMS.map((item) => {
                const key = getLineItemKey(item.name);
                const isSummary = item.isSubtotal || item.isTotal;

                return (
                  <TableRow
                    key={key}
                    className={`${isSummary ? 'bg-muted/30 font-bold' : ''} ${
                      item.category === 'profit' && !isSummary ? 'bg-emerald-50/30' : ''
                    } hover:bg-muted/10 transition-colors`}
                  >
                    <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span style={{ paddingRight: `${(item.indent || 0) * 24}px` }}>
                        {item.nameAr}
                        <span className="mr-1.5 text-xs opacity-50">({item.name})</span>
                      </span>
                    </TableCell>
                    {groups.map((group) =>
                      group.datasets.map((ds) => {
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
      </CardContent>
    </Card>
  );
}
