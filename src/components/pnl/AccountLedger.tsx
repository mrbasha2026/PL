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
  Building2, BookOpen, ArrowUpRight, ArrowDownRight, Minus,
  Search, Download, FileSpreadsheet, Filter,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getAllLineItems,
  getLineItemKey,
  COMPANY_COLORS,
  JournalEntry,
  AccountLedger,
  buildAccountLedger,
  computeRunningBalance,
  formatNumber,
  formatCompact,
  detectCategory,
} from '@/lib/pnl-types';

// ─── Category filter options ────────────────────────────────────────────────
type CategoryFilter = 'all' | 'revenue' | 'expense' | 'profit';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'الكل',
  revenue: 'الإيرادات',
  expense: 'المصروفات',
  profit: 'الأرباح',
};

// ─── Single Account Ledger View ────────────────────────────────────────────
function AccountLedgerView({ ledger }: { ledger: AccountLedger }) {
  const withBalance = computeRunningBalance(ledger.entries);
  const currency = ledger.entries[0]?.currency || 'SAR';

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-teal-600" />
          <span>دفتر الأستاذ — {ledger.accountNameAr}</span>
          <Badge variant="outline" className="text-[10px]">
            {ledger.entries.length} قيد
          </Badge>
        </CardTitle>

        {/* Summary stats */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-red-50/50 border-red-200/50">
            <span className="text-xs font-medium text-red-700">إجمالي المدين:</span>
            <span className="text-sm font-bold text-red-700 tabular-nums">
              {formatNumber(ledger.totalDebit, currency, false)}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-emerald-50/50 border-emerald-200/50">
            <span className="text-xs font-medium text-emerald-700">إجمالي الدائن:</span>
            <span className="text-sm font-bold text-emerald-700 tabular-nums">
              {formatNumber(ledger.totalCredit, currency, false)}
            </span>
          </div>
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
            ledger.netBalance > 0 ? 'bg-amber-50/50 border-amber-200/50' : 'bg-blue-50/50 border-blue-200/50'
          }`}>
            <span className="text-xs font-medium">صافي الرصيد:</span>
            <span className={`text-sm font-bold tabular-nums ${
              ledger.netBalance > 0 ? 'text-amber-700' : 'text-blue-700'
            }`}>
              {formatNumber(ledger.netBalance, currency, false)}
            </span>
            {ledger.netBalance > 0 ? (
              <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300">مدين</Badge>
            ) : ledger.netBalance < 0 ? (
              <Badge variant="outline" className="text-[9px] text-blue-700 border-blue-300">دائن</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10">
                <TableHead className="text-xs font-bold min-w-[90px]">التاريخ</TableHead>
                <TableHead className="text-xs font-bold min-w-[80px]">رقم القيد</TableHead>
                <TableHead className="text-xs font-bold min-w-[200px]">البيان</TableHead>
                <TableHead className="text-center text-xs font-bold min-w-[100px] bg-red-50/30">مدين</TableHead>
                <TableHead className="text-center text-xs font-bold min-w-[100px] bg-emerald-50/30">دائن</TableHead>
                <TableHead className="text-center text-xs font-bold min-w-[110px] bg-amber-50/30">الرصيد التراكمي</TableHead>
                <TableHead className="text-xs font-bold min-w-[100px]">المرجع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withBalance.map(({ entry, runningBalance }, idx) => (
                <TableRow key={entry.id} className={`hover:bg-muted/5 ${idx % 2 === 0 ? '' : 'bg-muted/[0.02]'}`}>
                  <TableCell className="text-sm tabular-nums">
                    {entry.date ? new Date(entry.date).toLocaleDateString('ar-SA') : '—'}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {entry.entryNumber || '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.description || '—'}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm bg-red-50/10">
                    {entry.debit > 0 ? (
                      <span className="font-medium text-red-700">{formatNumber(entry.debit, currency, false)}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm bg-emerald-50/10">
                    {entry.credit > 0 ? (
                      <span className="font-medium text-emerald-700">{formatNumber(entry.credit, currency, false)}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-sm bg-amber-50/10">
                    <span className={`font-bold ${
                      runningBalance > 0 ? 'text-amber-700' : runningBalance < 0 ? 'text-blue-700' : ''
                    }`}>
                      {formatNumber(Math.abs(runningBalance), currency, false)}
                      {runningBalance > 0 ? ' م' : runningBalance < 0 ? ' د' : ''}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.reference || '—'}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="bg-muted/20 font-bold border-t-2">
                <TableCell colSpan={3} className="text-sm text-left">الإجمالي</TableCell>
                <TableCell className="text-center tabular-nums text-sm text-red-700 bg-red-50/20">
                  {formatNumber(ledger.totalDebit, currency, false)}
                </TableCell>
                <TableCell className="text-center tabular-nums text-sm text-emerald-700 bg-emerald-50/20">
                  {formatNumber(ledger.totalCredit, currency, false)}
                </TableCell>
                <TableCell className="text-center tabular-nums text-sm bg-amber-50/20">
                  <span className={ledger.netBalance > 0 ? 'text-amber-700' : 'text-blue-700'}>
                    {formatNumber(Math.abs(ledger.netBalance), currency, false)}
                    {ledger.netBalance > 0 ? ' م' : ledger.netBalance < 0 ? ' د' : ''}
                  </span>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Export Ledger to Excel ────────────────────────────────────────────────
async function exportLedgerToExcel(ledger: AccountLedger) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const currency = ledger.entries[0]?.currency || 'SAR';

  const header = ['التاريخ', 'رقم القيد', 'البيان', 'مدين', 'دائن', 'الرصيد', 'م/د', 'المرجع'];
  const withBalance = computeRunningBalance(ledger.entries);

  const rows = withBalance.map(({ entry, runningBalance }) => [
    entry.date,
    entry.entryNumber,
    entry.description,
    entry.debit,
    entry.credit,
    Math.abs(runningBalance),
    runningBalance > 0 ? 'مدين' : runningBalance < 0 ? 'دائن' : '',
    entry.reference,
  ]);

  // Totals row
  rows.push([
    'الإجمالي', '', '',
    ledger.totalDebit, ledger.totalCredit,
    Math.abs(ledger.netBalance),
    ledger.netBalance > 0 ? 'مدين' : ledger.netBalance < 0 ? 'دائن' : '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 40 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, ledger.accountNameAr.substring(0, 31));

  XLSX.writeFile(wb, `دفتر_أستاذ_${ledger.accountNameAr.replace(/\s+/g, '_')}.xlsx`);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AccountLedgerExplorer() {
  const { getFilteredJournalEntries, companies, journalEntries } = usePnLStore();
  const allEntries = getFilteredJournalEntries();

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Get all line items
  const allLineItems = useMemo(() => getAllLineItems(companies), [companies]);

  // Get accounts that have journal entries
  const accountsWithEntries = useMemo(() => {
    const accountKeys = new Set(allEntries.map((e) => e.accountKey));
    return allLineItems.filter((item) => {
      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      return accountKeys.has(key);
    });
  }, [allEntries, allLineItems]);

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

  // Company list with journal entries
  const companyNames = useMemo(
    () => [...new Set(allEntries.map((e) => e.companyName))],
    [allEntries]
  );

  // Auto-select first account
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

  // Build ledgers for all accounts (grouped by selected company)
  const ledgers = useMemo(() => {
    if (!selectedCompany || !selectedAccountKey) return [];
    const selectedItem = allLineItems.find((item) =>
      item.isCustom ? item.name === selectedAccountKey : getLineItemKey(item.name) === selectedAccountKey
    );
    if (!selectedItem) return [];
    const ledger = buildAccountLedger(
      allEntries,
      selectedAccountKey,
      selectedItem.nameAr,
      selectedCompany
    );
    return [ledger];
  }, [allEntries, selectedAccountKey, selectedCompany, allLineItems]);

  // All ledgers for quick overview
  const allLedgers = useMemo(() => {
    if (!selectedCompany) return [];
    return accountsWithEntries.map((item) => {
      const key = item.isCustom ? item.name : getLineItemKey(item.name);
      return buildAccountLedger(allEntries, key, item.nameAr, selectedCompany || '');
    }).filter((l) => l.entries.length > 0);
  }, [allEntries, accountsWithEntries, selectedCompany]);

  // No data state
  if (allEntries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            لا توجد قيود محاسبية لعرضها
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            القيود المحاسبية (الحركات) تُعرض هنا عند رفع ملف Excel يحتوي على أوراق القيود.
            أضف ورقة باسم يحتوي على "قيود" أو "Journal" في ملف Excel.
          </p>
          <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-right max-w-lg">
            <h4 className="text-sm font-bold mb-2">كيف تضيف القيود إلى Excel:</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>أنشئ ورقة جديدة في ملف Excel</li>
              <li>سمّ الورقة باسم يحتوي على "قيود" مثل: قيود النخبة</li>
              <li>الصف الأول: عناوين الأعمدة (التاريخ، رقم القيد، الحساب، البيان، المدين، الدائن، المرجع، الفترة)</li>
              <li>كل صف = قيد محاسبي واحد مرحّل على الحساب</li>
              <li>ارفع الملف وستظهر القيود هنا تلقائياً</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Controls ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Search + Category filter */}
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

          {/* Account + Company selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">الحساب:</span>
            <Select
              value={selectedAccountKey || ''}
              onValueChange={(val) => setSelectedAccountKey(val)}
            >
              <SelectTrigger className="w-full max-w-md text-sm">
                <SelectValue placeholder="اختر حساباً" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredAccounts.map((item) => {
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
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">الشركة:</span>
            <Select
              value={selectedCompany || ''}
              onValueChange={(val) => setSelectedCompany(val)}
            >
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
      {ledgers.map((ledger) => (
        <div key={ledger.accountKey}>
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => exportLedgerToExcel(ledger)}
              disabled={ledger.entries.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              تصدير دفتر الأستاذ إلى Excel
            </Button>
          </div>
          <AccountLedgerView ledger={ledger} />
        </div>
      ))}

      {/* ─── Quick overview: All accounts with entries ────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-600" />
            ملخص الحسابات ذات القيود
            <Badge variant="outline" className="text-[10px]">{allLedgers.length} حساب</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allLedgers.map((ledger) => {
              const isSelected = ledger.accountKey === selectedAccountKey;
              const netClass = ledger.netBalance > 0
                ? 'text-amber-700' : ledger.netBalance < 0 ? 'text-blue-700' : '';
              return (
                <button
                  key={ledger.accountKey}
                  onClick={() => setSelectedAccountKey(ledger.accountKey)}
                  className={`text-right rounded-lg border p-3 transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50/50 ring-2 ring-teal-400/30 shadow-sm'
                      : 'border-muted hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{ledger.accountNameAr}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {ledger.entries.length} قيد
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div className="text-red-600">
                      مدين: {formatCompact(ledger.totalDebit)}
                    </div>
                    <div className="text-emerald-600">
                      دائن: {formatCompact(ledger.totalCredit)}
                    </div>
                  </div>
                  <div className={`mt-1 text-sm font-bold tabular-nums ${netClass}`}>
                    الرصيد: {formatCompact(Math.abs(ledger.netBalance))}
                    {ledger.netBalance > 0 ? ' مدين' : ledger.netBalance < 0 ? ' دائن' : ''}
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
