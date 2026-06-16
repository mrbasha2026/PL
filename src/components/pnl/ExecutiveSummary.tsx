'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  BarChart3, ArrowUpRight, ArrowDownRight, Minus,
  Building2, Calendar, Shield, Info, Sparkles,
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
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

function KPICard({
  title,
  titleEn,
  value,
  subtitle,
  tooltipText,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  titleEn: string;
  value: string;
  subtitle?: string;
  tooltipText?: string;
  trend?: number | null;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      {/* Top accent line */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(to left, ${color}, ${color}40)` }} />
      
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              {title}
              <span className="opacity-50 text-[10px]">({titleEn})</span>
              {tooltipText && <InfoTooltip text={tooltipText} side="bottom" />}
            </p>
            <p className="text-xl font-bold tabular-nums truncate" style={{ color }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
            )}
          </div>
          <div 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${color}25, ${color}10)` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
        
        {trend !== null && trend !== undefined && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {trend > 0 ? (
              <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-1.5 py-0.5">
                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">{Math.abs(trend).toFixed(1)}%</span>
              </div>
            ) : trend < 0 ? (
              <div className="flex items-center gap-1 rounded-lg bg-red-500/10 px-1.5 py-0.5">
                <ArrowDownRight className="h-3 w-3 text-red-500" />
                <span className="text-red-500 font-semibold">{Math.abs(trend).toFixed(1)}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-lg bg-muted/40 px-1.5 py-0.5">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">0.0%</span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">عن الفترة السابقة</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExecutiveSummary() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-chart-4/10 flex items-center justify-center">
            <Building2 className="h-10 w-10 text-primary/40" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-foreground/70">اختر بيانات لعرض الملخص التنفيذي</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          استخدم الفلاتر أعلاه لتحديد الشركات والفترات المالية المراد تحليلها
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards per company */}
      {groups.map((group, gIdx) => {
        const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
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
            {/* Company header */}
            <div className="flex items-center gap-3 mb-5">
              <div 
                className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}80)`, boxShadow: `0 8px 24px -8px ${color}50` }}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight" style={{ color }}>{group.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] rounded-md">{latest.period}</Badge>
                  {previous && (
                    <Badge variant="secondary" className="text-[10px] gap-1 rounded-md">
                      <Calendar className="h-2.5 w-2.5" />
                      مقارنة مع {previous.period}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
              <KPICard
                title="الإيرادات"
                titleEn="Revenue"
                value={formatNumber(revenue, latest.currency)}
                tooltipText="إجمالي المبيعات والخدمات — Total sales and services revenue"
                trend={revGrowth}
                icon={DollarSign}
                color={color}
              />
              <KPICard
                title="إجمالي الربح"
                titleEn="Gross Profit"
                value={formatNumber(grossProfit, latest.currency)}
                subtitle={`هامش ${grossMargin.toFixed(1)}%`}
                tooltipText="الإيرادات - تكلفة المبيعات — Revenue minus cost of goods sold"
                icon={TrendingUp}
                color="#059669"
              />
              <KPICard
                title="صافي الدخل"
                titleEn="Net Income"
                value={formatNumber(netIncome, latest.currency)}
                subtitle={`هامش ${netMargin.toFixed(1)}%`}
                tooltipText="الربح النهائي بعد جميع الخصومات — Final profit after all deductions"
                trend={netGrowth}
                icon={TrendingUp}
                color="#0d9488"
              />
              <KPICard
                title="الدخل التشغيلي"
                titleEn="EBIT"
                value={formatNumber(ebit, latest.currency)}
                tooltipText="الدخل من العمليات قبل الفوائد والضرائب — Operating profit before interest and taxes"
                icon={BarChart3}
                color="#d97706"
              />
            </div>

            {/* Quick ratios bar */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {FINANCIAL_RATIOS.slice(0, 6).map((ratio) => {
                const val = ratio.formula(latest.data);
                const prevVal = previous ? ratio.formula(previous.data) : null;
                const diff = val !== null && prevVal !== null ? val - prevVal : null;

                return (
                  <div 
                    key={ratio.key} 
                    className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm p-3 text-center transition-all hover:bg-card/60 hover:border-border/70"
                  >
                    <p className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center justify-center gap-0.5">
                      {ratio.nameAr}
                      {ratio.description && <InfoTooltip text={ratio.description} side="bottom" />}
                    </p>
                    <p className="text-sm font-bold tabular-nums">
                      {ratio.format === 'percentage' ? formatPercentage(val) : val !== null ? val.toFixed(2) : '—'}
                    </p>
                    {diff !== null && (
                      <p className={`text-[10px] font-medium mt-0.5 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}{ratio.format === 'percentage' ? '%' : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {gIdx < groups.length - 1 && <Separator className="mt-8" />}
          </div>
        );
      })}

      {/* Cross-company comparison summary */}
      {groups.length >= 2 && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-chart-4/15">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-bold">مقارنة سريعة بين الشركات</h3>
          </div>
          
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/20">
                    <th className="py-3 pr-4 text-right font-semibold text-muted-foreground">المؤشر</th>
                    {groups.map((g, i) => (
                      <React.Fragment key={g.name}>
                        <th className="py-3 px-3 text-center font-bold" style={{ color: COMPANY_COLORS[i % COMPANY_COLORS.length] }}>
                          {g.name}
                        </th>
                        <th className="py-3 px-2 text-center text-[10px] font-medium text-muted-foreground bg-muted/10">النسبة %</th>
                      </React.Fragment>
                    ))}
                    <th className="py-3 px-3 text-center font-medium text-muted-foreground">الأعلى</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'revenue', label: 'الإيرادات' },
                    { key: 'gross_profit', label: 'إجمالي الربح' },
                    { key: 'net_income', label: 'صافي الدخل' },
                  ].map((metric, mIdx) => {
                    const values = groups.map((g) => {
                      const latest = g.datasets[g.datasets.length - 1];
                      return { name: g.name, value: latest?.data[metric.key] || 0, currency: latest?.currency || 'SAR', revenue: latest?.data['revenue'] || 0 };
                    });
                    const maxVal = Math.max(...values.map((v) => v.value));

                    return (
                      <tr key={metric.key} className={`border-b last:border-0 border-border/30 ${mIdx % 2 !== 0 ? 'bg-muted/[0.02]' : ''}`}>
                        <td className="py-3 pr-4 font-medium">{metric.label}</td>
                        {values.map((v, i) => {
                          const pct = metric.key === 'revenue'
                            ? (v.revenue !== 0 ? '100.0%' : '—')
                            : (v.revenue !== 0 ? ((v.value / v.revenue) * 100).toFixed(1) + '%' : '—');
                          return (
                            <React.Fragment key={i}>
                              <td className={`py-3 px-3 text-center tabular-nums ${v.value === maxVal && v.value > 0 ? 'font-bold' : ''}`}>
                                {formatNumber(v.value, v.currency)}
                              </td>
                              <td className="py-3 px-2 text-center text-xs text-muted-foreground bg-muted/5 tabular-nums">
                                {pct}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className="py-3 px-3 text-center">
                          <Badge variant="secondary" className="text-xs rounded-md bg-primary/10 text-primary border-0">
                            {values.find((v) => v.value === maxVal)?.name || '—'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Methodology footnote */}
      <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Info className="h-3 w-3 text-primary" />
          </div>
          <div className="space-y-1">
            <p>الأسهم الخضراء 🟢 تشير للتحسن عن الفترة السابقة — الحمراء 🔴 تشير للتراجع</p>
            <p>الهوامش محسوبة: هامش الربح = (الربح ÷ الإيرادات) × 100</p>
            <p>النسبة المئوية للتغير = ((القيمة الحالية - السابقة) ÷ |القيمة السابقة|) × 100</p>
          </div>
        </div>
      </div>
    </div>
  );
}
