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
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getAllLineItems,
  getLineItemKey,
  COMPANY_COLORS,
  groupByPeriod,
  formatNumber,
  periodToArabic,
  JournalEntry,
  buildAccountLedger,
  computeRunningBalance,
  PnLLineItem,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

// ─── Journal Entries Dialog Component ──────────────────────────────────────
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
  const { getFilteredJournalEntries, selectedCompanyNames } = usePnLStore();
  const allEntries = getFilteredJournalEntries();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  // Get entries for this specific account
  const accountEntries = useMemo(() => {
    if (!accountKey) return [];
    return allEntries.filter((e) => e.accountKey === accountKey);
  }, [allEntries, accountKey]);

  // Group by company
  const companiesWithEntries = useMemo(() => {
    const companyMap = new Map<string, JournalEntry[]>();
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

  // Build ledger for selected company
  const ledger = useMemo(() => {
    if (!accountKey || !lineItem || !selectedCompany) return null;
    return buildAccountLedger(
      accountEntries,
      accountKey,
      lineItem.nameAr,
      selectedCompany
    );
  }, [accountEntries, accountKey, lineItem, selectedCompany]);

  // Export to Excel
  const exportToExcel = async () => {
    if (!ledger) return;
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
    XLSX.utils.book_append_sheet(wb, ws, (lineItem?.nameAr || 'Ledger').substring(0, 31));
    XLSX.writeFile(wb, `قيود_${lineItem?.nameAr?.replace(/\s+/g, '_') || 'account'}.xlsx`);
  };

  if (!lineItem || !accountKey) return null;

  const hasNoEntries = accountEntries.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-teal-600" />
            <span>قيود حساب: {lineItem.nameAr}</span>
            <span className="text-sm text-muted-foreground">({lineItem.name})</span>
            {!hasNoEntries && (
              <Badge variant="outline" className="text-[10px]">
                {accountEntries.length} قيد
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            القيود المحاسبية المرحّلة على هذا الحساب ضمن الفترات والشركات المختارة
          </DialogDescription>
        </DialogHeader>

        {hasNoEntries ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/20" />
            <h3 className="text-base font-semibold text-muted-foreground mb-2">
              لا توجد قيود محاسبية لهذا الحساب
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              لم يتم العثور على قيود محاسبية مرجّلة على حساب &ldquo;{lineItem.nameAr}&rdquo; في البيانات المرفوعة.
              يمكنك إضافة قيود عبر ورقة باسم يحتوي على &ldquo;قيود&rdquo; في ملف Excel.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Company tabs */}
            {companiesWithEntries.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">الشركة:</span>
                {companiesWithEntries.map(([name, entries]) => (
                  <Button
                    key={name}
                    variant={selectedCompany === name ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-7 ${
                      selectedCompany === name ? 'bg-teal-600 hover:bg-teal-700' : ''
                    }`}
                    onClick={() => setSelectedCompany(name)}
                  >
                    {name}
                    <Badge variant="outline" className="ml-1.5 text-[9px] h-4 px-1">
                      {entries.length}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}

            {/* Summary stats */}
            {ledger && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-900/50">
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">إجمالي المدين:</span>
                  <span className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
                    {formatNumber(ledger.totalDebit, ledger.entries[0]?.currency || 'SAR', false)}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">إجمالي الدائن:</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatNumber(ledger.totalCredit, ledger.entries[0]?.currency || 'SAR', false)}
                  </span>
                </div>
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
                  ledger.netBalance > 0 
                    ? 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/50'
                    : 'bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-900/50'
                }`}>
                  <span className="text-xs font-medium">صافي الرصيد:</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    ledger.netBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'
                  }`}>
                    {formatNumber(ledger.netBalance, ledger.entries[0]?.currency || 'SAR', false)}
                  </span>
                  {ledger.netBalance > 0 ? (
                    <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700">مدين</Badge>
                  ) : ledger.netBalance < 0 ? (
                    <Badge variant="outline" className="text-[9px] text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-700">دائن</Badge>
                  ) : null}
                </div>

                <div className="mr-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={exportToExcel}
                  >
                    <Download className="h-3.5 w-3.5" />
                    تصدير القيود
                  </Button>
                </div>
              </div>
            )}

            {/* Journal entries table */}
            {ledger && ledger.entries.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10">
                      <TableHead className="text-xs font-bold min-w-[90px]">التاريخ</TableHead>
                      <TableHead className="text-xs font-bold min-w-[80px]">رقم القيد</TableHead>
                      <TableHead className="text-xs font-bold min-w-[200px]">البيان</TableHead>
                      <TableHead className="text-center text-xs font-bold min-w-[100px] bg-red-50/30 dark:bg-red-950/20">مدين</TableHead>
                      <TableHead className="text-center text-xs font-bold min-w-[100px] bg-emerald-50/30 dark:bg-emerald-950/20">دائن</TableHead>
                      <TableHead className="text-center text-xs font-bold min-w-[110px] bg-amber-50/30 dark:bg-amber-950/20">الرصيد التراكمي</TableHead>
                      <TableHead className="text-xs font-bold min-w-[100px]">المرجع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computeRunningBalance(ledger.entries).map(({ entry, runningBalance }, idx) => {
                      const currency = entry.currency || 'SAR';
                      return (
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
                          <TableCell className="text-center tabular-nums text-sm bg-red-50/10 dark:bg-red-950/10">
                            {entry.debit > 0 ? (
                              <span className="font-medium text-red-700 dark:text-red-400">{formatNumber(entry.debit, currency, false)}</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm bg-emerald-50/10 dark:bg-emerald-950/10">
                            {entry.credit > 0 ? (
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">{formatNumber(entry.credit, currency, false)}</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm bg-amber-50/10 dark:bg-amber-950/10">
                            <span className={`font-bold ${
                              runningBalance > 0 ? 'text-amber-700 dark:text-amber-400' : runningBalance < 0 ? 'text-blue-700 dark:text-blue-400' : ''
                            }`}>
                              {formatNumber(Math.abs(runningBalance), currency, false)}
                              {runningBalance > 0 ? ' م' : runningBalance < 0 ? ' د' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.reference || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="bg-muted/20 font-bold border-t-2">
                      <TableCell colSpan={3} className="text-sm">الإجمالي</TableCell>
                      <TableCell className="text-center tabular-nums text-sm text-red-700 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10">
                        {formatNumber(ledger.totalDebit, ledger.entries[0]?.currency || 'SAR', false)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                        {formatNumber(ledger.totalCredit, ledger.entries[0]?.currency || 'SAR', false)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm bg-amber-50/20 dark:bg-amber-950/10">
                        <span className={ledger.netBalance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}>
                          {formatNumber(Math.abs(ledger.netBalance), ledger.entries[0]?.currency || 'SAR', false)}
                          {ledger.netBalance > 0 ? ' م' : ledger.netBalance < 0 ? ' د' : ''}
                        </span>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main PnLTable Component ──────────────────────────────────────────────────
export function PnLTable() {
  const { getFiltered, getAggregatedFiltered, getFilteredJournalEntries, dateRangeStart, dateRangeEnd, companies, journalEntries } = usePnLStore();
  const selected = getFiltered();
  const aggregated = getAggregatedFiltered();
  const isAggregated = !!(dateRangeStart && dateRangeEnd);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<PnLLineItem | null>(null);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);

  // Get all line items including custom ones from the data
  const allLineItems = getAllLineItems(companies);

  // Get accounts that have journal entries
  const accountsWithEntries = useMemo(() => {
    const keys = new Set(journalEntries.map((e) => e.accountKey));
    return keys;
  }, [journalEntries]);

  // Handle row click
  const handleRowClick = (item: PnLLineItem) => {
    // Only allow clicking on non-summary, non-total items that are expenses or revenue
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
    const hasEntries = accountsWithEntries.has(key);

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
        {/* Journal entries indicator */}
        {hasEntries && !isSummary && (
          <span className="inline-flex items-center gap-0.5 text-[9px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-1 py-0.5 rounded"
            title="يحتوي على قيود محاسبية — اضغط لعرضها">
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
                    const isClickable = !isSummary && (item.category === 'expense' || item.category === 'revenue');

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
                  <p>القيم المعروضة بالشكل المضغوط: K = ألف، M = مليون، B = مليار</p>
                  <p>اضغط على أي بند مصروف أو إيراد لعرض القيود المحاسبية المرحّلة عليه</p>
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

  // Standard (non-aggregated) view — grouped by PERIOD, all companies side by side per month
  const periodGroups = groupByPeriod(selected);

  // Build a company index map for consistent color assignment
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
                {/* Period/Month Row — each period spans (numCompanies * 2) columns */}
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
                {/* Company Row — within each period, show each company */}
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
                  const isClickable = !isSummary && (item.category === 'expense' || item.category === 'revenue');

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
                <p>النسبة % = قيمة البند ÷ الإيرادات × 100 — القيم السفلية باللون الأحمر</p>
                <p>اضغط على أي بند مصروف أو إيراد لعرض القيود المحاسبية المرحّلة عليه</p>
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
