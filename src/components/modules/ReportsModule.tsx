'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table2, BarChart3, GitCompareArrows, Calculator, CalendarDays, ArrowUpDown, Layers, AlertTriangle, LineChart, TrendingUp, BookOpen, Loader2, FileText, Database } from 'lucide-react';
import { PageActions } from '@/components/system/PageActions';
import { toast } from 'sonner';
import {
  ResponsiveContainer, BarChart, Bar, LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area,
} from 'recharts';

interface PnLDatum {
  id: string; companyId: string; companyName: string; companyColor: string;
  period: string; periodType: string; currency: string; source: string;
  valuesByItem: { key: string; name: string; nameAr: string; value: number; section: string; sectionType: string; category: string; isTotal: boolean; isSubtotal: boolean }[];
}

const BRAND = '#4CAF50';
const CHART_COLORS = ['#4CAF50', '#0D9488', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#EA580C', '#DB2777'];

// ============ Helper functions for financial math ============

function getValue(values: PnLDatum['valuesByItem'], keyMatch: string | string[]): number {
  const keys = Array.isArray(keyMatch) ? keyMatch : [keyMatch];
  for (const v of values) {
    if (keys.some(k => v.key.includes(k) || v.name.toLowerCase().includes(k.toLowerCase()))) return v.value;
  }
  return 0;
}

function sumBySection(values: PnLDatum['valuesByItem'], sectionType: string): number {
  return values.filter(v => v.sectionType === sectionType).reduce((s, v) => s + v.value, 0);
}

function formatNumber(n: number, currency = 'SAR') {
  if (n === 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B ${currency}`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M ${currency}`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K ${currency}`;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
}

export function ReportsModule() {
  const [data, setData] = useState<PnLDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pnl-data');
      const d = await res.json();
      setData(d.data || []);
      // Auto-select first company + first period
      const companyIds = [...new Set((d.data || []).map((x: PnLDatum) => x.companyId))];
      const periods = [...new Set((d.data || []).map((x: PnLDatum) => x.period))].sort();
      setSelectedCompanies(companyIds.slice(0, 3));
      setSelectedPeriods(periods);
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered data based on selections
  const filtered = useMemo(() => data.filter(d => selectedCompanies.includes(d.companyId)), [data, selectedCompanies]);
  const companies = useMemo(() => [...new Set(data.map(d => ({ id: d.companyId, name: d.companyName, color: d.companyColor })))], [data]);
  const periods = useMemo(() => [...new Set(data.map(d => d.period))].sort(), [data]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">لا توجد بيانات P&L بعد</p>
          <p className="text-sm mt-1">ارفع بيانات Excel أو أدخلها يدوياً من قسم "بيانات P&L"</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold">التقارير</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ملخص تنفيذي، جداول، نسب مالية، مقارنات، تحليل انحرافات، تنبؤات ورسوم بيانية
          </p>
        </div>
        <PageActions onRefresh={load} />
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">الشركات</label>
              <div className="flex flex-wrap gap-2">
                {companies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCompanies(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCompanies.includes(c.id) ? 'text-white' : 'bg-white dark:bg-slate-900 hover:border-current'
                    }`}
                    style={selectedCompanies.includes(c.id) ? { backgroundColor: c.color, borderColor: c.color } : { borderColor: c.color, color: c.color }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">الفترات</label>
              <div className="flex flex-wrap gap-2">
                {periods.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedPeriods.includes(p) ? 'bg-[#4CAF50] text-white border-[#4CAF50]' : 'bg-white dark:bg-slate-900 hover:border-[#4CAF50]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="summary"><FileText className="w-3.5 h-3.5 ml-1" /> ملخص تنفيذي</TabsTrigger>
          <TabsTrigger value="table"><Table2 className="w-3.5 h-3.5 ml-1" /> جدول</TabsTrigger>
          <TabsTrigger value="ratios"><Calculator className="w-3.5 h-3.5 ml-1" /> نسب مالية</TabsTrigger>
          <TabsTrigger value="comparison"><GitCompareArrows className="w-3.5 h-3.5 ml-1" /> مقارنة</TabsTrigger>
          <TabsTrigger value="mom"><CalendarDays className="w-3.5 h-3.5 ml-1" /> شهرية</TabsTrigger>
          <TabsTrigger value="yoy"><ArrowUpDown className="w-3.5 h-3.5 ml-1" /> سنوية</TabsTrigger>
          <TabsTrigger value="variance"><AlertTriangle className="w-3.5 h-3.5 ml-1" /> انحرافات</TabsTrigger>
          <TabsTrigger value="charts"><BarChart3 className="w-3.5 h-3.5 ml-1" /> رسوم</TabsTrigger>
          <TabsTrigger value="glossary"><BookOpen className="w-3.5 h-3.5 ml-1" /> مصطلحات</TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><ExecutiveSummary data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="table"><PnLTable data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="ratios"><FinancialRatios data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="comparison"><PnLComparison data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="mom"><MoMComparison data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="yoy"><YoYComparison data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="variance"><VarianceAnalysis data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="charts"><ChartsTab data={filtered} periods={selectedPeriods} /></TabsContent>
        <TabsContent value="glossary"><GlossaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ Executive Summary ============
function ExecutiveSummary({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  const summary = data.map(d => {
    const revenue = sumBySection(d.valuesByItem, 'INCOME');
    const expenses = sumBySection(d.valuesByItem, 'EXPENSE');
    const profit = sumBySection(d.valuesByItem, 'PROFIT');
    const netIncome = getValue(d.valuesByItem, ['net_income']);
    return {
      company: d.companyName,
      color: d.companyColor,
      period: d.period,
      revenue,
      expenses,
      profit,
      netIncome: netIncome || (revenue - expenses),
      margin: revenue ? ((netIncome || (revenue - expenses)) / revenue * 100) : 0,
    };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((s, i) => (
          <Card key={i} style={{ borderTop: `3px solid ${s.color}` }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{s.company}</div>
                <Badge variant="outline" className="text-[10px]">{s.period}</Badge>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">الإيرادات</span><span className="font-medium">{formatNumber(s.revenue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المصروفات</span><span className="font-medium text-red-600">{formatNumber(s.expenses)}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">صافي الدخل</span><span className={`font-bold ${s.netIncome >= 0 ? 'text-[#4CAF50]' : 'text-red-600'}`}>{formatNumber(s.netIncome)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الهامش</span><span className="font-medium">{s.margin.toFixed(1)}%</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ P&L Table ============
function PnLTable({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  if (data.length === 0) return <div className="text-center py-8 text-muted-foreground">اختر شركة واحدة على الأقل</div>;

  // Get all unique line items from the first dataset (assume all have similar structure)
  const allItems = data[0]?.valuesByItem || [];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="text-right p-3 font-medium sticky right-0 bg-slate-50 dark:bg-slate-900">البند</th>
                {data.map(d => (
                  <th key={d.id} className="text-right p-3 font-medium min-w-[120px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.companyColor }} />
                      <span>{d.companyName}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal">{d.period}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, i) => (
                <tr key={i} className={`border-t ${item.isTotal || item.isSubtotal ? 'bg-slate-50 dark:bg-slate-900/50 font-semibold' : ''}`}>
                  <td className="p-3 sticky right-0 bg-white dark:bg-slate-900">
                    <div style={{ paddingRight: `${(item.section ? 0 : 0) + 8}px` }} className={item.isTotal ? 'border-r-2 border-[#4CAF50] pr-2' : ''}>
                      {item.nameAr}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{item.section} / {item.category}</div>
                  </td>
                  {data.map(d => {
                    const v = d.valuesByItem.find(x => x.key === item.key);
                    return <td key={d.id} className={`p-3 font-mono text-xs ${item.isTotal || item.isSubtotal ? 'font-bold' : ''}`}>{v ? formatNumber(v.value) : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Financial Ratios ============
function FinancialRatios({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  const ratios = data.map(d => {
    const revenue = sumBySection(d.valuesByItem, 'INCOME');
    const expenses = sumBySection(d.valuesByItem, 'EXPENSE');
    const cogs = getValue(d.valuesByItem, ['cost_of_goods_sold', 'cost_of_sales']);
    const grossProfit = revenue - cogs;
    const netIncome = getValue(d.valuesByItem, ['net_income']) || (revenue - expenses);
    const operatingIncome = getValue(d.valuesByItem, ['operating_income', 'ebit']) || grossProfit - expenses;

    return {
      company: d.companyName,
      color: d.companyColor,
      period: d.period,
      grossMargin: revenue ? (grossProfit / revenue * 100) : 0,
      operatingMargin: revenue ? (operatingIncome / revenue * 100) : 0,
      netMargin: revenue ? (netIncome / revenue * 100) : 0,
      expenseRatio: revenue ? (expenses / revenue * 100) : 0,
      cogsRatio: revenue ? (cogs / revenue * 100) : 0,
    };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ratios.map((r, i) => (
        <Card key={i} style={{ borderTop: `3px solid ${r.color}` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{r.company}</span>
              <Badge variant="outline" className="text-[10px]">{r.period}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <RatioRow label="هامش الربح الإجمالي" value={r.grossMargin} good={r.grossMargin > 30} />
            <RatioRow label="هامش الربح التشغيلي" value={r.operatingMargin} good={r.operatingMargin > 15} />
            <RatioRow label="هامش صافي الربح" value={r.netMargin} good={r.netMargin > 10} />
            <RatioRow label="نسبة المصروفات" value={r.expenseRatio} good={r.expenseRatio < 50} inverted />
            <RatioRow label="نسبة تكلفة المبيعات" value={r.cogsRatio} good={r.cogsRatio < 70} inverted />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RatioRow({ label, value, good, inverted }: { label: string; value: number; good: boolean; inverted?: boolean }) {
  const isGood = inverted ? value < (100 - (100 - value)) : good;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={isGood ? 'default' : 'destructive'} className={isGood ? 'bg-[#4CAF50] text-[10px]' : 'text-[10px]'}>
        {value.toFixed(1)}%
      </Badge>
    </div>
  );
}

// ============ Comparison ============
function PnLComparison({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  if (data.length < 2) return <div className="text-center py-8 text-muted-foreground">اختر شركتين على الأقل للمقارنة</div>;

  const chartData = data[0].valuesByItem.filter(i => i.isTotal || i.isSubtotal).slice(0, 8).map(item => {
    const row: any = { name: item.nameAr };
    data.forEach(d => {
      const v = d.valuesByItem.find(x => x.key === item.key);
      row[d.companyName] = v ? v.value : 0;
    });
    return row;
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">مقارنة بين الشركات</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatNumber(v)} />
            <Legend />
            {data.map((d, i) => (
              <Bar key={d.id} dataKey={d.companyName} fill={d.companyColor || CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ============ MoM Comparison ============
function MoMComparison({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  // Group by company, sort by period
  const grouped: Record<string, PnLDatum[]> = {};
  data.forEach(d => {
    if (!grouped[d.companyId]) grouped[d.companyId] = [];
    grouped[d.companyId].push(d);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cid, items]) => {
        const sorted = items.sort((a, b) => a.period.localeCompare(b.period));
        const chartData = sorted.map(d => ({
          period: d.period,
          revenue: sumBySection(d.valuesByItem, 'INCOME'),
          expenses: sumBySection(d.valuesByItem, 'EXPENSE'),
          netIncome: getValue(d.valuesByItem, ['net_income']) || (sumBySection(d.valuesByItem, 'INCOME') - sumBySection(d.valuesByItem, 'EXPENSE')),
        }));
        return (
          <Card key={cid}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: items[0].companyColor }} />
                {items[0].companyName} — اتجاه شهري
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#4CAF50" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" name="المصروفات" stroke="#DC2626" strokeWidth={2} />
                  <Line type="monotone" dataKey="netIncome" name="صافي الدخل" stroke="#0D9488" strokeWidth={2} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ YoY Comparison ============
function YoYComparison({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  // Group by company and year
  const grouped: Record<string, PnLDatum[]> = {};
  data.forEach(d => {
    const year = d.period.split('-')[0].split(' ').pop() || d.period;
    const key = `${d.companyId}|${year}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([key, items]) => {
        const [cid] = key.split('|');
        const total = items.reduce((acc, d) => {
          acc.revenue += sumBySection(d.valuesByItem, 'INCOME');
          acc.expenses += sumBySection(d.valuesByItem, 'EXPENSE');
          acc.netIncome += getValue(d.valuesByItem, ['net_income']) || (sumBySection(d.valuesByItem, 'INCOME') - sumBySection(d.valuesByItem, 'EXPENSE'));
          return acc;
        }, { revenue: 0, expenses: 0, netIncome: 0 });

        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: items[0].companyColor }} />
                  {items[0].companyName}
                </div>
                <Badge variant="outline">{key.split('|')[1]} ({items.length} فترات)</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center p-2 bg-[#4CAF50]/5 rounded">
                  <div className="text-xs text-muted-foreground">إجمالي الإيرادات</div>
                  <div className="font-bold">{formatNumber(total.revenue)}</div>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded">
                  <div className="text-xs text-muted-foreground">إجمالي المصروفات</div>
                  <div className="font-bold text-red-600">{formatNumber(total.expenses)}</div>
                </div>
                <div className="text-center p-2 bg-[#0D9488]/5 rounded">
                  <div className="text-xs text-muted-foreground">صافي الدخل</div>
                  <div className={`font-bold ${total.netIncome >= 0 ? 'text-[#4CAF50]' : 'text-red-600'}`}>{formatNumber(total.netIncome)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ Variance Analysis ============
function VarianceAnalysis({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  // For each company, find anomalies: items where value differs significantly from average
  const grouped: Record<string, PnLDatum[]> = {};
  data.forEach(d => {
    if (!grouped[d.companyId]) grouped[d.companyId] = [];
    grouped[d.companyId].push(d);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cid, items]) => {
        if (items.length < 2) return null;
        // Compare last period vs previous
        const sorted = items.sort((a, b) => a.period.localeCompare(b.period));
        const last = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        const anomalies = last.valuesByItem
          .map(item => {
            const prevVal = prev.valuesByItem.find(x => x.key === item.key)?.value || 0;
            const change = item.value - prevVal;
            const pct = prevVal ? (change / Math.abs(prevVal) * 100) : 0;
            return { ...item, prevVal, change, pct, abs: Math.abs(change) };
          })
          .filter(x => x.abs > 0 && (Math.abs(x.pct) > 20 || x.abs > 1000))
          .sort((a, b) => b.abs - a.abs)
          .slice(0, 8);

        return (
          <Card key={cid}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: items[0].companyColor }} />
                {items[0].companyName} — تحليل الانحرافات ({prev.period} ← {last.period})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs">
                    <tr>
                      <th className="text-right p-3">البند</th>
                      <th className="text-right p-3">السابق</th>
                      <th className="text-right p-3">الحالي</th>
                      <th className="text-right p-3">التغير</th>
                      <th className="text-right p-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((a, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{a.nameAr}</td>
                        <td className="p-3 font-mono text-xs">{formatNumber(a.prevVal)}</td>
                        <td className="p-3 font-mono text-xs">{formatNumber(a.value)}</td>
                        <td className={`p-3 font-mono text-xs ${a.change > 0 ? 'text-red-600' : 'text-[#4CAF50]'}`}>
                          {a.change > 0 ? '+' : ''}{formatNumber(a.change)}
                        </td>
                        <td className="p-3">
                          <Badge variant={a.change > 0 ? 'destructive' : 'default'} className={a.change < 0 ? 'bg-[#4CAF50] text-[10px]' : 'text-[10px]'}>
                            {a.pct > 0 ? '+' : ''}{a.pct.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {anomalies.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا توجد انحرافات كبيرة</div>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ Charts ============
function ChartsTab({ data, periods }: { data: PnLDatum[]; periods: string[] }) {
  // Pie chart - expense distribution for first company
  const first = data[0];
  const expenseByCategory = first ? first.valuesByItem
    .filter(v => v.sectionType === 'EXPENSE')
    .reduce((acc, v) => {
      const existing = acc.find(x => x.name === v.category);
      if (existing) existing.value += v.value;
      else acc.push({ name: v.category, value: v.value });
      return acc;
    }, [] as { name: string; value: number }[]) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">توزيع المصروفات — {first?.companyName}</CardTitle></CardHeader>
        <CardContent>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatNumber(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">صافي الدخل عبر الفترات</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.map(d => ({
              period: d.period,
              value: getValue(d.valuesByItem, ['net_income']) || (sumBySection(d.valuesByItem, 'INCOME') - sumBySection(d.valuesByItem, 'EXPENSE')),
              name: d.companyName,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatNumber(v)} />
              <Area type="monotone" dataKey="value" stroke="#4CAF50" fill="#4CAF5040" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Glossary ============
function GlossaryTab() {
  const terms = [
    { ar: 'الإيرادات', en: 'Revenue', desc: 'إجمالي المبالغ المحصلة من المبيعات والخدمات قبل أي خصومات' },
    { ar: 'تكلفة البضاعة المباعة', en: 'COGS', desc: 'التكلفة المباشرة للمنتجات أو الخدمات المباعة' },
    { ar: 'إجمالي الربح', en: 'Gross Profit', desc: 'الإيرادات ناقص تكلفة البضاعة المباعة' },
    { ar: 'المصروفات التشغيلية', en: 'Operating Expenses', desc: 'تكاليف التشغيل اليومي بما فيها البيع والإدارة' },
    { ar: 'الدخل التشغيلي', en: 'EBIT', desc: 'الربح من العمليات قبل الفوائد والضرائب' },
    { ar: 'صافي الدخل', en: 'Net Income', desc: 'الربح النهائي بعد جميع التكاليف والضرائب' },
    { ar: 'هامش الربح الإجمالي', en: 'Gross Margin', desc: '(إجمالي الربح / الإيرادات) × 100' },
    { ar: 'هامش صافي الربح', en: 'Net Margin', desc: '(صافي الدخل / الإيرادات) × 100' },
    { ar: 'مصروف مقدم', en: 'Prepaid Expense', desc: 'مصروف مدفوع مقدماً يوزع على عدة فترات مستقبلية' },
    { ar: 'تحليل الانحرافات', en: 'Variance Analysis', desc: 'مقارنة القيم الفعلية بالمتوقعة أو السابقة لتحديد الفروقات' },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#4CAF50]" /> دليل المصطلحات</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {terms.map(t => (
          <div key={t.en} className="p-3 border rounded-lg">
            <div className="font-semibold text-sm">{t.ar}</div>
            <div className="text-xs text-muted-foreground font-mono">{t.en}</div>
            <div className="text-xs mt-1">{t.desc}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
