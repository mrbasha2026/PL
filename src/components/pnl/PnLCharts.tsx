'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  COMPANY_COLORS,
  CompanyPnL,
} from '@/lib/pnl-types';

function formatCompact(value: number): string {
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
  if (absVal >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (absVal >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toFixed(0);
}

const KEY_METRICS = [
  { key: 'revenue', labelAr: 'الإيرادات', labelEn: 'Revenue' },
  { key: 'gross_profit', labelAr: 'إجمالي الربح', labelEn: 'Gross Profit' },
  { key: 'operating_income_ebit', labelAr: 'الدخل التشغيلي', labelEn: 'EBIT' },
  { key: 'income_before_tax', labelAr: 'الدخل قبل الضريبة', labelEn: 'Pre-Tax Income' },
  { key: 'net_income', labelAr: 'صافي الدخل', labelEn: 'Net Income' },
];

const EXPENSE_BREAKDOWN = [
  { key: 'cost_of_goods_sold', labelAr: 'تكلفة البضاعة المباعة', labelEn: 'COGS' },
  { key: 'selling_expenses', labelAr: 'مصروفات البيع', labelEn: 'Selling' },
  { key: 'general_administrative', labelAr: 'مصروفات إدارية', labelEn: 'G&A' },
  { key: 'depreciation_amortization', labelAr: 'الإهلاك', labelEn: 'D&A' },
  { key: 'interest_expense', labelAr: 'مصروفات الفوائد', labelEn: 'Interest' },
  { key: 'income_tax_expense', labelAr: 'الضرائب', labelEn: 'Tax' },
];

function MarginGauge({ companies }: { companies: CompanyPnL[] }) {
  const data = companies.map((company, idx) => {
    const revenue = company.data['revenue'] || 0;
    const grossProfit = company.data['gross_profit'] || 0;
    const netIncome = company.data['net_income'] || 0;
    const ebit = company.data['operating_income_ebit'] || 0;

    return {
      name: company.name,
      grossMargin: revenue ? +((grossProfit / revenue) * 100).toFixed(1) : 0,
      operatingMargin: revenue ? +((ebit / revenue) * 100).toFixed(1) : 0,
      netMargin: revenue ? +((netIncome / revenue) * 100).toFixed(1) : 0,
      color: COMPANY_COLORS[idx % COMPANY_COLORS.length],
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">هوامش الربحية (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Legend />
            <Bar dataKey="grossMargin" name="هامش الربح الإجمالي" fill="#10b981" radius={[0, 4, 4, 0]} />
            <Bar dataKey="operatingMargin" name="هامش التشغيلي" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            <Bar dataKey="netMargin" name="هامش صافي الربح" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function KeyMetricsChart({ companies }: { companies: CompanyPnL[] }) {
  const data = KEY_METRICS.map((metric) => {
    const item: Record<string, string | number> = {
      name: metric.labelAr,
    };
    companies.forEach((company, idx) => {
      item[company.name] = company.data[metric.key] || 0;
    });
    return item;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">المؤشرات المالية الرئيسية</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={formatCompact} />
            <Tooltip formatter={(value: number) => formatCompact(value)} />
            <Legend />
            {companies.map((company, idx) => (
              <Bar
                key={company.id}
                dataKey={company.name}
                fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ExpenseBreakdownChart({ companies }: { companies: CompanyPnL[] }) {
  if (companies.length === 0) return null;

  // Show expense breakdown as pie charts for each company
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">توزيع المصروفات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company, idx) => {
            const pieData = EXPENSE_BREAKDOWN.map((exp) => ({
              name: exp.labelAr,
              value: Math.abs(company.data[exp.key] || 0),
            })).filter((d) => d.value > 0);

            return (
              <div key={company.id} className="text-center">
                <h4 className="mb-2 text-sm font-semibold" style={{ color: COMPANY_COLORS[idx % COMPANY_COLORS.length] }}>
                  {company.name}
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            [
                              '#ef4444',
                              '#f59e0b',
                              '#10b981',
                              '#8b5cf6',
                              '#06b6d4',
                              '#ec4899',
                            ][index % 6]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCompact(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RadarComparison({ companies }: { companies: CompanyPnL[] }) {
  if (companies.length < 2) return null;

  const radarData = KEY_METRICS.map((metric) => {
    const item: Record<string, string | number> = {
      metric: metric.labelAr,
    };
    // Normalize values to 0-100 scale based on max value
    const maxVal = Math.max(
      ...companies.map((c) => Math.abs(c.data[metric.key] || 0)),
      1
    );
    companies.forEach((company) => {
      const val = company.data[metric.key] || 0;
      item[company.name] = +((Math.abs(val) / maxVal) * 100).toFixed(1);
    });
    return item;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">مقارنة شاملة (رادار)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" className="text-xs" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            {companies.map((company, idx) => (
              <Radar
                key={company.id}
                name={company.name}
                dataKey={company.name}
                stroke={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
                fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PnLCharts() {
  const { companies, selectedCompanyIds } = usePnLStore();

  const selectedCompanies = companies.filter((c) =>
    selectedCompanyIds.includes(c.id)
  );

  if (selectedCompanies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">
            اختر شركة واحدة على الأقل لعرض الرسوم البيانية
          </h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="metrics" dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">المؤشرات الرئيسية</TabsTrigger>
          <TabsTrigger value="margins">الهوامش</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
          <TabsTrigger value="radar">مقارنة رادار</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics">
          <KeyMetricsChart companies={selectedCompanies} />
        </TabsContent>
        <TabsContent value="margins">
          <MarginGauge companies={selectedCompanies} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpenseBreakdownChart companies={selectedCompanies} />
        </TabsContent>
        <TabsContent value="radar">
          <RadarComparison companies={selectedCompanies} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
