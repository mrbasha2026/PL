import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'البيانات المالية مطلوبة لإنشاء التحليل' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `أنت محلل مالي محترف. قم بتحليل البيانات المالية المقدمة وأجب بالعربية فقط. قدم:
1. ملخص تنفيذي مختصر للأداء المالي
2. ثلاث توصيات عملية للتحسين
3. نقاط القوة (مع علامة ✅)
4. نقاط الضعف أو المخاطر (مع علامة ⚠️)
استخدم أرقاماً محددة ونسباً مئوية في تحليلك. كن دقيقاً ومهنياً.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || 'لم يتم إنشاء تحليل';
    return NextResponse.json({ summary: content });
  } catch (error: any) {
    console.error('AI Summary error:', error);
    return NextResponse.json(
      { error: 'فشل في إنشاء التحليل الذكي' },
      { status: 500 }
    );
  }
}
