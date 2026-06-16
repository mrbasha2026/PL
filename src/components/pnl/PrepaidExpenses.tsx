'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Plus, Pencil, Trash2, Search, Filter, X,
  Wallet, Calendar, TrendingUp, TrendingDown, PieChart,
  BarChart3, Clock, CheckCircle2, AlertCircle, Coins,
  LayoutGrid, CalendarRange, FileBarChart,
} from 'lucide-react';
import {
  usePrepaidStore,
  type PrepaidCompany,
  type PrepaidExpense,
  type PrepaidCategory,
  type PrepaidStatus,
  PREPAID_CATEGORIES,
  PREPAID_STATUSES,
  PREPAID_COMPANY_COLORS,
  getCategoryInfo,
  getStatusInfo,
  monthsBetween,
  getMonthlyInstallment,
  getConsumedInfo,
} from '@/lib/prepaid-store';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatSAR(n: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function formatDateAr(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function PrepaidExpenses() {
  const {
    companies, expenses,
    selectedCompanyId, searchQuery, filterCategory, filterStatus, filterYear,
    setSelectedCompany, setSearchQuery, setFilterCategory, setFilterStatus, setFilterYear,
    getFilteredExpenses, getExpenseCountByCompany,
    deleteCompany, deleteExpense,
  } = usePrepaidStore();

  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<PrepaidCompany | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PrepaidExpense | null>(null);

  // Depend on the underlying state so the memo recomputes when filters/data change.
  // (Zustand action references are stable, so they alone won't trigger recomputation.)
  const filteredExpenses = useMemo(
    () => getFilteredExpenses(),
    [getFilteredExpenses, expenses, selectedCompanyId, searchQuery, filterCategory, filterStatus, filterYear]
  );

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    expenses.forEach((e) => {
      set.add(new Date(e.startDate).getFullYear());
      set.add(new Date(e.endDate).getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [expenses]);

  const totalCount = expenses.length;
  const totalAmount = expenses.reduce((s, e) => s + e.totalAmount, 0);
  const totalMonthly = expenses
    .filter((e) => e.status === 'active')
    .reduce((s, e) => s + getMonthlyInstallment(e.totalAmount, e.monthsCount), 0);
  const totalConsumed = expenses.reduce((s, e) => s + getConsumedInfo(e).consumed, 0);
  const totalRemaining = expenses.reduce((s, e) => s + getConsumedInfo(e).remaining, 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 dark:border-emerald-500/25 bg-gradient-to-bl from-emerald-500/5 via-transparent to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 p-6">
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-emerald-500/8 blur-2xl" />
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-teal-500/8 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">تتبع المصروفات المقدمة</h2>
              <p className="text-sm text-muted-foreground mt-1">
                إدارة المصروفات المدفوعة مسبقاً وتوزيعها على الفترات المحاسبية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs h-9"
              onClick={() => { setEditingCompany(null); setCompanyDialogOpen(true); }}
            >
              <Building2 className="h-3.5 w-3.5" />
              شركة جديدة
            </Button>
            <Button
              size="sm"
              className="gap-1.5 rounded-xl text-xs h-9 bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              onClick={() => { setEditingExpense(null); setExpenseDialogOpen(true); }}
              disabled={companies.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              مصروف مقدم جديد
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Wallet} label="إجمالي المصروفات" value={formatSAR(totalAmount)} color="emerald" />
          <StatCard icon={Calendar} label="القسط الشهري (نشط)" value={formatSAR(totalMonthly)} color="sky" />
          <StatCard icon={TrendingDown} label="المستهلك" value={formatSAR(totalConsumed)} color="amber" />
          <StatCard icon={TrendingUp} label="المتبقي" value={formatSAR(totalRemaining)} color="violet" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar: Companies */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">الشركات</h3>
                <Badge variant="outline" className="text-[10px] rounded-md">{companies.length}</Badge>
              </div>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => setSelectedCompany(null)}
                className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                  selectedCompanyId === null
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'text-foreground/70 hover:bg-muted/40 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  جميع الشركات
                </span>
                <span className="text-[10px] text-muted-foreground">{totalCount}</span>
              </button>
              {companies.length === 0 ? (
                <div className="text-center py-6 px-3">
                  <Building2 className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground mb-3">لا توجد شركات بعد</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 rounded-lg w-full"
                    onClick={() => { setEditingCompany(null); setCompanyDialogOpen(true); }}
                  >
                    <Plus className="h-3 w-3" />
                    إضافة شركة
                  </Button>
                </div>
              ) : (
                companies.map((c) => {
                  const count = getExpenseCountByCompany(c.id);
                  const isActive = selectedCompanyId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`group w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'hover:bg-muted/40 border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedCompany(c.id)}
                        className="flex-1 flex items-center justify-between gap-2 text-right min-w-0"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className={`truncate ${isActive ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{c.name}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{count}</span>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingCompany(c); setCompanyDialogOpen(true); }}
                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="تعديل"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`حذف "${c.name}"؟ سيتم حذف ${count} مصروف مرتبط.`)) deleteCompany(c.id);
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="حذف"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="space-y-4 min-w-0">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 text-xs rounded-xl pr-9"
                />
              </div>
              <FilterSelect
                value={filterCategory}
                onChange={(v) => setFilterCategory(v as PrepaidCategory | 'all')}
                options={[{ value: 'all', label: 'جميع التصنيفات' }, ...PREPAID_CATEGORIES.map((c) => ({ value: c.value, label: c.labelAr }))]}
              />
              <FilterSelect
                value={filterStatus}
                onChange={(v) => setFilterStatus(v as PrepaidStatus | 'all')}
                options={[{ value: 'all', label: 'جميع الحالات' }, ...PREPAID_STATUSES.map((s) => ({ value: s.value, label: s.labelAr }))]}
              />
              <FilterSelect
                value={filterYear}
                onChange={(v) => setFilterYear(v === 'all' ? 'all' : Number(v))}
                options={[{ value: 'all', label: 'كل السنوات' }, ...availableYears.map((y) => ({ value: y, label: String(y) }))]}
              />
              {(searchQuery || filterCategory !== 'all' || filterStatus !== 'all' || filterYear !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs gap-1 rounded-xl"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('all');
                    setFilterStatus('all');
                    setFilterYear('all');
                  }}
                >
                  <X className="h-3 w-3" />
                  مسح
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {expenses.length === 0 ? (
            <EmptyState onAdd={() => { setEditingExpense(null); setExpenseDialogOpen(true); }} hasCompanies={companies.length > 0} onAddCompany={() => { setEditingCompany(null); setCompanyDialogOpen(true); }} />
          ) : filteredExpenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 py-12 text-center">
              <Filter className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد نتائج مطابقة للفلتر</p>
            </div>
          ) : (
            <Tabs defaultValue="cards" className="w-full">
              <TabsList className="bg-muted/30 border border-border/40 rounded-2xl p-1 h-auto">
                <TabsTrigger value="cards" className="gap-1.5 rounded-xl text-xs px-3 py-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  المصروفات ({filteredExpenses.length})
                </TabsTrigger>
                <TabsTrigger value="monthly" className="gap-1.5 rounded-xl text-xs px-3 py-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                  <CalendarRange className="h-3.5 w-3.5" />
                  التوزيع الشهري
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5 rounded-xl text-xs px-3 py-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                  <FileBarChart className="h-3.5 w-3.5" />
                  التحليلات
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cards" className="mt-4">
                <ExpensesCardsList
                  expenses={filteredExpenses}
                  companies={companies}
                  onEdit={(e) => { setEditingExpense(e); setExpenseDialogOpen(true); }}
                  onDelete={(e) => { if (confirm(`حذف "${e.name}"؟`)) deleteExpense(e.id); }}
                />
              </TabsContent>

              <TabsContent value="monthly" className="mt-4">
                <MonthlyDistribution expenses={filteredExpenses} />
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <AnalyticsView expenses={filteredExpenses} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CompanyDialog
        open={companyDialogOpen}
        onClose={() => setCompanyDialogOpen(false)}
        editing={editingCompany}
      />
      <ExpenseDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        editing={editingExpense}
        companies={companies}
      />
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  };
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums tracking-tight truncate">{value}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: any; onChange: (v: any) => void; options: { value: any; label: string }[] }) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const numeric = options.find((o) => String(o.value) === raw && typeof o.value === 'number')?.value;
        onChange(numeric ?? (raw === 'all' ? 'all' : raw));
      }}
      className="h-9 text-xs rounded-xl border border-border/50 bg-background px-3 pr-3 pl-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}

function EmptyState({ onAdd, hasCompanies, onAddCompany }: { onAdd: () => void; hasCompanies: boolean; onAddCompany: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border/60 py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-emerald-500/8 flex items-center justify-center mx-auto mb-4">
        <Wallet className="h-8 w-8 text-emerald-500/60" />
      </div>
      <h3 className="text-base font-semibold mb-1">ابدأ بتتبع مصروفاتك المقدمة</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
        {hasCompanies
          ? 'أضف أول مصروف مقدم لتتبع توزيعه الشهري وحساب المستهلك والمتبقي تلقائياً'
          : 'أضف أولاً شركة، ثم ابدأ بإضافة المصروفات المقدمة المرتبطة بها'}
      </p>
      {hasCompanies ? (
        <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          مصروف مقدم جديد
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600" onClick={onAddCompany}>
          <Building2 className="h-4 w-4" />
          إضافة شركة
        </Button>
      )}
    </div>
  );
}

function ExpensesCardsList({
  expenses, companies, onEdit, onDelete,
}: {
  expenses: PrepaidExpense[];
  companies: PrepaidCompany[];
  onEdit: (e: PrepaidExpense) => void;
  onDelete: (e: PrepaidExpense) => void;
}) {
  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {expenses.map((e) => {
        const cat = getCategoryInfo(e.category);
        const status = getStatusInfo(e.status);
        const company = companyMap.get(e.companyId);
        const monthly = getMonthlyInstallment(e.totalAmount, e.monthsCount);
        const info = getConsumedInfo(e);

        return (
          <div
            key={e.id}
            className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden transition-all hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-500/30"
          >
            {/* Top stripe */}
            <div className="h-1" style={{ backgroundColor: cat.color }} />

            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">{e.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    {company && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: company.color }} />
                        {company.name}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] rounded-md border ${status.bg} ${status.color}`}>
                  {status.labelAr}
                </Badge>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <Badge variant="outline" className="text-[10px] rounded-md gap-1" style={{ borderColor: `${cat.color}40`, color: cat.color, background: `${cat.color}08` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.labelAr}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CalendarRange className="h-3 w-3" />
                  {formatDateAr(e.startDate)} — {formatDateAr(e.endDate)}
                </span>
              </div>

              {/* Amounts grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-xl bg-muted/20 p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">الإجمالي</p>
                  <p className="text-sm font-bold tabular-nums">{formatSAR(e.totalAmount)}</p>
                </div>
                <div className="rounded-xl bg-muted/20 p-2.5">
                  <p className="text-[10px] text-muted-foreground mb-0.5">القسط الشهري</p>
                  <p className="text-sm font-bold tabular-nums">{formatSAR(monthly)}</p>
                </div>
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-2.5">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-0.5">مستهلك</p>
                  <p className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{formatSAR(info.consumed)}</p>
                </div>
                <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-2.5">
                  <p className="text-[10px] text-violet-700 dark:text-violet-400 mb-0.5">متبقي</p>
                  <p className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-400">{formatSAR(info.remaining)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    الشهر {info.monthsElapsed} من {e.monthsCount}
                  </span>
                  <span className="font-semibold">{info.percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, info.percent)}%`,
                      background: `linear-gradient(to left, ${cat.color}, ${cat.color}aa)`,
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 rounded-lg"
                  onClick={() => onEdit(e)}
                >
                  <Pencil className="h-3 w-3" />
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(e)}
                >
                  <Trash2 className="h-3 w-3" />
                  حذف
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyDistribution({ expenses }: { expenses: PrepaidExpense[] }) {
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; total: number; count: number }>();
    expenses.forEach((e) => {
      const start = new Date(e.startDate);
      if (isNaN(start.getTime())) return;
      const monthly = getMonthlyInstallment(e.totalAmount, e.monthsCount);
      for (let i = 0; i < e.monthsCount; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
        const existing = map.get(key) || { month: label, total: 0, count: 0 };
        existing.total += monthly;
        existing.count += 1;
        map.set(key, existing);
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [expenses]);

  const maxTotal = Math.max(1, ...monthlyData.map((d) => d.total));

  if (monthlyData.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 py-12 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">لا توجد بيانات كافية لعرض التوزيع الشهري</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-emerald-500" />
            التوزيع الشهري للمصروفات
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">إجمالي القسط الشهري لكل فترة</p>
        </div>
        <Badge variant="outline" className="rounded-md text-[10px]">{monthlyData.length} شهر</Badge>
      </div>
      <div className="space-y-2">
        {monthlyData.map((d, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground font-medium w-28 text-left shrink-0">{d.month}</span>
            <div className="flex-1 h-7 rounded-lg bg-muted/20 overflow-hidden relative">
              <div
                className="h-full rounded-lg bg-gradient-to-l from-emerald-500 to-teal-500 transition-all flex items-center justify-start pr-2"
                style={{ width: `${Math.max(8, (d.total / maxTotal) * 100)}%` }}
              >
                <span className="text-[10px] font-bold text-white whitespace-nowrap">
                  {formatSAR(d.total)}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground w-12 text-left shrink-0">{d.count} مصروف</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsView({ expenses }: { expenses: PrepaidExpense[] }) {
  const byYear = useMemo(() => {
    const map = new Map<number, { year: number; total: number; monthly: number; count: number }>();
    expenses.forEach((e) => {
      const year = new Date(e.startDate).getFullYear();
      if (isNaN(year)) return;
      const existing = map.get(year) || { year, total: 0, monthly: 0, count: 0 };
      existing.total += e.totalAmount;
      existing.monthly += getMonthlyInstallment(e.totalAmount, e.monthsCount);
      existing.count += 1;
      map.set(year, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.year - a.year);
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map = new Map<PrepaidCategory, { category: PrepaidCategory; total: number; count: number }>();
    expenses.forEach((e) => {
      const existing = map.get(e.category) || { category: e.category, total: 0, count: 0 };
      existing.total += e.totalAmount;
      existing.count += 1;
      map.set(e.category, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const totalAll = byYear.reduce((s, y) => s + y.total, 0);

  return (
    <div className="space-y-4">
      {/* Yearly table */}
      <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 bg-muted/20">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-emerald-500" />
            ملخص سنوي
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10">
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">السنة</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">إجمالي المصروف</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">القسط الشهري</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-5 py-3">عدد المصروفات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {byYear.map((y) => (
                <tr key={y.year} className="hover:bg-muted/15 transition-colors">
                  <td className="px-5 py-3 font-bold tabular-nums">{y.year}</td>
                  <td className="px-5 py-3 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatSAR(y.total)}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatSAR(y.monthly)}</td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">{y.count}</td>
                </tr>
              ))}
              {byYear.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">لا توجد بيانات</td>
                </tr>
              )}
            </tbody>
            {byYear.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border/40 bg-muted/15 font-bold">
                  <td className="px-5 py-3">الإجمالي</td>
                  <td className="px-5 py-3 tabular-nums text-emerald-700 dark:text-emerald-400">{formatSAR(totalAll)}</td>
                  <td colSpan={2} className="px-5 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-5">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
          <PieChart className="h-4 w-4 text-emerald-500" />
          التوزيع حسب التصنيف
        </h3>
        <div className="space-y-2.5">
          {byCategory.map((c) => {
            const cat = getCategoryInfo(c.category);
            const pct = totalAll > 0 ? (c.total / totalAll) * 100 : 0;
            return (
              <div key={c.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium">{cat.labelAr}</span>
                    <span className="text-[10px] text-muted-foreground">({c.count})</span>
                  </span>
                  <span className="font-bold tabular-nums">{formatSAR(c.total)} · {pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Dialogs ──────────────────────────────────────────────────────────────
function CompanyDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: PrepaidCompany | null }) {
  const { addCompany, updateCompany } = usePrepaidStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PREPAID_COMPANY_COLORS[0]);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description);
        setColor(editing.color);
      } else {
        setName('');
        setDescription('');
        setColor(PREPAID_COMPANY_COLORS[Math.floor(Math.random() * PREPAID_COMPANY_COLORS.length)]);
      }
    }
  }, [open, editing]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'الاسم مطلوب' });
      return;
    }
    if (editing) {
      updateCompany(editing.id, { name: name.trim(), description: description.trim(), color });
      toast({ title: 'تم التحديث', description: `تم تحديث بيانات "${name.trim()}"` });
    } else {
      addCompany({ name: name.trim(), description: description.trim(), color });
      toast({ title: 'تمت الإضافة', description: `تمت إضافة "${name.trim()}"` });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{editing ? 'تعديل شركة' : 'إضافة شركة جديدة'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج إدارة بيانات الشركة</DialogDescription>

        <div className="relative overflow-hidden px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600 to-teal-600" />
          <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{editing ? 'تعديل الشركة' : 'إضافة شركة جديدة'}</h2>
              <p className="text-white/70 text-[11px]">أدخل بيانات الشركة</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="co-name" className="text-xs font-semibold">اسم الشركة <span className="text-destructive">*</span></Label>
            <Input
              id="co-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: شركة النور للتجارة"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-desc" className="text-xs font-semibold">الوصف</Label>
            <Textarea
              id="co-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر"
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">اللون التعريفي</Label>
            <div className="flex flex-wrap gap-2">
              {PREPAID_COMPANY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" size="sm" className="text-xs rounded-xl" onClick={onClose}>إلغاء</Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600"
            onClick={handleSubmit}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {editing ? 'تحديث' : 'إضافة الشركة'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({
  open, onClose, editing, companies,
}: {
  open: boolean;
  onClose: () => void;
  editing: PrepaidExpense | null;
  companies: PrepaidCompany[];
}) {
  const { addExpense, updateExpense } = usePrepaidStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [category, setCategory] = useState<PrepaidCategory>('rent');
  const [status, setStatus] = useState<PrepaidStatus>('active');
  const [totalAmount, setTotalAmount] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  const monthsCount = useMemo(() => monthsBetween(startDate, endDate), [startDate, endDate]);
  const monthly = useMemo(() => getMonthlyInstallment(Number(totalAmount) || 0, monthsCount), [totalAmount, monthsCount]);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setCompanyId(editing.companyId);
        setCategory(editing.category);
        setStatus(editing.status);
        setTotalAmount(String(editing.totalAmount));
        setStartDate(editing.startDate);
        setEndDate(editing.endDate);
        setNotes(editing.notes || '');
      } else {
        setName('');
        setCompanyId(companies[0]?.id || '');
        setCategory('rent');
        setStatus('active');
        setTotalAmount('');
        setStartDate(todayISO());
        setEndDate(addMonthsISO(todayISO(), 12));
        setNotes('');
      }
    }
  }, [open, editing, companies]);

  // Auto-adjust end date when start date or months change
  const handleMonthsChange = (m: number) => {
    setEndDate(addMonthsISO(startDate, Math.max(1, m)));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'الاسم مطلوب' });
      return;
    }
    if (!companyId) {
      toast({ variant: 'destructive', title: 'اختر شركة' });
      return;
    }
    const amount = Number(totalAmount);
    if (!amount || amount <= 0) {
      toast({ variant: 'destructive', title: 'المبلغ غير صحيح' });
      return;
    }
    if (monthsCount < 1) {
      toast({ variant: 'destructive', title: 'فترة غير صحيحة' });
      return;
    }

    const payload = {
      name: name.trim(),
      companyId,
      category,
      status,
      totalAmount: amount,
      startDate,
      endDate,
      monthsCount,
      notes: notes.trim(),
    };

    if (editing) {
      updateExpense(editing.id, payload);
      toast({ title: 'تم التحديث', description: `تم تحديث "${name.trim()}"` });
    } else {
      addExpense(payload);
      toast({ title: 'تمت الإضافة', description: `تمت إضافة "${name.trim()}"` });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-lg p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{editing ? 'تعديل مصروف مقدم' : 'إضافة مصروف مقدم جديد'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج إدارة المصروف المقدم</DialogDescription>

        <div className="relative overflow-hidden px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600 via-teal-600 to-cyan-600" />
          <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{editing ? 'تعديل المصروف المقدم' : 'مصروف مقدم جديد'}</h2>
              <p className="text-white/70 text-[11px]">سيتم حساب القسط الشهري والمستهلك تلقائياً</p>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ex-name" className="text-xs font-semibold">اسم المصروف <span className="text-destructive">*</span></Label>
              <Input
                id="ex-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: إيجار سنوي"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الشركة <span className="text-destructive">*</span></Label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">التصنيف</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PrepaidCategory)}
                  className="w-full h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {PREPAID_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.labelAr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الحالة</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PrepaidStatus)}
                  className="w-full h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {PREPAID_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.labelAr}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-amount" className="text-xs font-semibold">المبلغ الإجمالي (ر.س) <span className="text-destructive">*</span></Label>
                <Input
                  id="ex-amount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl tabular-nums"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ex-start" className="text-xs font-semibold">تاريخ البداية <span className="text-destructive">*</span></Label>
                <Input
                  id="ex-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-end" className="text-xs font-semibold">تاريخ النهاية <span className="text-destructive">*</span></Label>
                <Input
                  id="ex-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">عدد الأشهر</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={monthsCount}
                  onChange={(e) => handleMonthsChange(Number(e.target.value) || 1)}
                  className="rounded-xl tabular-nums w-24"
                  min={1}
                />
                <span className="text-[11px] text-muted-foreground">شهر</span>
                <div className="flex-1 rounded-xl bg-emerald-500/5 border border-emerald-500/15 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">القسط الشهري: </span>
                  <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{formatSAR(monthly)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ex-notes" className="text-xs font-semibold">ملاحظات</Label>
              <Textarea
                id="ex-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" size="sm" className="text-xs rounded-xl" onClick={onClose}>إلغاء</Button>
          <Button
            size="sm"
            className="text-xs gap-1.5 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-600"
            onClick={handleSubmit}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {editing ? 'تحديث' : 'إضافة المصروف'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
