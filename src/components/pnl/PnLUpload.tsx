'use client';

import React, { useCallback, useState } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePnLStore } from '@/lib/pnl-store';
import { CompanyPnL } from '@/lib/pnl-types';

export function PnLUpload() {
  const { addCompany, companies } = usePnLStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      const validExtensions = ['.xlsx', '.xls'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
        setError('يرجى رفع ملف Excel صالح (.xlsx أو .xls)');
        return;
      }

      setIsUploading(true);
      setError(null);
      setSuccess(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/pnl', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'حدث خطأ أثناء تحليل الملف');
          return;
        }

        const parsedCompanies: CompanyPnL[] = result.companies;
        let addedCount = 0;

        parsedCompanies.forEach((company: CompanyPnL) => {
          // Check for duplicate names
          const exists = companies.some(
            (c) => c.name === company.name && c.period === company.period
          );
          if (!exists) {
            addCompany(company);
            addedCount++;
          }
        });

        if (addedCount > 0) {
          setSuccess(`تم إضافة ${addedCount} شركة بنجاح`);
        } else {
          setError('جميع الشركات في هذا الملف موجودة مسبقاً');
        }
      } catch (err) {
        setError('حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    },
    [addCompany, companies]
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

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

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
      if (!response.ok) throw new Error('Failed to download template');

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

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          رفع بيانات الأرباح والخسائر
        </CardTitle>
        <CardDescription>
          قم برفع ملف Excel يحتوي على بيانات P&L لشركة واحدة أو أكثر
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-muted-foreground/25 hover:border-emerald-400 hover:bg-muted/50'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm text-muted-foreground">جارٍ تحليل الملف...</p>
            </div>
          ) : (
            <>
              <Upload className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="mb-1 text-sm font-medium">
                اسحب وأفلت ملف Excel هنا
              </p>
              <p className="mb-3 text-xs text-muted-foreground">أو</p>
              <label htmlFor="pnl-file-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() =>
                    document.getElementById('pnl-file-upload')?.click()
                  }
                >
                  اختر ملف
                </Button>
              </label>
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

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            يدعم ملفات .xlsx و .xls — كل ورقة تمثل شركة
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-emerald-700 hover:text-emerald-800"
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
