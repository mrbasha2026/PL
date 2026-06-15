'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePnLStore } from '@/lib/pnl-store';
import { CompanyPnL } from '@/lib/pnl-types';

export function PnLUpload() {
  const { addCompanies, companies } = usePnLStore();
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
        let addedCount = 0;

        parsed.forEach((company: CompanyPnL) => {
          const exists = companies.some(
            (c) => c.companyName === company.companyName && c.period === company.period
          );
          if (!exists) addedCount++;
        });

        if (addedCount > 0) {
          addCompanies(parsed.filter((c) => !companies.some(
            (ex) => ex.companyName === c.companyName && ex.period === c.period
          )));
          const uniqueCompanies = new Set(parsed.map((c) => c.companyName));
          setSuccess(`تم إضافة ${addedCount} مجموعة بيانات من ${uniqueCompanies.size} شركة`);
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
    [addCompanies, companies]
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
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5 text-teal-600" />
          رفع بيانات الأرباح والخسائر
        </CardTitle>
        <CardDescription>
          ارفع ملف Excel يحتوي على بيانات P&L — يدعم عدة شركات وفترات مالية
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="animate-in fade-in duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-teal-200 bg-teal-50 text-teal-800 animate-in fade-in duration-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
            isDragging
              ? 'border-teal-500 bg-teal-50 scale-[1.01]'
              : 'border-muted-foreground/20 hover:border-teal-400 hover:bg-muted/30'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
              <p className="text-sm text-muted-foreground">جارٍ تحليل الملف...</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
                <Upload className="h-6 w-6 text-teal-600" />
              </div>
              <p className="mb-1 text-sm font-semibold">اسحب وأفلت ملف Excel هنا</p>
              <p className="mb-3 text-xs text-muted-foreground">أو اضغط لاختيار ملف</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer gap-1.5"
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
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {datasetCount > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="h-3.5 w-3.5" />
                <Badge variant="secondary" className="gap-1 text-xs">
                  {companyCount} {companyCount === 1 ? 'شركة' : 'شركات'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {datasetCount} {datasetCount === 1 ? 'فترة' : 'فترة'}
                </Badge>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-teal-700 hover:text-teal-800"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" />
            تحميل القالب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
