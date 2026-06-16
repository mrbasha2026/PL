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

// ─── Journal Entries Dialog Component (Professional Design) ──────────────────
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

  // Auto-generate journal entries from P&L data
  const allAutoEntries = useMemo(() => {
    const filtered = companies.filter(
      (c) => selectedCompanyNames.includes(c.companyName) && selectedPeriods.includes(c.period)
    );
    return generateAutoJournalEntries(filtered, allLineItems);
  }, [companies, allLineItems, selectedCompanyNames, selectedPeriods]);

  // Filter for this specific account
  const accountEntries = useMemo(() => {
    if (!accountKey) return [];
    return allAutoEntries
      .filter((e) => e.accountKey === accountKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allAutoEntries, accountKey]);

  // Group by company
  const companiesWithEntries = useMemo(() => {
    const companyMap = new Map<string, AutoJournalEntry[]>();
    accountEntries.forEach((e) => {
      const existing = companyMap.get(e.companyName) || [];
      existing.push(e);
      companyMap.set(e.companyName, existing);
    });
    return Array.from(companyMap.entries());
  }, [accountEntries]);

  // Auto-select first company
  React.useEffect(() => {
    if (!selectedCompany && companiesWithEntries.length > 0) {
      setSelectedCompany(companiesWithEntries[0][0]);
    }
  }, [companiesWithEntries, selectedCompany]);

  // Selected company entries
  const selectedEntries = useMemo(() => {
    if (!selectedCompany) return [];
    return accountEntries.filter((e) => e.companyName === selectedCompany);
  }, [accountEntries, selectedCompany]);

  const withBalance = useMemo(() => computeRunningBalance(selectedEntries), [selectedEntries]);

  const totalDebit = selectedEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = selectedEntries.reduce((s, e) => s + e.credit, 0);
  const netBalance = totalDebit - totalCredit;
  const currency = selectedEntries[0]?.currency || 'SAR';

  // Export to Excel
  const exportToExcel = async () => {
    if (selectedEntries.length === 0) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const header = ['التاريخ', 'رقم القيد', 'البيان', 'مدين', 'دائن', 'الرصيد', 'م/د', 'المرجع'];
    const rows = withBalance.map(({ entry, runningBalance }) => [
      entry.date,
      entry.entryNumber,
      entry.description,
      entry.debit || '',
      entry.credit || '',
      Math.abs(runningBalance),
      runningBalance > 0 ? 'مدين' : runningBalance < 0 ? 'دائن' : '',
      entry.reference,
    ]);

    rows.push([
      'الإجمالي', '', '',
      totalDebit, totalCredit,
      Math.abs(netBalance),
      netBalance > 0 ? 'مدين' : netBalance < 0 ? 'دائن' : '',
      '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [
      { wch: 14 }, { wch: 16 }, { wch: 45 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, (lineItem?.nameAr || 'Ledger').substring(0, 31));
    XLSX.writeFile(wb, `قيود_${lineItem?.nameAr?.replace(/\s+/g, '_') || 'account'}.xlsx`);
  };

  if (!lineItem || !accountKey) return null;

  const isExpense = lineItem.category === 'expense';
  const isRevenue = lineItem.category === 'revenue';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden" dir="rtl">
        {/* ─── Header Banner ─────────────────────────────────── */}
        <div className={`px-6 py-5 ${
          isExpense
            ? 'bg-gradient-to-l from-red-600 via-red-500 to-rose-500'
            : 'bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                {isExpense ? (
                  <ArrowUpRight className="h-5 w-5 text-white" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {isExpense ? 'قيود حساب مصروف' : 'قيود حساب إيراد'}
                </h2>
                <p className="text-white/80 text-sm mt-0.5">
                  {lineItem.nameAr} — {lineItem.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs px-2.5 py-1">
                <Sparkles className="h-3 w-3 ml-1" />
                محسوب تلقائياً
              </Badge>
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs px-2.5 py-1">
                {accountEntries.length} قيد
              </Badge>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* ─── Company Selector ──────────────────────────────── */}
          {companiesWithEntries.length > 1 && (
            <div className="px-6 pt-4 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  الشركة:
                </span>
                {companiesWithEntries.map(([name, entries], idx) => {
                  const isActive = selectedCompany === name;
                  const color = COMPANY_COLORS[idx % COMPANY_COLORS.length];
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedCompany(name)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive
                          ? 'text-white shadow-md scale-105'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                      style={isActive ? { backgroundColor: color } : undefined}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isActive ? 'white' : color }} />
                      {name}
                      <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted-foreground/60'}`}>
                        ({entries.length})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Summary Cards ─────────────────────────────────── */}
          {selectedEntries.length > 0 && (
            <div className="px-6 pt-3 pb-2">
              <div className="grid grid-cols-3 gap-3">
                {/* Total Debit */}
                <div className="relative overflow-hidden rounded-xl border border-red-200/60 dark:border-red-900/40 bg-gradient-to-bl from-red-50 to-white dark:from-red-950/30 dark:to-slate-900 p-3.5">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[11px] font-medium text-red-600 dark:text-red-400">إجمالي المدين</span>
                  </div>
                  <p className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">
                    {formatNumber(totalDebit, currency, false)}
                  </p>
                </div>

                {/* Total Credit */}
                <div className="relative overflow-hidden rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-bl from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900 p-3.5">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">إجمالي الدائن</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {formatNumber(totalCredit, currency, false)}
                  </p>
                </div>

                {/* Net Balance */}
                <div className={`relative overflow-hidden rounded-xl border p-3.5 ${
                  isExpense
                    ? 'border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-bl from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900'
                    : 'border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-bl from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900'
                }`}>
                  <div className={`absolute top-0 left-0 w-1 h-full ${isExpense ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className={`h-3.5 w-3.5 ${isExpense ? 'text-amber-500' : 'text-blue-500'}`} />
                    <span className={`text-[11px] font-medium ${isExpense ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      صافي الرصيد
                    </span>
                    <Badge className={`text-[9px] h-4 px-1.5 ${
                      isExpense
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0'
                    }`}>
                      {isExpense ? 'مدين' : 'دائن'}
                    </Badge>
                  </div>
                  <p className={`text-lg font-bold tabular-nums ${isExpense ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'}`}>
                    {formatNumber(Math.abs(netBalance), currency, false)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Export Button ──────────────────────────────────── */}
          {selectedEntries.length > 0 && (
            <div className="px-6 pt-1 pb-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7 rounded-lg"
                onClick={exportToExcel}
              >
                <Download className="h-3.5 w-3.5" />
                تصدير القيود Excel
              </Button>
            </div>
          )}

          {/* ─── Journal Entries Table ──────────────────────────── */}
          {withBalance.length > 0 && (
            <div className="px-6 pb-6">
              <div className="overflow-x-auto rounded-xl border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="text-[11px] font-bold min-w-[85px] text-slate-600 dark:text-slate-300">
                        <Calendar className="h-3 w-3 inline ml-1" />
                        التاريخ
                      </TableHead>
                      <TableHead className="text-[11px] font-bold min-w-[90px] text-slate-600 dark:text-slate-300">رقم القيد</TableHead>
                      <TableHead className="text-[11px] font-bold min-w-[220px] text-slate-600 dark:text-slate-300">
                        <FileText className="h-3 w-3 inline ml-1" />
                        البيان
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold min-w-[110px] bg-red-50/80 dark:bg-red-950/20 text-red-700 dark:text-red-300">
                        مدين
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold min-w-[110px] bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                        دائن
                      </TableHead>
                      <TableHead className="text-center text-[11px] font-bold min-w-[120px] bg-amber-50/80 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                        الرصيد
                      </TableHead>
                      <TableHead className="text-[11px] font-bold min-w-[110px] text-slate-600 dark:text-slate-300">المرجع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withBalance.map(({ entry, runningBalance }, idx) => {
                      const isLast = idx === withBalance.length - 1;
                      return (
                        <TableRow
                          key={entry.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            idx % 2 !== 0 ? 'bg-slate-25 dark:bg-slate-900/20' : ''
                          }`}
                        >
                          <TableCell className="text-xs tabular-nums font-medium text-slate-700 dark:text-slate-300">
                            {entry.date ? new Date(entry.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {entry.entryNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs bg-red-50/30 dark:bg-red-950/10">
                            {entry.debit > 0 ? (
                              <span className="font-semibold text-red-600 dark:text-red-400">{formatNumber(entry.debit, currency, false)}</span>
                            ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs bg-emerald-50/30 dark:bg-emerald-950/10">
                            {entry.credit > 0 ? (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatNumber(entry.credit, currency, false)}</span>
                            ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs bg-amber-50/30 dark:bg-amber-950/10">
                            <span className={`font-bold ${
                              runningBalance > 0 ? 'text-amber-600 dark:text-amber-400' : runningBalance < 0 ? 'text-blue-600 dark:text-blue-400' : ''
                            }`}>
                              {formatCompact(Math.abs(runningBalance))}
                              <span className="text-[9px] mr-0.5 opacity-70">
                                {runningBalance > 0 ? 'م' : runningBalance < 0 ? 'د' : ''}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {entry.reference}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* ─── Totals Row ─────────────────────────────── */}
                    <TableRow className="bg-slate-100/80 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-600">
                      <TableCell colSpan={3} className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        الإجمالي
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/15">
                        {formatNumber(totalDebit, currency, false)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/15">
                        {formatNumber(totalCredit, currency, false)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-xs font-bold bg-amber-50/40 dark:bg-amber-950/15">
                        <span className={netBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}>
                          {formatNumber(Math.abs(netBalance), currency, false)}
                          <span className="text-[9px] mr-0.5 opacity-70">
                            {netBalance > 0 ? ' مدين' : netBalance < 0 ? ' دائن' : ''}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* ─── Footer Note ──────────────────────────────── */}
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                <p>
                  القيود محسوبة تلقائياً من بيانات قائمة الأرباح والخسائر — الحسابات المدينة: المصروفات | الحسابات الدائنة: الإيرادات
                </p>
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
          <span className="inline-flex items-center gap-0.5 text-[9px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-1.5 py-0.5 rounded-full"
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
                          isClickable ? 'cursor-pointer hover:bg-teal-50/30 dark:hover:bg-teal-950/20' : 'hover:bg-muted/10'
                        } transition-colors`}
                        onClick={isClickable ? () => handleRowClick(item) : undefined}
                      >
                        <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {renderLineItemName(item)}
                          {isClickable && (
                            <ChevronLeft className="h-3 w-3 text-muted-foreground/40 inline mr-1" />
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
                        isClickable ? 'cursor-pointer hover:bg-teal-50/30 dark:hover:bg-teal-950/20' : 'hover:bg-muted/10'
                      } transition-colors`}
                      onClick={isClickable ? () => handleRowClick(item) : undefined}
                    >
                      <TableCell className={`font-medium ${isSummary ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {renderLineItemName(item)}
                        {isClickable && (
                          <ChevronLeft className="h-3 w-3 text-muted-foreground/40 inline mr-1" />
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
