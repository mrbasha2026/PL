import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── AI Response ──────────────────────────────────────────────────────────────
interface AIResponse {
  summary: string;
  mode: string;
  model: string;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
}

// ─── Free Model Options ──────────────────────────────────────────────────────
const FREE_MODELS = [
  { id: 'glm-4-plus', name: 'GLM-4 Plus', desc: 'الأفضل — ذكاء عالي وتحليل مالي متقدم' },
  { id: 'glm-4-flash', name: 'GLM-4 Flash', desc: 'الأسرع — استجابة فورية للتحليلات السريعة' },
  { id: 'glm-4-long', name: 'GLM-4 Long', desc: 'للتحليلات الطويلة — يدعم بيانات أكبر' },
];

// ─── Analysis Modes ──────────────────────────────────────────────────────────
const ANALYSIS_MODES: Record<string, { systemPrompt: string; maxTokens: number; temperature: number }> = {
  executive: {
    systemPrompt: `أنت محلل مالي محترف ومستشار تنفيذي. قم بتحليل البيانات المالية المقدمة وأجب بالعربية فقط.

قدم تحليلاً شاملاً يتضمن:
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

// ─── Load Z-AI Config (3-layer fallback) ────────────────────────────────────
function getZAIConfig() {
  // 1. Try env vars
  const envBaseUrl = process.env.ZAI_BASE_URL;
  const envApiKey = process.env.ZAI_API_KEY;
  if (envBaseUrl && envApiKey) {
    console.log('[AI] Config from env vars');
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      chatId: process.env.ZAI_CHAT_ID || '',
      token: process.env.ZAI_TOKEN || '',
      userId: process.env.ZAI_USER_ID || '',
    };
  }

  // 2. Try config files
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(os.homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ];
  for (const filePath of configPaths) {
    try {
      const configStr = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(configStr);
      if (config.baseUrl && config.apiKey) {
        console.log('[AI] Config from file:', filePath);
        return config;
      }
    } catch { /* next */ }
  }

  // 3. Built-in config — always works
  console.log('[AI] Using built-in config');
  return {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-43918972-0013-4774-b4f8-d105cb76fb8d',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZjBlZmIxY2UtYWViZS00YmVhLTgwYzQtMTBhOWI2ZDNiMjZlIiwiY2hhdF9pZCI6ImNoYXQtNDM5MTg5NzItMDAxMy00Nzc0LWI0ZjgtZDEwNWNiNzZmYjhkIiwicGxhdGZvcm0iOiJ6YWkifQ.xZyIVt_Rh0MOf-habJkydAt-lCm4fSiQ-f42Oc4FhNU',
    userId: 'f0efb1ce-aebe-4bea-80c4-10a9b6d3b26e',
  };
}

// ─── AI Analysis Engine (Free) ──────────────────────────────────────────────
async function analyzeWithAI(
  prompt: string,
  mode: string,
  analysisConfig: typeof ANALYSIS_MODES.executive,
  requestedModel: string = 'glm-4-plus',
): Promise<AIResponse> {
  const config = getZAIConfig();
  const zai = new ZAI(config);

  console.log(`[AI] Analyzing with model: ${requestedModel}`);

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: analysisConfig.systemPrompt },
      { role: 'user', content: prompt },
    ],
    model: requestedModel,
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

  const usedModel = completion.model || requestedModel;

  return {
    summary: content,
    mode,
    model: usedModel,
    tokensUsed: completion.usage?.total_tokens || 0,
    inputTokens: completion.usage?.prompt_tokens || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
  };
}

// ─── Main API Handler ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { prompt, mode = 'executive', model = 'glm-4-plus' } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'البيانات المالية مطلوبة لإنشاء التحليل' },
        { status: 400 }
      );
    }

    const analysisConfig = ANALYSIS_MODES[mode] || ANALYSIS_MODES.executive;

    // Try with requested model, fallback to glm-4-plus if it fails
    try {
      const result = await analyzeWithAI(prompt, mode, analysisConfig, model);
      return NextResponse.json(result);
    } catch (modelError: any) {
      // If requested model failed and it's not glm-4-plus, try the default
      if (model !== 'glm-4-plus') {
        console.warn(`[AI] Model ${model} failed, trying glm-4-plus:`, modelError.message);
        try {
          const result = await analyzeWithAI(prompt, mode, analysisConfig, 'glm-4-plus');
          return NextResponse.json(result);
        } catch {
          // Both failed, throw original error
        }
      }
      throw modelError;
    }
  } catch (error: any) {
    console.error('AI Summary error:', error);
    return NextResponse.json(
      { error: `فشل في إنشاء التحليل الذكي: ${error.message || 'خطأ غير معروف'}` },
      { status: 500 }
    );
  }
}
