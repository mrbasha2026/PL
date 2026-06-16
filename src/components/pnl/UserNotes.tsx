'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StickyNote, Building2, Copy, Check, Trash2, Info } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import {
  PNL_LINE_ITEMS,
  getLineItemKey,
  groupByCompany,
  formatNumber,
  periodToArabic,
} from '@/lib/pnl-types';
import { InfoTooltip } from '@/components/pnl/InfoTooltip';

function buildNoteKey(companyName: string, period: string, lineItemKey: string): string {
  return `${companyName}::${period}::${lineItemKey}`;
}

export function UserNotes() {
  const { getFiltered, notes, setNote, deleteNote, clearNotes } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // Build flattened rows for the table
  const rows: Array<{
    companyName: string;
    period: string;
    periodAr: string;
    lineItem: typeof PNL_LINE_ITEMS[number];
    lineItemKey: string;
    value: number;
    currency: string;
    noteKey: string;
  }> = [];

  const filteredGroups = filterCompany === 'all'
    ? groups
    : groups.filter((g) => g.name === filterCompany);

  filteredGroups.forEach((group) => {
    group.datasets.forEach((ds) => {
      PNL_LINE_ITEMS.forEach((item) => {
        const lineItemKey = getLineItemKey(item.name);
        const noteKey = buildNoteKey(ds.companyName, ds.period, lineItemKey);
        rows.push({
          companyName: ds.companyName,
          period: ds.period,
          periodAr: periodToArabic(ds.period),
          lineItem: item,
          lineItemKey,
          value: ds.data[lineItemKey] || 0,
          currency: ds.currency,
          noteKey,
        });
      });
    });
  });

  // Count notes
  const notesCount = Object.keys(notes).length;
  const filteredNotesCount = rows.filter((r) => notes[r.noteKey]).length;

  // Export notes as formatted text
  const exportNotes = useCallback(() => {
    const entries = Object.entries(notes);
    if (entries.length === 0) return;

    const lines: string[] = ['📋 تصدير الملاحظات — P&L Notes Export', '═'.repeat(50), ''];

    entries.forEach(([key, value]) => {
      const parts = key.split('::');
      if (parts.length < 3) return;
      const [company, period, itemKey] = parts;
      // Find the Arabic name for the line item
      const lineItem = PNL_LINE_ITEMS.find((li) => getLineItemKey(li.name) === itemKey);
      const itemAr = lineItem?.nameAr || itemKey;

      lines.push(`🏢 الشركة: ${company}`);
      lines.push(`📅 الفترة: ${periodToArabic(period)}`);
      lines.push(`📊 البند: ${itemAr}`);
      lines.push(`📝 الملاحظة: ${value}`);
      lines.push('─'.repeat(40));
      lines.push('');
    });

    lines.push(`إجمالي الملاحظات: ${entries.length}`);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [notes]);

  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لإضافة الملاحظات</h3>
          <p className="text-sm text-muted-foreground mt-1">يمكنك إضافة ملاحظات شخصية على كل بند مالي</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <StickyNote className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notesCount}</p>
              <p className="text-xs text-muted-foreground">إجمالي الملاحظات</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Building2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">الشركات المعروضة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
              <Info className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredNotesCount}</p>
              <p className="text-xs text-muted-foreground">ملاحظات على البيانات الحالية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Notes Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-amber-50/60 to-amber-50/30 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 text-amber-600" />
              ملاحظات المستخدم
              {notesCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                  📝 {notesCount}
                </Badge>
              )}
              <InfoTooltip text="أضف ملاحظاتك الشخصية على كل بند مالي — تُحفظ تلقائياً عند مغادرة الحقل — Add personal annotations to any financial line item. Notes save automatically on blur." side="left" />
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Company filter */}
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">جميع الشركات</option>
                {groups.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={exportNotes}
                disabled={notesCount === 0}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    تصدير الملاحظات
                  </>
                )}
              </Button>
              {notesCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={clearNotes}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  مسح الكل
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 sticky top-0 z-10">
                  <TableHead className="min-w-[180px] text-xs font-bold">البند المالي</TableHead>
                  <TableHead className="min-w-[100px] text-center text-xs font-bold">الشركة</TableHead>
                  <TableHead className="min-w-[100px] text-center text-xs font-bold">الفترة</TableHead>
                  <TableHead className="min-w-[120px] text-center text-xs font-bold">القيمة</TableHead>
                  <TableHead className="min-w-[220px] text-xs font-bold">الملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isSummary = row.lineItem.isSubtotal || row.lineItem.isTotal;
                  const existingNote = notes[row.noteKey] || '';

                  return (
                    <TableRow
                      key={row.noteKey}
                      className={`${isSummary ? 'bg-muted/15 font-bold' : ''} ${
                        existingNote ? 'bg-amber-50/40' : ''
                      } hover:bg-muted/5 transition-colors`}
                    >
                      <TableCell className={`text-sm ${isSummary ? 'font-bold' : 'text-muted-foreground'}`}>
                        <span style={{ paddingRight: `${(row.lineItem.indent || 0) * 20}px` }}>
                          {existingNote && <span className="ml-1 text-xs">📝</span>}
                          {row.lineItem.nameAr}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">{row.companyName}</TableCell>
                      <TableCell className="text-center text-xs">{row.periodAr}</TableCell>
                      <TableCell
                        className={`text-center tabular-nums text-sm ${
                          row.value < 0 ? 'text-red-600' : isSummary ? 'font-bold' : ''
                        }`}
                      >
                        {formatNumber(row.value, row.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={existingNote}
                            onChange={(e) => setNote(row.noteKey, e.target.value)}
                            onBlur={(e) => {
                              if (e.target.value.trim() === '') {
                                deleteNote(row.noteKey);
                              }
                            }}
                            placeholder="أضف ملاحظة..."
                            className={`h-7 text-xs ${
                              existingNote
                                ? 'border-amber-300 bg-amber-50/50 focus:border-amber-400 focus:ring-amber-200'
                                : 'border-dashed border-muted-foreground/30 bg-transparent focus:border-solid focus:border-amber-400'
                            }`}
                          />
                          {existingNote && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                              onClick={() => deleteNote(row.noteKey)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {/* Methodology footer */}
          <div className="border-t px-4 py-3 bg-muted/10">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p>الملاحظات تُحفظ تلقائياً عند مغادرة الحقل — الحقول الفارغة تُحذف تلقائياً</p>
                <p>مفتاح الملاحظة: اسم الشركة + الفترة + البند المالي — البيانات محفوظة في المتصفح فقط</p>
                <p>📝 يشير إلى وجود ملاحظة على البند — الخلفية الصفراء تميّز البنود ذات الملاحظات</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
