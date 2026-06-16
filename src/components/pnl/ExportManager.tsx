'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, Printer, Share2, Copy, Check } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { PNL_LINE_ITEMS, getLineItemKey, groupByCompany, formatNumber, FINANCIAL_RATIOS, periodToArabic } from '@/lib/pnl-types';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

export function ExportManager() {
  const { getFiltered, selectedCompanyNames, selectedPeriods, companies } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Export Excel
  const exportExcel = () => {
    if (groups.length === 0) return;

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // === Sheet 1: البيانات التفصيلية (Detailed P&L) ===
      const detailHeader = ['البند المالي', 'البند (EN)'];
      groups.forEach((group) => {
        group.datasets.forEach((ds) => {
          detailHeader.push(`${group.name} - ${periodToArabic(ds.period)}`);
        });
      });

      const detailRows: (string | number)[][] = [detailHeader];

      PNL_LINE_ITEMS.forEach((item) => {
        const key = getLineItemKey(item.name);
        const row: (string | number)[] = [item.nameAr, item.name];

        groups.forEach((group) => {
          group.datasets.forEach((ds) => {
            const val = ds.data[key] || 0;
            row.push(val);
          });
        });

        detailRows.push(row);
      });

      const detailWs = XLSX.utils.aoa_to_sheet(detailRows);

      // Set column widths
      const colWidths = [{ wch: 30 }, { wch: 30 }];
      groups.forEach((group) => {
        group.datasets.forEach(() => {
          colWidths.push({ wch: 18 });
        });
      });
      detailWs['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, detailWs, 'البيانات التفصيلية');

      // === Sheet 2: النسب المالية (Financial Ratios) ===
      const ratioHeader = ['النسبة', 'النسبة (EN)'];
      groups.forEach((group) => {
        group.datasets.forEach((ds) => {
          ratioHeader.push(`${group.name} - ${periodToArabic(ds.period)}`);
        });
      });

      const ratioRows: (string | number)[][] = [ratioHeader];

      FINANCIAL_RATIOS.forEach((ratio) => {
        const row: (string | number)[] = [ratio.nameAr, ratio.nameEn];

        groups.forEach((group) => {
          group.datasets.forEach((ds) => {
            const val = ratio.formula(ds.data);
            if (ratio.format === 'percentage') {
              row.push(val !== null ? parseFloat(val.toFixed(1)) : '—');
            } else {
              row.push(val !== null ? parseFloat(val.toFixed(2)) : '—');
            }
          });
        });

        ratioRows.push(row);
      });

      const ratioWs = XLSX.utils.aoa_to_sheet(ratioRows);
      ratioWs['!cols'] = [{ wch: 25 }, { wch: 25 }, ...groups.flatMap((g) => g.datasets.map(() => ({ wch: 18 })))];
      XLSX.utils.book_append_sheet(wb, ratioWs, 'النسب المالية');

      // === Sheet 3: المقارنة الشهرية (MoM Comparison) ===
      const momHeader = ['الشركة', 'البند', 'الفترة السابقة', 'الفترة الحالية', 'التغير %'];
      const momRows: (string | number)[][] = [momHeader];

      const keyMetrics = [
        { key: 'revenue', nameAr: 'الإيرادات' },
        { key: 'gross_profit', nameAr: 'إجمالي الربح' },
        { key: 'operating_income_ebit', nameAr: 'الدخل التشغيلي' },
        { key: 'net_income', nameAr: 'صافي الدخل' },
        { key: 'operating_expenses', nameAr: 'المصروفات التشغيلية' },
        { key: 'cost_of_goods_sold', nameAr: 'تكلفة البضاعة المباعة' },
      ];

      groups.forEach((group) => {
        if (group.datasets.length < 2) return;
        const latest = group.datasets[group.datasets.length - 1];
        const previous = group.datasets[group.datasets.length - 2];

        keyMetrics.forEach((metric) => {
          const currVal = latest.data[metric.key] || 0;
          const prevVal = previous.data[metric.key] || 0;
          const change = prevVal !== 0 ? ((currVal - prevVal) / Math.abs(prevVal)) * 100 : 0;

          momRows.push([
            group.name,
            metric.nameAr,
            prevVal,
            currVal,
            parseFloat(change.toFixed(1)),
          ]);
        });
      });

      const momWs = XLSX.utils.aoa_to_sheet(momRows);
      momWs['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, momWs, 'المقارنة الشهرية');

      // Generate and download
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `PnL_Report_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);

      toast({
        title: 'تم تصدير الملف',
        description: `تم تحميل ${filename} بنجاح`,
      });
    } catch (err) {
      console.error('Excel export error:', err);
      toast({
        title: 'خطأ في التصدير',
        description: 'حدث خطأ أثناء إنشاء ملف Excel',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Export PDF (Print)
  const exportPDF = () => {
    document.body.classList.add('printing-pnl');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-pnl');
      }, 500);
    }, 100);
  };

  // Share Link
  const shareLink = () => {
    try {
      const state = {
        c: selectedCompanyNames,
        p: selectedPeriods,
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;

      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        toast({
          title: 'تم نسخ الرابط',
          description: 'يمكنك مشاركة الرابط مع الآخرين لعرض نفس البيانات',
        });
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback: select from a temporary input
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        toast({
          title: 'تم نسخ الرابط',
          description: 'يمكنك مشاركة الرابط مع الآخرين لعرض نفس البيانات',
        });
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (err) {
      console.error('Share link error:', err);
      toast({
        title: 'خطأ في المشاركة',
        description: 'حدث خطأ أثناء إنشاء رابط المشاركة',
        variant: 'destructive',
      });
    }
  };

  // Empty state
  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Download className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات للتصدير والمشاركة</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Export Options */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-slate-50 to-slate-100/50 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-slate-600" />
            تصدير ومشاركة — Export & Share
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Excel Export */}
            <button
              onClick={exportExcel}
              disabled={exporting || groups.length === 0}
              className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-6 transition-all hover:border-emerald-400 hover:bg-emerald-50/60 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-emerald-800">تصدير Excel</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ملف Excel بثلاث أوراق: البيانات التفصيلية والنسب المالية والمقارنة الشهرية
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                .xlsx
              </Badge>
            </button>

            {/* PDF/Print Export */}
            <button
              onClick={exportPDF}
              className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/30 p-6 transition-all hover:border-slate-400 hover:bg-slate-50/60 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-transform group-hover:scale-110">
                <Printer className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-slate-800">طباعة / PDF</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  طباعة التقرير الحالي أو حفظه كملف PDF من متصفحك
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                PDF / Print
              </Badge>
            </button>

            {/* Share Link */}
            <button
              onClick={shareLink}
              className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-6 transition-all hover:border-amber-400 hover:bg-amber-50/60 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-transform group-hover:scale-110">
                {copied ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <Share2 className="h-6 w-6" />
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-amber-800">
                  {copied ? 'تم النسخ!' : 'مشاركة الرابط'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  نسخ رابط يحتوي على الشركات والفترات المحددة للمشاركة مع الآخرين
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                {copied ? (
                  <><Check className="h-3 w-3 ml-1" /> تم النسخ</>
                ) : (
                  <><Copy className="h-3 w-3 ml-1" /> نسخ</>
                )}
              </Badge>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Export Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">تفاصيل التصدير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Excel sheet descriptions */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold">محتوى ملف Excel</span>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">ورقة 1</Badge>
                <span>البيانات التفصيلية — جميع بنود P&L لكل شركة وفترة</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">ورقة 2</Badge>
                <span>النسب المالية — الهوامش ونسب التغطية لكل شركة وفترة</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">ورقة 3</Badge>
                <span>المقارنة الشهرية — التغيرات الفترة لفترة للمؤشرات الرئيسية</span>
              </div>
            </div>
          </div>

          {/* Selected data summary */}
          <div className="rounded-lg border bg-muted/10 p-3">
            <p className="text-xs font-medium mb-2">البيانات المحددة للتصدير:</p>
            <div className="flex flex-wrap gap-1.5">
              {groups.map((group, idx) => (
                <Badge key={group.name} variant="secondary" className="text-[10px] gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `hsl(${(idx * 47) % 360}, 60%, 45%)` }}
                  />
                  {group.name} ({group.periods.length} فترات)
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              إجمالي: {groups.length} {groups.length === 1 ? 'شركة' : 'شركات'} — {selected.length} {selected.length === 1 ? 'مجموعة بيانات' : 'مجموعات بيانات'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
