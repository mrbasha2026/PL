'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  Building2, Calendar, Shield
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  CompanyPnL,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  formatPercentage,
  calcGrowth,
  getLineItemKey,
  FINANCIAL_RATIOS,
} from '@/lib/pnl-types';

function KPICard({
  title,
  titleEn,
  value,
  subtitle,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  titleEn: string;
  value: string;
  subtitle?: string;
  trend?: number | null;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 h-1 w-full" style={{ backgroundColor: color }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {title}
              <span className="opacity-50 mr-1">({titleEn})</span>
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
        {trend !== null && trend !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend > 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={trend > 0 ? 'text-emerald-600 font-medium' : trend < 0 ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">عن الفترة السابقة</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExecutiveSummary() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض الملخص التنفيذي</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards per company */}
      {groups.map((group, gIdx) => {
        const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
        // Use the latest period for KPIs
        const latest = group.datasets[group.datasets.length - 1];
        const previous = group.datasets.length > 1 ? group.datasets[group.datasets.length - 2] : null;

        if (!latest) return null;

        const revenue = latest.data['revenue'] || 0;
        const grossProfit = latest.data['gross_profit'] || 0;
        const ebit = latest.data['operating_income_ebit'] || 0;
        const netIncome = latest.data['net_income'] || 0;
        const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
        const netMargin = revenue ? (netIncome / revenue) * 100 : 0;

        const revGrowth = previous ? calcGrowth(latest.data, previous.data, 'revenue') : null;
        const netGrowth = previous ? calcGrowth(latest.data, previous.data, 'net_income') : null;

        return (
          <div key={group.name}>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <h3 className="text-lg font-bold" style={{ color }}>{group.name}</h3>
              <Badge variant="outline" className="text-xs">{latest.period}</Badge>
              {previous && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Calendar className="h-3 w-3" />
                  مقارنة مع {previous.period}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPICard
                title="الإيرادات"
                titleEn="Revenue"
                value={formatNumber(revenue, latest.currency)}
                trend={revGrowth}
                icon={DollarSign}
                color={color}
              />
              <KPICard
                title="إجمالي الربح"
                titleEn="Gross Profit"
                value={formatNumber(grossProfit, latest.currency)}
                subtitle={`هامش ${grossMargin.toFixed(1)}%`}
                icon={TrendingUp}
                color="#059669"
              />
              <KPICard
                title="صافي الدخل"
                titleEn="Net Income"
                value={formatNumber(netIncome, latest.currency)}
                subtitle={`هامش ${netMargin.toFixed(1)}%`}
                trend={netGrowth}
                icon={TrendingUp}
                color="#0d9488"
              />
              <KPICard
                title="الدخل التشغيلي"
                titleEn="EBIT"
                value={formatNumber(ebit, latest.currency)}
                icon={BarChart3}
                color="#d97706"
              />
            </div>

            {/* Quick ratios bar */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {FINANCIAL_RATIOS.slice(0, 6).map((ratio) => {
                const val = ratio.formula(latest.data);
                const prevVal = previous ? ratio.formula(previous.data) : null;
                const diff = val !== null && prevVal !== null ? val - prevVal : null;

                return (
                  <div key={ratio.key} className="rounded-lg border bg-muted/20 p-2.5 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{ratio.nameAr}</p>
                    <p className="text-sm font-bold tabular-nums">
                      {ratio.format === 'percentage' ? formatPercentage(val) : val !== null ? val.toFixed(2) : '—'}
                    </p>
                    {diff !== null && (
                      <p className={`text-[10px] font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : ''}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}{ratio.format === 'percentage' ? '%' : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {gIdx < groups.length - 1 && <Separator className="mt-6" />}
          </div>
        );
      })}

      {/* Cross-company comparison summary */}
      {groups.length >= 2 && (
        <>
          <Separator />
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-teal-600" />
                مقارنة سريعة بين الشركات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="py-2 pr-4 text-right font-medium text-muted-foreground">المؤشر</th>
                      {groups.map((g, i) => (
                        <th key={g.name} className="py-2 px-3 text-center font-bold" style={{ color: COMPANY_COLORS[i % COMPANY_COLORS.length] }}>
                          {g.name}
                        </th>
                      ))}
                      <th className="py-2 px-3 text-center font-medium text-muted-foreground">الأعلى</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'revenue', label: 'الإيرادات' },
                      { key: 'gross_profit', label: 'إجمالي الربح' },
                      { key: 'net_income', label: 'صافي الدخل' },
                    ].map((metric) => {
                      const values = groups.map((g) => {
                        const latest = g.datasets[g.datasets.length - 1];
                        return { name: g.name, value: latest?.data[metric.key] || 0, currency: latest?.currency || 'SAR' };
                      });
                      const maxVal = Math.max(...values.map((v) => v.value));

                      return (
                        <tr key={metric.key} className="border-b last:border-0">
                          <td className="py-2.5 pr-4 font-medium">{metric.label}</td>
                          {values.map((v, i) => (
                            <td key={i} className={`py-2.5 px-3 text-center tabular-nums ${v.value === maxVal && v.value > 0 ? 'font-bold' : ''}`}>
                              {formatNumber(v.value, v.currency)}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="secondary" className="text-xs">
                              {values.find((v) => v.value === maxVal)?.name || '—'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
