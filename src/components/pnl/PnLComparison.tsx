'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, GitCompareArrows } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { COMPANY_COLORS, groupByCompany, formatNumber, CompanyPnL } from '@/lib/pnl-types';

function MetricCard({ label, labelEn, value, currency, color, isBest }: {
  label: string; labelEn: string; value: number; currency: string; color: string; isBest?: boolean;
}) {
  const absVal = Math.abs(value);
  let formatted: string;
  if (absVal >= 1_000_000_000) formatted = (value / 1_000_000_000).toFixed(1) + 'B';
  else if (absVal >= 1_000_000) formatted = (value / 1_000_000).toFixed(1) + 'M';
  else if (absVal >= 1_000) formatted = (value / 1_000).toFixed(1) + 'K';
  else formatted = value.toFixed(0);

  return (
    <div className={`rounded-xl border p-4 transition-all ${isBest ? 'ring-2 shadow-md' : 'hover:shadow-sm'}`}
      style={{ borderColor: isBest ? color : undefined }}>
      <div className="mb-1 text-xs text-muted-foreground">{label} <span className="opacity-50">({labelEn})</span></div>
      <div className="text-xl font-bold tabular-nums" style={{ color }}>{formatted} {currency}</div>
    </div>
  );
}

export function PnLComparison() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <GitCompareArrows className="mb-4 h-12 w-12 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات للمقارنة</h3>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { key: 'revenue', labelAr: 'الإيرادات', labelEn: 'Revenue', higher: true },
    { key: 'gross_profit', labelAr: 'إجمالي الربح', labelEn: 'Gross Profit', higher: true },
    { key: 'operating_income_ebit', labelAr: 'الدخل التشغيلي', labelEn: 'EBIT', higher: true },
    { key: 'net_income', labelAr: 'صافي الدخل', labelEn: 'Net Income', higher: true },
  ];

  return (
    <div className="space-y-6">
      {metrics.map((metric) => {
        const latestPerGroup = groups.map((g) => g.datasets[g.datasets.length - 1]).filter(Boolean);
        const values = latestPerGroup.map((d) => d.data[metric.key] || 0);
        const bestVal = metric.higher ? Math.max(...values) : Math.min(...values);

        return (
          <Card key={metric.key} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {metric.higher ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                {metric.labelAr}
                <span className="text-xs font-normal text-muted-foreground">({metric.labelEn})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {groups.map((group, gIdx) => {
                  const latest = group.datasets[group.datasets.length - 1];
                  if (!latest) return null;
                  const value = latest.data[metric.key] || 0;
                  const isBest = value === bestVal && value !== 0;
                  return (
                    <MetricCard
                      key={group.name}
                      label={group.name}
                      labelEn={latest.period}
                      value={value}
                      currency={latest.currency}
                      color={COMPANY_COLORS[gIdx % COMPANY_COLORS.length]}
                      isBest={isBest}
                    />
                  );
                })}
              </div>

              {/* Variance */}
              {groups.length >= 2 && (
                <div className="mt-4 rounded-xl bg-muted/40 p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">الفروقات:</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groups.slice(1).map((group, gIdx) => {
                      const base = groups[0].datasets[groups[0].datasets.length - 1];
                      const comp = group.datasets[group.datasets.length - 1];
                      if (!base || !comp) return null;
                      const baseVal = base.data[metric.key] || 0;
                      const compVal = comp.data[metric.key] || 0;
                      const diff = compVal - baseVal;
                      const pct = baseVal !== 0 ? ((diff / Math.abs(baseVal)) * 100).toFixed(1) : null;
                      const isPositive = diff > 0;
                      return (
                        <div key={group.name} className="flex items-center gap-2 text-sm rounded-lg bg-background/60 p-2">
                          {isPositive ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : diff < 0 ? <ArrowDownRight className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-muted-foreground">{group.name} مقابل {groups[0].name}:</span>
                          <span className={`font-bold ${isPositive ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : ''}`}>
                            {pct !== null ? `${isPositive ? '+' : ''}${pct}%` : '—'}
                          </span>
                          <span className="text-muted-foreground text-xs">({formatNumber(diff, base.currency)})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
