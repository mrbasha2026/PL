import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Analysis modes with tailored system prompts
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

// Model fallback chain - try these models in order if one fails
const MODEL_FALLBACKS: Record<string, string[]> = {
  'claude-sonnet-4-20250514': ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  'claude-opus-4-20250514': ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  'claude-3-5-sonnet-20241022': ['claude-3-haiku-20240307'],
  'claude-3-haiku-20240307': [],
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, mode = 'executive' } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'البيانات المالية مطلوبة لإنشاء التحليل' },
        { status: 400 }
      );
    }

    // Check for API key: first from client headers, then from environment variables
    const clientApiKey = request.headers.get('x-anthropic-api-key');
    const clientModel = request.headers.get('x-anthropic-model');
    const envApiKey = process.env.ANTHROPIC_API_KEY;

    const apiKey = (clientApiKey && clientApiKey !== 'your-api-key-here')
      ? clientApiKey
      : envApiKey;

    if (!apiKey || apiKey === 'your-api-key-here') {
      return NextResponse.json(
        {
          error: 'مفتاح API غير مضبوط',
          details: 'يرجى إضافة مفتاح Anthropic API من إعدادات التحليل الذكي أو في ملف .env.local',
          setupUrl: 'https://console.anthropic.com/settings/keys',
        },
        { status: 401 }
      );
    }

    const analysisConfig = ANALYSIS_MODES[mode] || ANALYSIS_MODES.executive;
    const requestedModel = clientModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    // Initialize Anthropic client
    const client = new Anthropic({ apiKey });

    // Try the requested model, then fallback to other models if 403
    const modelsToTry = [requestedModel, ...(MODEL_FALLBACKS[requestedModel] || ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'])];
    // Remove duplicates
    const uniqueModels = [...new Set(modelsToTry)];

    let message: Anthropic.Message | null = null;
    let usedModel = '';
    let lastError: any = null;

    for (const model of uniqueModels) {
      try {
        console.log(`Trying model: ${model}`);
        message = await client.messages.create({
          model,
          max_tokens: analysisConfig.maxTokens,
          temperature: analysisConfig.temperature,
          system: analysisConfig.systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            }
          ],
        });
        usedModel = model;
        break; // Success, exit the loop
      } catch (modelError: any) {
        console.warn(`Model ${model} failed:`, modelError.message);
        lastError = modelError;

        // If it's a 403 (model not allowed) or 404 (model not found), try next model
        if (modelError.status === 403 || modelError.status === 404) {
          continue;
        }

        // For other errors (429, 500, etc.), don't try other models
        throw modelError;
      }
    }

    if (!message) {
      // All models failed with 403/404
      if (lastError?.status === 403) {
        return NextResponse.json(
          {
            error: 'النماذج المطلوبة غير متاحة لحسابك',
            details: 'يرجى التحقق من أن حسابك في Anthropic يدعم النماذج المحددة. جرب اختيار نموذج آخر مثل Claude 3.5 Sonnet أو Claude 3 Haiku.',
            triedModels: uniqueModels,
          },
          { status: 403 }
        );
      }
      throw lastError;
    }

    // Extract the content from Claude's response
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

    return NextResponse.json({
      summary: content,
      mode,
      model: usedModel,
      requestedModel,
      tokensUsed: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0),
      inputTokens: message.usage?.input_tokens || 0,
      outputTokens: message.usage?.output_tokens || 0,
    });
  } catch (error: any) {
    console.error('Claude AI Summary error:', error);

    // Handle specific Anthropic errors
    if (error.status === 401) {
      return NextResponse.json(
        {
          error: 'مفتاح API غير صالح',
          details: 'يرجى التحقق من مفتاح Anthropic API — تأكد أنه صحيح ولم تنتهِ صلاحيته',
        },
        { status: 401 }
      );
    }

    if (error.status === 403) {
      return NextResponse.json(
        {
          error: 'الوصول مرفوض — النموذج غير متاح لحسابك',
          details: 'حسابك في Anthropic قد لا يدعم هذا النموذج. جرب اختيار Claude 3.5 Sonnet أو Claude 3 Haiku من الإعدادات.',
        },
        { status: 403 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        {
          error: 'تم تجاوز حد الطلبات',
          details: 'يرجى الانتظار قليلاً ثم المحاولة مرة أخرى. تحقق من حدود استخدامك في لوحة تحكم Anthropic.',
        },
        { status: 429 }
      );
    }

    if (error.status === 500 || error.status === 529) {
      return NextResponse.json(
        {
          error: 'خطأ في خادم Anthropic',
          details: 'خوادم Anthropic تواجه مشكلة مؤقتة — يرجى المحاولة بعد دقيقة',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: `فشل في إنشاء التحليل الذكي: ${error.message || 'خطأ غير معروف'}` },
      { status: 500 }
    );
  }
}
