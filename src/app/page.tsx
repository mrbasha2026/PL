'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import {
  Table2, BarChart3, GitCompareArrows,
  Sparkles, Calculator, FileText, TrendingUp, Database, Clock,
  CalendarDays, BookOpen, StickyNote, Layers, Download, Brain,
  Sun, Moon, AlertTriangle, ArrowUpDown, LineChart, ScrollText,
  Zap, HardDrive, Wallet, Shield, Settings as SettingsIcon, Lock,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { usePnLStore } from '@/lib/pnl-store';
import { useAuth } from '@/lib/use-auth';
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
import { SaveManager } from '@/components/pnl/SaveManager';
import { PrepaidExpenses } from '@/components/pnl/PrepaidExpenses';
import { LoginPage } from '@/components/auth/LoginPage';
import { UserMenu } from '@/components/auth/UserMenu';
import { AdminPanel } from '@/components/admin/AdminPanel';

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
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission } = useAuth();

  const hasData = companies.length > 0;
  const companyCount = new Set(companies.map((c) => c.companyName)).size;
  const periodCount = new Set(companies.map((c) => c.period)).size;
  const [saveManagerOpen, setSaveManagerOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const [view, setView] = React.useState<'pnl' | 'prepaid'>('pnl');

  // Filter tabs based on permissions
  const allTabs = [
    { value: 'summary', icon: FileText, label: 'الملخص التنفيذي', short: 'ملخص', perm: 'pnl.view' },
    { value: 'table', icon: Table2, label: 'الجدول المفصل', short: 'جدول', perm: 'pnl.view' },
    { value: 'ratios', icon: Calculator, label: 'النسب المالية', short: 'نسب', perm: 'pnl.view' },
    { value: 'comparison', icon: GitCompareArrows, label: 'المقارنة', short: 'مقارنة', perm: 'pnl.view' },
    { value: 'mom', icon: CalendarDays, label: 'مقارنة شهرية', short: 'شهرية', perm: 'pnl.view' },
    { value: 'yoy', icon: ArrowUpDown, label: 'مقارنة سنوية', short: 'سنوية', perm: 'pnl.view' },
    { value: 'quarterly', icon: Layers, label: 'تجميع ربعي', short: 'ربعي', perm: 'pnl.view' },
    { value: 'variance', icon: AlertTriangle, label: 'تحليل الانحرافات', short: 'انحرافات', perm: 'pnl.view' },
    { value: 'forecast', icon: LineChart, label: 'التنبؤات', short: 'تنبؤات', perm: 'pnl.view' },
    { value: 'explorer', icon: ScrollText, label: 'حركات البنود', short: 'حركات', perm: 'pnl.view' },
    { value: 'ledger', icon: BookOpen, label: 'دفتر الأستاذ (القيود)', short: 'قيود', perm: 'pnl.view' },
    { value: 'charts', icon: BarChart3, label: 'الرسوم البيانية', short: 'رسوم', perm: 'pnl.view' },
    { value: 'trends', icon: TrendingUp, label: 'التحليل الترندي', short: 'ترند', perm: 'pnl.view' },
    { value: 'ai', icon: Brain, label: 'التحليل الذكي', short: 'ذكي', perm: 'pnl.view' },
    { value: 'notes', icon: StickyNote, label: 'الملاحظات', short: 'ملاحظات', perm: 'pnl.view' },
    { value: 'export', icon: Download, label: 'تصدير ومشاركة', short: 'تصدير', perm: 'pnl.export' },
    { value: 'glossary', icon: BookOpen, label: 'دليل المصطلحات', short: 'مصطلحات', perm: 'pnl.view' },
  ];
  const tabs = allTabs.filter((t) => hasPermission(t.perm));

  // ─── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-14 w-14">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-chart-4 blur-md opacity-40" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-4 overflow-hidden">
              <Image src="/logo.png" alt="Dealz Tree" width={36} height={36} className="h-9 w-auto" priority />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            جاري التحميل...
          </div>
        </div>
      </div>
    );
  }

  // ─── Unauthenticated: show login ────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const canViewPnL = hasPermission('pnl.view');
  const canViewPrepaid = hasPermission('prepaid.view');
  const canAccessAdmin = hasAnyPermission(['users.view', 'roles.view', 'system.audit', 'system.settings']);

  // If user has neither P&L nor prepaid access, show access denied
  if (!canViewPnL && !canViewPrepaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
            <Lock className="h-7 w-7 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground mb-5">
            حسابك لا يملك صلاحيات للوصول إلى أي قسم في النظام. تواصل مع المدير لمنحك الصلاحيات المناسبة.
          </p>
          <UserMenu />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Modern Glassmorphic Header ─────────────────────────────────── */}
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
              {hasData && canViewPnL && (
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
              )}
              <ThemeToggle />

              {/* View switcher: P&L ↔ Prepaid (only if user has both perms) */}
              {canViewPnL && canViewPrepaid && (
                <Button
                  variant={view === 'prepaid' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs gap-1.5 h-9 rounded-xl font-medium ${
                    view === 'prepaid'
                      ? 'bg-gradient-to-l from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15'
                  }`}
                  onClick={() => setView(view === 'prepaid' ? 'pnl' : 'prepaid')}
                  title="تتبع المصروفات المقدمة"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">المصروفات المقدمة</span>
                </Button>
              )}

              {/* Save button (only if user has save.create or save.view) */}
              {hasAnyPermission(['save.view', 'save.create']) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 h-9 rounded-xl font-medium bg-gradient-to-l from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-400 hover:from-violet-500/20 hover:to-purple-500/20"
                  onClick={() => setSaveManagerOpen(true)}
                  title="حفظ دائم في قاعدة البيانات"
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">حفظ دائم</span>
                </Button>
              )}

              {/* Admin button */}
              {canAccessAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5 h-9 rounded-xl font-medium bg-gradient-to-l from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 hover:from-amber-500/20 hover:to-orange-500/20"
                  onClick={() => setAdminOpen(true)}
                  title="لوحة الإدارة"
                >
                  <SettingsIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">الإدارة</span>
                </Button>
              )}

              {/* Clear all (only with pnl.delete) */}
              {hasData && hasPermission('pnl.delete') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/8 hover:text-destructive h-9 rounded-xl font-medium"
                  onClick={clearAll}
                >
                  مسح الكل
                </Button>
              )}

              {/* User menu */}
              <UserMenu onOpenAdmin={() => setAdminOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ──────────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 lg:px-8">

        {view === 'prepaid' && canViewPrepaid ? (
          /* === PREPAID EXPENSES VIEW === */
          <PrepaidExpenses />
        ) : canViewPnL ? (
        <>
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
              {hasPermission('pnl.upload') ? (
                <PnLUpload />
              ) : (
                <div className="rounded-3xl border border-dashed border-border/60 p-8 text-center bg-muted/10">
                  <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    لا تملك صلاحية رفع البيانات — يمكنك عرض البيانات المرفوعة فقط
                  </p>
                </div>
              )}
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
        </>
        ) : (
          <div className="rounded-3xl border border-dashed border-border/60 p-12 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">لا تملك صلاحية الوصول إلى لوحة P&L</p>
          </div>
        )}
      </main>

      {/* ─── Modern Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-auto no-print border-t border-border/40 bg-muted/20 backdrop-blur-sm py-6">
        <div className="mx-auto max-w-[1600px] px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium bg-gradient-to-l from-primary to-chart-4 bg-clip-text text-transparent inline-block">
            ديلز تري — Dealz Tree
          </p>
          <span className="mx-2 text-muted-foreground/30">|</span>
          <span className="text-sm text-muted-foreground">نظام إدارة الأرباح والخسائر — P&L Management System</span>
          <p className="mt-2 text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <Shield className="h-3 w-3" />
            نظام محمي بصلاحيات متقدمة — جميع الإجراءات مسجّلة في سجل التدقيق
          </p>
        </div>
      </footer>

      {/* ─── Dialogs ─────────────────────────────────────────────────────────── */}
      <SaveManager isOpen={saveManagerOpen} onClose={() => setSaveManagerOpen(false)} />
      <AdminPanel isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
}
