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
import {
  ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Building2,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  formatPercentage,
  periodToArabic,
} from '@/lib/pnl-types';

export function CompanyMoM() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض المقارنة الشهرية</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, gIdx) => {
        const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
        const datasets = group.datasets;

        if (datasets.length < 2) {
          return (
            <Card key={group.name} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span style={{ color }}>{group.name}</span>
                  <Badge variant="outline" className="text-xs">مقارنة شهرية</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
                تحتاج فترتان على الأقل لعرض المقارنة الشهرية — الفترة المتاحة: {datasets[0]?.period || '—'}
              </CardContent>
            </Card>
          );
        }

        // Build consecutive period pairs
        const pairs: Array<{
          current: typeof datasets[0];
          previous: typeof datasets[0];
        }> = [];

        for (let i = 1; i < datasets.length; i++) {
          pairs.push({
            current: datasets[i],
            previous: datasets[i - 1],
          });
        }

        return (
          <Card key={group.name} className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3" style={{ backgroundColor: `${color}08` }}>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span style={{ color }}>{group.name}</span>
                <Badge variant="outline" className="text-xs">مقارنة شهرية (Month-over-Month)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {pairs.map((pair, pairIdx) => {
                  const currPeriod = pair.current.period;
                  const prevPeriod = pair.previous.period;

                  return (
                    <div key={pairIdx} className={pairIdx > 0 ? 'border-t' : ''}>
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted/10">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {periodToArabic(prevPeriod)} ← {periodToArabic(currPeriod)}
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/5">
                            <TableHead className="min-w-[200px] text-xs font-bold">البند المالي</TableHead>
                            <TableHead className="min-w-[110px] text-center text-xs font-medium">
                              {periodToArabic(prevPeriod)}
                              <br />
                              <span className="text-[10px] opacity-60">(السابقة)</span>
                            </TableHead>
                            <TableHead className="min-w-[110px] text-center text-xs font-medium">
                              {periodToArabic(currPeriod)}
                              <br />
                              <span className="text-[10px] opacity-60">(الحالية)</span>
                            </TableHead>
                            <TableHead className="min-w-[100px] text-center text-xs font-medium">
                              الفرق
                              <br />
                              <span className="text-[10px] opacity-60">(Difference)</span>
                            </TableHead>
                            <TableHead className="min-w-[90px] text-center text-xs font-medium">
                              التغير %
                              <br />
                              <span className="text-[10px] opacity-60">(Change)</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {PNL_LINE_ITEMS.map((item) => {
                            const key = getLineItemKey(item.name);
                            const isSummary = item.isSubtotal || item.isTotal;
                            const currVal = pair.current.data[key] || 0;
                            const prevVal = pair.previous.data[key] || 0;
                            const diff = currVal - prevVal;
                            const pctChange = prevVal !== 0 ? ((diff / Math.abs(prevVal)) * 100) : null;

                            return (
                              <TableRow
                                key={key}
                                className={`${isSummary ? 'bg-muted/20 font-bold' : ''} hover:bg-muted/5 transition-colors`}
                              >
                                <TableCell className={`text-sm ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                                  <span style={{ paddingRight: `${(item.indent || 0) * 20}px` }}>
                                    {item.nameAr}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center tabular-nums text-sm">
                                  {formatNumber(prevVal, pair.previous.currency)}
                                </TableCell>
                                <TableCell className={`text-center tabular-nums text-sm ${currVal < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                                  {formatNumber(currVal, pair.current.currency)}
                                </TableCell>
                                <TableCell className={`text-center tabular-nums text-sm font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : ''}`}>
                                  {diff > 0 ? '+' : ''}{formatNumber(diff, pair.current.currency)}
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  {pctChange !== null ? (
                                    <span className={`inline-flex items-center gap-1 text-sm font-bold ${
                                      pctChange > 0 ? 'text-emerald-600' : pctChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                                    }`}>
                                      {pctChange > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : pctChange < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                      {Math.abs(pctChange).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
