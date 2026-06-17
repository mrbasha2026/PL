'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2, BookOpen, ArrowUpRight, ArrowDownRight,
  Search, Download, Sparkles, TrendingUp, TrendingDown,
  Calendar, FileText, BarChart3, ChevronRight,
  Layers, Hash, Receipt, Wallet, ArrowLeftRight,
  CircleDot, MoveRight, SparklesIcon,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getAllLineItems,
  getLineItemKey,
  COMPANY_COLORS,
  formatNumber,
  formatCompact,
  PnLLineItem,
  CompanyPnL,
} from '@/lib/pnl-types';

// ─── Auto-generate journal entries from P&L data ──────────────────────────
interface AutoJournalEntry {
  id: string;
  companyName: string;
  period: string;
  date: string;
  entryNumber: string;
  accountKey: string;
  accountNameAr: string;
  accountNameEn: string;
  description: string;
  debit: number;
  credit: number;
  reference: string;
  currency: string;
  category: 'revenue' | 'expense';
}

const ARABIC_MONTHS_MAP: Record<string, string> = {
  'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل',
  'May': 'مايو', 'Jun': 'يونيو', 'Jul': 'يوليو', 'Aug': 'أغسطس',
  'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر',
};

const MONTH_NUM: Record<string, number> = {
  'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
  'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
};

function parsePeriodComponents(period: string): { year: number; month: number; monthAr: string } | null {
  const parts = period.trim().split(/[\s\-]+/);
  if (parts.length < 2) return null;
  const monthStr = parts[0];
  const year = parseInt(parts[parts.length - 1], 10);
  const month = MONTH_NUM[monthStr];
  const monthAr = ARABIC_MONTHS_MAP[monthStr];
  if (!month || isNaN(year) || !monthAr) return null;
  return { year, month, monthAr };
}

function splitAmount(total: number, parts: number): number[] {
  if (parts <= 1) return [total];
  const result: number[] = [];
  let remaining = total;
  for (let i = 0; i < parts - 1; i++) {
    const pct = 0.25 + Math.random() * 0.20;
    const part = Math.round(remaining * pct);
    result.push(part);
    remaining -= part;
  }
  result.push(remaining);
  return result;
}

function generateAutoJournalEntries(
  companies: CompanyPnL[],
  lineItems: PnLLineItem[],
): AutoJournalEntry[] {
  const entries: AutoJournalEntry[] = [];
  let entryCounter = 1;

  for (const ds of companies) {
    const periodInfo = parsePeriodComponents(ds.period);
    if (!periodInfo) continue;
    const { year, month, monthAr } = periodInfo;
    const periodAr = `${monthAr} ${year}`;

    for (const item of lineItems) {
      if (item.isSubtotal || item.isTotal) continue;
      if (item.category === 'profit') continue;

      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      const value = ds.data[key] || 0;
      if (value === 0) continue;

      const category = item.category as 'revenue' | 'expense';
      const numEntries = value > 500000 ? 3 : value > 100000 ? 2 : 1;
      const amounts = splitAmount(value, numEntries);

      amounts.forEach((amt, idx) => {
        const day = String(Math.min(28, 5 + idx * 10)).padStart(2, '0');
        const date = `${year}-${String(month).padStart(2, '0')}-${day}`;
        const entryNum = `JV-${year}${String(month).padStart(2, '0')}-${String(entryCounter).padStart(4, '0')}`;
        entryCounter++;

        const desc = category === 'revenue'
          ? `إثبات إيراد ${item.nameAr} — ${periodAr}`
          : `تسجيل مصروف ${item.nameAr} — ${periodAr}`;

        const refPrefix = category === 'revenue' ? 'REV' : 'EXP';
        const reference = `${refPrefix}-${year}${String(month).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`;

        entries.push({
          id: `aje_${ds.companyName}_${key}_${ds.period}_${idx}`,
          companyName: ds.companyName,
          period: ds.period,
          date,
          entryNumber: entryNum,
          accountKey: key,
          accountNameAr: item.nameAr,
          accountNameEn: item.name,
          description: desc,
          debit: category === 'expense' ? amt : 0,
          credit: category === 'revenue' ? amt : 0,
          reference,
          currency: ds.currency,
          category,
        });
      });
    }
  }
  return entries;
}

function computeRunningBalance(entries: AutoJournalEntry[]): { entry: AutoJournalEntry; runningBalance: number }[] {
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { entry, runningBalance: balance };
  });
}

// ─── Category filter options ────────────────────────────────────────────────
type CategoryFilter = 'all' | 'revenue' | 'expense' | 'profit';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'الكل',
  revenue: 'الإيرادات',
  expense: 'المصروفات',
  profit: 'الأرباح',
};

// ─── Modern Account Ledger View ────────────────────────────────────────────
function AccountLedgerView({ entries, accountNameAr, accountNameEn, accountKey }: {
  entries: AutoJournalEntry[];
  accountNameAr: string;
  accountNameEn: string;
  accountKey: string;
}) {
  const withBalance = computeRunningBalance(entries);
  const currency = entries[0]?.currency || 'SAR';
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  const netBalance = totalDebit - totalCredit;
  const isExpense = entries[0]?.category === 'expense';

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const header = ['التاريخ', 'رقم القيد', 'البيان', 'مدين', 'دائن', 'الرصيد', 'م/د', 'المرجع'];
    const rows = withBalance.map(({ entry, runningBalance }) => [
      entry.date, entry.entryNumber, entry.description,
      entry.debit || '', entry.credit || '',
      Math.abs(runningBalance),
      runningBalance > 0 ? 'مدين' : runningBalance < 0 ? 'دائن' : '',
      entry.reference,
    ]);
    rows.push(['الإجمالي', '', '', totalDebit, totalCredit, Math.abs(netBalance), netBalance > 0 ? 'مدين' : netBalance < 0 ? 'دائن' : '', '']);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 45 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, accountNameAr.substring(0, 31));
    XLSX.writeFile(wb, `دفتر_أستاذ_${accountNameAr.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* ─── Modern Stats Strip ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent dark:from-red-500/20 dark:via-red-500/10 p-4 transition-all hover:shadow-lg hover:shadow-red-500/5">
          <div className="absolute -top-6 -left-6 h-20 w-20 rounded-full bg-red-500/10 blur-2xl group-hover:bg-red-500/20 transition-colors" />
          <div className="relative flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">
                <TrendingUp className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600/80 dark:text-red-400/80">مدين</span>
            </div>
          </div>
          <p className="relative text-xl font-bold tabular-nums text-red-700 dark:text-red-300 tracking-tight">
            {formatNumber(totalDebit, currency, false)}
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/10 p-4 transition-all hover:shadow-lg hover:shadow-emerald-500/5">
          <div className="absolute -top-6 -left-6 h-20 w-20 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="relative flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">دائن</span>
            </div>
          </div>
          <p className="relative text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300 tracking-tight">
            {formatNumber(totalCredit, currency, false)}
          </p>
        </div>

        <div className={`group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 p-4 transition-all hover:shadow-lg ${
          isExpense
            ? 'bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent dark:from-violet-500/20 dark:via-violet-500/10 hover:shadow-violet-500/5'
            : 'bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-500/20 dark:via-sky-500/10 hover:shadow-sky-500/5'
        }`}>
          <div className={`absolute -top-6 -left-6 h-20 w-20 rounded-full blur-2xl transition-colors ${
            isExpense ? 'bg-violet-500/10 group-hover:bg-violet-500/20' : 'bg-sky-500/10 group-hover:bg-sky-500/20'
          }`} />
          <div className="relative flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isExpense ? 'bg-violet-500/15' : 'bg-sky-500/15'
              }`}>
                <BarChart3 className={`h-4 w-4 ${isExpense ? 'text-violet-500' : 'text-sky-500'}`} />
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                isExpense ? 'text-violet-600/80 dark:text-violet-400/80' : 'text-sky-600/80 dark:text-sky-400/80'
              }`}>صافي الرصيد</span>
            </div>
            <Badge className={`text-[9px] h-5 px-1.5 border-0 ${
              isExpense
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
            }`}>
              {isExpense ? 'مدين' : 'دائن'}
            </Badge>
          </div>
          <p className={`relative text-xl font-bold tabular-nums tracking-tight ${
            isExpense ? 'text-violet-700 dark:text-violet-300' : 'text-sky-700 dark:text-sky-300'
          }`}>
            {formatNumber(Math.abs(netBalance), currency, false)}
          </p>
        </div>
      </div>

      {/* ─── Timeline View ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 dark:border-border/30 overflow-hidden">
        {/* Table Header */}
        <div className="bg-muted/30 dark:bg-muted/20 border-b border-border/50">
          <div className="grid grid-cols-[100px_110px_1fr_110px_110px_120px_110px] gap-0 px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">التاريخ</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">رقم القيد</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">البيان</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 text-center">مدين</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 text-center">دائن</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 text-center">الرصيد</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">المرجع</span>
          </div>
        </div>

        {/* Table Body - Timeline Style */}
        <div className="divide-y divide-border/30">
          {withBalance.map(({ entry, runningBalance }, idx) => (
            <div
              key={entry.id}
              className={`group grid grid-cols-[100px_110px_1fr_110px_110px_120px_110px] gap-0 px-5 py-3.5 items-center transition-colors hover:bg-muted/20 ${
                idx % 2 !== 0 ? 'bg-muted/5' : ''
              }`}
            >
              {/* Date */}
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ring-2 ring-background ${
                  entry.debit > 0 ? 'bg-red-400' : 'bg-emerald-400'
                }`} />
                <span className="text-xs tabular-nums font-medium text-foreground/80">
                  {entry.date ? new Date(entry.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>

              {/* Entry Number */}
              <span className="text-[11px] font-mono text-muted-foreground tracking-tight">{entry.entryNumber}</span>

              {/* Description */}
              <span className="text-xs text-foreground/90 leading-relaxed">{entry.description}</span>

              {/* Debit */}
              <div className="text-center">
                {entry.debit > 0 ? (
                  <span className="inline-flex items-center justify-center rounded-md bg-red-500/8 dark:bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">
                    {formatNumber(entry.debit, currency, false)}
                  </span>
                ) : <span className="text-muted-foreground/30">—</span>}
              </div>

              {/* Credit */}
              <div className="text-center">
                {entry.credit > 0 ? (
                  <span className="inline-flex items-center justify-center rounded-md bg-emerald-500/8 dark:bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatNumber(entry.credit, currency, false)}
                  </span>
                ) : <span className="text-muted-foreground/30">—</span>}
              </div>

              {/* Running Balance */}
              <div className="text-center">
                <span className={`text-xs font-bold tabular-nums ${
                  runningBalance > 0 ? 'text-amber-600 dark:text-amber-400' : runningBalance < 0 ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'
                }`}>
                  {formatCompact(Math.abs(runningBalance))}
                  <span className="text-[9px] mr-0.5 opacity-60">{runningBalance > 0 ? 'م' : runningBalance < 0 ? 'د' : ''}</span>
                </span>
              </div>

              {/* Reference */}
              <span className="text-[10px] font-mono text-muted-foreground/60">{entry.reference}</span>
            </div>
          ))}

          {/* Totals Row */}
          <div className="grid grid-cols-[100px_110px_1fr_110px_110px_120px_110px] gap-0 px-5 py-4 bg-muted/20 border-t-2 border-border/50">
            <span className="col-span-3 text-xs font-bold text-foreground/80">الإجمالي</span>
            <div className="text-center">
              <span className="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums">{formatNumber(totalDebit, currency, false)}</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(totalCredit, currency, false)}</span>
            </div>
            <div className="text-center">
              <span className={`text-xs font-bold tabular-nums ${netBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>
                {formatNumber(Math.abs(netBalance), currency, false)}
                <span className="text-[9px] mr-0.5 opacity-60">{netBalance > 0 ? ' مدين' : netBalance < 0 ? ' دائن' : ''}</span>
              </span>
            </div>
            <span />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 shrink-0 text-violet-500" />
          القيود محسوبة تلقائياً من بيانات قائمة الأرباح والخسائر
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 rounded-xl border-dashed hover:border-solid transition-all" onClick={exportToExcel}>
          <Download className="h-3.5 w-3.5" />
          تصدير Excel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AccountLedgerExplorer() {
  const { companies, selectedCompanyNames, selectedPeriods } = usePnLStore();
  const allLineItems = useMemo(() => getAllLineItems(companies), [companies]);

  const filteredCompanies = useMemo(() =>
    companies.filter((c) => selectedCompanyNames.includes(c.companyName) && selectedPeriods.includes(c.period)),
    [companies, selectedCompanyNames, selectedPeriods]
  );

  const allAutoEntries = useMemo(() =>
    generateAutoJournalEntries(filteredCompanies, allLineItems),
    [filteredCompanies, allLineItems]
  );

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  const accountsWithEntries = useMemo(() => {
    const accountKeys = new Set(allAutoEntries.map((e) => e.accountKey));
    return allLineItems.filter((item) => {
      if (item.isSubtotal || item.isTotal) return false;
      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      return accountKeys.has(key) && (item.category === 'revenue' || item.category === 'expense');
    });
  }, [allAutoEntries, allLineItems]);

  const filteredAccounts = useMemo(() => {
    let items = accountsWithEntries;
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
  }, [accountsWithEntries, categoryFilter, searchText]);

  const companyNames = useMemo(
    () => [...new Set(allAutoEntries.map((e) => e.companyName))],
    [allAutoEntries]
  );

  React.useEffect(() => {
    if (!selectedAccountKey && filteredAccounts.length > 0) {
      const firstKey = filteredAccounts[0].isCustom
        ? filteredAccounts[0].name
        : getLineItemKey(filteredAccounts[0].name);
      setSelectedAccountKey(firstKey);
    }
  }, [filteredAccounts, selectedAccountKey]);

  React.useEffect(() => {
    if (!selectedCompany && companyNames.length > 0) {
      setSelectedCompany(companyNames[0]);
    }
  }, [companyNames, selectedCompany]);

  const categoryCounts = useMemo(() => {
    const counts = { all: 0, revenue: 0, expense: 0, profit: 0 };
    accountsWithEntries.forEach((item) => {
      counts.all++;
      counts[item.category]++;
    });
    return counts;
  }, [accountsWithEntries]);

  const selectedLedgerEntries = useMemo(() => {
    if (!selectedAccountKey || !selectedCompany) return [];
    return allAutoEntries
      .filter((e) => e.accountKey === selectedAccountKey && e.companyName === selectedCompany)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allAutoEntries, selectedAccountKey, selectedCompany]);

  const selectedItem = useMemo(() => {
    return allLineItems.find((item) => {
      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      return key === selectedAccountKey;
    });
  }, [allLineItems, selectedAccountKey]);

  const allAccountSummaries = useMemo(() => {
    if (!selectedCompany) return [];
    const companyEntries = allAutoEntries.filter((e) => e.companyName === selectedCompany);
    const accountMap = new Map<string, { entries: AutoJournalEntry[]; totalDebit: number; totalCredit: number }>();
    companyEntries.forEach((e) => {
      const existing = accountMap.get(e.accountKey) || { entries: [], totalDebit: 0, totalCredit: 0 };
      existing.entries.push(e);
      existing.totalDebit += e.debit;
      existing.totalCredit += e.credit;
      accountMap.set(e.accountKey, existing);
    });
    return Array.from(accountMap.entries()).map(([key, data]) => {
      const item = allLineItems.find((li) => {
        const liKey = li.isCustom ? li.name : getLineItemKey(li.name);
        return liKey === key;
      });
      return {
        accountKey: key,
        accountNameAr: item?.nameAr || data.entries[0]?.accountNameAr || key,
        accountNameEn: item?.name || data.entries[0]?.accountNameEn || key,
        category: item?.category || 'expense',
        ...data,
      };
    });
  }, [allAutoEntries, selectedCompany, allLineItems]);

  if (filteredCompanies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-sky-500/10 dark:from-violet-500/20 dark:to-sky-500/20 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-violet-500/40" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-foreground/70">لا توجد بيانات لعرض القيود</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">
          اختر شركة وفترة من الفلاتر لعرض القيود المحاسبية المحسوبة تلقائياً من بيانات الأرباح والخسائر
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Modern Toolbar ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/50 dark:border-border/30 bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* Search Row */}
        <div className="p-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="ابحث عن حساب..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30">
              {(['all', 'revenue', 'expense'] as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? cat === 'revenue' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : cat === 'expense' ? 'bg-red-500 text-white shadow-md shadow-red-500/25'
                          : 'bg-foreground text-background shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                  <span className={`text-[10px] ${categoryFilter === cat ? 'opacity-70' : 'opacity-40'}`}>
                    {categoryCounts[cat]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selectors Row */}
        <div className="px-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Account Selector */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
                <Wallet className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <select
                value={selectedAccountKey || ''}
                onChange={(e) => setSelectedAccountKey(e.target.value)}
                className="flex-1 rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50"
              >
                <option value="" disabled>اختر حساباً</option>
                {filteredAccounts.map((item) => {
                  const key = item.isCustom ? item.name : getLineItemKey(item.name);
                  return (
                    <option key={key} value={key}>
                      {item.nameAr} — {item.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Company Selector */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10">
                <Building2 className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <select
                value={selectedCompany || ''}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="rounded-xl border border-border/50 bg-background/50 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 min-w-[160px]"
              >
                <option value="" disabled>اختر شركة</option>
                {companyNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Account Header ────────────────────────────────────── */}
      {selectedItem && selectedLedgerEntries.length > 0 && (
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            selectedItem.category === 'expense'
              ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20'
          }`}>
            {selectedItem.category === 'expense'
              ? <ArrowUpRight className="h-5 w-5 text-white" />
              : <ArrowDownRight className="h-5 w-5 text-white" />
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">{selectedItem.nameAr}</h3>
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-600 dark:text-violet-400">
                <Sparkles className="h-2.5 w-2.5 ml-0.5" />
                محسوب تلقائياً
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedLedgerEntries.length} قيد
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{selectedItem.name}</p>
          </div>
        </div>
      )}

      {/* ─── Account Ledger ───────────────────────────────────── */}
      {selectedLedgerEntries.length > 0 && selectedItem && (
        <AccountLedgerView
          entries={selectedLedgerEntries}
          accountNameAr={selectedItem.nameAr}
          accountNameEn={selectedItem.name}
          accountKey={selectedAccountKey || ''}
        />
      )}

      {/* ─── Account Cards Grid ────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-foreground">جميع الحسابات</h3>
          <Badge variant="outline" className="text-[10px]">{allAccountSummaries.length} حساب</Badge>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allAccountSummaries.map((acc) => {
            const isSelected = acc.accountKey === selectedAccountKey;
            const net = acc.totalDebit - acc.totalCredit;
            const isExp = acc.category === 'expense';
            return (
              <button
                key={acc.accountKey}
                onClick={() => setSelectedAccountKey(acc.accountKey)}
                className={`group text-right rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-violet-400/60 bg-violet-50/50 dark:bg-violet-950/20 ring-1 ring-violet-400/20 shadow-lg shadow-violet-500/5'
                    : 'border-border/40 bg-card/50 hover:border-border/80 hover:shadow-md hover:bg-card/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125 ${
                      isExp ? 'bg-red-400' : 'bg-emerald-500'
                    }`} />
                    <span className="text-sm font-semibold truncate">{acc.accountNameAr}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </div>
                <p className="text-[10px] text-muted-foreground/60 mb-3 truncate">{acc.accountNameEn}</p>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-red-500/80 tabular-nums">م {formatCompact(acc.totalDebit)}</span>
                  <span className="text-muted-foreground/20">|</span>
                  <span className="text-emerald-500/80 tabular-nums">د {formatCompact(acc.totalCredit)}</span>
                </div>
                <div className={`mt-2 text-sm font-bold tabular-nums ${isExp ? 'text-violet-700 dark:text-violet-400' : 'text-sky-700 dark:text-sky-400'}`}>
                  {formatCompact(Math.abs(net))}
                  <span className="text-[9px] font-normal opacity-50">{net > 0 ? ' مدين' : net < 0 ? ' دائن' : ''}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
