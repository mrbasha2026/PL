'use client';

import React, { useState, useMemo } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Building2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Minus, Search, Filter, BarChart3, LineChart as LineChartIcon, TableIcon,
  ArrowUpDown,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getAllLineItems,
  getLineItemKey,
  COMPANY_COLORS,
  groupByCompany,
  formatNumber,
  formatCompact,
  formatPercentage,
  periodToArabic,
  calcGrowth,
  sortPeriods,
  CompanyGroup,
} from '@/lib/pnl-types';


// ─── Category filter options ────────────────────────────────────────────────
type CategoryFilter = 'all' | 'revenue' | 'expense' | 'profit';
type ViewMode = 'chart' | 'table' | 'both';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'الكل',
  revenue: 'الإيرادات',
  expense: 'المصروفات',
  profit: 'الأرباح',
};

// ─── Detail table for a single line item across periods ──────────────────────
function LineItemDetailTable({
  itemKey,
  itemAr,
  itemEn,
  groups,
}: {
  itemKey: string;
  itemAr: string;
  itemEn: string;
  groups: CompanyGroup[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/10">
            <TableHead className="text-xs font-bold">الشركة</TableHead>
            {groups[0]?.datasets.map((ds) => (
              <TableHead key={ds.period} className="text-center text-xs font-medium min-w-[110px]">
                {periodToArabic(ds.period)}
              </TableHead>
            ))}
            <TableHead className="text-center text-xs font-bold bg-emerald-50/50">الإجمالي</TableHead>
            <TableHead className="text-center text-xs font-bold bg-amber-50/50">المتوسط</TableHead>
            <TableHead className="text-center text-xs font-bold bg-blue-50/50">التغير %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group, gIdx) => {
            const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
            const values = group.datasets.map((ds) => ds.data[itemKey] || 0);
            const total = values.reduce((a, b) => a + b, 0);
            const avg = values.length > 0 ? total / values.length : 0;
            const firstVal = values[0] || 0;
            const lastVal = values[values.length - 1] || 0;
            const overallChange = firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : null;

            return (
              <TableRow key={group.name} className="hover:bg-muted/5">
                <TableCell className="font-medium text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {group.name}
                  </div>
                </TableCell>
                {group.datasets.map((ds, i) => {
                  const val = ds.data[itemKey] || 0;
                  const prevVal = i > 0 ? (group.datasets[i - 1]?.data[itemKey] || 0) : null;
                  const change = prevVal !== null && prevVal !== 0
                    ? ((val - prevVal) / Math.abs(prevVal)) * 100
                    : null;

                  return (
                    <TableCell key={ds.period} className="text-center tabular-nums text-sm">
                      <div>{formatNumber(val, ds.currency, false)}</div>
                      {change !== null && (
                        <div className={`text-[10px] font-medium ${
                          change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </div>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center tabular-nums text-sm font-bold bg-emerald-50/20">
                  {formatNumber(total, groups[0].datasets[0]?.currency || 'SAR', false)}
                </TableCell>
                <TableCell className="text-center tabular-nums text-sm bg-amber-50/20">
                  {formatNumber(Math.round(avg), groups[0].datasets[0]?.currency || 'SAR', false)}
                </TableCell>
                <TableCell className="text-center bg-blue-50/20">
                  {overallChange !== null ? (
                    <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${
                      overallChange > 0 ? 'text-emerald-600' : overallChange < 0 ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {overallChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : overallChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {Math.abs(overallChange).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Chart view for a single line item ──────────────────────────────────────
function LineItemChart({
  itemKey,
  itemAr,
  groups,
  chartType,
}: {
  itemKey: string;
  itemAr: string;
  groups: CompanyGroup[];
  chartType: 'bar' | 'line';
}) {
  // Build chart data: one entry per period with each company's value
  const allPeriods = sortPeriods([...new Set(groups.flatMap((g) => g.datasets.map((d) => d.period)))]);

  const chartData = allPeriods.map((period) => {
    const item: Record<string, string | number> = { period: periodToArabic(period) };
    groups.forEach((group) => {
      const ds = group.datasets.find((d) => d.period === period);
      item[group.name] = ds ? (ds.data[itemKey] || 0) : 0;
    });
    return item;
  });

  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ChartComponent data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => formatCompact(value)} />
        <Legend />
        {groups.map((group, idx) =>
          chartType === 'bar' ? (
            <Bar
              key={group.name}
              dataKey={group.name}
              fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ) : (
            <Line
              key={group.name}
              type="monotone"
              dataKey={group.name}
              stroke={COMPANY_COLORS[idx % COMPANY_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: COMPANY_COLORS[idx % COMPANY_COLORS.length] }}
            />
          )
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function LineItemExplorer() {
  const { getFiltered, companies } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [searchText, setSearchText] = useState('');

  // Get all line items (standard + custom)
  const allLineItems = useMemo(() => getAllLineItems(companies), [companies]);

  // Filter line items by category and search
  const filteredItems = useMemo(() => {
    let items = allLineItems;
    if (categoryFilter !== 'all') {
      items = items.filter((item) => item.category === categoryFilter);
    }
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.nameAr.includes(searchText.trim()) ||
          item.name.toLowerCase().includes(search) ||
          getLineItemKey(item.name).includes(search)
      );
    }
    return items;
  }, [allLineItems, categoryFilter, searchText]);

  // Auto-select first item if none selected
  React.useEffect(() => {
    if (!selectedItemKey && filteredItems.length > 0) {
      const firstKey = filteredItems[0].isCustom
        ? filteredItems[0].name
        : getLineItemKey(filteredItems[0].name);
      setSelectedItemKey(firstKey);
    }
  }, [filteredItems, selectedItemKey]);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            اختر بيانات لعرض حركات البنود المالية
          </h3>
        </CardContent>
      </Card>
    );
  }

  // Selected item details
  const selectedItem = allLineItems.find((item) =>
    item.isCustom ? item.name === selectedItemKey : getLineItemKey(item.name) === selectedItemKey
  );

  // Category counts for badges
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, revenue: 0, expense: 0, profit: 0 };
    allLineItems.forEach((item) => {
      counts.all++;
      counts[item.category]++;
    });
    return counts;
  }, [allLineItems]);

  return (
    <div className="space-y-4">
      {/* ─── Top controls ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Search + Category filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن بند مالي..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-lg border bg-background px-4 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(['all', 'revenue', 'expense', 'profit'] as CategoryFilter[]).map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1 text-xs h-7 ${
                    categoryFilter === cat
                      ? cat === 'revenue'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : cat === 'expense'
                          ? 'bg-red-500 hover:bg-red-600'
                          : cat === 'profit'
                            ? 'bg-teal-600 hover:bg-teal-700'
                            : 'bg-slate-700 hover:bg-slate-800'
                      : ''
                  }`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                  <span className="opacity-70">({categoryCounts[cat]})</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Line item selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">البند المالي:</span>
            <Select
              value={selectedItemKey || ''}
              onValueChange={(val) => setSelectedItemKey(val)}
            >
              <SelectTrigger className="w-full max-w-md text-sm">
                <SelectValue placeholder="اختر بنداً مالياً" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredItems.map((item) => {
                  const key = item.isCustom ? item.name : getLineItemKey(item.name);
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            item.category === 'revenue'
                              ? 'bg-emerald-500'
                              : item.category === 'expense'
                                ? 'bg-red-400'
                                : 'bg-teal-500'
                          }`}
                        />
                        <span>{item.nameAr}</span>
                        <span className="text-muted-foreground text-xs">({item.name})</span>
                        {item.isCustom && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">مخصص</Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 mr-auto">
              <span className="text-xs text-muted-foreground ml-2">العرض:</span>
              <Button
                variant={viewMode === 'chart' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('chart')}
                title="رسم بياني فقط"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('table')}
                title="جدول فقط"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'both' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('both')}
                title="رسم + جدول"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>

              {viewMode !== 'table' && (
                <>
                  <span className="text-xs text-muted-foreground mx-1">|</span>
                  <Button
                    variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setChartType('bar')}
                  >
                    <BarChart3 className="h-3 w-3" />
                    أعمدة
                  </Button>
                  <Button
                    variant={chartType === 'line' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setChartType('line')}
                  >
                    <LineChartIcon className="h-3 w-3" />
                    خطي
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Selected item detail ──────────────────────────────────── */}
      {selectedItem && selectedItemKey && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className={`h-3 w-3 rounded-full ${
                  selectedItem.category === 'revenue'
                    ? 'bg-emerald-500'
                    : selectedItem.category === 'expense'
                      ? 'bg-red-400'
                      : 'bg-teal-500'
                }`}
              />
              <span>{selectedItem.nameAr}</span>
              <span className="text-sm font-normal text-muted-foreground">({selectedItem.name})</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  selectedItem.category === 'revenue'
                    ? 'border-emerald-300 text-emerald-700'
                    : selectedItem.category === 'expense'
                      ? 'border-red-300 text-red-600'
                      : 'border-teal-300 text-teal-700'
                }`}
              >
                {CATEGORY_LABELS[selectedItem.category]}
              </Badge>
              {selectedItem.isCustom && (
                <Badge variant="secondary" className="text-[10px]">مخصص</Badge>
              )}
              {selectedItem.description && (
                <span className="text-xs text-muted-foreground font-normal max-w-md truncate">
                  — {selectedItem.description.split('—')[0]?.trim()}
                </span>
              )}
            </CardTitle>

            {/* Quick summary stats */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {groups.map((group, gIdx) => {
                const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                const values = group.datasets.map((ds) => ds.data[selectedItemKey] || 0);
                const total = values.reduce((a, b) => a + b, 0);
                const latest = values[values.length - 1] || 0;
                const first = values[0] || 0;
                const change = first !== 0 ? ((latest - first) / Math.abs(first)) * 100 : null;
                const revenue = group.datasets[group.datasets.length - 1]?.data['revenue'] || 0;
                const pctOfRevenue = revenue !== 0 ? (latest / revenue) * 100 : null;

                return (
                  <div
                    key={group.name}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                    style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-bold" style={{ color }}>{group.name}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-xs font-medium tabular-nums">
                      {formatNumber(latest, 'SAR')}
                    </span>
                    {pctOfRevenue !== null && (
                      <span className="text-[10px] text-muted-foreground">
                        ({pctOfRevenue.toFixed(1)}% من الإيرادات)
                      </span>
                    )}
                    {change !== null && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                          change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        {change > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : change < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Chart */}
            {viewMode !== 'table' && (
              <LineItemChart
                itemKey={selectedItemKey}
                itemAr={selectedItem.nameAr}
                groups={groups}
                chartType={chartType}
              />
            )}

            {/* Detail table */}
            {viewMode !== 'chart' && (
              <LineItemDetailTable
                itemKey={selectedItemKey}
                itemAr={selectedItem.nameAr}
                itemEn={selectedItem.name}
                groups={groups}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Quick browse: all items as clickable cards ────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            استعراض سريع للبنود المالية
            <Badge variant="outline" className="text-[10px]">{filteredItems.length} بند</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const key = item.isCustom ? item.name : getLineItemKey(item.name);
              const isSelected = key === selectedItemKey;
              const latestVals = groups.map((g) => {
                const ds = g.datasets[g.datasets.length - 1];
                return ds ? (ds.data[key] || 0) : 0;
              });
              const totalVal = latestVals.reduce((a, b) => a + b, 0);
              const firstVals = groups.map((g) => {
                const ds = g.datasets[0];
                return ds ? (ds.data[key] || 0) : 0;
              });
              const totalFirst = firstVals.reduce((a, b) => a + b, 0);
              const change = totalFirst !== 0 ? ((totalVal - totalFirst) / Math.abs(totalFirst)) * 100 : null;

              return (
                <button
                  key={key}
                  onClick={() => setSelectedItemKey(key)}
                  className={`text-right rounded-lg border p-3 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50/50 ring-2 ring-teal-400/30 shadow-sm'
                      : 'border-muted hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            item.category === 'revenue'
                              ? 'bg-emerald-500'
                              : item.category === 'expense'
                                ? 'bg-red-400'
                                : 'bg-teal-500'
                          }`}
                        />
                        <span className="text-sm font-medium truncate">{item.nameAr}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.name}</p>
                    </div>
                    {change !== null && (
                      <span
                        className={`shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold ${
                          change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        {change > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : change < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-base font-bold tabular-nums">
                      {formatNumber(totalVal, 'SAR')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {groups.length === 1
                        ? periodToArabic(groups[0].datasets[groups[0].datasets.length - 1]?.period || '')
                        : `${groups.length} شركات`}
                    </span>
                  </div>
                  {item.isSubtotal || item.isTotal ? (
                    <Badge variant="outline" className="text-[9px] mt-1 h-4 px-1">
                      {item.isTotal ? 'إجمالي' : 'فرعي'}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
