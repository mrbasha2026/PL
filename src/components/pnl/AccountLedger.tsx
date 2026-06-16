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
  Building2, BookOpen, ArrowUpRight, ArrowDownRight,
  Search, Download, FileSpreadsheet, Filter, Sparkles, TrendingUp, TrendingDown, Calendar, FileText, BarChart3,
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

// ─── Single Account Ledger View (Professional Design) ──────────────────────
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
    <Card className="shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-4 ${
        isExpense
          ? 'bg-gradient-to-l from-red-600 via-red-500 to-rose-500'
          : 'bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              {isExpense ? <ArrowUpRight className="h-4.5 w-4.5 text-white" /> : <ArrowDownRight className="h-4.5 w-4.5 text-white" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{accountNameAr}</h3>
              <p className="text-white/70 text-xs">{accountNameEn}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
              <Sparkles className="h-3 w-3 ml-1" />
              محسوب تلقائياً
            </Badge>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-[10px]">
              {entries.length} قيد
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="relative overflow-hidden rounded-xl border border-red-200/60 dark:border-red-900/40 bg-gradient-to-bl from-red-50 to-white dark:from-red-950/30 dark:to-slate-900 p-3">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-red-500" />
              <span className="text-[10px] font-medium text-red-600 dark:text-red-400">إجمالي المدين</span>
            </div>
            <p className="text-sm font-bold text-red-700 dark:text-red-300 tabular-nums">{formatNumber(totalDebit, currency, false)}</p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-bl from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 p-3">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">إجمالي الدائن</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatNumber(totalCredit, currency, false)}</p>
          </div>
          <div className={`relative overflow-hidden rounded-xl border p-3 ${
            isExpense
              ? 'border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-bl from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900'
              : 'border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-bl from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900'
          }`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${isExpense ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className={`h-3 w-3 ${isExpense ? 'text-amber-500' : 'text-blue-500'}`} />
              <span className={`text-[10px] font-medium ${isExpense ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>صافي الرصيد</span>
            </div>
            <p className={`text-sm font-bold tabular-nums ${isExpense ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
              {formatNumber(Math.abs(netBalance), currency, false)}
              <span className="text-[9px] mr-1 opacity-70">{netBalance > 0 ? 'مدين' : netBalance < 0 ? 'دائن' : ''}</span>
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="text-[11px] font-bold text-slate-600 dark:text-slate-300">التاريخ</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-600 dark:text-slate-300">رقم القيد</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-600 dark:text-slate-300">البيان</TableHead>
                <TableHead className="text-center text-[11px] font-bold bg-red-50/80 dark:bg-red-950/20 text-red-700 dark:text-red-300">مدين</TableHead>
                <TableHead className="text-center text-[11px] font-bold bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">دائن</TableHead>
                <TableHead className="text-center text-[11px] font-bold bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">الرصيد</TableHead>
                <TableHead className="text-[11px] font-bold text-slate-600 dark:text-slate-300">المرجع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withBalance.map(({ entry, runningBalance }, idx) => (
                <TableRow key={entry.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${idx % 2 !== 0 ? 'bg-slate-25 dark:bg-slate-900/20' : ''}`}>
                  <TableCell className="text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">
                    {entry.date ? new Date(entry.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{entry.entryNumber}</TableCell>
                  <TableCell className="text-xs text-slate-700 dark:text-slate-300">{entry.description}</TableCell>
                  <TableCell className="text-center tabular-nums text-xs bg-red-50/30 dark:bg-red-950/10">
                    {entry.debit > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">{formatNumber(entry.debit, currency, false)}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-xs bg-emerald-50/30 dark:bg-emerald-950/10">
                    {entry.credit > 0 ? <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatNumber(entry.credit, currency, false)}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-xs bg-amber-50/30 dark:bg-amber-950/10">
                    <span className={`font-bold ${runningBalance > 0 ? 'text-amber-600 dark:text-amber-400' : runningBalance < 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                      {formatCompact(Math.abs(runningBalance))}
                      <span className="text-[9px] mr-0.5 opacity-70">{runningBalance > 0 ? 'م' : runningBalance < 0 ? 'د' : ''}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] text-slate-400 font-mono">{entry.reference}</TableCell>
                </TableRow>
              ))}
              {/* Totals */}
              <TableRow className="bg-slate-100/80 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-600">
                <TableCell colSpan={3} className="text-xs font-bold text-slate-700 dark:text-slate-200">الإجمالي</TableCell>
                <TableCell className="text-center tabular-nums text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/15">{formatNumber(totalDebit, currency, false)}</TableCell>
                <TableCell className="text-center tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/15">{formatNumber(totalCredit, currency, false)}</TableCell>
                <TableCell className="text-center tabular-nums text-xs font-bold bg-amber-50/40 dark:bg-amber-950/15">
                  <span className={netBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}>
                    {formatNumber(Math.abs(netBalance), currency, false)}
                    <span className="text-[9px] mr-0.5 opacity-70">{netBalance > 0 ? ' مدين' : netBalance < 0 ? ' دائن' : ''}</span>
                  </span>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
            القيود محسوبة تلقائياً من بيانات قائمة الأرباح والخسائر
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7 rounded-lg" onClick={exportToExcel}>
            <Download className="h-3.5 w-3.5" />
            تصدير Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AccountLedgerExplorer() {
  const { companies, selectedCompanyNames, selectedPeriods } = usePnLStore();
  const allLineItems = useMemo(() => getAllLineItems(companies), [companies]);

  // Filter companies by selection
  const filteredCompanies = useMemo(() =>
    companies.filter((c) => selectedCompanyNames.includes(c.companyName) && selectedPeriods.includes(c.period)),
    [companies, selectedCompanyNames, selectedPeriods]
  );

  // Auto-generate journal entries
  const allAutoEntries = useMemo(() =>
    generateAutoJournalEntries(filteredCompanies, allLineItems),
    [filteredCompanies, allLineItems]
  );

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Get accounts that have entries
  const accountsWithEntries = useMemo(() => {
    const accountKeys = new Set(allAutoEntries.map((e) => e.accountKey));
    return allLineItems.filter((item) => {
      if (item.isSubtotal || item.isTotal) return false;
      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      return accountKeys.has(key) && (item.category === 'revenue' || item.category === 'expense');
    });
  }, [allAutoEntries, allLineItems]);

  // Filter by category
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

  // Company list
  const companyNames = useMemo(
    () => [...new Set(allAutoEntries.map((e) => e.companyName))],
    [allAutoEntries]
  );

  // Auto-select first account & company
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

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, revenue: 0, expense: 0, profit: 0 };
    accountsWithEntries.forEach((item) => {
      counts.all++;
      counts[item.category]++;
    });
    return counts;
  }, [accountsWithEntries]);

  // Build selected ledger entries
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

  // All accounts quick overview
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

  // No data
  if (filteredCompanies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            لا توجد بيانات لعرض القيود
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            اختر شركة وفترة من الفلاتر لعرض القيود المحاسبية المحسوبة تلقائياً من بيانات الأرباح والخسائر.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Controls ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Search + Category */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن حساب..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-lg border bg-background px-4 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(['all', 'revenue', 'expense'] as CategoryFilter[]).map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1 text-xs h-7 ${
                    categoryFilter === cat
                      ? cat === 'revenue' ? 'bg-emerald-600 hover:bg-emerald-700'
                        : cat === 'expense' ? 'bg-red-500 hover:bg-red-600'
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

          {/* Account + Company selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">الحساب:</span>
            <Select value={selectedAccountKey || ''} onValueChange={(val) => setSelectedAccountKey(val)}>
              <SelectTrigger className="w-full max-w-md text-sm">
                <SelectValue placeholder="اختر حساباً" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredAccounts.map((item) => {
                  const key = item.isCustom ? item.name : getLineItemKey(item.name);
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.category === 'revenue' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <span>{item.nameAr}</span>
                        <span className="text-muted-foreground text-xs">({item.name})</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">الشركة:</span>
            <Select value={selectedCompany || ''} onValueChange={(val) => setSelectedCompany(val)}>
              <SelectTrigger className="w-full max-w-[200px] text-sm">
                <SelectValue placeholder="اختر شركة" />
              </SelectTrigger>
              <SelectContent>
                {companyNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Account Ledger ───────────────────────────────────── */}
      {selectedLedgerEntries.length > 0 && selectedItem && (
        <AccountLedgerView
          entries={selectedLedgerEntries}
          accountNameAr={selectedItem.nameAr}
          accountNameEn={selectedItem.name}
          accountKey={selectedAccountKey || ''}
        />
      )}

      {/* ─── Quick overview: All accounts ────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-600" />
            ملخص الحسابات ذات القيود
            <Badge variant="outline" className="text-[10px]">{allAccountSummaries.length} حساب</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allAccountSummaries.map((acc) => {
              const isSelected = acc.accountKey === selectedAccountKey;
              const net = acc.totalDebit - acc.totalCredit;
              const isExp = acc.category === 'expense';
              return (
                <button
                  key={acc.accountKey}
                  onClick={() => setSelectedAccountKey(acc.accountKey)}
                  className={`text-right rounded-xl border p-3 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50/50 ring-2 ring-teal-400/30 shadow-sm'
                      : 'border-muted hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${isExp ? 'bg-red-400' : 'bg-emerald-500'}`} />
                        <span className="text-sm font-medium truncate">{acc.accountNameAr}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{acc.accountNameEn}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">{acc.entries.length} قيد</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div className="text-red-600">مدين: {formatCompact(acc.totalDebit)}</div>
                    <div className="text-emerald-600">دائن: {formatCompact(acc.totalCredit)}</div>
                  </div>
                  <div className={`mt-1 text-sm font-bold tabular-nums ${isExp ? 'text-amber-700' : 'text-blue-700'}`}>
                    الرصيد: {formatCompact(Math.abs(net))}
                    {net > 0 ? ' مدين' : net < 0 ? ' دائن' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
