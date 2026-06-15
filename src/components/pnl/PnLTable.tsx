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
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

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
                      colSpan={group.datasets.length}
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
                    <TableHead key={ds.id} className="min-w-[130px] text-center text-xs font-medium">
                      {ds.period}
                      <br />
                      <span className="opacity-60">{ds.currency}</span>
                    </TableHead>
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
                        return (
                          <TableCell
                            key={ds.id}
                            className={`text-center tabular-nums text-sm ${
                              value < 0 ? 'text-red-600' : isSummary ? 'text-foreground font-bold' : ''
                            }`}
                          >
                            {formatNumber(value, ds.currency)}
                          </TableCell>
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
