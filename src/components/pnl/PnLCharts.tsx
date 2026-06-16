'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePnLStore } from '@/lib/pnl-store';
import {
  COMPANY_COLORS, CompanyPnL, groupByCompany, formatCompact,
  formatPercentage,
} from '@/lib/pnl-types';

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

const PIE_COLORS = ['#0d9488', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ea580c'];

function KeyMetricsChart({ groups }: { groups: ReturnType<typeof groupByCompany> }) {
  const data = KEY_METRICS.map((metric) => {
    const item: Record<string, string | number> = { name: metric.labelAr };
    groups.forEach((group) => {
      const latest = group.datasets[group.datasets.length - 1];
      if (latest) item[group.name] = latest.data[metric.key] || 0;
    });
    return item;
  });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">المؤشرات المالية الرئيسية</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: number) => formatCompact(value)} />
            <Legend />
            {groups.map((group, idx) => (
              <Bar key={group.name} dataKey={group.name} fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function MarginChart({ groups }: { groups: ReturnType<typeof groupByCompany> }) {
  const data = groups.map((group, idx) => {
    const latest = group.datasets[group.datasets.length - 1];
    const rev = latest?.data['revenue'] || 0;
    return {
      name: group.name,
      grossMargin: rev ? +(((latest?.data['gross_profit'] || 0) / rev) * 100).toFixed(1) : 0,
      operatingMargin: rev ? +(((latest?.data['operating_income_ebit'] || 0) / rev) * 100).toFixed(1) : 0,
      netMargin: rev ? +(((latest?.data['net_income'] || 0) / rev) * 100).toFixed(1) : 0,
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">هوامش الربحية (%)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} layout="vertical" margin={{ right: 50 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Legend />
            <Bar dataKey="grossMargin" name="هامش الربح الإجمالي" fill="#059669" radius={[0, 4, 4, 0]} />
            <Bar dataKey="operatingMargin" name="هامش التشغيلي" fill="#d97706" radius={[0, 4, 4, 0]} />
            <Bar dataKey="netMargin" name="هامش صافي الربح" fill="#0d9488" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ExpenseChart({ groups }: { groups: ReturnType<typeof groupByCompany> }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">توزيع المصروفات</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, idx) => {
            const latest = group.datasets[group.datasets.length - 1];
            if (!latest) return null;
            const pieData = EXPENSE_BREAKDOWN.map((exp) => ({
              name: exp.labelAr,
              value: Math.abs(latest.data[exp.key] || 0),
            })).filter((d) => d.value > 0);

            return (
              <div key={group.name} className="text-center">
                <h4 className="mb-2 text-sm font-bold" style={{ color: COMPANY_COLORS[idx % COMPANY_COLORS.length] }}>
                  {group.name}
                  <span className="font-normal opacity-60 mr-1">({latest.period})</span>
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCompact(v)} />
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

function RadarView({ groups }: { groups: ReturnType<typeof groupByCompany> }) {
  if (groups.length < 2) return (
    <Card>
      <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
        تحتاج شركتان على الأقل لعرض مقارنة الرادار
      </CardContent>
    </Card>
  );

  const radarData = KEY_METRICS.map((metric) => {
    const item: Record<string, string | number> = { metric: metric.labelAr };
    const maxVal = Math.max(...groups.map((g) => Math.abs(g.datasets[g.datasets.length - 1]?.data[metric.key] || 0)), 1);
    groups.forEach((group) => {
      const latest = group.datasets[group.datasets.length - 1];
      const val = latest?.data[metric.key] || 0;
      item[group.name] = +((Math.abs(val) / maxVal) * 100).toFixed(1);
    });
    return item;
  });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">مقارنة شاملة (رادار)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            {groups.map((group, idx) => (
              <Radar key={group.name} name={group.name} dataKey={group.name}
                stroke={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
                fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]} fillOpacity={0.12} strokeWidth={2} />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TrendChart({ groups }: { groups: ReturnType<typeof groupByCompany> }) {
  const groupsWithMultiple = groups.filter((g) => g.datasets.length > 1);

  if (groupsWithMultiple.length === 0) return (
    <Card>
      <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
        تحتاج فترتان على الأقل لكل شركة لعرض التحليل الترندي
      </CardContent>
    </Card>
  );

  const trendData = groupsWithMultiple[0]?.datasets.map((ds, idx) => {
    const item: Record<string, string | number> = { period: ds.period };
    groupsWithMultiple.forEach((group) => {
      if (group.datasets[idx]) {
        item[group.name] = group.datasets[idx].data['revenue'] || 0;
        item[`${group.name}_net`] = group.datasets[idx].data['net_income'] || 0;
      }
    });
    return item;
  }) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">تطور الإيرادات عبر الفترات</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCompact(value)} />
              <Legend />
              {groupsWithMultiple.map((group, idx) => (
                <Line key={group.name} type="monotone" dataKey={group.name} name={`${group.name} - إيرادات`}
                  stroke={COMPANY_COLORS[idx % COMPANY_COLORS.length]} strokeWidth={2.5}
                  dot={{ r: 4, fill: COMPANY_COLORS[idx % COMPANY_COLORS.length] }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">تطور صافي الدخل عبر الفترات</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCompact(value)} />
              <Legend />
              {groupsWithMultiple.map((group, idx) => (
                <Line key={`${group.name}_net`} type="monotone" dataKey={`${group.name}_net`} name={`${group.name} - صافي الدخل`}
                  stroke={COMPANY_COLORS[idx % COMPANY_COLORS.length]} strokeWidth={2.5} strokeDasharray="5 5"
                  dot={{ r: 4, fill: COMPANY_COLORS[idx % COMPANY_COLORS.length] }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function PnLCharts({ forceTrends }: { forceTrends?: boolean } = {}) {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض الرسوم البيانية</h3>
        </CardContent>
      </Card>
    );
  }

  // If forceTrends, directly render trend charts
  if (forceTrends) {
    return <TrendChart groups={groups} />;
  }

  return (
    <Tabs defaultValue="metrics">
      <TabsList className="mb-4 grid w-full grid-cols-5">
        <TabsTrigger value="metrics">المؤشرات</TabsTrigger>
        <TabsTrigger value="margins">الهوامش</TabsTrigger>
        <TabsTrigger value="expenses">المصروفات</TabsTrigger>
        <TabsTrigger value="radar">رادار</TabsTrigger>
        <TabsTrigger value="trends">ترند</TabsTrigger>
      </TabsList>
      <TabsContent value="metrics"><KeyMetricsChart groups={groups} /></TabsContent>
      <TabsContent value="margins"><MarginChart groups={groups} /></TabsContent>
      <TabsContent value="expenses"><ExpenseChart groups={groups} /></TabsContent>
      <TabsContent value="radar"><RadarView groups={groups} /></TabsContent>
      <TabsContent value="trends"><TrendChart groups={groups} /></TabsContent>
    </Tabs>
  );
}
