'use client';

import React from 'react';
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
  ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Building2, Info,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  periodToArabic,
  CompanyGroup,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

function CompanyMoMTable({ group, color }: { group: CompanyGroup; color: string }) {
  const datasets = group.datasets;

  if (datasets.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        لا توجد بيانات لهذه الشركة
      </div>
    );
  }

  // Methodology note footer
  const methodologyNote = (
    <div className="border-t px-4 py-3 bg-muted/10">
      <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p>التغير % = ((قيمة الشهر الحالي - الشهر السابق) ÷ |الشهر السابق|) × 100</p>
          <p>🟢 ارتفاع إيجابي — 🔴 انخفاض سلبي — القيم السالبة بالأحمر</p>
          <p>النسبة % = قيمة البند ÷ الإيرادات × 100</p>
        </div>
      </div>
    </div>
  );

  if (datasets.length === 1) {
    return (
      <div className="space-y-4">
        {/* Single period: just show the values */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {periodToArabic(datasets[0].period)}
          </Badge>
          <span className="text-xs text-muted-foreground">فترة واحدة فقط — لا تتوفر مقارنة شهرية</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="min-w-[200px] text-xs font-bold">البند المالي</TableHead>
                <TableHead className="min-w-[120px] text-center text-xs font-medium">
                  {periodToArabic(datasets[0].period)}
                </TableHead>
                <TableHead className="min-w-[70px] text-center text-[10px] font-medium bg-muted/5">النسبة %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PNL_LINE_ITEMS.map((item) => {
                const key = getLineItemKey(item.name);
                const isSummary = item.isSubtotal || item.isTotal;
                const value = datasets[0].data[key] || 0;
                const revenue = datasets[0].data['revenue'] || 0;
                const pct = key === 'revenue'
                  ? (revenue !== 0 ? '100.0%' : '—')
                  : (revenue !== 0 ? `${((value / revenue) * 100).toFixed(1)}%` : '—');

                return (
                  <TableRow key={key} className={`${isSummary ? 'bg-muted/20 font-bold' : ''} hover:bg-muted/5`}>
                    <TableCell className={`text-sm ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                      <span style={{ paddingRight: `${(item.indent || 0) * 20}px` }}>
                        {item.nameAr}
                        {item.description && <InfoTooltip text={item.description} side="left" />}
                      </span>
                    </TableCell>
                    <TableCell className={`text-center tabular-nums text-sm ${value < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                      {formatNumber(value, datasets[0].currency)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">{pct}</TableCell>
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

  // Multiple periods: each month as a column, with MoM change columns between them
  // Layout: Line Item | Month1 | Month2 | Δ% | Month3 | Δ% | ... 
  // Where Δ% = change from previous month

  return (
    <div>
      {/* Column explanation */}
      <div className="px-4 py-2 bg-muted/5 border-b text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
        <span>📋 البند المالي = اسم البند بالعربية والإنجليزية</span>
        <span>💰 القيمة = المبلغ بالعملة</span>
        <span>📊 النسبة % = البند ÷ الإيرادات × 100</span>
        <span>📈 التغير % = التغير عن الشهر السابق</span>
      </div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10">
            <TableHead className="min-w-[200px] sticky right-0 bg-background z-10 text-xs font-bold border-l" rowSpan={2}>
              البند المالي
            </TableHead>
            {/* First period - full column */}
            <TableHead className="min-w-[110px] text-center text-xs font-medium border-b" rowSpan={2}>
              {periodToArabic(datasets[0].period)}
              <br />
              <span className="text-[10px] opacity-60">{datasets[0].currency}</span>
            </TableHead>
            {/* Subsequent periods: value + change */}
            {datasets.slice(1).map((ds, i) => (
              <React.Fragment key={ds.id}>
                <TableHead className="min-w-[110px] text-center text-xs font-medium border-b" rowSpan={2}>
                  {periodToArabic(ds.period)}
                  <br />
                  <span className="text-[10px] opacity-60">{ds.currency}</span>
                </TableHead>
                <TableHead className="min-w-[70px] text-center text-[10px] font-medium bg-emerald-50/50 border-b" rowSpan={2}>
                  التغير %
                  <br />
                  <span className="opacity-60">vs {periodToArabic(datasets[i].period).split(' ')[0]}</span>
                </TableHead>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {PNL_LINE_ITEMS.map((item) => {
            const key = getLineItemKey(item.name);
            const isSummary = item.isSubtotal || item.isTotal;
            const revenue = datasets[0].data['revenue'] || 0;

            return (
              <TableRow key={key} className={`${isSummary ? 'bg-muted/15 font-bold' : ''} hover:bg-muted/5 transition-colors`}>
                <TableCell className={`text-sm sticky right-0 bg-background z-10 border-l ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                  <span style={{ paddingRight: `${(item.indent || 0) * 20}px` }}>
                    {item.nameAr}
                    {item.description && <InfoTooltip text={item.description} side="left" />}
                  </span>
                </TableCell>
                {/* First period value */}
                {(() => {
                  const val = datasets[0].data[key] || 0;
                  const rev = datasets[0].data['revenue'] || 0;
                  const pct = key === 'revenue'
                    ? (rev !== 0 ? '100.0%' : '—')
                    : (rev !== 0 ? `${((val / rev) * 100).toFixed(1)}%` : '—');
                  return (
                    <TableCell className={`text-center tabular-nums text-sm ${val < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                      {formatNumber(val, datasets[0].currency)}
                    </TableCell>
                  );
                })()}
                {/* Subsequent periods: value + change */}
                {datasets.slice(1).map((ds, i) => {
                  const currVal = ds.data[key] || 0;
                  const prevVal = datasets[i].data[key] || 0;
                  const diff = currVal - prevVal;
                  const pctChange = prevVal !== 0 ? ((diff / Math.abs(prevVal)) * 100) : null;

                  return (
                    <React.Fragment key={ds.id + key}>
                      <TableCell className={`text-center tabular-nums text-sm ${currVal < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''}`}>
                        {formatNumber(currVal, ds.currency)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums bg-emerald-50/20">
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
      {methodologyNote}
    </div>
  );
}

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

  if (groups.length === 1) {
    const color = COMPANY_COLORS[0 % COMPANY_COLORS.length];
    return (
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="pb-3" style={{ backgroundColor: `${color}08` }}>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span style={{ color }}>{groups[0].name}</span>
            <Badge variant="outline" className="text-xs">مقارنة شهرية</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CompanyMoMTable group={groups[0]} color={color} />
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
                <Badge variant="outline" className="text-[10px]">مقارنة شهرية (Month-over-Month)</Badge>
                <span className="text-[10px] text-muted-foreground">
                  {group.datasets.length} {group.datasets.length === 1 ? 'فترة' : 'فترات'}
                </span>
              </div>
              <CompanyMoMTable group={group} color={color} />
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
