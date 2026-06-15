'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Brain, AlertTriangle, CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { groupByCompany, formatNumber, formatPercentage, FINANCIAL_RATIOS } from '@/lib/pnl-types';

export function AISummary() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildPrompt = useCallback(() => {
    if (groups.length === 0) return '';

    let prompt = 'تحليل البيانات المالية التالية:\n\n';

    groups.forEach((group) => {
      const latest = group.datasets[group.datasets.length - 1];
      const previous = group.datasets.length > 1 ? group.datasets[group.datasets.length - 2] : null;

      if (!latest) return;

      const revenue = latest.data['revenue'] || 0;
      const grossProfit = latest.data['gross_profit'] || 0;
      const ebit = latest.data['operating_income_ebit'] || 0;
      const netIncome = latest.data['net_income'] || 0;
      const cogs = latest.data['cost_of_goods_sold'] || 0;
      const opex = latest.data['operating_expenses'] || 0;
      const interestExpense = latest.data['interest_expense'] || 0;
      const taxExpense = latest.data['income_tax_expense'] || 0;

      const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
      const operatingMargin = revenue ? (ebit / revenue) * 100 : 0;
      const netMargin = revenue ? (netIncome / revenue) * 100 : 0;
      const cogsRatio = revenue ? (cogs / revenue) * 100 : 0;
      const opexRatio = revenue ? (opex / revenue) * 100 : 0;
      const effectiveTaxRate = latest.data['income_before_tax']
        ? (taxExpense / latest.data['income_before_tax']) * 100
        : 0;
      const interestCoverage = interestExpense ? ebit / interestExpense : null;

      prompt += `--- الشركة: ${group.name} ---\n`;
      prompt += `الفترة: ${latest.period}\n`;
      prompt += `العملة: ${latest.currency}\n`;
      prompt += `الإيرادات: ${formatNumber(revenue, latest.currency, false)}\n`;
      prompt += `تكلفة البضاعة المباعة: ${formatNumber(cogs, latest.currency, false)}\n`;
      prompt += `إجمالي الربح: ${formatNumber(grossProfit, latest.currency, false)} (هامش ${grossMargin.toFixed(1)}%)\n`;
      prompt += `المصروفات التشغيلية: ${formatNumber(opex, latest.currency, false)} (نسبة ${opexRatio.toFixed(1)}%)\n`;
      prompt += `الدخل التشغيلي (EBIT): ${formatNumber(ebit, latest.currency, false)} (هامش ${operatingMargin.toFixed(1)}%)\n`;
      prompt += `صافي الدخل: ${formatNumber(netIncome, latest.currency, false)} (هامش ${netMargin.toFixed(1)}%)\n`;
      prompt += `معدل الضريبة الفعلي: ${effectiveTaxRate.toFixed(1)}%\n`;
      if (interestCoverage !== null) {
        prompt += `نسبة تغطية الفوائد: ${interestCoverage.toFixed(2)}x\n`;
      }

      // Period-over-period changes
      if (previous) {
        const revGrowth = previous.data['revenue']
          ? ((revenue - (previous.data['revenue'] || 0)) / Math.abs(previous.data['revenue'])) * 100
          : null;
        const netGrowth = previous.data['net_income']
          ? ((netIncome - (previous.data['net_income'] || 0)) / Math.abs(previous.data['net_income'])) * 100
          : null;
        const gpGrowth = previous.data['gross_profit']
          ? ((grossProfit - (previous.data['gross_profit'] || 0)) / Math.abs(previous.data['gross_profit'])) * 100
          : null;

        prompt += `\nالتغير عن الفترة السابقة (${previous.period}):\n`;
        if (revGrowth !== null) prompt += `  نمو الإيرادات: ${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%\n`;
        if (gpGrowth !== null) prompt += `  نمو إجمالي الربح: ${gpGrowth >= 0 ? '+' : ''}${gpGrowth.toFixed(1)}%\n`;
        if (netGrowth !== null) prompt += `  نمو صافي الدخل: ${netGrowth >= 0 ? '+' : ''}${netGrowth.toFixed(1)}%\n`;
      }

      // All financial ratios
      prompt += `\nالنسب المالية الرئيسية:\n`;
      FINANCIAL_RATIOS.forEach((ratio) => {
        const val = ratio.formula(latest.data);
        const formatted = ratio.format === 'percentage'
          ? formatPercentage(val)
          : val !== null ? val.toFixed(2) + 'x' : '—';
        prompt += `  ${ratio.nameAr}: ${formatted}\n`;
      });

      prompt += '\n';
    });

    // Cross-company summary if multiple
    if (groups.length >= 2) {
      prompt += '\n--- مقارنة بين الشركات ---\n';
      const latestData = groups.map((g) => {
        const latest = g.datasets[g.datasets.length - 1];
        return {
          name: g.name,
          revenue: latest?.data['revenue'] || 0,
          netIncome: latest?.data['net_income'] || 0,
          netMargin: latest?.data['revenue'] ? ((latest.data['net_income'] || 0) / latest.data['revenue']) * 100 : 0,
          grossMargin: latest?.data['revenue'] ? ((latest.data['gross_profit'] || 0) / latest.data['revenue']) * 100 : 0,
          currency: latest?.currency || 'SAR',
        };
      });

      const highestRevenue = latestData.reduce((a, b) => a.revenue > b.revenue ? a : b);
      const highestNetIncome = latestData.reduce((a, b) => a.netIncome > b.netIncome ? a : b);
      const highestNetMargin = latestData.reduce((a, b) => a.netMargin > b.netMargin ? a : b);

      prompt += `أعلى إيرادات: ${highestRevenue.name} (${formatNumber(highestRevenue.revenue, highestRevenue.currency)})\n`;
      prompt += `أعلى صافي دخل: ${highestNetIncome.name} (${formatNumber(highestNetIncome.netIncome, highestNetIncome.currency)})\n`;
      prompt += `أعلى هامش صافي ربح: ${highestNetMargin.name} (${highestNetMargin.netMargin.toFixed(1)}%)\n`;
    }

    return prompt;
  }, [groups]);

  const generateSummary = useCallback(async () => {
    const prompt = buildPrompt();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل في إنشاء التحليل');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err: any) {
      console.error('AI Summary fetch error:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء التحليل الذكي');
    } finally {
      setLoading(false);
    }
  }, [buildPrompt]);

  // Empty state
  if (selected.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold text-muted-foreground">اختر بيانات لعرض التحليل الذكي</h3>
        </CardContent>
      </Card>
    );
  }

  // Parse the AI response into sections
  const parseSections = (text: string) => {
    const sections: { title: string; content: string; icon: React.ReactNode; color: string }[] = [];

    // Try to identify sections by common patterns
    const lines = text.split('\n');
    let currentSection: { title: string; content: string[]; icon: React.ReactNode; color: string } | null = null;

    const sectionPatterns: { pattern: RegExp; title: string; icon: React.ReactNode; color: string }[] = [
      { pattern: /ملخص تنفيذي|الملخص التنفيذي|ملخص ذكي|الملخص/, title: 'ملخص ذكي', icon: <Brain className="h-4 w-4" />, color: 'text-teal-600' },
      { pattern: /توصيات|التوصيات|توصيات آلية/, title: 'توصيات آلية', icon: <Sparkles className="h-4 w-4" />, color: 'text-amber-600' },
      { pattern: /نقاط القوة|القوة|نقاط القوة والضعف/, title: 'نقاط القوة والضعف', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600' },
      { pattern: /نقاط الضعف|الضعف|المخاطر/, title: 'نقاط الضعف والمخاطر', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500' },
    ];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Check if this line is a section header
      let matched = false;
      for (const sp of sectionPatterns) {
        if (sp.pattern.test(trimmed)) {
          if (currentSection) {
            sections.push({ ...currentSection, content: currentSection.content.join('\n') });
          }
          currentSection = { title: sp.title, content: [], icon: sp.icon, color: sp.color };
          matched = true;
          break;
        }
      }

      if (!matched && currentSection) {
        currentSection.content.push(trimmed);
      }
    });

    if (currentSection) {
      sections.push({ ...currentSection, content: currentSection.content.join('\n') });
    }

    // If no sections were parsed, put everything in one section
    if (sections.length === 0) {
      sections.push({
        title: 'التحليل الذكي',
        content: text,
        icon: <Brain className="h-4 w-4" />,
        color: 'text-teal-600',
      });
    }

    return sections;
  };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-teal-50 to-teal-100/50 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-teal-600" />
              التحليل الذكي — AI Financial Analysis
            </CardTitle>
            <Button
              onClick={generateSummary}
              disabled={loading || groups.length === 0}
              size="sm"
              className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جارٍ التحليل...
                </>
              ) : summary ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  إعادة التحليل
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  إنشاء تحليل ذكي
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {groups.map((group, idx) => (
              <Badge key={group.name} variant="outline" className="gap-1 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `hsl(${(idx * 47) % 360}, 60%, 45%)` }}
                />
                {group.name}
                <span className="opacity-50">({group.periods.length} فترات)</span>
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            يستخدم الذكاء الاصطناعي لتحليل البيانات المالية وإنشاء ملخص تنفيذي وتوصيات عملية ونقاط القوة والضعف
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full bg-teal-100 flex items-center justify-center">
                <Brain className="h-8 w-8 text-teal-600" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-teal-700 mb-2">جارٍ تحليل البيانات المالية</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              يقوم الذكاء الاصطناعي بمراجعة الإيرادات والأرباح والنسب المالية لإنشاء تحليل شامل
            </p>
            <div className="mt-4 flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="shadow-sm border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-red-700 mb-2">فشل في إنشاء التحليل</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
            <Button
              onClick={generateSummary}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Summary Results */}
      {summary && !loading && !error && (
        <div className="space-y-4">
          {parseSections(summary).map((section, idx) => (
            <Card key={idx} className="shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 pb-2">
                <CardTitle className={`flex items-center gap-2 text-sm ${section.color}`}>
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {section.content.split('\n').map((line, lineIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={lineIdx} />;

                    // Highlight lines with checkmarks or warnings
                    const hasCheck = trimmed.includes('✅') || trimmed.includes('✓');
                    const hasWarning = trimmed.includes('⚠️') || trimmed.includes('⚠');
                    const isNumbered = /^\d+[\.\)]\s/.test(trimmed);
                    const isBullet = /^[-•]\s/.test(trimmed);

                    return (
                      <div
                        key={lineIdx}
                        className={`py-1 ${
                          hasCheck
                            ? 'text-emerald-700 bg-emerald-50/50 rounded px-2 -mx-2'
                            : hasWarning
                            ? 'text-amber-700 bg-amber-50/50 rounded px-2 -mx-2'
                            : isNumbered || isBullet
                            ? 'pr-4'
                            : ''
                        }`}
                      >
                        {trimmed}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* AI Disclaimer */}
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p>تم إنشاء هذا التحليل بواسطة الذكاء الاصطناعي — يُرجى مراجعته والتحقق من دقته قبل اتخاذ أي قرارات مالية</p>
                <p>التحليل مبني على البيانات المحددة في الفلاتر الحالية فقط</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initial State (no summary yet, not loading) */}
      {!summary && !loading && !error && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50">
              <Sparkles className="h-7 w-7 text-teal-500" />
            </div>
            <h3 className="text-base font-semibold mb-2">اضغط لإنشاء تحليل ذكي</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              سيقوم الذكاء الاصطناعي بتحليل البيانات المالية المحددة وإنشاء ملخص تنفيذي مع توصيات عملية
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
