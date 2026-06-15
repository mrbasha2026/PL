'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, RefreshCw, Brain, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, Copy, Check, Cpu, MessageSquare, Zap,
} from 'lucide-react';

interface ClaudeInsightProps {
  /** The prompt to send to Claude — should contain the financial context */
  prompt: string;
  /** System prompt to guide Claude's analysis */
  systemPrompt: string;
  /** Title displayed on the card */
  title: string;
  /** Icon for the card */
  icon?: React.ReactNode;
  /** Max tokens for response */
  maxTokens?: number;
  /** Temperature */
  temperature?: number;
}

export function ClaudeInsight({
  prompt,
  systemPrompt,
  title,
  icon,
  maxTokens = 3000,
  temperature = 0.5,
}: ClaudeInsightProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [tokens, setTokens] = useState<{ input: number; output: number; model: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInsight = useCallback(async () => {
    if (!prompt.trim()) return;

    const clientApiKey = localStorage.getItem('anthropic_api_key');
    const clientModel = localStorage.getItem('anthropic_model') || 'claude-sonnet-4-20250514';

    if (!clientApiKey || clientApiKey === 'your-api-key-here') {
      setError('يرجى إضافة مفتاح Claude API من تبويب التحليل الذكي أولاً');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anthropic-api-key': clientApiKey,
          'x-anthropic-model': clientModel,
        },
        body: JSON.stringify({ prompt, mode: 'executive' }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل في إنشاء التحليل');
      }

      const data = await response.json();
      setInsight(data.summary);
      setTokens({
        input: data.inputTokens || 0,
        output: data.outputTokens || 0,
        model: data.model || clientModel,
      });
    } catch (err: any) {
      console.error('Claude Insight error:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء التحليل');
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  return (
    <Card className="shadow-sm overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/50">
      <CardHeader
        className="bg-gradient-to-l from-indigo-50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/10 pb-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm text-indigo-700 dark:text-indigo-400">
          <div className="flex items-center gap-2">
            {icon || <Brain className="h-4 w-4" />}
            {title}
            <Badge variant="outline" className="gap-1 text-[9px] bg-white/50 dark:bg-slate-800/50">
              <Cpu className="h-2.5 w-2.5" />
              Claude AI
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 space-y-3">
          {/* Generate button */}
          {!insight && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
                <Sparkles className="h-6 w-6 text-indigo-500" />
              </div>
              <p className="text-sm text-muted-foreground mb-3 max-w-md">
                اضغط لإنشاء تحليل ذكي متعمق باستخدام Claude AI
              </p>
              <Button onClick={generateInsight} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Sparkles className="h-4 w-4" />
                إنشاء تحليل Claude
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative mb-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                </div>
              </div>
              <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
                جارٍ التحليل بالذكاء الاصطناعي...
              </p>
              <p className="text-xs text-muted-foreground">
                Claude يراجع البيانات وينشئ تحليلاً مخصصاً
              </p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button onClick={generateInsight} variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Insight Result */}
          {insight && !loading && !error && (
            <div className="space-y-3">
              {/* Token info */}
              {tokens && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="gap-1 text-[9px] bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                    <Cpu className="h-2.5 w-2.5" />
                    {tokens.model}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {tokens.input.toLocaleString()} توكن إدخال
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    {tokens.output.toLocaleString()} توكن إخراج
                  </Badge>
                </div>
              )}

              {/* Content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/5 rounded-lg p-4">
                {insight.split('\n').map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <br key={idx} />;

                  const hasCheck = trimmed.includes('✅') || trimmed.includes('✓');
                  const hasWarning = trimmed.includes('⚠️') || trimmed.includes('⚠');
                  const isNumbered = /^\d+[\.\)]\s/.test(trimmed);
                  const isBullet = /^[-•]\s/.test(trimmed);

                  return (
                    <div
                      key={idx}
                      className={`py-0.5 ${
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

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button onClick={generateInsight} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  إعادة التحليل
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => copyToClipboard(insight)}
                >
                  {copied ? <Check className="h-3 w-3 text-teal-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'تم النسخ' : 'نسخ'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
