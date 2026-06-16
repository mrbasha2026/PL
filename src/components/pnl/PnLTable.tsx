'use client';

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, Info, Tag, BookOpen, Download, ChevronLeft,
  ArrowUpRight, ArrowDownRight, Calendar, FileText, Sparkles,
  TrendingUp, TrendingDown, BarChart3,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getAllLineItems,
  getLineItemKey,
  COMPANY_COLORS,
  groupByPeriod,
  formatNumber,
  formatCompact,
  periodToArabic,
  CompanyPnL,
  PnLLineItem,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

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

// Descriptions for different account types
function getEntryDescription(
  accountNameAr: string,
  category: 'revenue' | 'expense',
  periodAr: string,
  _entryType: 'primary' | 'adjustment' | 'accrual'
): string {
  if (category === 'revenue') {
    return `إثبات إيراد ${accountNameAr} — ${periodAr}`;
  }
  return `تسجيل مصروف ${accountNameAr} — ${periodAr}`;
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
    const midMonth = `${year}-${String(month).padStart(2, '0')}-15`;

    for (const item of lineItems) {
      if (item.isSubtotal || item.isTotal) continue;
      if (item.category === 'profit') continue;

      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      const value = ds.data[key] || 0;
      if (value === 0) continue;

      const category = item.category as 'revenue' | 'expense';

      // Generate 1-3 entries per account per period for realism
      const numEntries = value > 500000 ? 3 : value > 100000 ? 2 : 1;
      const amounts = splitAmount(value, numEntries);

      amounts.forEach((amt, idx) => {
        const day = String(Math.min(28, 5 + idx * 10)).padStart(2, '0');
        const date = `${year}-${String(month).padStart(2, '0')}-${day}`;
        const entryNum = `JV-${year}${String(month).padStart(2, '0')}-${String(entryCounter).padStart(4, '0')}`;
        entryCounter++;

        const entryTypes: Array<'primary' | 'adjustment' | 'accrual'> = ['primary', 'adjustment', 'accrual'];
        const entryType = entryTypes[idx] || 'primary';
        const desc = getEntryDescription(item.nameAr, category, periodAr, entryType);

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

function splitAmount(total: number, parts: number): number[] {
  if (parts <= 1) return [total];
  const result: number[] = [];
  let remaining = total;
  for (let i = 0; i < parts - 1; i++) {
    // Random split between 25-45% for each part
    const pct = 0.25 + Math.random() * 0.20;
    const part = Math.round(remaining * pct);
    result.push(part);
    remaining -= part;
  }
  result.push(remaining);
  return result;
}

// Compute running balance
function computeRunningBalance(entries: AutoJournalEntry[]): { entry: AutoJournalEntry; runningBalance: number }[] {
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { entry, runningBalance: balance };
  });
}

// ─── Journal Entries Dialog Component (Modern Design) ──────────────────
function JournalEntriesDialog({
  isOpen,
  onClose,
  lineItem,
  accountKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  lineItem: PnLLineItem | null;
  accountKey: string | null;
}) {
  const { companies, selectedCompanyNames, selectedPeriods } = usePnLStore();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const allLineItems = useMemo(() => getAllLineItems(companies), [companies]);

  const allAutoEntries = useMemo(() => {
    const filtered = companies.filter(
      (c) => selectedCompanyNames.includes(c.companyName) && selectedPeriods.includes(c.period)
    );
    return generateAutoJournalEntries(filtered, allLineItems);
  }, [companies, allLineItems, selectedCompanyNames, selectedPeriods]);

  const accountEntries = useMemo(() => {
    if (!accountKey) return [];
    return allAutoEntries
      .filter((e) => e.accountKey === accountKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allAutoEntries, accountKey]);

  const companiesWithEntries = useMemo(() => {
    const companyMap = new Map<string, AutoJournalEntry[]>();
    accountEntries.forEach((e) => {
      const existing = companyMap.get(e.companyName) || [];
      existing.push(e);
      companyMap.set(e.companyName, existing);
    });
    return Array.from(companyMap.entries());
  }, [accountEntries]);

  React.useEffect(() => {
    if (!selectedCompany && companiesWithEntries.length > 0) {
      setSelectedCompany(companiesWithEntries[0][0]);
    }
  }, [companiesWithEntries, selectedCompany]);

  const selectedEntries = useMemo(() => {
    if (!selectedCompany) return [];
    return accountEntries.filter((e) => e.companyName === selectedCompany);
  }, [accountEntries, selectedCompany]);

  const withBalance = useMemo(() => computeRunningBalance(selectedEntries), [selectedEntries]);

  const totalDebit = selectedEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = selectedEntries.reduce((s, e) => s + e.credit, 0);
  const netBalance = totalDebit - totalCredit;
  const currency = selectedEntries[0]?.currency || 'SAR';

  const exportToExcel = async () => {
    if (selectedEntries.length === 0) return;
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
    XLSX.utils.book_append_sheet(wb, ws, (lineItem?.nameAr || 'Ledger').substring(0, 31));
    XLSX.writeFile(wb, `قيود_${lineItem?.nameAr?.replace(/\s+/g, '_') || 'account'}.xlsx`);
  };

  if (!lineItem || !accountKey) return null;

  const isExpense = lineItem.category === 'expense';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" showCloseButton={false}>
        {/* ─── Modern Glassmorphic Header ──────────────────────── */}
        <div className="relative overflow-hidden px-7 py-6">
          {/* Gradient Background */}
          <div className={`absolute inset-0 ${
            isExpense
              ? 'bg-gradient-to-bl from-red-600 via-rose-500 to-pink-600'
              : 'bg-gradient-to-bl from-emerald-600 via-teal-500 to-cyan-600'
          }`} />
          {/* Decorative Circles */}
          <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute top-1/2 left-1/3 h-20 w-20 rounded-full bg-white/3 blur-lg" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10 shadow-lg">
                {isExpense ? (
                  <ArrowUpRight className="h-6 w-6 text-white" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight tracking-tight">
                  {isExpense ? 'قيود حساب مصروف' : 'قيود حساب إيراد'}
                </h2>
                <p className="text-white/70 text-sm mt-1 font-medium">
                  {lineItem.nameAr} <span className="text-white/40">—</span> <span className="text-white/50">{lineItem.name}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/12 text-white border border-white/10 backdrop-blur-sm text-[11px] px-3 py-1 rounded-full">
                <Sparkles className="h-3 w-3 ml-1" />
                محسوب تلقائياً
              </Badge>
              <Badge className="bg-white/12 text-white border border-white/10 backdrop-blur-sm text-[11px] px-3 py-1 rounded-full">
                {accountEntries.length} قيد
              </Badge>
              <button
                onClick={onClose}
                className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-130px)] bg-background">
          {/* ─── Company Selector ──────────────────────────────── */}
          {companiesWithEntries.length > 1 && (
            <div className="px-7 pt-5 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  الشركة
                </span>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/20">
                  {companiesWithEntries.map(([name, entries], idx) => {
                    const isActive = selectedCompany === name;
                    const color = COMPANY_COLORS[idx % COMPANY_COLORS.length];
                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedCompany(name)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? 'text-white shadow-lg scale-[1.02]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                        style={isActive ? { backgroundColor: color } : undefined}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? 'white' : color }} />
                        {name}
                        <span className={`text-[10px] ${isActive ? 'text-white/60' : 'text-muted-foreground/40'}`}>
                          {entries.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Modern Stats ──────────────────────────────────── */}
          {selectedEntries.length > 0 && (
            <div className="px-7 pt-2 pb-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="group relative overflow-hidden rounded-2xl border border-red-500/10 dark:border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-transparent dark:from-red-500/10 p-4 transition-all hover:shadow-lg hover:shadow-red-500/5">
                  <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-red-500/10 blur-2xl group-hover:bg-red-500/15 transition-colors" />
                  <div className="relative flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
                        <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500/70">إجمالي المدين</span>
                    </div>
                  </div>
                  <p className="relative text-xl font-bold text-red-700 dark:text-red-300 tabular-nums tracking-tight">
                    {formatNumber(totalDebit, currency, false)}
                  </p>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/10 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent dark:from-emerald-500/10 p-4 transition-all hover:shadow-lg hover:shadow-emerald-500/5">
                  <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/15 transition-colors" />
                  <div className="relative flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
                        <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/70">إجمالي الدائن</span>
                    </div>
                  </div>
                  <p className="relative text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums tracking-tight">
                    {formatNumber(totalCredit, currency, false)}
                  </p>
                </div>

                <div className={`group relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-lg ${
                  isExpense
                    ? 'border-violet-500/10 dark:border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent dark:from-violet-500/10 hover:shadow-violet-500/5'
                    : 'border-sky-500/10 dark:border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent dark:from-sky-500/10 hover:shadow-sky-500/5'
                }`}>
                  <div className={`absolute -top-4 -left-4 h-16 w-16 rounded-full blur-2xl transition-colors ${
                    isExpense ? 'bg-violet-500/10 group-hover:bg-violet-500/15' : 'bg-sky-500/10 group-hover:bg-sky-500/15'
                  }`} />
                  <div className="relative flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isExpense ? 'bg-violet-500/10' : 'bg-sky-500/10'
                      }`}>
                        <BarChart3 className={`h-3.5 w-3.5 ${isExpense ? 'text-violet-500' : 'text-sky-500'}`} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        isExpense ? 'text-violet-500/70' : 'text-sky-500/70'
                      }`}>صافي الرصيد</span>
                    </div>
                    <Badge className={`text-[9px] h-5 px-2 border-0 rounded-full ${
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
            </div>
          )}

          {/* ─── Export ──────────────────────────────────────────── */}
          {selectedEntries.length > 0 && (
            <div className="px-7 pb-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-xl border-dashed hover:border-solid transition-all"
                onClick={exportToExcel}
              >
                <Download className="h-3.5 w-3.5" />
                تصدير القيود
              </Button>
            </div>
          )}

          {/* ─── Journal Entries Timeline ───────────────────────── */}
          {withBalance.length > 0 && (
            <div className="px-7 pb-7">
              <div className="rounded-2xl border border-border/50 dark:border-border/30 overflow-hidden">
                {/* Table Header */}
                <div className="bg-muted/20 dark:bg-muted/10 border-b border-border/30">
                  <div className="grid grid-cols-[100px_110px_1fr_110px_110px_120px_110px] gap-0 px-5 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">التاريخ</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">رقم القيد</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">البيان</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/50 text-center">مدين</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/50 text-center">دائن</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/50 text-center">الرصيد</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">المرجع</span>
                  </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-border/20">
                  {withBalance.map(({ entry, runningBalance }, idx) => (
                    <div
                      key={entry.id}
                      className={`group grid grid-cols-[100px_110px_1fr_110px_110px_120px_110px] gap-0 px-5 py-3.5 items-center transition-colors hover:bg-muted/15 ${
                        idx % 2 !== 0 ? 'bg-muted/[0.03]' : ''
                      }`}
                    >
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ring-2 ring-background shrink-0 ${
                          entry.debit > 0 ? 'bg-red-400' : 'bg-emerald-400'
                        }`} />
                        <span className="text-xs tabular-nums font-medium text-foreground/80">
                          {entry.date ? new Date(entry.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </div>

                      {/* Entry Number */}
                      <span className="text-[11px] font-mono text-muted-foreground/60 tracking-tight">{entry.entryNumber}</span>

                      {/* Description */}
                      <span className="text-xs text-foreground/85 leading-relaxed">{entry.description}</span>

                      {/* Debit */}
                      <div className="text-center">
                        {entry.debit > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-red-500/6 dark:bg-red-500/12 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 tabular-nums">
                            {formatNumber(entry.debit, currency, false)}
                          </span>
                        ) : <span className="text-muted-foreground/20">—</span>}
                      </div>

                      {/* Credit */}
                      <div className="text-center">
                        {entry.credit > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-lg bg-emerald-500/6 dark:bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatNumber(entry.credit, currency, false)}
                          </span>
                        ) : <span className="text-muted-foreground/20">—</span>}
                      </div>

                      {/* Running Balance */}
                      <div className="text-center">
                        <span className={`text-xs font-bold tabular-nums ${
                          runningBalance > 0 ? 'text-amber-600 dark:text-amber-400' : runningBalance < 0 ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground'
                        }`}>
                          {formatCompact(Math.abs(runningBalance))}
                          <span className="text-[9px] mr-0.5 opacity-50">{runningBalance > 0 ? 'م' : runningBalance < 0 ? 'د' : ''}</span>
                        </span>
                      </div>

                      {/* Reference */}
                      <span className="text-[10px] font-mono text-muted-foreground/40">{entry.reference}</span>
                    </div>
                  ))}

                  {/* Totals */}
                  <div className="grid grid-cols-[100px_110px_1fr_110px_110px_120px_110px] gap-0 px-5 py-4 bg-muted/15 border-t-2 border-border/40">
                    <span className="col-span-3 text-xs font-bold text-foreground/70">الإجمالي</span>
                    <div className="text-center">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 tabular-nums">{formatNumber(totalDebit, currency, false)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(totalCredit, currency, false)}</span>
                    </div>
                    <div className="text-center">
                      <span className={`text-xs font-bold tabular-nums ${netBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`}>
                        {formatNumber(Math.abs(netBalance), currency, false)}
                        <span className="text-[9px] font-normal opacity-50">{netBalance > 0 ? ' مدين' : netBalance < 0 ? ' دائن' : ''}</span>
                      </span>
                    </div>
                    <span />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground/50">
                <Sparkles className="h-3 w-3 shrink-0 text-violet-500/60" />
                القيود محسوبة تلقائياً من بيانات قائمة الأرباح والخسائر — الحسابات المدينة: المصروفات | الحسابات الدائنة: الإيرادات
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main PnLTable Component ──────────────────────────────────────────────────
export function PnLTable() {
  const { getFiltered, getAggregatedFiltered, dateRangeStart, dateRangeEnd, companies } = usePnLStore();
  const selected = getFiltered();
  const aggregated = getAggregatedFiltered();
  const isAggregated = !!(dateRangeStart && dateRangeEnd);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<PnLLineItem | null>(null);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);

  // Get all line items including custom ones from the data
  const allLineItems = getAllLineItems(companies);

  // Determine which accounts have data (for the indicator)
  const accountsWithData = useMemo(() => {
    const keys = new Set<string>();
    companies.forEach((ds) => {
      Object.entries(ds.data).forEach(([key, val]) => {
        if (val !== 0) keys.add(key);
      });
    });
    return keys;
  }, [companies]);

  // Handle row click
  const handleRowClick = (item: PnLLineItem) => {
    if (item.isSubtotal || item.isTotal) return;
    const key = item.isCustom ? item.name : getLineItemKey(item.name);
    setSelectedLineItem(item);
    setSelectedAccountKey(key);
    setDialogOpen(true);
  };

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر شركة وفترة واحدة على الأقل من الفلاتر</h3>
        </CardContent>
      </Card>
    );
  }

  // Helper: render a clickable line item name cell
  const renderLineItemName = (item: PnLLineItem) => {
    const key = item.isCustom ? item.name : getLineItemKey(item.name);
    const isSummary = item.isSubtotal || item.isTotal;
    const hasData = accountsWithData.has(key);
    const isClickable = !isSummary && (item.category === 'expense' || item.category === 'revenue') && hasData;

    return (
      <span style={{ paddingRight: `${(item.indent || 0) * 24}px` }}
        className="flex items-center gap-1.5"
      >
        {item.nameAr}
        {item.isCustom && (
          <span className="mr-1.5 inline-flex items-center gap-0.5 text-[9px] text-blue-600 bg-blue-50 dark:bg-blue-950 px-1 py-0.5 rounded">
            <Tag className="h-2.5 w-2.5" />
            مخصص
          </span>
        )}
        {!item.isCustom && (
          <span className="mr-1.5 text-xs opacity-50">({item.name})</span>
        )}
        {item.isCustom && item.nameEn && (
          <span className="mr-1.5 text-xs opacity-50">({item.nameEn})</span>
        )}
        {item.description && <InfoTooltip text={item.description} side="left" />}
        {/* Clickable indicator */}
        {isClickable && (
          <span className="inline-flex items-center gap-0.5 text-[9px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded-full ring-1 ring-violet-500/20"
            title="اضغط لعرض القيود المحاسبية">
            <BookOpen className="h-2.5 w-2.5" />
            قيود
          </span>
        )}
      </span>
    );
  };

  // Aggregated view: show one column per company with summed data
  if (isAggregated) {
    return (
      <>
        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="bg-gradient-to-l from-muted/60 to-muted/30 pb-3">
            <CardTitle className="text-base font-bold">قائمة الأرباح والخسائر — بيانات مجمّعة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="min-w-[260px] font-bold bg-muted/30">البند المالي</TableHead>
                    {aggregated.map((agg, gIdx) => {
                      const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                      return (
                        <React.Fragment key={agg.companyName}>
                          <TableHead
                            className="min-w-[130px] text-center font-bold border-b"
                            style={{ color, backgroundColor: `${color}10` }}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                              {agg.companyName}
                            </div>
                            <div className="text-xs font-normal opacity-70 mt-0.5">
                              {agg.periodLabel} ({agg.periodCount} فترات)
                            </div>
                          </TableHead>
                          <TableHead
                            className="min-w-[70px] text-center text-[10px] font-medium border-b"
                            style={{ backgroundColor: `${color}08` }}
                          >
                            النسبة %
                          </TableHead>
                        </React.Fragment>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLineItems.map((item) => {
                    const key = item.isCustom ? item.name : getLineItemKey(item.name);
                    const isSummary = item.isSubtotal || item.isTotal;
                    const isClickable = !isSummary && (item.category === 'expense' || item.category === 'revenue') && accountsWithData.has(key);

                    return (
                      <TableRow
                        key={key}
                        className={`${isSummary ? 'bg-muted/30 font-bold' : ''} ${
                          item.category === 'profit' && !isSummary ? 'bg-emerald-50/30' : ''
                        } ${item.isCustom ? 'bg-blue-50/20' : ''} ${
                          isClickable ? 'cursor-pointer hover:bg-violet-50/30 dark:hover:bg-violet-950/20' : 'hover:bg-muted/10'
                        } transition-colors`}
                        onClick={isClickable ? () => handleRowClick(item) : undefined}
                      >
                        <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {renderLineItemName(item)}
                          {isClickable && (
                            <ChevronLeft className="h-3 w-3 text-violet-500/40 inline mr-1" />
                          )}
                        </TableCell>
                        {aggregated.map((agg) => {
                          const value = agg.aggregatedData[key] || 0;
                          const revenue = agg.aggregatedData['revenue'] || 0;
                          const pct = key === 'revenue'
                            ? revenue !== 0 ? '100.0%' : '—'
                            : revenue !== 0
                              ? `${((value / revenue) * 100).toFixed(1)}%`
                              : '—';
                          return (
                            <React.Fragment key={agg.companyName + key}>
                              <TableCell
                                className={`text-center tabular-nums text-sm ${
                                  value < 0 ? 'text-red-600' : isSummary ? 'text-foreground font-bold' : ''
                                }`}
                              >
                                {formatNumber(value, agg.currency)}
                              </TableCell>
                              <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">
                                {pct}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="border-t px-4 py-3 bg-muted/10">
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p>النسبة % = قيمة البند ÷ الإيرادات × 100 — القيم السلبية باللون الأحمر</p>
                  <p>اضغط على أي بند مصروف أو إيراد لعرض القيود المحاسبية المحسوبة تلقائياً</p>
                  <p>البنود المخصصة <Tag className="h-2.5 w-2.5 inline" /> مضافة من ملف Excel — يتم تصنيفها تلقائياً حسب الاسم</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <JournalEntriesDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          lineItem={selectedLineItem}
          accountKey={selectedAccountKey}
        />
      </>
    );
  }

  // Standard (non-aggregated) view
  const periodGroups = groupByPeriod(selected);
  const allCompanyNames = [...new Set(selected.map((c) => c.companyName))];
  const companyColorMap = new Map<string, string>();
  allCompanyNames.forEach((name, idx) => {
    companyColorMap.set(name, COMPANY_COLORS[idx % COMPANY_COLORS.length]);
  });

  return (
    <>
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="bg-gradient-to-l from-muted/60 to-muted/30 pb-3">
          <CardTitle className="text-base font-bold">قائمة الأرباح والخسائر — مقارنة شهرية بين الشركات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="min-w-[260px] font-bold bg-muted/30" rowSpan={2}>
                    البند المالي
                  </TableHead>
                  {periodGroups.map((pg) => (
                    <TableHead
                      key={pg.period}
                      colSpan={pg.datasets.length * 2}
                      className="text-center font-bold border-b text-sm"
                      style={{ backgroundColor: '#f0fdf4' }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {periodToArabic(pg.period)}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className="bg-muted/10">
                  {periodGroups.map((pg) =>
                    pg.datasets.map((ds) => {
                      const color = companyColorMap.get(ds.companyName) || COMPANY_COLORS[0];
                      return (
                        <React.Fragment key={ds.id}>
                          <TableHead
                            className="min-w-[130px] text-center text-xs font-medium"
                            style={{ color, backgroundColor: `${color}10` }}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                              {ds.companyName}
                            </div>
                            <span className="opacity-60 text-[10px]">{ds.currency}</span>
                          </TableHead>
                          <TableHead
                            className="min-w-[60px] text-center text-[10px] font-medium bg-muted/5"
                            style={{ backgroundColor: `${color}05` }}
                          >
                            النسبة %
                          </TableHead>
                        </React.Fragment>
                      );
                    })
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allLineItems.map((item) => {
                  const key = item.isCustom ? item.name : getLineItemKey(item.name);
                  const isSummary = item.isSubtotal || item.isTotal;
                  const isClickable = !isSummary && (item.category === 'expense' || item.category === 'revenue') && accountsWithData.has(key);

                  return (
                    <TableRow
                      key={key}
                      className={`${isSummary ? 'bg-muted/30 font-bold' : ''} ${
                        item.category === 'profit' && !isSummary ? 'bg-emerald-50/30' : ''
                      } ${item.isCustom ? 'bg-blue-50/20' : ''} ${
                        isClickable ? 'cursor-pointer hover:bg-violet-50/30 dark:hover:bg-violet-950/20' : 'hover:bg-muted/10'
                      } transition-colors`}
                      onClick={isClickable ? () => handleRowClick(item) : undefined}
                    >
                      <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {renderLineItemName(item)}
                        {isClickable && (
                          <ChevronLeft className="h-3 w-3 text-violet-500/40 inline mr-1" />
                        )}
                      </TableCell>
                      {periodGroups.map((pg) =>
                        pg.datasets.map((ds) => {
                          const value = ds.data[key] || 0;
                          const revenue = ds.data['revenue'] || 0;
                          const pct = key === 'revenue'
                            ? revenue !== 0 ? '100.0%' : '—'
                            : revenue !== 0
                              ? `${((value / revenue) * 100).toFixed(1)}%`
                              : '—';
                          return (
                            <React.Fragment key={ds.id + key}>
                              <TableCell
                                className={`text-center tabular-nums text-sm ${
                                  value < 0 ? 'text-red-600' : isSummary ? 'text-foreground font-bold' : ''
                                }`}
                              >
                                {formatNumber(value, ds.currency)}
                              </TableCell>
                              <TableCell className="text-center tabular-nums text-xs text-muted-foreground bg-muted/5">
                                {pct}
                              </TableCell>
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="border-t px-4 py-3 bg-muted/10">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p>الجدول مجمّع حسب الشهر — كل شهر يعرض جميع الشركات جنباً إلى جنب للمقارنة المباشرة</p>
                <p>اضغط على أي بند مصروف أو إيراد لعرض القيود المحاسبية المحسوبة تلقائياً</p>
                <p>البنود المخصصة <Tag className="h-2.5 w-2.5 inline" /> مضافة من ملف Excel — يتم تصنيفها تلقائياً حسب الاسم</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <JournalEntriesDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        lineItem={selectedLineItem}
        accountKey={selectedAccountKey}
      />
    </>
  );
}
