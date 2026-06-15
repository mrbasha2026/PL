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
  Calculator, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  COMPANY_COLORS,
  FINANCIAL_RATIOS,
  groupByCompany,
  formatPercentage,
  calcGrowth,
} from '@/lib/pnl-types';

export function FinancialRatios() {
  const { companies, selectedIds } = usePnLStore();
  const selected = companies.filter((c) => selectedIds.includes(c.id));
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Calculator className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض النسب المالية</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profitability Ratios */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-emerald-50 to-emerald-100/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            نسب الربحية — Profitability Ratios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="min-w-[200px] font-bold">النسبة</TableHead>
                {groups.map((group, gIdx) => {
                  const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                  return (
                    <TableHead
                      key={group.name}
                      className="min-w-[130px] text-center font-bold"
                      style={{ color }}
                    >
                      {group.name}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FINANCIAL_RATIOS.filter((r) => r.format === 'percentage').map((ratio) => (
                <TableRow key={ratio.key} className="hover:bg-muted/5">
                  <TableCell className="font-medium">
                    {ratio.nameAr}
                    <span className="mr-1 text-xs text-muted-foreground">({ratio.nameEn})</span>
                  </TableCell>
                  {groups.map((group, gIdx) => {
                    const latest = group.datasets[group.datasets.length - 1];
                    const prev = group.datasets.length > 1 ? group.datasets[group.datasets.length - 2] : null;
                    const val = latest ? ratio.formula(latest.data) : null;
                    const prevVal = prev ? ratio.formula(prev.data) : null;
                    const diff = val !== null && prevVal !== null ? val - prevVal : null;

                    return (
                      <TableCell key={group.name} className="text-center tabular-nums">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`font-bold ${val !== null && val < 0 ? 'text-red-600' : ''}`}>
                            {formatPercentage(val)}
                          </span>
                          {diff !== null && (
                            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
                              diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {diff > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : diff < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Coverage Ratios */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-amber-50 to-amber-100/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-amber-600" />
            نسب التغطية — Coverage Ratios
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="min-w-[200px] font-bold">النسبة</TableHead>
                {groups.map((group, gIdx) => {
                  const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                  return (
                    <TableHead key={group.name} className="min-w-[130px] text-center font-bold" style={{ color }}>
                      {group.name}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {FINANCIAL_RATIOS.filter((r) => r.format === 'ratio').map((ratio) => (
                <TableRow key={ratio.key} className="hover:bg-muted/5">
                  <TableCell className="font-medium">
                    {ratio.nameAr}
                    <span className="mr-1 text-xs text-muted-foreground">({ratio.nameEn})</span>
                  </TableCell>
                  {groups.map((group) => {
                    const latest = group.datasets[group.datasets.length - 1];
                    const val = latest ? ratio.formula(latest.data) : null;
                    return (
                      <TableCell key={group.name} className="text-center tabular-nums font-bold">
                        {val !== null ? val.toFixed(2) + 'x' : '—'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Period-over-Period Growth */}
      {groups.some((g) => g.datasets.length > 1) && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-l from-teal-50 to-teal-100/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              التحليل الترندي — نمو فترة لفترة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="min-w-[200px] font-bold">البند</TableHead>
                  {groups.filter((g) => g.datasets.length > 1).map((group, gIdx) => {
                    const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                    const prevPeriod = group.datasets[group.datasets.length - 2]?.period;
                    const currPeriod = group.datasets[group.datasets.length - 1]?.period;
                    return (
                      <TableHead key={group.name} className="min-w-[130px] text-center font-bold" style={{ color }}>
                        {group.name}
                        <br />
                        <span className="text-xs font-normal opacity-60">{currPeriod} مقابل {prevPeriod}</span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { key: 'revenue', labelAr: 'الإيرادات' },
                  { key: 'gross_profit', labelAr: 'إجمالي الربح' },
                  { key: 'operating_income_ebit', labelAr: 'الدخل التشغيلي' },
                  { key: 'income_before_tax', labelAr: 'الدخل قبل الضريبة' },
                  { key: 'net_income', labelAr: 'صافي الدخل' },
                ].map((metric) => (
                  <TableRow key={metric.key} className="hover:bg-muted/5">
                    <TableCell className="font-medium">{metric.labelAr}</TableCell>
                    {groups.filter((g) => g.datasets.length > 1).map((group) => {
                      const latest = group.datasets[group.datasets.length - 1];
                      const prev = group.datasets[group.datasets.length - 2];
                      const growth = calcGrowth(latest.data, prev.data, metric.key);
                      return (
                        <TableCell key={group.name} className="text-center tabular-nums">
                          {growth !== null ? (
                            <span className={`flex items-center justify-center gap-1 font-bold ${
                              growth > 0 ? 'text-emerald-600' : growth < 0 ? 'text-red-500' : ''
                            }`}>
                              {growth > 0 ? <ArrowUpRight className="h-4 w-4" /> : growth < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                              {Math.abs(growth).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
