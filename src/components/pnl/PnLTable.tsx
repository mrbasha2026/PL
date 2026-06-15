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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Building2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  CompanyPnL,
  groupByCompany,
  formatNumber,
} from '@/lib/pnl-types';

export function PnLTable() {
  const { companies, removeDataset, removeCompanyGroup, selectedIds, toggleSelection, selectAll, deselectAll } = usePnLStore();

  const selected = companies.filter((c) => selectedIds.includes(c.id));
  const groups = groupByCompany(selected);

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">لا توجد بيانات بعد</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            قم برفع ملف Excel لعرض بيانات الأرباح والخسائر
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get all unique periods across selected datasets
  const allPeriods = [...new Set(selected.map((c) => c.period))].sort();

  return (
    <div className="space-y-5">
      {/* Company management bar */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground ml-2">الشركات:</span>
            {groups.map((group, gIdx) => {
              const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
              return (
                <div key={group.name} className="flex items-center gap-1">
                  <Badge
                    className="gap-1.5 px-3 py-1.5 text-sm cursor-pointer"
                    style={{ backgroundColor: color, borderColor: color }}
                    onClick={() => {
                      const ids = group.datasets.map((d) => d.id);
                      const allSelected = ids.every((id) => selectedIds.includes(id));
                      if (allSelected) {
                        ids.forEach((id) => {
                          if (selectedIds.includes(id)) toggleSelection(id);
                        });
                      } else {
                        ids.forEach((id) => {
                          if (!selectedIds.includes(id)) toggleSelection(id);
                        });
                      }
                    }}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'white' }} />
                    {group.name}
                    <span className="text-xs opacity-70">({group.periods.length} فترات)</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 p-0 text-white/70 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); removeCompanyGroup(group.name); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              );
            })}
            <div className="mr-auto flex gap-1">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>تحديد الكل</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={deselectAll}>إلغاء الكل</Button>
            </div>
          </div>

          {/* Individual period chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selected.map((ds) => {
              const gIdx = groups.findIndex((g) => g.name === ds.companyName);
              const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
              return (
                <Badge
                  key={ds.id}
                  variant="outline"
                  className="gap-1 text-xs cursor-pointer transition-all"
                  style={{ borderColor: color, color }}
                  onClick={() => toggleSelection(ds.id)}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {ds.companyName} — {ds.period}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-0.5 h-3.5 w-3.5 p-0 text-current opacity-60 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); removeDataset(ds.id); }}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* P&L Table — Professional */}
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
                    const groupSelected = group.datasets.filter((d) => selectedIds.includes(d.id));
                    return (
                      <TableHead
                        key={group.name}
                        colSpan={groupSelected.length}
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
                  {groups.map((group) => {
                    const groupSelected = group.datasets.filter((d) => selectedIds.includes(d.id));
                    return groupSelected.map((ds) => (
                      <TableHead key={ds.id} className="min-w-[140px] text-center text-xs font-medium">
                        {ds.period}
                        <br />
                        <span className="opacity-60">{ds.currency}</span>
                      </TableHead>
                    ));
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
                      {groups.map((group) => {
                        const groupSelected = group.datasets.filter((d) => selectedIds.includes(d.id));
                        return groupSelected.map((ds) => {
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
                        });
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
