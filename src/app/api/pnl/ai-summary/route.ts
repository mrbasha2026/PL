import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

// ─── AI Engine Types ──────────────────────────────────────────────────────────
type AIEngine = 'chatgpt' | 'claude';

interface AIResponse {
  summary: string;
  mode: string;
  engine: AIEngine;
  model: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

// ─── Analysis Modes ──────────────────────────────────────────────────────────
const ANALYSIS_MODES: Record<string, { systemPrompt: string; maxTokens: number; temperature: number }> = {
  executive: {
    systemPrompt: `أنت محلل مالي محترف ومستشار تنفيذي. قم بتحليل البيانات المالية المقدمة وأجب بالعربية فقط.

قدم تحليلاً بنيويشمل:
## الملخص التنفيذي
- نظرة عامة مختصرة على أداء كل شركة
- أهم المؤشرات مع أرقام محددة

## التوصيات الاستراتيجية
- 3-5 توصيات عملية وقابلة للتنفيذ
- رتبها حسب الأولوية

## نقاط القوة
- حدد نقاط القوة لكل شركة مع أمثلة رقمية

## المخاطر والتحديات
- حدد المخاطر مع تقييم مستوى الخطورة (عالي/متوسط/منخفض)

## التوقعات قصيرة المدى
- توقع الأداء للفترة القادمة بناءً على الاتجاهات الحالية

استخدم أرقاماً محددة ونسباً مئوية في كل نقطة. كن دقيقاً ومهنياً. أضف تحليل DuPont إذا أمكن.`,
    maxTokens: 4096,
    temperature: 0.7,
  },

  deep: {
    systemPrompt: `أنت محلل مالي متخصص في التحليل العميق والتقييم. أجب بالعربية فقط.

قم بتحليل مالي عميق وشامل يتضمن:

## التحليل الهيكلي للتكاليف
- تحليل تفصيلي لهيكل التكاليف لكل شركة
- مقارنة نسب التكاليف مع معايير القطاع (إن أمكن)
- تحديد بنود التكاليف الأكثر تأثيراً على الربحية

## تحليل الربحية المتدرج (DuPont Analysis)
- تفكيك ROE إلى مكوناته: هامش الصافي × دوران الأصول × الرافعة المالية
- تحديد المحرك الرئيسي للعائد في كل شركة

## تحليل السيولة والمخاطر
- نسبة تغطية الفوائد وتأثيرها على المخاطر المالية
- تقييم كفاية الأرباح التشغيلية لتغطية الالتزامات

## تحليل الاتجاهات (Trend Analysis)
- هل الهوامش تتحسن أم تتدهور؟
- هل نمو الإيرادات حقيقي أم تضخمي؟
- هل التكاليف تنمو بنسبة أسرع من الإيرادات؟

## مقارنة مرجعية (Benchmarking)
- مقارنة أداء الشركات مع بعضها
- تحديد الشركة الأفضل في كل مؤشر

## توصيات تحسين الهوامش
- 5 توصيات محددة لتحسين الهوامش مع تقدير الأثر المالي

كن دقيقاً جداً في الأرقام والنسب. استخدم لغة مهنية مع شرح المصطلحات.`,
    maxTokens: 4096,
    temperature: 0.3,
  },

  forecast: {
    systemPrompt: `أنت محلل مالي متخصص في التنبؤات والتخطيط المالي. أجب بالعربية فقط.

بناءً على البيانات التاريخية المقدمة، قدم:

## تحليل الاتجاهات التاريخية
- تحديد الاتجاه العام لكل مؤشر مالي (صاعد/هابط/ثابت)
- تحديد معدل النمو الشهري المتوسط
- تحديد أي أنماط موسمية واضحة

## التوقعات للـ 3 أشهر القادمة
- توقع الإيرادات مع نطاق الثقة (متفائل/متوقع/متحفظ)
- توقع صافي الدخل مع نطاق الثقة
- توقع الهوامش الرئيسية

## سيناريوهات ماذا لو (What-If Scenarios)
- سيناريو متفائل: نمو 15% في الإيرادات
- سيناريو أساسي: استمرار الاتجاه الحالي
- سيناريو متشائم: انخفاض 10% في الإيرادات
- أثر كل سيناريو على صافي الدخل والهوامش

## مؤشرات الخطر المبكر (Early Warning Signals)
- ما هي العلامات التي يجب مراقبتها؟
- ما هي العتبات الحرجة لكل مؤشر؟

## خطة العمل المقترحة
- إجراءات فورية (خلال شهر)
- إجراءات قصيرة المدى (خلال ربع سنة)
- إجراءات استراتيجية (خلال سنة)

قدم أرقاماً محددة في كل توقع مع توضيح الافتراضات.`,
    maxTokens: 4096,
    temperature: 0.5,
  },

  comparison: {
    systemPrompt: `أنت مستشار مالي متخصص في المقارنة والتقييم النسبي للشركات. أجب بالعربية فقط.

قم بتحليل مقارن شامل:

## مصفوفة الأداء المقارن
- صنّف كل شركة في كل مؤشر (الأفضل/المتوسط/الأضعف)
- المؤشرات: الإيرادات، هامش الربح الإجمالي، هامش التشغيل، هامش الصافي، تغطية الفوائد

## تحليل الميزة التنافسية
- ما هي الميزة التنافسية لكل شركة بناءً على الأرقام؟
- أي شركة تدير عملياتها بكفاءة أعلى؟
- أي شركة تحقق أفضل عائد على المخاطرة؟

## تحليل الفجوات
- ما حجم الفجوة بين الشركات في كل مؤشر؟
- ما هي المجالات التي يمكن للشركات الأضعف أن تتعلم فيها من الأقوى؟

## تصنيف الشركات
- الترتيب العام بناءً على الأداء المالي الشامل
- معيار التقييم والأوزان المستخدمة

## توصيات لكل شركة
- توصيات محددة لكل شركة بناءً على موقعها التنافسي
- ما الذي يجب أن تركز عليه كل شركة للتحسين؟

استخدم جداول مقارنة وأرقام محددة. كن موضوعياً ومتوازناً.`,
    maxTokens: 4096,
    temperature: 0.5,
  },
};

// ─── Model Fallback Chain ────────────────────────────────────────────────────
const MODEL_FALLBACKS: Record<string, string[]> = {
  'claude-sonnet-4-20250514': ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  'claude-opus-4-20250514': ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  'claude-3-5-sonnet-20241022': ['claude-3-haiku-20240307'],
  'claude-3-haiku-20240307': [],
};

// ─── Load Z-AI Config (bypass file-based config) ────────────────────────────
function loadZAIConfig(): { baseUrl: string; apiKey: string; chatId?: string; token?: string; userId?: string } | null {
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(require('os').homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ];

  for (const filePath of configPaths) {
    try {
      const configStr = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(configStr);
      if (config.baseUrl && config.apiKey) {
        console.log('[Z-AI] Config loaded from:', filePath);
        return config;
      }
    } catch {
      // continue to next path
    }
  }
  return null;
}

// ─── ChatGPT Free Engine (GLM-4 Plus) ────────────────────────────────────────
async function analyzeWithChatGPT(
  prompt: string,
  mode: string,
  analysisConfig: typeof ANALYSIS_MODES.executive,
): Promise<AIResponse> {
  console.log('[ChatGPT] Using z-ai-web-dev-sdk (GLM-4 Plus) — Free');

  const config = loadZAIConfig();
  if (!config) {
    throw new Error('لم يتم العثور على إعدادات المحرك المجاني. تأكد من وجود ملف .z-ai-config');
  }

  const zai = new ZAI(config);

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: analysisConfig.systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: analysisConfig.temperature,
    max_tokens: analysisConfig.maxTokens,
  });

  let content = '';
  if (completion.choices && completion.choices[0]) {
    const message = completion.choices[0].message;
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (message.content) {
      content = Array.isArray(message.content)
        ? message.content.map((c: any) => c.text || c.content || '').join('')
        : String(message.content);
    }
  }

  if (!content || content.trim().length === 0) {
    content = 'لم يتم إنشاء تحليل — يرجى المحاولة مرة أخرى';
  }

  return {
    summary: content,
    mode,
    engine: 'chatgpt',
    model: completion.model || 'glm-4-plus',
    tokensUsed: completion.usage?.total_tokens || 0,
    inputTokens: completion.usage?.prompt_tokens || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
    fallbackUsed: false,
  };
}

// ─── Claude AI Engine ────────────────────────────────────────────────────────
async function analyzeWithClaude(
  apiKey: string,
  prompt: string,
  mode: string,
  analysisConfig: typeof ANALYSIS_MODES.executive,
  requestedModel: string,
): Promise<AIResponse> {
  const client = new Anthropic({ apiKey });

  const modelsToTry = [requestedModel, ...(MODEL_FALLBACKS[requestedModel] || ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'])];
  const uniqueModels = [...new Set(modelsToTry)];

  let message: Anthropic.Message | null = null;
  let usedModel = '';
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      console.log(`[Claude] Trying model: ${model}`);
      message = await client.messages.create({
        model,
        max_tokens: analysisConfig.maxTokens,
        temperature: analysisConfig.temperature,
        system: analysisConfig.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      usedModel = model;
      break;
    } catch (modelError: any) {
      console.warn(`[Claude] Model ${model} failed:`, modelError.message);
      lastError = modelError;
      // 403 (not allowed), 404 (not found), 400 (credit too low) — try next model
      if ([400, 403, 404].includes(modelError.status)) {
        continue;
      }
      throw modelError;
    }
  }

  if (!message) {
    throw lastError;
  }

  let content = '';
  if (message.content) {
    for (const block of message.content) {
      if (block.type === 'text') {
        content += block.text;
      }
    }
  }

  if (!content || content.trim().length === 0) {
    content = 'لم يتم إنشاء تحليل — يرجى المحاولة مرة أخرى';
  }

  return {
    summary: content,
    mode,
    engine: 'claude',
    model: usedModel,
    tokensUsed: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
    inputTokens: message.usage?.input_tokens || 0,
    outputTokens: message.usage?.output_tokens || 0,
    fallbackUsed: false,
  };
}

// ─── Main API Handler ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { prompt, mode = 'executive', engine: preferredEngine } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'البيانات المالية مطلوبة لإنشاء التحليل' },
        { status: 400 }
      );
    }

    const analysisConfig = ANALYSIS_MODES[mode] || ANALYSIS_MODES.executive;

    // ── ChatGPT Free Mode (no API key needed) ──
    if (preferredEngine === 'chatgpt') {
      try {
        const result = await analyzeWithChatGPT(prompt, mode, analysisConfig);
        return NextResponse.json(result);
      } catch (zaiError: any) {
        console.error('[ChatGPT] Free engine failed:', zaiError.message);
        return NextResponse.json(
          { error: `فشل المحرك المجاني: ${zaiError.message || 'خطأ غير معروف'}` },
          { status: 500 }
        );
      }
    }

    // ── Claude Mode ──
    const clientApiKey = request.headers.get('x-anthropic-api-key');
    const clientModel = request.headers.get('x-anthropic-model');
    const envApiKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = (clientApiKey && clientApiKey !== 'your-api-key-here')
      ? clientApiKey
      : envApiKey;
    const hasClaudeKey = !!(apiKey && apiKey !== 'your-api-key-here');
    const requestedModel = clientModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    // No Claude API key — fall back to ChatGPT free automatically
    if (!hasClaudeKey) {
      const result = await analyzeWithChatGPT(prompt, mode, analysisConfig);
      result.fallbackUsed = true;
      result.fallbackReason = 'لا يوجد مفتاح Claude API — يتم استخدام ChatGPT المجاني تلقائياً';
      return NextResponse.json(result);
    }

    // Try Claude first, fall back to ChatGPT free on failure
    try {
      const result = await analyzeWithClaude(apiKey!, prompt, mode, analysisConfig, requestedModel);
      return NextResponse.json(result);
    } catch (claudeError: any) {
      console.warn('[Claude] Failed, falling back to ChatGPT free:', claudeError.message);

      // Determine fallback reason
      let fallbackReason = 'فشل Claude AI — يتم استخدام ChatGPT المجاني';
      if (claudeError.status === 400 && claudeError.message?.includes('credit balance')) {
        fallbackReason = 'رصيد Claude API غير كافٍ — يتم استخدام ChatGPT المجاني تلقائياً';
      } else if (claudeError.status === 401) {
        fallbackReason = 'مفتاح Claude API غير صالح — يتم استخدام ChatGPT المجاني';
      } else if (claudeError.status === 403) {
        fallbackReason = 'النموذج غير متاح لحسابك — يتم استخدام ChatGPT المجاني';
      } else if (claudeError.status === 429) {
        fallbackReason = 'تم تجاوز حد طلبات Claude — يتم استخدام ChatGPT المجاني';
      }

      // Fall back to ChatGPT free
      const result = await analyzeWithChatGPT(prompt, mode, analysisConfig);
      result.fallbackUsed = true;
      result.fallbackReason = fallbackReason;
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error('AI Summary error:', error);
    return NextResponse.json(
      { error: `فشل في إنشاء التحليل الذكي: ${error.message || 'خطأ غير معروف'}` },
      { status: 500 }
    );
  }
}
