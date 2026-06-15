'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePnLStore } from '@/lib/pnl-store';
import { COMPANY_COLORS, CompanyPnL } from '@/lib/pnl-types';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  labelEn: string;
  value: number;
  currency: string;
  color: string;
  isBest?: boolean;
}

function MetricCard({ label, labelEn, value, currency, color, isBest }: MetricCardProps) {
  const formatVal = (v: number, c: string) => {
    const absVal = Math.abs(v);
    let formatted: string;
    if (absVal >= 1_000_000_000) formatted = (v / 1_000_000_000).toFixed(1) + 'B';
    else if (absVal >= 1_000_000) formatted = (v / 1_000_000).toFixed(1) + 'M';
    else if (absVal >= 1_000) formatted = (v / 1_000).toFixed(1) + 'K';
    else formatted = v.toFixed(0);
    return `${formatted} ${c}`;
  };

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isBest ? 'ring-2 shadow-md' : ''
      }`}
      style={{
        borderColor: isBest ? color : undefined,
        ringColor: isBest ? color : undefined,
      }}
    >
      <div className="mb-1 text-xs text-muted-foreground">
        {label} <span className="opacity-50">({labelEn})</span>
      </div>
      <div className="text-lg font-bold tabular-nums" style={{ color }}>
        {formatVal(value, currency)}
      </div>
    </div>
  );
}

function ComparisonCards({ companies }: { companies: CompanyPnL[] }) {
  const metrics = [
    { key: 'revenue', labelAr: 'الإيرادات', labelEn: 'Revenue', higher: true },
    { key: 'gross_profit', labelAr: 'إجمالي الربح', labelEn: 'Gross Profit', higher: true },
    { key: 'operating_income_ebit', labelAr: 'الدخل التشغيلي', labelEn: 'EBIT', higher: true },
    { key: 'net_income', labelAr: 'صافي الدخل', labelEn: 'Net Income', higher: true },
  ];

  return (
    <div className="space-y-6">
      {metrics.map((metric) => {
        const values = companies.map((c) => c.data[metric.key] || 0);
        const bestVal = metric.higher ? Math.max(...values) : Math.min(...values);

        return (
          <Card key={metric.key}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {metric.higher ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                {metric.labelAr}
                <span className="text-xs font-normal text-muted-foreground">
                  ({metric.labelEn})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {companies.map((company, idx) => {
                  const value = company.data[metric.key] || 0;
                  const isBest = value === bestVal && value !== 0;
                  return (
                    <MetricCard
                      key={company.id}
                      label={company.name}
                      labelEn={company.period}
                      value={value}
                      currency={company.currency}
                      color={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
                      isBest={isBest}
                    />
                  );
                })}
              </div>

              {/* Variance info */}
              {companies.length >= 2 && (
                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {companies.slice(1).map((company, idx) => {
                      const baseVal = companies[0].data[metric.key] || 0;
                      const compVal = company.data[metric.key] || 0;
                      const diff = compVal - baseVal;
                      const pct = baseVal !== 0 ? ((diff / Math.abs(baseVal)) * 100).toFixed(1) : 'N/A';
                      const isPositive = diff > 0;
                      return (
                        <div key={company.id} className="flex items-center gap-1.5">
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                          ) : diff < 0 ? (
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">
                            {company.name} مقابل {companies[0].name}:
                          </span>
                          <span
                            className={
                              isPositive
                                ? 'font-medium text-emerald-600'
                                : diff < 0
                                ? 'font-medium text-red-600'
                                : ''
                            }
                          >
                            {pct !== 'N/A' ? `${isPositive ? '+' : ''}${pct}%` : 'N/A'}
                          </span>
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

export function PnLComparison() {
  const { companies, selectedCompanyIds } = usePnLStore();

  const selectedCompanies = companies.filter((c) =>
    selectedCompanyIds.includes(c.id)
  );

  if (selectedCompanies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">
            اختر شركة واحدة على الأقل للمقارنة
          </h3>
        </CardContent>
      </Card>
    );
  }

  return <ComparisonCards companies={selectedCompanies} />;
}
