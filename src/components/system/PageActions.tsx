'use client';

import { Button } from '@/components/ui/button';
import { Printer, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PageActionsProps {
  /** Optional: custom export handler. If not provided, exports current page tables to Excel. */
  onExportExcel?: () => void;
  /** Optional: custom print handler. If not provided, triggers window.print() */
  onPrint?: () => void;
  /** Optional: refresh handler */
  onRefresh?: () => void;
  /** Hide actions */
  hideExcel?: boolean;
  hidePrint?: boolean;
  /** Additional buttons */
  children?: React.ReactNode;
}

export function PageActions({ onExportExcel, onPrint, onRefresh, hideExcel, hidePrint, children }: PageActionsProps) {
  const handlePrint = () => {
    if (onPrint) onPrint();
    else window.print();
  };

  const handleExportExcel = async () => {
    if (onExportExcel) {
      onExportExcel();
      return;
    }
    // Default: scrape tables on the page and export to Excel
    try {
      const tables = document.querySelectorAll('table');
      if (tables.length === 0) {
        toast.warning('لا توجد جداول للتصدير');
        return;
      }
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      tables.forEach((table, idx) => {
        // Skip tables inside .no-print or non-data tables
        if (table.closest('.no-print')) return;
        const ws = XLSX.utils.table_to_sheet(table);
        const sheetName = `تقرير ${idx + 1}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
      XLSX.writeFile(wb, `dealz-tree-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم تصدير التقرير إلى Excel');
    } catch (e: any) {
      toast.error('فشل تصدير Excel: ' + e.message);
    }
  };

  return (
    <div className="flex items-center gap-2 no-print">
      {children}
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh} title="تحديث">
          <RefreshCw className="h-3.5 w-3.5 ml-1" /> تحديث
        </Button>
      )}
      {!hideExcel && (
        <Button variant="outline" size="sm" onClick={handleExportExcel} title="تصدير Excel">
          <FileSpreadsheet className="h-3.5 w-3.5 ml-1" /> Excel
        </Button>
      )}
      {!hidePrint && (
        <Button variant="outline" size="sm" onClick={handlePrint} title="طباعة">
          <Printer className="h-3.5 w-3.5 ml-1" /> طباعة
        </Button>
      )}
    </div>
  );
}
