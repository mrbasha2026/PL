'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import {
  Table2, BarChart3, GitCompareArrows,
  Sparkles, Calculator, FileText, TrendingUp, Database, Clock,
  CalendarDays, BookOpen, StickyNote, Layers, Download, Brain,
  Sun, Moon, AlertTriangle, ArrowUpDown, LineChart, ScrollText,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePnLStore } from '@/lib/pnl-store';
import { PnLUpload } from '@/components/pnl/PnLUpload';
import { FilterBar } from '@/components/pnl/FilterBar';
import { PnLTable } from '@/components/pnl/PnLTable';
import { PnLCharts } from '@/components/pnl/PnLCharts';
import { PnLComparison } from '@/components/pnl/PnLComparison';
import { ExecutiveSummary } from '@/components/pnl/ExecutiveSummary';
import { FinancialRatios } from '@/components/pnl/FinancialRatios';
import { CompanyMoM } from '@/components/pnl/CompanyMoM';
import { Glossary } from '@/components/pnl/Glossary';
import { UserNotes } from '@/components/pnl/UserNotes';
import { QuarterlyAggregation } from '@/components/pnl/QuarterlyAggregation';
import { AISummary } from '@/components/pnl/AISummary';
import { ExportManager } from '@/components/pnl/ExportManager';
import { YoYComparison } from '@/components/pnl/YoYComparison';
import { VarianceAnalysis } from '@/components/pnl/VarianceAnalysis';
import { Forecasting } from '@/components/pnl/Forecasting';
import { LineItemExplorer } from '@/components/pnl/LineItemExplorer';
import { AccountLedgerExplorer } from '@/components/pnl/AccountLedger';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 hover:bg-muted"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
    </Button>
  );
}

export default function Home() {
  const { companies, selectedCompanyNames, selectedPeriods, clearAll, lastUpdated } = usePnLStore();
  const hasData = companies.length > 0;
  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const periodCount = new Set(companies.map((c) => c.period)).size;

  // Define all tabs for the scrollable tab bar
  const tabs = [
    { value: 'summary', icon: FileText, label: 'الملخص التنفيذي', short: 'ملخص' },
    { value: 'table', icon: Table2, label: 'الجدول المفصل', short: 'جدول' },
    { value: 'ratios', icon: Calculator, label: 'النسب المالية', short: 'نسب' },
    { value: 'comparison', icon: GitCompareArrows, label: 'المقارنة', short: 'مقارنة' },
    { value: 'mom', icon: CalendarDays, label: 'مقارنة شهرية', short: 'شهرية' },
    { value: 'yoy', icon: ArrowUpDown, label: 'مقارنة سنوية', short: 'سنوية' },
    { value: 'quarterly', icon: Layers, label: 'تجميع ربعي', short: 'ربعي' },
    { value: 'variance', icon: AlertTriangle, label: 'تحليل الانحرافات', short: 'انحرافات' },
    { value: 'forecast', icon: LineChart, label: 'التنبؤات', short: 'تنبؤات' },
    { value: 'explorer', icon: ScrollText, label: 'حركات البنود', short: 'حركات' },
    { value: 'ledger', icon: BookOpen, label: 'دفتر الأستاذ (القيود)', short: 'قيود' },
    { value: 'charts', icon: BarChart3, label: 'الرسوم البيانية', short: 'رسوم' },
    { value: 'trends', icon: TrendingUp, label: 'التحليل الترندي', short: 'ترند' },
    { value: 'ai', icon: Brain, label: 'التحليل الذكي', short: 'ذكي' },
    { value: 'notes', icon: StickyNote, label: 'الملاحظات', short: 'ملاحظات' },
    { value: 'export', icon: Download, label: 'تصدير ومشاركة', short: 'تصدير' },
    { value: 'glossary', icon: BookOpen, label: 'دليل المصطلحات', short: 'مصطلحات' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg shadow-sm no-print">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Dealz Tree"
              width={36}
              height={36}
              className="h-9 w-auto"
              priority
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold leading-tight tracking-tight text-[#4CAF50]">
                  ديلز تري
                </h1>
                <span className="text-xs text-muted-foreground font-medium">Dealz Tree</span>
              </div>
              <p className="text-[10px] text-muted-foreground tracking-wide">
                لوحة مقارنة الأرباح والخسائر — P&L COMPARISON DASHBOARD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  <span className="rounded-full bg-[#4CAF50]/10 px-2 py-0.5 text-[10px] font-semibold text-[#4CAF50]">
                    {companyCount} {companyCount === 1 ? 'شركة' : 'شركات'}
                  </span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                    {periodCount} {periodCount === 1 ? 'فترة' : 'فترات'}
                  </span>
                  {lastUpdated && (
                    <span className="flex items-center gap-1 text-[10px] opacity-60">
                      <Clock className="h-3 w-3" />
                      {new Date(lastUpdated).toLocaleString('ar-SA')}
                    </span>
                  )}
                </div>
                <Separator orientation="vertical" className="h-6" />
              </>
            )}
            <ThemeToggle />
            {hasData && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 h-7"
                onClick={clearAll}
              >
                مسح الكل
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">

        {/* === EMPTY STATE: Upload + Steps === */}
        {!hasData && (
          <div className="mb-10">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#4CAF50]/10 px-4 py-1.5 text-xs font-semibold text-[#4CAF50]">
                <Sparkles className="h-3.5 w-3.5" />
                منصة تحليل مالي احترافية
              </div>
              <h2 className="mb-3 text-3xl font-bold tracking-tight">
                قم برفع ومقارنة بيانات الأرباح والخسائر
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed">
                ارفع ملف Excel يحتوي على بيانات P&L لشركة واحدة أو أكثر عبر فترات شهرية متعددة،
                ثم حلّل وقارن بينها باستخدام تقارير تفاعلية احترافية
              </p>
            </div>

            <div className="mx-auto max-w-2xl">
              <PnLUpload />
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[
                { step: 1, title: 'حمّل القالب', desc: 'نزّل قالب Excel المقترح واملأ بيانات الشركات والفترات الشهرية', color: 'bg-[#4CAF50]/10', numColor: 'text-[#4CAF50]' },
                { step: 2, title: 'ارفع الملف', desc: 'ارفع ملف Excel — كل ورقة تمثل شركة وكل عمود يمثل شهر', color: 'bg-amber-100', numColor: 'text-amber-700' },
                { step: 3, title: 'حلّل وقارن', desc: 'استخدم الملخص التنفيذي والجداول والرسوم البيانية والنسب المالية والتحليل الذكي', color: 'bg-violet-100', numColor: 'text-violet-700' },
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
          </div>
        )}

        {/* === DATA LOADED: Filters + Reports === */}
        {hasData && (
          <div className="space-y-5">
            {/* Unified Filter Bar */}
            <FilterBar />

            {/* Report Tabs — scrollable on mobile */}
            <Tabs defaultValue="summary" className="w-full">
              <div className="overflow-x-auto no-print -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="mb-5 inline-flex h-auto w-max min-w-full gap-1 rounded-xl bg-muted/50 p-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 rounded-lg text-xs whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 px-3 py-2"
                    >
                      <tab.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden lg:inline">{tab.label}</span>
                      <span className="lg:hidden">{tab.short}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="summary"><ExecutiveSummary /></TabsContent>
              <TabsContent value="table"><PnLTable /></TabsContent>
              <TabsContent value="ratios"><FinancialRatios /></TabsContent>
              <TabsContent value="comparison"><PnLComparison /></TabsContent>
              <TabsContent value="mom"><CompanyMoM /></TabsContent>
              <TabsContent value="yoy"><YoYComparison /></TabsContent>
              <TabsContent value="quarterly"><QuarterlyAggregation /></TabsContent>
              <TabsContent value="variance"><VarianceAnalysis /></TabsContent>
              <TabsContent value="forecast"><Forecasting /></TabsContent>
              <TabsContent value="explorer"><LineItemExplorer /></TabsContent>
              <TabsContent value="ledger"><AccountLedgerExplorer /></TabsContent>
              <TabsContent value="charts"><PnLCharts /></TabsContent>
              <TabsContent value="trends"><PnLCharts forceTrends /></TabsContent>
              <TabsContent value="ai"><AISummary /></TabsContent>
              <TabsContent value="notes"><UserNotes /></TabsContent>
              <TabsContent value="export"><ExportManager /></TabsContent>
              <TabsContent value="glossary"><Glossary /></TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-slate-50 dark:bg-slate-950 py-5 no-print">
        <div className="mx-auto max-w-[1600px] px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">
            ديلز تري — Dealz Tree | لوحة مقارنة الأرباح والخسائر — Profit & Loss Comparison Dashboard
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/50">
            البيانات محفوظة تلقائياً في المتصفح — لا تُرسل لأي خادم خارجي
          </p>
        </div>
      </footer>
    </div>
  );
}
