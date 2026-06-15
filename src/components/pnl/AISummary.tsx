'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sparkles, RefreshCw, Brain, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Building2, TrendingUp, Search, GitCompareArrows, FileText,
  Zap, ChevronDown, ChevronUp, Copy, Check, Settings, Key, Info,
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

// Claude model options
const CLAUDE_MODELS = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', desc: 'الأكثر توفراً — سريع وفعال ومتاح لمعظم الحسابات' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', desc: 'أحدث نموذج — أفضل جودة (قد لا يكون متاحاً لجميع الحسابات)' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', desc: 'الأسرع والأرخص — مناسب للتحليلات السريعة' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', desc: 'أعلى جودة — أبطأ وأغلى (يحتاج خطة خاصة)' },
];

interface AIResponse {
  summary: string;
  mode: string;
  engine: 'chatgpt' | 'claude';
  model: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  fallbackUsed?: boolean;
  fallbackReason?: string;
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

  // AI Engine selection
  const [aiEngine, setAiEngine] = useState<'chatgpt' | 'claude'>('chatgpt');

  // API Key settings
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet-20241022');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // Load saved settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key');
    const savedModel = localStorage.getItem('anthropic_model');
    const savedEngine = localStorage.getItem('ai_engine');
    if (savedKey) {
      setApiKey(savedKey);
      setApiKeySaved(true);
    }
    if (savedModel) {
      setSelectedModel(savedModel);
    }
    if (savedEngine === 'chatgpt' || savedEngine === 'claude') {
      setAiEngine(savedEngine);
    }
  }, []);

  const saveApiKey = useCallback(() => {
    if (apiKey.trim()) {
      localStorage.setItem('anthropic_api_key', apiKey.trim());
      localStorage.setItem('anthropic_model', selectedModel);
      localStorage.setItem('ai_engine', aiEngine);
      setApiKeySaved(true);
      setShowSettings(false);
      setConnectionStatus('unknown');
    }
  }, [apiKey, selectedModel, aiEngine]);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem('anthropic_api_key');
    localStorage.removeItem('anthropic_model');
    setApiKey('');
    setApiKeySaved(false);
    setConnectionStatus('unknown');
  }, []);

  const testConnection = useCallback(async () => {
    if (!apiKey.trim()) return;
    try {
      const response = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anthropic-api-key': apiKey.trim(),
          'x-anthropic-model': selectedModel,
        },
        body: JSON.stringify({ prompt: 'اختبار اتصال — اكتب "متصل" فقط', mode: 'executive' }),
      });
      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  }, [apiKey, selectedModel]);

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

    // Check for client-side API key
    const clientApiKey = localStorage.getItem('anthropic_api_key') || apiKey;
    const clientModel = localStorage.getItem('anthropic_model') || selectedModel;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Pass API key from client if available and using Claude
      if (aiEngine === 'claude' && clientApiKey && clientApiKey !== 'your-api-key-here') {
        headers['x-anthropic-api-key'] = clientApiKey;
        headers['x-anthropic-model'] = clientModel;
      }

      const response = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, mode, engine: aiEngine }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل في إنشاء التحليل');
      }

      const data: AIResponse = await response.json();
      setSummaries(prev => ({ ...prev, [mode]: data.summary }));
      setAiResponses(prev => ({ ...prev, [mode]: data }));
      setConnectionStatus('connected');
    } catch (err: any) {
      console.error('AI Summary fetch error:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء التحليل الذكي');
    } finally {
      setLoading(false);
    }
  }, [buildPrompt, apiKey, selectedModel, aiEngine]);

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
              <Badge variant="outline" className={`gap-1 text-xs bg-white/50 dark:bg-slate-800/50 ${
                aiEngine === 'chatgpt' ? 'text-emerald-700 dark:text-emerald-400' : 'text-violet-700 dark:text-violet-400'
              }`}>
                {aiEngine === 'chatgpt' ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                {aiEngine === 'chatgpt' ? 'ChatGPT مجاني' : 'Claude AI'}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* API Key Status */}
              <Badge
                variant="outline"
                className={`gap-1 text-[10px] ${
                  aiEngine === 'chatgpt'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : apiKeySaved
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400'
                }`}
              >
                {aiEngine === 'chatgpt' ? <Zap className="h-3 w-3" /> : <Key className="h-3 w-3" />}
                {aiEngine === 'chatgpt' ? 'مجاني' : apiKeySaved ? 'متصل' : 'غير متصل'}
              </Badge>
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="ghost"
                size="sm"
                className="gap-1 h-7 w-7 p-0"
              >
                <Settings className="h-4 w-4" />
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
            {/* Engine Switcher */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => { setAiEngine('chatgpt'); localStorage.setItem('ai_engine', 'chatgpt'); }}
                className={`text-[10px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  aiEngine === 'chatgpt'
                    ? 'bg-background shadow-sm font-bold text-emerald-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="h-2.5 w-2.5" />
                ChatGPT مجاني
              </button>
              <button
                onClick={() => { setAiEngine('claude'); localStorage.setItem('ai_engine', 'claude'); }}
                className={`text-[10px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  aiEngine === 'claude'
                    ? 'bg-background shadow-sm font-bold text-violet-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Cpu className="h-2.5 w-2.5" />
                Claude
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Settings Panel */}
      {showSettings && (
        <Card className="shadow-sm border-2 border-indigo-200 dark:border-indigo-800 overflow-hidden">
          <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4 text-indigo-600" />
              إعدادات Claude AI — مفتاح API
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Info about getting API key */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-bold">كيفية الحصول على مفتاح API:</p>
                <p>1. اذهب إلى <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline font-bold">console.anthropic.com</a></p>
                <p>2. سجل الدخول بحسابك المدفوع</p>
                <p>3. أنشئ مفتاح API جديد وانسخه</p>
                <p>4. الصقه هنا واضغط "حفظ"</p>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">نموذج Claude</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {CLAUDE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`rounded-lg border p-3 text-right transition-all ${
                      selectedModel === model.id
                        ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-300'
                        : 'border-muted hover:border-indigo-200'
                    }`}
                  >
                    <p className="text-sm font-bold">{model.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">مفتاح API</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeySaved(false);
                  }}
                  placeholder="sk-ant-api03-..."
                  className="flex-1 text-sm font-mono"
                  dir="ltr"
                />
                <Button onClick={saveApiKey} size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Check className="h-3.5 w-3.5" />
                  حفظ
                </Button>
              </div>
            </div>

            {/* Connection Test & Clear */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={testConnection}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={!apiKey.trim()}
                >
                  <Zap className="h-3 w-3" />
                  اختبار الاتصال
                </Button>
                {connectionStatus === 'connected' && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 ml-1" />
                    متصل بنجاح
                  </Badge>
                )}
                {connectionStatus === 'error' && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                    <XCircle className="h-3 w-3 ml-1" />
                    فشل الاتصال
                  </Badge>
                )}
              </div>
              {apiKeySaved && (
                <Button onClick={clearApiKey} variant="ghost" size="sm" className="gap-1 text-xs text-red-500 hover:text-red-700">
                  <XCircle className="h-3 w-3" />
                  حذف المفتاح
                </Button>
              )}
            </div>

            {/* Security note */}
            <div className="text-[10px] text-muted-foreground flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>يُحفظ المفتاح محلياً في المتصفح فقط ولا يُرسل لأي خادم خارجي. يتم إرساله مباشرة إلى خوادم Anthropic عبر اتصال مشفر.</span>
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
              يقوم Claude AI بمراجعة البيانات المالية بالتفصيل لإنشاء تحليل شامل ومتعمق
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
              {!apiKeySaved && (
                <Button onClick={() => setShowSettings(true)} variant="outline" size="sm" className="gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  إعداد مفتاح API
                </Button>
              )}
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
              {/* Fallback notice */}
              {currentResponse.fallbackUsed && currentResponse.fallbackReason && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 p-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <p>{currentResponse.fallbackReason}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Engine Badge */}
                  <Badge variant="outline" className={`gap-1 text-[10px] ${
                    currentResponse.engine === 'chatgpt'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                  }`}>
                    {currentResponse.engine === 'chatgpt' ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                    {currentResponse.engine === 'chatgpt' ? `ChatGPT — ${currentResponse.model}` : `Claude — ${currentResponse.model}`}
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
