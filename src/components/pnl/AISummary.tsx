'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sparkles, RefreshCw, Brain, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Building2, TrendingUp, Search, GitCompareArrows, FileText,
  Zap, ChevronDown, ChevronUp, Copy, Check, Info,
  MessageSquare, Cpu,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { groupByCompany, formatNumber, formatPercentage, FINANCIAL_RATIOS, periodToArabic } from '@/lib/pnl-types';

type AnalysisMode = 'executive' | 'deep' | 'forecast' | 'comparison';

const MODE_CONFIG: Record<AnalysisMode, {
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgClass: string;
  darkBgClass: string;
}> = {
  executive: {
    label: 'تحليل تنفيذي',
    description: 'ملخص تنفيذي + توصيات + نقاط القوة والضعف',
    icon: FileText,
    color: 'text-teal-600',
    bgClass: 'from-teal-50 to-teal-100/50',
    darkBgClass: 'dark:from-teal-950/30 dark:to-teal-900/10',
  },
  deep: {
    label: 'تحليل عميق',
    description: 'تحليل هيكلي + DuPont + مقارنة مرجعية + توصيات تحسين الهوامش',
    icon: Search,
    color: 'text-violet-600',
    bgClass: 'from-violet-50 to-violet-100/50',
    darkBgClass: 'dark:from-violet-950/30 dark:to-violet-900/10',
  },
  forecast: {
    label: 'تحليل تنبؤي',
    description: 'اتجاهات + توقعات + سيناريوهات ماذا لو + مؤشرات الخطر المبكر',
    icon: TrendingUp,
    color: 'text-amber-600',
    bgClass: 'from-amber-50 to-amber-100/50',
    darkBgClass: 'dark:from-amber-950/30 dark:to-amber-900/10',
  },
  comparison: {
    label: 'تحليل مقارن',
    description: 'مصفوفة أداء + ميزة تنافسية + فجوات + تصنيف الشركات',
    icon: GitCompareArrows,
    color: 'text-rose-600',
    bgClass: 'from-rose-50 to-rose-100/50',
    darkBgClass: 'dark:from-rose-950/30 dark:to-rose-900/10',
  },
};

// Free AI model options
const AI_MODELS = [
  { id: 'glm-4-plus', name: 'GLM-4 Plus', desc: 'الأفضل — ذكاء عالي وتحليل مالي متقدم', icon: '🧠', color: 'violet' },
  { id: 'glm-4-flash', name: 'GLM-4 Flash', desc: 'الأسرع — استجابة فورية للتحليلات السريعة', icon: '⚡', color: 'amber' },
  { id: 'glm-4-long', name: 'GLM-4 Long', desc: 'للتحليلات الطويلة — يدعم بيانات أكبر', icon: '📚', color: 'teal' },
];

interface AIResponse {
  summary: string;
  mode: string;
  model: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
}

export function AISummary() {
  const { getFiltered } = usePnLStore();
  const selected = getFiltered();
  const groups = groupByCompany(selected);

  const [activeMode, setActiveMode] = useState<AnalysisMode>('executive');
  const [summaries, setSummaries] = useState<Record<AnalysisMode, string | null>>({
    executive: null, deep: null, forecast: null, comparison: null,
  });
  const [aiResponses, setAiResponses] = useState<Record<AnalysisMode, AIResponse | null>>({
    executive: null, deep: null, forecast: null, comparison: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Selected AI model & settings
  const [selectedModel, setSelectedModel] = useState('glm-4-plus');
  const [showSettings, setShowSettings] = useState(false);

  // Load saved model from localStorage
  useEffect(() => {
    const savedModel = localStorage.getItem('ai_model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  const saveModel = useCallback(() => {
    localStorage.setItem('ai_model', selectedModel);
    setShowSettings(false);
  }, [selectedModel]);

  const clearSettings = useCallback(() => {
    localStorage.removeItem('ai_model');
    setSelectedModel('glm-4-plus');
  }, []);

  const testConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'اختبار — اكتب متصل فقط', mode: 'executive', model: selectedModel }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [selectedModel]);

  const buildPrompt = useCallback((mode: AnalysisMode) => {
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
      const sellingExp = latest.data['selling_expenses'] || 0;
      const gaExp = latest.data['general_administrative'] || 0;
      const daExp = latest.data['depreciation_amortization'] || 0;
      const interestIncome = latest.data['interest_income'] || 0;
      const interestExpense = latest.data['interest_expense'] || 0;
      const otherIncome = latest.data['other_income_expense'] || 0;
      const incomeBeforeTax = latest.data['income_before_tax'] || 0;
      const taxExpense = latest.data['income_tax_expense'] || 0;

      const grossMargin = revenue ? (grossProfit / revenue) * 100 : 0;
      const operatingMargin = revenue ? (ebit / revenue) * 100 : 0;
      const netMargin = revenue ? (netIncome / revenue) * 100 : 0;
      const cogsRatio = revenue ? (cogs / revenue) * 100 : 0;
      const opexRatio = revenue ? (opex / revenue) * 100 : 0;
      const sellingRatio = revenue ? (sellingExp / revenue) * 100 : 0;
      const gaRatio = revenue ? (gaExp / revenue) * 100 : 0;
      const daRatio = revenue ? (daExp / revenue) * 100 : 0;
      const effectiveTaxRate = incomeBeforeTax ? (taxExpense / incomeBeforeTax) * 100 : 0;
      const interestCoverage = interestExpense ? ebit / interestExpense : null;

      prompt += `══════ الشركة: ${group.name} ══════\n`;
      prompt += `الفترة: ${latest.period}\n`;
      prompt += `العملة: ${latest.currency}\n\n`;

      // Full P&L detail
      prompt += `📊 قائمة الدخل التفصيلية:\n`;
      prompt += `  الإيرادات: ${formatNumber(revenue, latest.currency, false)}\n`;
      prompt += `  تكلفة البضاعة المباعة: ${formatNumber(cogs, latest.currency, false)} (${cogsRatio.toFixed(1)}% من الإيرادات)\n`;
      prompt += `  إجمالي الربح: ${formatNumber(grossProfit, latest.currency, false)} (هامش ${grossMargin.toFixed(1)}%)\n`;
      prompt += `  مصروفات البيع: ${formatNumber(sellingExp, latest.currency, false)} (${sellingRatio.toFixed(1)}%)\n`;
      prompt += `  مصروفات إدارية وعمومية: ${formatNumber(gaExp, latest.currency, false)} (${gaRatio.toFixed(1)}%)\n`;
      prompt += `  الإهلاك والاستنفاد: ${formatNumber(daExp, latest.currency, false)} (${daRatio.toFixed(1)}%)\n`;
      prompt += `  إجمالي المصروفات التشغيلية: ${formatNumber(opex, latest.currency, false)} (${opexRatio.toFixed(1)}%)\n`;
      prompt += `  الدخل التشغيلي (EBIT): ${formatNumber(ebit, latest.currency, false)} (هامش ${operatingMargin.toFixed(1)}%)\n`;
      prompt += `  إيرادات الفوائد: ${formatNumber(interestIncome, latest.currency, false)}\n`;
      prompt += `  مصروفات الفوائد: ${formatNumber(interestExpense, latest.currency, false)}\n`;
      prompt += `  إيرادات/مصروفات أخرى: ${formatNumber(otherIncome, latest.currency, false)}\n`;
      prompt += `  الدخل قبل الضريبة: ${formatNumber(incomeBeforeTax, latest.currency, false)}\n`;
      prompt += `  مصروف ضريبة الدخل: ${formatNumber(taxExpense, latest.currency, false)}\n`;
      prompt += `  صافي الدخل: ${formatNumber(netIncome, latest.currency, false)} (هامش ${netMargin.toFixed(1)}%)\n`;
      prompt += `  معدل الضريبة الفعلي: ${effectiveTaxRate.toFixed(1)}%\n`;
      if (interestCoverage !== null) {
        prompt += `  نسبة تغطية الفوائد: ${interestCoverage.toFixed(2)}x\n`;
      }

      // All periods trend if available
      if (group.datasets.length > 1) {
        prompt += `\n📈 الاتجاه الشهري:\n`;
        group.datasets.forEach((ds) => {
          const rev = ds.data['revenue'] || 0;
          const ni = ds.data['net_income'] || 0;
          const gm = rev ? ((ds.data['gross_profit'] || 0) / rev * 100) : 0;
          const nm = rev ? (ni / rev * 100) : 0;
          prompt += `  ${ds.period}: إيرادات=${formatNumber(rev, ds.currency, false)}, هامش إجمالي=${gm.toFixed(1)}%, هامش صافي=${nm.toFixed(1)}%\n`;
        });
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
        const ebitGrowth = previous.data['operating_income_ebit']
          ? ((ebit - (previous.data['operating_income_ebit'] || 0)) / Math.abs(previous.data['operating_income_ebit'])) * 100
          : null;

        prompt += `\n📊 التغير عن الفترة السابقة (${periodToArabic(previous.period)}):\n`;
        if (revGrowth !== null) prompt += `  نمو الإيرادات: ${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%\n`;
        if (gpGrowth !== null) prompt += `  نمو إجمالي الربح: ${gpGrowth >= 0 ? '+' : ''}${gpGrowth.toFixed(1)}%\n`;
        if (ebitGrowth !== null) prompt += `  نمو الدخل التشغيلي: ${ebitGrowth >= 0 ? '+' : ''}${ebitGrowth.toFixed(1)}%\n`;
        if (netGrowth !== null) prompt += `  نمو صافي الدخل: ${netGrowth >= 0 ? '+' : ''}${netGrowth.toFixed(1)}%\n`;

        // Margin changes
        const prevGrossMargin = previous.data['revenue'] ? ((previous.data['gross_profit'] || 0) / previous.data['revenue']) * 100 : null;
        const prevNetMargin = previous.data['revenue'] ? ((previous.data['net_income'] || 0) / previous.data['revenue']) * 100 : null;
        if (prevGrossMargin !== null) prompt += `  تغير هامش الربح الإجمالي: ${(grossMargin - prevGrossMargin) >= 0 ? '+' : ''}${(grossMargin - prevGrossMargin).toFixed(1)} نقطة\n`;
        if (prevNetMargin !== null) prompt += `  تغير هامش صافي الربح: ${(netMargin - prevNetMargin) >= 0 ? '+' : ''}${(netMargin - prevNetMargin).toFixed(1)} نقطة\n`;
      }

      // All financial ratios
      prompt += `\n📐 النسب المالية الرئيسية:\n`;
      FINANCIAL_RATIOS.forEach((ratio) => {
        const val = ratio.formula(latest.data);
        const formatted = ratio.format === 'percentage'
          ? formatPercentage(val)
          : val !== null ? val.toFixed(2) + 'x' : '—';
        prompt += `  ${ratio.nameAr} (${ratio.nameEn}): ${formatted}\n`;
      });

      prompt += '\n';
    });

    // Cross-company comparison if multiple
    if (groups.length >= 2) {
      prompt += '\n══════ مقارنة بين الشركات ══════\n';
      const latestData = groups.map((g) => {
        const latest = g.datasets[g.datasets.length - 1];
        const prev = g.datasets.length > 1 ? g.datasets[g.datasets.length - 2] : null;
        return {
          name: g.name,
          period: latest?.period,
          revenue: latest?.data['revenue'] || 0,
          grossProfit: latest?.data['gross_profit'] || 0,
          ebit: latest?.data['operating_income_ebit'] || 0,
          netIncome: latest?.data['net_income'] || 0,
          netMargin: latest?.data['revenue'] ? ((latest.data['net_income'] || 0) / latest.data['revenue']) * 100 : 0,
          grossMargin: latest?.data['revenue'] ? ((latest.data['gross_profit'] || 0) / latest.data['revenue']) * 100 : 0,
          opMargin: latest?.data['revenue'] ? ((latest.data['operating_income_ebit'] || 0) / latest.data['revenue']) * 100 : 0,
          currency: latest?.currency || 'SAR',
          revenueGrowth: prev?.data['revenue'] && latest?.data['revenue']
            ? ((latest.data['revenue'] - prev.data['revenue']) / Math.abs(prev.data['revenue'])) * 100 : null,
        };
      });

      prompt += `\n| الشركة | الإيرادات | هامش إجمالي | هامش تشغيلي | هامش صافي | نمو الإيرادات |\n`;
      prompt += `|--------|-----------|-------------|-------------|-----------|----------------|\n`;
      latestData.forEach((d) => {
        prompt += `| ${d.name} | ${formatNumber(d.revenue, d.currency)} | ${d.grossMargin.toFixed(1)}% | ${d.opMargin.toFixed(1)}% | ${d.netMargin.toFixed(1)}% | ${d.revenueGrowth !== null ? (d.revenueGrowth >= 0 ? '+' : '') + d.revenueGrowth.toFixed(1) + '%' : '—'} |\n`;
      });

      const highestRevenue = latestData.reduce((a, b) => a.revenue > b.revenue ? a : b);
      const highestNetIncome = latestData.reduce((a, b) => a.netIncome > b.netIncome ? a : b);
      const highestNetMargin = latestData.reduce((a, b) => a.netMargin > b.netMargin ? a : b);
      const highestGrowth = latestData.filter(d => d.revenueGrowth !== null).reduce((a, b) => (a.revenueGrowth || 0) > (b.revenueGrowth || 0) ? a : b, latestData[0]);

      prompt += `\n🏆 التصنيف:\n`;
      prompt += `أعلى إيرادات: ${highestRevenue.name} (${formatNumber(highestRevenue.revenue, highestRevenue.currency)})\n`;
      prompt += `أعلى صافي دخل: ${highestNetIncome.name} (${formatNumber(highestNetIncome.netIncome, highestNetIncome.currency)})\n`;
      prompt += `أعلى هامش صافي ربح: ${highestNetMargin.name} (${highestNetMargin.netMargin.toFixed(1)}%)\n`;
      if (highestGrowth) {
        prompt += `أعلى نمو إيرادات: ${highestGrowth.name} (${highestGrowth.revenueGrowth?.toFixed(1)}%)\n`;
      }
    }

    return prompt;
  }, [groups]);

  const generateSummary = useCallback(async (mode: AnalysisMode) => {
    const prompt = buildPrompt(mode);
    if (!prompt.trim()) return;

    const clientModel = localStorage.getItem('ai_model') || selectedModel;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, model: clientModel }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل في إنشاء التحليل');
      }

      const data: AIResponse = await response.json();
      setSummaries(prev => ({ ...prev, [mode]: data.summary }));
      setAiResponses(prev => ({ ...prev, [mode]: data }));
    } catch (err: any) {
      console.error('AI Summary fetch error:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء التحليل الذكي');
    } finally {
      setLoading(false);
    }
  }, [buildPrompt, selectedModel]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

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
    const lines = text.split('\n');
    let currentSection: { title: string; content: string[]; icon: React.ReactNode; color: string } | null = null;

    const sectionPatterns: { pattern: RegExp; title: string; icon: React.ReactNode; color: string }[] = [
      { pattern: /ملخص تنفيذي|الملخص التنفيذي|ملخص ذكي|الملخص|نظرة عامة/, title: 'ملخص ذكي', icon: <Brain className="h-4 w-4" />, color: 'text-teal-600' },
      { pattern: /توصيات|التوصيات|توصيات آلية|توصيات استراتيجية|خطة العمل/, title: 'التوصيات', icon: <Sparkles className="h-4 w-4" />, color: 'text-amber-600' },
      { pattern: /نقاط القوة|القوة|نقاط القوة والضعف/, title: 'نقاط القوة والضعف', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600' },
      { pattern: /نقاط الضعف|الضعف|المخاطر|التحديات|مؤشرات الخطر/, title: 'المخاطر والتحديات', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500' },
      { pattern: /توقعات|التوقعات|التنبؤ|سيناريوهات|ماذا لو/, title: 'التوقعات والسيناريوهات', icon: <TrendingUp className="h-4 w-4" />, color: 'text-violet-600' },
      { pattern: /تحليل هيكلي|هيكل التكاليف|الربحية|DuPont|تحليل عميق/, title: 'التحليل العميق', icon: <Search className="h-4 w-4" />, color: 'text-indigo-600' },
      { pattern: /مقارنة|مصفوفة|ميزة تنافسية|تصنيف|فجوات|مرجعية/, title: 'المقارنة والتصنيف', icon: <GitCompareArrows className="h-4 w-4" />, color: 'text-rose-600' },
    ];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

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

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const currentSummary = summaries[activeMode];
  const currentConfig = MODE_CONFIG[activeMode];
  const currentResponse = aiResponses[activeMode];

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className={`bg-gradient-to-l ${currentConfig.bgClass} ${currentConfig.darkBgClass} pb-3`}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center gap-1.5">
                <Zap className="h-5 w-5 text-amber-500" />
                <span>التحليل الذكي —</span>
              </div>
              <Badge variant="outline" className="gap-1 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Zap className="h-3 w-3" />
                AI مجاني
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Zap className="h-3 w-3" />
                مجاني
              </Badge>
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="ghost"
                size="sm"
                className="gap-1 h-7 w-7 p-0"
              >
                <Cpu className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => generateSummary(activeMode)}
                disabled={loading || groups.length === 0}
                size="sm"
                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    جارٍ التحليل...
                  </>
                ) : currentSummary ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    إعادة التحليل
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    إنشاء تحليل
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* AI Engine Selection */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
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
            <div className="flex-1" />
            {/* Model Selection */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              {AI_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModel(m.id); localStorage.setItem('ai_model', m.id); }}
                  className={`text-[10px] px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                    selectedModel === m.id
                      ? 'bg-background shadow-sm font-bold text-emerald-700'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.icon}
                  {m.name.replace('GLM-4 ', '')}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Settings Panel */}
      {showSettings && (
        <Card className="shadow-sm border-2 border-emerald-200 dark:border-emerald-800 overflow-hidden">
          <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/30 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-emerald-600" />
              إعدادات الذكاء الاصطناعي — اختيار النموذج
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Info */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 flex items-start gap-2">
              <Zap className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="font-bold">جميع النماذج مجانية بالكامل!</p>
                <p>لا تحتاج مفتاح API أو اشتراك — كل نموذج مجاني وجاهز للاستخدام فوراً</p>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">اختر النموذج</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`rounded-lg border p-3 text-right transition-all ${
                      selectedModel === model.id
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-300'
                        : 'border-muted hover:border-emerald-200'
                    }`}
                  >
                    <p className="text-sm font-bold">{model.icon} {model.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center justify-between">
              <Button onClick={saveModel} size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="h-3.5 w-3.5" />
                حفظ الإعدادات
              </Button>
              <Button onClick={clearSettings} variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Mode Selection */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.entries(MODE_CONFIG) as [AnalysisMode, typeof MODE_CONFIG.executive][]).map(([mode, config]) => {
              const Icon = config.icon;
              const hasSummary = !!summaries[mode];
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setActiveMode(mode);
                    if (!summaries[mode] && !loading) {
                      generateSummary(mode);
                    }
                  }}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all ${
                    activeMode === mode
                      ? 'bg-muted/50 ring-2 ring-teal-500/30 shadow-sm'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  {hasSummary && (
                    <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-teal-500" />
                  )}
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <span className="text-xs font-semibold">{config.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{config.description}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Brain className="h-8 w-8 text-teal-600" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-teal-700 dark:text-teal-400 mb-2">
              جارٍ التحليل بـ {currentConfig.label}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              يقوم الذكاء الاصطناعي بمراجعة البيانات المالية بالتفصيل لإنشاء تحليل شامل ومتعمق
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
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-2">فشل في إنشاء التحليل</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => generateSummary(activeMode)} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary Results */}
      {currentSummary && !loading && !error && (
        <div className="space-y-4">
          {/* Response metadata */}
          {currentResponse && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Model Badge */}
                  <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <Cpu className="h-3 w-3" />
                    {currentResponse.model}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    <MessageSquare className="h-3 w-3" />
                    {currentResponse.inputTokens?.toLocaleString()} توكن إدخال
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
                    <Sparkles className="h-3 w-3" />
                    {currentResponse.outputTokens?.toLocaleString()} توكن إخراج
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                    <Zap className="h-3 w-3" />
                    {currentResponse.tokensUsed?.toLocaleString()} توكن إجمالي
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => copyToClipboard(currentSummary)}
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-teal-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'تم النسخ' : 'نسخ التحليل'}
                </Button>
              </div>
            </div>
          )}

          {/* Copy button when no metadata */}
          {!currentResponse && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => copyToClipboard(currentSummary)}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-teal-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'تم النسخ' : 'نسخ التحليل'}
              </Button>
            </div>
          )}

          {parseSections(currentSummary).map((section, idx) => {
            const isExpanded = expandedSections[section.title] !== false; // default expanded
            return (
              <Card key={idx} className="shadow-sm overflow-hidden">
                <CardHeader
                  className="bg-muted/30 pb-2 cursor-pointer"
                  onClick={() => toggleSection(section.title)}
                >
                  <CardTitle className={`flex items-center justify-between text-sm ${section.color}`}>
                    <div className="flex items-center gap-2">
                      {section.icon}
                      {section.title}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-4">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {section.content.split('\n').map((line, lineIdx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return <br key={lineIdx} />;

                        const hasCheck = trimmed.includes('✅') || trimmed.includes('✓');
                        const hasWarning = trimmed.includes('⚠️') || trimmed.includes('⚠');
                        const isNumbered = /^\d+[\.\)]\s/.test(trimmed);
                        const isBullet = /^[-•]\s/.test(trimmed);
                        const isTableLine = trimmed.includes('|') && trimmed.includes('|');

                        // Table rendering
                        if (isTableLine && !trimmed.match(/^[-|:\s]+$/)) {
                          const cells = trimmed.split('|').filter(c => c.trim());
                          return (
                            <div key={lineIdx} className="flex gap-4 py-0.5 text-xs border-b border-muted/30">
                              {cells.map((cell, ci) => (
                                <span key={ci} className="flex-1">{cell.trim()}</span>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={lineIdx}
                            className={`py-1 ${
                              hasCheck
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 rounded px-2 -mx-2'
                                : hasWarning
                                ? 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20 rounded px-2 -mx-2'
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
                )}
              </Card>
            );
          })}

          {/* AI Disclaimer */}
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p>تم إنشاء هذا التحليل بواسطة Claude AI من Anthropic — يُرجى مراجعته والتحقق من دقته قبل اتخاذ أي قرارات مالية</p>
                <p>التحليل مبني على البيانات المحددة في الفلاتر الحالية فقط — كلما زادت الفترات زادت دقة التحليل</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initial State — no API key */}
      {!currentSummary && !loading && !error && !apiKeySaved && (
        <Card className="shadow-sm border-2 border-dashed border-indigo-200 dark:border-indigo-800">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
              <Key className="h-7 w-7 text-indigo-500" />
            </div>
            <h3 className="text-base font-semibold mb-2">أضف مفتاح Claude API للبدء</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              لاستخدام التحليل الذكي، تحتاج إلى مفتاح API من Anthropic. اضغط على زر الإعدادات أعلاه لإضافة المفتاح.
            </p>
            <Button onClick={() => setShowSettings(true)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Settings className="h-4 w-4" />
              إعداد مفتاح API
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Initial State — has API key */}
      {!currentSummary && !loading && !error && apiKeySaved && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30">
              <Sparkles className="h-7 w-7 text-teal-500" />
            </div>
            <h3 className="text-base font-semibold mb-2">اختر نوع التحليل واضغط "إنشاء تحليل"</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              اختر نوع التحليل المناسب من الأعلى: تنفيذي سريع، عميق ومفصل، تنبؤي مع سيناريوهات، أو مقارن بين الشركات
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
