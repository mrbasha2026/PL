'use client';

import React from 'react';
import {
  Table2,
  BarChart3,
  GitCompareArrows,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePnLStore } from '@/lib/pnl-store';
import { PnLUpload } from '@/components/pnl/PnLUpload';
import { PnLTable } from '@/components/pnl/PnLTable';
import { PnLCharts } from '@/components/pnl/PnLCharts';
import { PnLComparison } from '@/components/pnl/PnLComparison';

export default function Home() {
  const { companies, clearAll } = usePnLStore();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                مقارنة الأرباح والخسائر
              </h1>
              <p className="text-xs text-muted-foreground">
                P&L Comparison Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {companies.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {companies.length} {companies.length === 1 ? 'شركة' : 'شركات'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={clearAll}
                >
                  مسح الكل
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero / Upload Section */}
        <div className="mb-8">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              تحليل مالي متقدم
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
              قم برفع ومقارنة بيانات الأرباح والخسائر
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              ارفع ملف Excel يحتوي على بيانات P&L لشركة واحدة أو أكثر، ثم قارن
              بينها باستخدام الجداول والرسوم البيانية التفاعلية
            </p>
          </div>
          <div className="mx-auto max-w-2xl">
            <PnLUpload />
          </div>
        </div>

        {/* Data Display Section */}
        {companies.length > 0 && (
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3 sm:w-auto sm:inline-grid sm:grid-cols-3">
              <TabsTrigger value="table" className="gap-1.5">
                <Table2 className="h-4 w-4" />
                <span className="hidden sm:inline">الجدول</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1.5">
                <GitCompareArrows className="h-4 w-4" />
                <span className="hidden sm:inline">المقارنة</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">الرسوم البيانية</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              <PnLTable />
            </TabsContent>
            <TabsContent value="comparison">
              <PnLComparison />
            </TabsContent>
            <TabsContent value="charts">
              <PnLCharts />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty state hints */}
        {companies.length === 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <span className="text-xl">1</span>
                </div>
                <h3 className="mb-1 font-semibold">حمّل القالب</h3>
                <p className="text-xs text-muted-foreground">
                  نزّل قالب Excel المقترح واملأ بيانات الشركات
                </p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <span className="text-xl">2</span>
                </div>
                <h3 className="mb-1 font-semibold">ارفع الملف</h3>
                <p className="text-xs text-muted-foreground">
                  ارفع ملف Excel — كل ورقة تمثل شركة مختلفة
                </p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                  <span className="text-xl">3</span>
                </div>
                <h3 className="mb-1 font-semibold">قارن وحلّل</h3>
                <p className="text-xs text-muted-foreground">
                  استخدم الجداول والرسوم البيانية لمقارنة الشركات
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30 py-4">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          لوحة مقارنة الأرباح والخسائر — P&L Comparison Dashboard
        </div>
      </footer>
    </div>
  );
}
