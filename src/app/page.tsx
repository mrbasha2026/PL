'use client';

import React from 'react';
import {
  Table2, BarChart3, GitCompareArrows, Building2,
  Sparkles, Calculator, FileText, TrendingUp, Database, Clock,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePnLStore } from '@/lib/pnl-store';
import { PnLUpload } from '@/components/pnl/PnLUpload';
import { PnLTable } from '@/components/pnl/PnLTable';
import { PnLCharts } from '@/components/pnl/PnLCharts';
import { PnLComparison } from '@/components/pnl/PnLComparison';
import { ExecutiveSummary } from '@/components/pnl/ExecutiveSummary';
import { FinancialRatios } from '@/components/pnl/FinancialRatios';
import { groupByCompany } from '@/lib/pnl-types';

export default function Home() {
  const { companies, selectedIds, clearAll, lastUpdated } = usePnLStore();

  const selected = companies.filter((c) => selectedIds.includes(c.id));
  const groups = groupByCompany(selected);
  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const periodCount = new Set(companies.map((c) => c.period)).size;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-lg shadow-sm">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-md">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight">
                لوحة مقارنة الأرباح والخسائر
              </h1>
              <p className="text-[10px] text-muted-foreground tracking-wide">
                PROFIT & LOSS COMPARISON DASHBOARD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {companies.length > 0 && (
              <>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  <Badge variant="secondary" className="gap-1 text-xs font-medium">
                    {companyCount} {companyCount === 1 ? 'شركة' : 'شركات'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {periodCount} {periodCount === 1 ? 'فترة' : 'فترات'}
                  </Badge>
                  {lastUpdated && (
                    <span className="flex items-center gap-1 text-[10px] opacity-60">
                      <Clock className="h-3 w-3" />
                      {new Date(lastUpdated).toLocaleString('ar-SA')}
                    </span>
                  )}
                </div>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 h-7"
                  onClick={clearAll}
                >
                  مسح الكل
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Upload Section — shown always but compact when data exists */}
        <div className={companies.length > 0 ? 'mb-6' : 'mb-10'}>
          {companies.length === 0 && (
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-4 py-1.5 text-xs font-semibold text-teal-800">
                <Sparkles className="h-3.5 w-3.5" />
                منصة تحليل مالي احترافية
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight">
                قم برفع ومقارنة بيانات الأرباح والخسائر
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                ارفع ملف Excel يحتوي على بيانات P&L لشركة واحدة أو أكثر عبر فترات مالية متعددة،
                ثم حلّل وقارن بينها باستخدام تقارير تفاعلية احترافية
              </p>
            </div>
          )}

          <div className={companies.length === 0 ? 'mx-auto max-w-2xl' : ''}>
            <PnLUpload />
          </div>
        </div>

        {/* Reports Section */}
        {companies.length > 0 && (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="mb-5 grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 sm:grid-cols-6">
              <TabsTrigger value="summary" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">الملخص التنفيذي</span>
                <span className="sm:hidden">ملخص</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Table2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">الجدول المفصل</span>
                <span className="sm:hidden">جدول</span>
              </TabsTrigger>
              <TabsTrigger value="ratios" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Calculator className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">النسب المالية</span>
                <span className="sm:hidden">نسب</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <GitCompareArrows className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">المقارنة</span>
                <span className="sm:hidden">مقارنة</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">الرسوم البيانية</span>
                <span className="sm:hidden">رسوم</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5 rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">التحليل الترندي</span>
                <span className="sm:hidden">ترند</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <ExecutiveSummary />
            </TabsContent>
            <TabsContent value="table">
              <PnLTable />
            </TabsContent>
            <TabsContent value="ratios">
              <FinancialRatios />
            </TabsContent>
            <TabsContent value="comparison">
              <PnLComparison />
            </TabsContent>
            <TabsContent value="charts">
              <PnLCharts />
            </TabsContent>
            <TabsContent value="trends">
              <PnLCharts forceTrends />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty state */}
        {companies.length === 0 && (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { step: 1, title: 'حمّل القالب', desc: 'نزّل قالب Excel المقترح واملأ بيانات الشركات والفترات المالية', color: 'bg-teal-100', numColor: 'text-teal-700' },
              { step: 2, title: 'ارفع الملف', desc: 'ارفع ملف Excel — كل ورقة تمثل شركة وكل عمود يمثل فترة مالية', color: 'bg-amber-100', numColor: 'text-amber-700' },
              { step: 3, title: 'حلّل وقارن', desc: 'استخدم الملخص التنفيذي والجداول والرسوم البيانية والنسب المالية', color: 'bg-violet-100', numColor: 'text-violet-700' },
            ].map((item) => (
              <Card key={item.step} className="border-dashed hover:border-solid transition-all">
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                    <span className={`text-2xl font-bold ${item.numColor}`}>{item.step}</span>
                  </div>
                  <h3 className="mb-2 text-base font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-slate-50 py-5">
        <div className="mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            لوحة مقارنة الأرباح والخسائر — Profit & Loss Comparison Dashboard
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/50">
            البيانات محفوظة تلقائياً في المتصفح — لا تُرسل لأي خادم خارجي
          </p>
        </div>
      </footer>
    </div>
  );
}
