'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import {
  Table2, BarChart3, GitCompareArrows,
  Sparkles, Calculator, FileText, TrendingUp, Database, Clock,
  CalendarDays, BookOpen, StickyNote, Layers, Download, Brain,
  Sun, Moon, AlertTriangle, ArrowUpDown, LineChart, ScrollText,
  Zap,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 w-9 p-0 rounded-xl hover:bg-primary/8"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-primary" />}
    </Button>
  );
}

export default function Home() {
  const { companies, selectedCompanyNames, selectedPeriods, clearAll, lastUpdated } = usePnLStore();
  const hasData = companies.length > 0;
  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const periodCount = new Set(companies.map((c) => c.period)).size;

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
    <div className="flex min-h-screen flex-col">
      {/* ─── Modern Glassmorphic Header ─────────────────────────── */}
      <header className="sticky top-0 z-50 no-print">
        <div className="backdrop-blur-xl bg-background/70 border-b border-border/40 shadow-sm shadow-primary/5">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-chart-2 blur-md opacity-30" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-4 overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="Dealz Tree"
                    width={28}
                    height={28}
                    className="h-7 w-auto"
                    priority
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold leading-tight tracking-tight bg-gradient-to-l from-primary to-chart-4 bg-clip-text text-transparent">
                    ديلز تري
                  </h1>
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Dealz Tree</span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 tracking-wide font-medium">
                  لوحة مقارنة الأرباح والخسائر
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {hasData && (
                <>
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-xl bg-primary/8 border border-primary/15 px-3 py-1.5">
                      <Database className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">
                        {companyCount} {companyCount === 1 ? 'شركة' : 'شركات'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-xl bg-muted/40 border border-border/40 px-3 py-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {periodCount} {periodCount === 1 ? 'فترة' : 'فترات'}
                      </span>
                    </div>
                    {lastUpdated && (
                      <div className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        {new Date(lastUpdated).toLocaleString('ar-SA')}
                      </div>
                    )}
                  </div>
                </>
              )}
              <ThemeToggle />
              {hasData && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/8 hover:text-destructive h-9 rounded-xl font-medium"
                  onClick={clearAll}
                >
                  مسح الكل
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ──────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 lg:px-8">

        {/* === EMPTY STATE === */}
        {!hasData && (
          <div className="mb-10">
            {/* Hero Section */}
            <div className="mb-10 text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-primary/10 to-chart-4/10 border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5" />
                منصة تحليل مالي احترافية
              </div>
              <h2 className="mb-4 text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-l from-primary via-chart-4 to-chart-2 bg-clip-text text-transparent">
                  قم برفع ومقارنة
                </span>
                <br />
                <span className="text-foreground">بيانات الأرباح والخسائر</span>
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground leading-relaxed text-base">
                ارفع ملف Excel يحتوي على بيانات P&L لشركة واحدة أو أكثر عبر فترات شهرية متعددة،
                ثم حلّل وقارن بينها باستخدام تقارير تفاعلية احترافية
              </p>
            </div>

            {/* Upload Card */}
            <div className="mx-auto max-w-2xl mb-10">
              <PnLUpload />
            </div>

            {/* 3-Step Guide */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 max-w-5xl mx-auto">
              {[
                {
                  step: 1,
                  title: 'حمّل القالب',
                  desc: 'نزّل قالب Excel المقترح واملأ بيانات الشركات والفترات الشهرية',
                  icon: Download,
                  gradient: 'from-primary/15 to-primary/5',
                  iconBg: 'from-primary to-primary/70',
                },
                {
                  step: 2,
                  title: 'ارفع الملف',
                  desc: 'ارفع ملف Excel — كل ورقة تمثل شركة وكل عمود يمثل شهر',
                  icon: FileText,
                  gradient: 'from-chart-4/15 to-chart-4/5',
                  iconBg: 'from-chart-4 to-chart-4/70',
                },
                {
                  step: 3,
                  title: 'حلّل وقارن',
                  desc: 'استخدم الملخص التنفيذي والجداول والرسوم البيانية والنسب المالية والتحليل الذكي',
                  icon: Sparkles,
                  gradient: 'from-chart-2/15 to-chart-2/5',
                  iconBg: 'from-chart-2 to-chart-2/70',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br ${item.gradient} backdrop-blur-sm p-6 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1`}
                >
                  <div className="absolute top-4 left-4 text-7xl font-bold text-foreground/5 select-none">
                    {item.step}
                  </div>
                  <div className="relative">
                    <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.iconBg} shadow-lg`}>
                      <item.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Features grid */}
            <div className="mt-16 max-w-5xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: BarChart3, label: 'رسوم بيانية تفاعلية', color: 'text-chart-1' },
                  { icon: Calculator, label: 'نسب مالية محسوبة', color: 'text-chart-2' },
                  { icon: Brain, label: 'تحليل ذكي بالـ AI', color: 'text-chart-4' },
                  { icon: BookOpen, label: 'قيود محاسبية تلقائية', color: 'text-chart-5' },
                ].map((feat) => (
                  <div key={feat.label} className="flex items-center gap-2.5 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm px-4 py-3">
                    <feat.icon className={`h-4 w-4 ${feat.color}`} />
                    <span className="text-xs font-medium">{feat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === DATA LOADED === */}
        {hasData && (
          <div className="space-y-6">
            <FilterBar />

            <Tabs defaultValue="summary" className="w-full">
              <div className="overflow-x-auto no-print -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="mb-6 inline-flex h-auto w-max min-w-full gap-1.5 rounded-2xl bg-muted/30 border border-border/40 p-1.5 backdrop-blur-sm">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-2 rounded-xl text-xs whitespace-nowrap data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 px-3.5 py-2.5 font-medium transition-all"
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

      {/* ─── Modern Footer ──────────────────────────────────────── */}
      <footer className="mt-auto no-print border-t border-border/40 bg-muted/20 backdrop-blur-sm py-6">
        <div className="mx-auto max-w-[1600px] px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium bg-gradient-to-l from-primary to-chart-4 bg-clip-text text-transparent inline-block">
            ديلز تري — Dealz Tree
          </p>
          <span className="mx-2 text-muted-foreground/30">|</span>
          <span className="text-sm text-muted-foreground">لوحة مقارنة الأرباح والخسائر — P&L Comparison Dashboard</span>
          <p className="mt-2 text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <Database className="h-3 w-3" />
            البيانات محفوظة تلقائياً في المتصفح — لا تُرسل لأي خادم خارجي
          </p>
        </div>
      </footer>
    </div>
  );
}
