import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Analysis modes with tailored system prompts
const ANALYSIS_MODES: Record<string, { systemPrompt: string; maxTokens: number }> = {
  executive: {
    systemPrompt: `أنت محلل مالي محترف ومستشار تنفيذي. قم بتحليل البيانات المالية المقدمة وأجب بالعربية فقط.

قدم تحليلاً بنيويشمل:
## الملخص التنفيذي
- نظرة عامة مختصرة على أداء كل شركة
- أهم المؤشرات مع أرقام محددة

## التوصيات الاستراتيجية
- 3-5 توصيات عملية وقابلة للتنفيذ
- رتبها حسب الأولوية

## نقاط القوة ✅
- حدد نقاط القوة لكل شركة مع أمثلة رقمية

## المخاطر والتحديات ⚠️
- حدد المخاطر مع تقييم مستوى الخطورة (عالي/متوسط/منخفض)

## التوقعات قصيرة المدى
- توقع الأداء للفترة القادمة بناءً على الاتجاهات الحالية

استخدم أرقاماً محددة ونسباً مئوية في كل نقطة. كن دقيقاً ومهنياً. أضف تحليل DuPont إذا أمكن.`,
    maxTokens: 3000,
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
    maxTokens: 4000,
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
    maxTokens: 3500,
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
    maxTokens: 3500,
  },
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

    const analysisConfig = ANALYSIS_MODES[mode] || ANALYSIS_MODES.executive;

    const zai = await ZAI.create();

    // Use thinking mode for deep analysis
    const useThinking = mode === 'deep' || mode === 'forecast';

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: analysisConfig.systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature: mode === 'deep' ? 0.3 : mode === 'forecast' ? 0.5 : 0.7,
      max_tokens: analysisConfig.maxTokens,
      ...(useThinking ? { thinking: { type: 'enabled' } } : {}),
    });

    // Extract the content - handle both regular and thinking responses
    let content = '';
    if (completion.choices && completion.choices[0]) {
      const message = completion.choices[0].message;
      // If thinking mode was used, the response might have a different structure
      if (typeof message.content === 'string') {
        content = message.content;
      } else if (message.content) {
        // Handle array content format
        content = Array.isArray(message.content)
          ? message.content.map((c: any) => c.text || c.content || '').join('')
          : String(message.content);
      }
    }

    if (!content || content.trim().length === 0) {
      content = 'لم يتم إنشاء تحليل — يرجى المحاولة مرة أخرى';
    }

    return NextResponse.json({
      summary: content,
      mode,
      tokensUsed: completion.usage?.total_tokens || 0,
    });
  } catch (error: any) {
    console.error('AI Summary error:', error);
    return NextResponse.json(
      { error: 'فشل في إنشاء التحليل الذكي — يرجى المحاولة مرة أخرى' },
      { status: 500 }
    );
  }
}
