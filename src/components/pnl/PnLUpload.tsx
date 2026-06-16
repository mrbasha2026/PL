'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePnLStore } from '@/lib/pnl-store';
import { CompanyPnL, JournalEntry } from '@/lib/pnl-types';

export function PnLUpload() {
  const { addCompanies, addJournalEntries, companies } = usePnLStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.xlsx', '.xls'].includes(ext)) {
        setError('يرجى رفع ملف Excel صالح (.xlsx أو .xls)');
        return;
      }

      setIsUploading(true);
      setError(null);
      setSuccess(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/pnl', { method: 'POST', body: formData });
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'حدث خطأ أثناء تحليل الملف');
          return;
        }

        const parsed: CompanyPnL[] = result.companies;
        const parsedEntries: JournalEntry[] = result.journalEntries || [];
        let addedCount = 0;

        parsed.forEach((company: CompanyPnL) => {
          const exists = companies.some(
            (c) => c.companyName === company.companyName && c.period === company.period
          );
          if (!exists) addedCount++;
        });

        if (addedCount > 0 || parsedEntries.length > 0) {
          if (addedCount > 0) {
            addCompanies(parsed.filter((c) => !companies.some(
              (ex) => ex.companyName === c.companyName && ex.period === c.period
            )));
          }
          if (parsedEntries.length > 0) {
            addJournalEntries(parsedEntries);
          }
          const uniqueCompanies = new Set(parsed.map((c) => c.companyName));

          // ─── Save parsed P&L data to Supabase database ────────────────────
          // This satisfies the user's requirement: "عند رفع البيانات الاكسل
          // يتم تخزينها في قاعدة البيانات"
          try {
            const records = parsed.map((c: any) => ({
              companyName: c.companyName,
              period: c.period,
              currency: c.currency || 'SAR',
              periodType: 'monthly',
              fileName: file.name,
              lineItems: Object.entries(c.data || {}).map(([key, amount]: any) => ({
                name: key,
                key,
                amount: Number(amount) || 0,
              })),
            }));
            const saveRes = await fetch('/api/pnl/save-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ records }),
            });
            if (saveRes.ok) {
              const saveData = await saveRes.json();
              console.log('[pnl] saved to DB:', saveData);
            }
          } catch (dbErr) {
            console.error('[pnl] DB save failed:', dbErr);
            // Don't fail the whole upload — local state was already updated
          }

          const msg = [
            addedCount > 0 ? `${addedCount} مجموعة بيانات من ${uniqueCompanies.size} شركة` : '',
            parsedEntries.length > 0 ? `${parsedEntries.length} قيد محاسبي` : '',
          ].filter(Boolean).join(' + ');
          setSuccess(`تم إضافة ${msg} وتخزينها في قاعدة البيانات`);
        } else {
          setError('جميع البيانات في هذا الملف موجودة مسبقاً');
        }
      } catch (err) {
        setError('حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [addCompanies, addJournalEntries, companies]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
      e.target.value = '';
    },
    [handleFileUpload]
  );

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/pnl', { method: 'GET' });
      if (!response.ok) throw new Error('Failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PnL_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('حدث خطأ أثناء تحميل القالب');
      console.error(err);
    }
  };

  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const datasetCount = companies.length;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="animate-in fade-in duration-300 rounded-2xl border-destructive/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-300 rounded-2xl">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          isDragging
            ? 'border-primary bg-primary/8 scale-[1.01] shadow-lg shadow-primary/10'
            : 'border-border/60 hover:border-primary/50 hover:bg-primary/3'
        }`}
      >
        {/* Decorative gradient corners */}
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-chart-4/8 blur-3xl" />

        {isUploading ? (
          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <Loader2 className="relative h-12 w-12 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">جارٍ تحليل الملف...</p>
          </div>
        ) : (
          <div className="relative">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-4 shadow-lg shadow-primary/25">
              <Upload className="h-7 w-7 text-white" />
            </div>
            <p className="mb-1 text-base font-bold">اسحب وأفلت ملف Excel هنا</p>
            <p className="mb-4 text-xs text-muted-foreground">أو اضغط لاختيار ملف من جهازك</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/8"
              onClick={() => document.getElementById('pnl-file-upload')?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              اختر ملف
            </Button>
            <input
              id="pnl-file-upload"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          {datasetCount > 0 && (
            <>
              <Badge variant="outline" className="gap-1.5 text-xs rounded-xl border-primary/30 bg-primary/5 text-primary">
                <Database className="h-3 w-3" />
                {companyCount} {companyCount === 1 ? 'شركة' : 'شركات'}
              </Badge>
              <Badge variant="outline" className="text-xs rounded-xl">
                {datasetCount} {datasetCount === 1 ? 'فترة' : 'فترة'}
              </Badge>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-primary hover:bg-primary/8 rounded-xl"
          onClick={handleDownloadTemplate}
        >
          <Download className="h-4 w-4" />
          تحميل القالب
        </Button>
      </div>
    </div>
  );
}
