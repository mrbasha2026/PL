'use client';

import React from 'react';
import { PnLUpload } from '@/components/pnl/PnLUpload';
import { FilterBar } from '@/components/pnl/FilterBar';
import { PnLTable } from '@/components/pnl/PnLTable';
import { PnLCharts } from '@/components/pnl/PnLCharts';
import { ExecutiveSummary } from '@/components/pnl/ExecutiveSummary';
import { FinancialRatios } from '@/components/pnl/FinancialRatios';
import { usePnLStore } from '@/lib/pnl-store';
import { useAuth } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table2, BarChart3, FileText, Calculator, Database, Upload,
  Download, RefreshCw, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export function PnLModule() {
  const { companies, selectedCompanyNames, selectedPeriods, clearAll, loadFromDB } = usePnLStore();
  const { hasPermission } = useAuth();
  const [loadingDB, setLoadingDB] = React.useState(false);

  const hasData = companies.length > 0;
  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const periodCount = new Set(companies.map((c) => c.period)).size;

  const loadFromDatabase = async () => {
    setLoadingDB(true);
    try {
      const res = await fetch('/api/pnl/save-batch');
      const data = await res.json();
      if (data.datasets && data.datasets.length > 0) {
        // Convert DB datasets to PnL store format
        const companies: any[] = [];
        data.datasets.forEach((d: any) => {
          const lineItems: Record<string, number> = {};
          d.parsed?.lineItems?.forEach((li: any) => {
            lineItems[li.key] = li.amount;
          });
          companies.push({
            id: d.id,
            companyName: d.companyName,
            period: d.period,
            currency: d.currency || 'SAR',
            data: lineItems,
          });
        });
        loadFromDB(companies);
        toast.success(`تم تحميل ${companies.length} سجل من قاعدة البيانات`);
      } else {
        toast.info('لا توجد بيانات P&L محفوظة في قاعدة البيانات');
      }
    } catch (e: any) {
      toast.error('فشل التحميل من قاعدة البيانات: ' + e.message);
    } finally {
      setLoadingDB(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {hasData && (
            <>
              <div className="flex items-center gap-1.5 rounded-xl bg-primary/8 border border-primary/15 px-3 py-1.5">
                <Database className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {companyCount} {companyCount === 1 ? 'شركة' : 'شركات'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 border border-border/40 px-3 py-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {periodCount} {periodCount === 1 ? 'فترة' : 'فترات'}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={loadFromDatabase}
            disabled={loadingDB}
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${loadingDB ? 'animate-spin' : ''}`} />
            تحميل من قاعدة البيانات
          </Button>
          {hasData && hasPermission('pnl.delete') && (
            <Button variant="outline" size="sm" onClick={() => {
              if (confirm('مسح جميع البيانات المحملة محلياً؟ (لا يحذف من قاعدة البيانات)')) {
                clearAll();
                toast.success('تم مسح البيانات');
              }
            }}>
              <Trash2 className="h-4 w-4 ml-1" />
              مسح
            </Button>
          )}
        </div>
      </div>

      {!hasData ? (
        // No data — show upload component
        <PnLUpload />
      ) : (
        <>
          <FilterBar />
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="summary" className="text-xs">
                <FileText className="h-3.5 w-3.5 ml-1" />
                الملخص التنفيذي
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs">
                <Table2 className="h-3.5 w-3.5 ml-1" />
                الجدول المفصل
              </TabsTrigger>
              <TabsTrigger value="ratios" className="text-xs">
                <Calculator className="h-3.5 w-3.5 ml-1" />
                النسب المالية
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-xs">
                <BarChart3 className="h-3.5 w-3.5 ml-1" />
                الرسوم البيانية
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary"><ExecutiveSummary /></TabsContent>
            <TabsContent value="table"><PnLTable /></TabsContent>
            <TabsContent value="ratios"><FinancialRatios /></TabsContent>
            <TabsContent value="charts"><PnLCharts /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
