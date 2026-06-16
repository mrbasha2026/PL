'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { PNL_LINE_ITEMS, FINANCIAL_RATIOS } from '@/lib/pnl-types';

export function Glossary() {
  return (
    <div className="space-y-6">
      {/* Line Items Glossary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-[#4CAF50]" />
            مصطلحات قائمة الأرباح والخسائر — P&L Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PNL_LINE_ITEMS.filter(item => item.description).map((item) => (
              <div key={item.name} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{item.nameAr}</span>
                  <span className="text-xs text-muted-foreground">({item.name})</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ratios Glossary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-amber-600" />
            النسب المالية — Financial Ratios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FINANCIAL_RATIOS.filter(r => r.description).map((ratio) => (
              <div key={ratio.key} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{ratio.nameAr}</span>
                  <span className="text-xs text-muted-foreground">({ratio.nameEn})</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ratio.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-teal-600" />
            منهجية الحساب — Calculation Methodology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <h4 className="font-bold text-xs mb-1">النسبة المئوية من الإيرادات (% of Revenue)</h4>
              <p className="text-xs text-muted-foreground">تُحسب بقسمة قيمة البند على الإيرادات مضروبة في 100: (قيمة البند ÷ الإيرادات) × 100</p>
            </div>
            <div className="rounded-lg border p-3">
              <h4 className="font-bold text-xs mb-1">نسبة التغير الشهري (Month-over-Month Change %)</h4>
              <p className="text-xs text-muted-foreground">تُحسب: ((قيمة الشهر الحالي - الشهر السابق) ÷ القيمة المطلقة للشهر السابق) × 100</p>
            </div>
            <div className="rounded-lg border p-3">
              <h4 className="font-bold text-xs mb-1">التجميع (Aggregation)</h4>
              <p className="text-xs text-muted-foreground">عند تحديد نطاق تجميع، يتم جمع قيم جميع الأشهر في النطاق لكل بند. مثلاً: تجميع يناير-مارس = مجموع القيم للثلاثة أشهر</p>
            </div>
            <div className="rounded-lg border p-3">
              <h4 className="font-bold text-xs mb-1">رموز الأرقام المضغوطة</h4>
              <p className="text-xs text-muted-foreground">K = ألف (1,000) | M = مليون (1,000,000) | B = مليار (1,000,000,000)</p>
            </div>
            <div className="rounded-lg border p-3">
              <h4 className="font-bold text-xs mb-1">دلالة الألوان</h4>
              <p className="text-xs text-muted-foreground">
                🟢 أخضر = قيمة إيجابية / تحسن / ارتفاع &nbsp;|&nbsp; 🔴 أحمر = قيمة سلبية / تراجع / انخفاض &nbsp;|&nbsp; ⚪ رمادي = لا تغير
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
