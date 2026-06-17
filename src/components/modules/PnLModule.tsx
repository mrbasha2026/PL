'use client';

import React from 'react';
import { PnLUpload } from '@/components/pnl/PnLUpload';
import { FilterBar } from '@/components/pnl/FilterBar';
import { PnLTable } from '@/components/pnl/PnLTable';
import { PnLCharts } from '@/components/pnl/PnLCharts';
import { ExecutiveSummary } from '@/components/pnl/ExecutiveSummary';
import { FinancialRatios } from '@/components/pnl/FinancialRatios';
import { PnLComparison } from '@/components/pnl/PnLComparison';
import { VarianceAnalysis } from '@/components/pnl/VarianceAnalysis';
import { YoYComparison } from '@/components/pnl/YoYComparison';
import { CompanyMoM } from '@/components/pnl/CompanyMoM';
import { Glossary } from '@/components/pnl/Glossary';
import { usePnLStore } from '@/lib/pnl-store';
import { useAuth } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageActions } from '@/components/system/PageActions';
import {
  Table2, BarChart3, FileText, Calculator, GitCompareArrows,
  CalendarDays, ArrowUpDown, AlertTriangle, BookOpen, Database, Upload,
  Trash2, RefreshCw, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function PnLModule() {
  const { companies, clearAll, loadFromDB } = usePnLStore();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Auto-load from database on mount — ALWAYS fetch from DB, never localStorage-only
  const loadFromDatabase = React.useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    try {
      const res = await fetch('/api/pnl/save-batch');
      const data = await res.json();
      if (data.datasets && data.datasets.length > 0) {
        // Convert DB datasets to PnL store format
        const dbCompanies: any[] = [];
        data.datasets.forEach((d: any) => {
          const lineItems: Record<string, number> = {};
          d.parsed?.lineItems?.forEach((li: any) => {
            lineItems[li.key] = li.amount;
          });
          dbCompanies.push({
            id: d.id,
            companyName: d.companyName,
            period: d.period,
            currency: d.currency || 'SAR',
            data: lineItems,
          });
        });
        loadFromDB(dbCompanies);
        if (showToast) toast.success(`تم تحميل ${dbCompanies.length} سجل من قاعدة البيانات`);
      } else {
        // No data — clear the store so user sees the upload prompt
        if (companies.length > 0) clearAll();
        if (showToast) toast.info('لا توجد بيانات P&L في قاعدة البيانات بعد');
      }
    } catch (e: any) {
      if (showToast) toast.error('فشل التحميل من قاعدة البيانات: ' + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadFromDB, clearAll, companies.length]);

  React.useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  const hasData = companies.length > 0;
  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const periodCount = new Set(companies.map((c) => c.period)).size;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between no-print">
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
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                <Database className="h-3 w-3 text-emerald-600" />
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  متصل بقاعدة البيانات
                </span>
              </div>
            </>
          )}
        </div>
        <PageActions
          onRefresh={() => loadFromDatabase(true)}
          hideExcel={false}
          hidePrint={false}
        >
          {hasData && hasPermission('pnl.delete') && (
            <Button
              variant="outline" size="sm"
              onClick={() => {
                if (confirm('مسح جميع البيانات المحملة محلياً؟ (لا يحذف من قاعدة البيانات)')) {
                  clearAll();
                  toast.success('تم مسح البيانات المحلية');
                }
              }}
            >
              <Trash2 className="h-4 w-4 ml-1" />
              مسح محلي
            </Button>
          )}
        </PageActions>
      </div>

      {!hasData ? (
        // No data — show upload component (which saves to DB)
        <PnLUpload />
      ) : (
        <>
          <FilterBar />
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1 no-print">
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
              <TabsTrigger value="comparison" className="text-xs">
                <GitCompareArrows className="h-3.5 w-3.5 ml-1" />
                مقارنة الشركات
              </TabsTrigger>
              <TabsTrigger value="mom" className="text-xs">
                <CalendarDays className="h-3.5 w-3.5 ml-1" />
                مقارنة شهرية
              </TabsTrigger>
              <TabsTrigger value="yoy" className="text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 ml-1" />
                مقارنة سنوية
              </TabsTrigger>
              <TabsTrigger value="variance" className="text-xs">
                <AlertTriangle className="h-3.5 w-3.5 ml-1" />
                تحليل الانحرافات
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-xs">
                <BarChart3 className="h-3.5 w-3.5 ml-1" />
                الرسوم البيانية
              </TabsTrigger>
              <TabsTrigger value="glossary" className="text-xs">
                <BookOpen className="h-3.5 w-3.5 ml-1" />
                مسرد المصطلحات
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary"><ExecutiveSummary /></TabsContent>
            <TabsContent value="table"><PnLTable /></TabsContent>
            <TabsContent value="ratios"><FinancialRatios /></TabsContent>
            <TabsContent value="comparison"><PnLComparison /></TabsContent>
            <TabsContent value="mom"><CompanyMoM /></TabsContent>
            <TabsContent value="yoy"><YoYComparison /></TabsContent>
            <TabsContent value="variance"><VarianceAnalysis /></TabsContent>
            <TabsContent value="charts"><PnLCharts /></TabsContent>
            <TabsContent value="glossary"><Glossary /></TabsContent>
          </Tabs>
        </>
      )}

      {refreshing && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-primary text-primary-foreground px-4 py-2 shadow-lg flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 animate-spin" />
          جاري التحديث من قاعدة البيانات...
        </div>
      )}
    </div>
  );
}
