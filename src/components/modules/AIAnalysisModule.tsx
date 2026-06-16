'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Loader2, Sparkles, AlertCircle, Copy, Check, RefreshCw } from 'lucide-react';
import { PageActions } from '@/components/system/PageActions';
import { toast } from 'sonner';

interface PnLDatum {
  id: string; companyId: string; companyName: string; companyColor: string;
  period: string; currency: string;
  valuesByItem: { key: string; name: string; nameAr: string; value: number; section: string; sectionType: string; isTotal: boolean; isSubtotal: boolean }[];
}

const ANALYSIS_MODES = [
  { id: 'executive', label: 'ملخص تنفيذي', desc: 'نظرة سريعة للأداء المالي', icon: Sparkles },
  { id: 'deep', label: 'تحليل عميق', desc: 'تفاصيل شاملة لكل بند', icon: Brain },
  { id: 'forecast', label: 'تنبؤ مستقبلي', desc: 'توقعات مالية مستندة للبيانات', icon: Sparkles },
];

export function AIAnalysisModule() {
  const [data, setData] = useState<PnLDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('executive');
  const [apiKey, setApiKey] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/pnl-data');
        const d = await res.json();
        setData(d.data || []);
        const stored = typeof window !== 'undefined' ? localStorage.getItem('anthropic_api_key') : '';
        if (stored) setApiKey(stored);
      } catch { toast.error('فشل التحميل'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function analyze() {
    if (data.length === 0) { toast.error('لا توجد بيانات للتحليل'); return; }
    if (!apiKey) { toast.error('أدخل مفتاح Claude API'); return; }
    setAnalyzing(true);
    setResult('');
    try {
      const res = await fetch('/api/pnl/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anthropic-api-key': apiKey,
        },
        body: JSON.stringify({ mode, data: data.map(d => ({
          company: d.companyName, period: d.period,
          values: d.valuesByItem.map(v => ({ name: v.nameAr, value: v.value, section: v.section })),
        })) }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error);
      setResult(r.summary || r.content || 'لا توجد نتيجة');
    } catch (e: any) {
      toast.error('فشل التحليل: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function copyResult() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold">التحليل الذكي</h2>
          <p className="text-sm text-muted-foreground mt-1">تحليل مالي متقدم بالذكاء الاصطناعي (Claude)</p>
        </div>
        <PageActions hideExcel hidePrint />
      </div>

      {/* API Key */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium">مفتاح Anthropic API</Label>
          <div className="flex gap-2 mt-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (typeof window !== 'undefined') localStorage.setItem('anthropic_api_key', e.target.value);
              }}
              placeholder="sk-ant-..."
              className="flex-1 px-3 py-2 border rounded-md text-sm font-mono"
            />
            <Button variant="outline" onClick={() => { setApiKey(''); localStorage.removeItem('anthropic_api_key'); }}>مسح</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            يُحفظ المفتاح محلياً في متصفحك فقط. احصل عليه من{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" className="text-[#4CAF50] underline">console.anthropic.com</a>
          </p>
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ANALYSIS_MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`text-right p-4 rounded-lg border transition-all ${
              mode === m.id ? 'border-[#4CAF50] bg-[#4CAF50]/5 shadow-sm' : 'border-border hover:border-[#4CAF50]/50'
            }`}
          >
            <m.icon className={`w-5 h-5 mb-2 ${mode === m.id ? 'text-[#4CAF50]' : 'text-muted-foreground'}`} />
            <div className="font-semibold text-sm">{m.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Action */}
      <div className="flex justify-center">
        <Button
          onClick={analyze}
          disabled={analyzing || data.length === 0 || !apiKey}
          className="bg-[#4CAF50] hover:bg-[#388E3C] px-8"
        >
          {analyzing ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جارٍ التحليل...</> : <><Sparkles className="w-4 h-4 ml-1" /> تحليل البيانات</>}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-[#4CAF50]" /> نتيجة التحليل</CardTitle>
            <Button variant="ghost" size="sm" onClick={copyResult}>
              {copied ? <><Check className="w-3 h-3 ml-1" /> تم النسخ</> : <><Copy className="w-3 h-3 ml-1" /> نسخ</>}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{result}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {data.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            لا توجد بيانات P&L للتحليل. ارفع بيانات أولاً.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
