import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { PNL_LINE_ITEMS, getLineItemKey, detectCategory } from '@/lib/pnl-types';

// GET: Download Excel template — Islamic Business Format with comprehensive expense categories
export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ['تعليمات - Instructions'],
      [''],
      ['العربية:'],
      ['قم بملء بيانات كل شركة في ورقة منفصلة'],
      ['اسم الورقة = اسم الشركة (مثال: الراجحي)'],
      ['الصف 1: الفترة المالية — كل عمود يمثل فترة مختلفة'],
      ['B1 = الفترة الأولى (مثل: Jan 2026 أو يناير 2026)'],
      ['الصف 2: العملة (مثل: SAR)'],
      ['عمود A = اسم البند المالي (عربي - إنجليزي)'],
      ['الأعمدة B,C,D... = القيم لكل فترة'],
      [''],
      ['ملاحظة: لا توجد ضريبة دخل — نظام الزكاة الشرعية'],
      ['يمكنك ترك أي بند فارغ أو بصفر إذا لا ينطبق'],
      [''],
      ['English:'],
      ['Fill each company data in a separate sheet'],
      ['Sheet name = Company name (e.g., Al Rajhi)'],
      ['Row 1: Financial period — each column is a different period'],
      ['Row 2: Currency (e.g., SAR)'],
      ['Column A = Line item name (Arabic - English)'],
      ['Columns B,C,D... = Values for each period'],
      [''],
      ['Note: No income tax — Islamic Zakat system applies'],
      ['Leave any item blank or zero if not applicable'],
    ];
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'تعليمات Instructions');

    // Template sheet with multi-period columns
    const headerRow = ['البند Line Item', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];
    const currencyRow = ['العملة Currency', 'SAR', 'SAR', 'SAR', 'SAR', 'SAR', 'SAR'];

    const templateData: (string | number)[][] = [headerRow, currencyRow];

    PNL_LINE_ITEMS.forEach((item) => {
      const indent = item.indent || 0;
      const prefix = '  '.repeat(indent);
      let nameStr: string;

      if (item.isSubtotal || item.isTotal) {
        nameStr = `${prefix}${item.nameAr} - ${item.name}`;
      } else {
        nameStr = `${prefix}${item.nameAr} - ${item.name}`;
      }

      templateData.push([nameStr, 0, 0, 0, 0, 0, 0]);
    });

    const templateWs = XLSX.utils.aoa_to_sheet(templateData);
    templateWs['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, templateWs, 'شركة نموذجية Sample Co');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="PnL_Template_Islamic.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

// ─── Parse a line item name from Excel cell ──────────────────────────────────
function parseLineItemName(cellText: string): { key: string; nameAr: string; nameEn: string } | null {
  const trimmed = cellText.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('---') || trimmed.startsWith('العملة') || trimmed.startsWith('Currency') ||
      trimmed.startsWith('البند') || trimmed.startsWith('Line Item')) {
    return null;
  }

  // Check if it matches any standard line item first
  for (const item of PNL_LINE_ITEMS) {
    if (trimmed.includes(item.name) || trimmed.includes(item.nameAr)) {
      return { key: getLineItemKey(item.name), nameAr: item.nameAr, nameEn: item.name };
    }
  }

  // Custom item — parse the name
  let nameAr = trimmed;
  let nameEn = '';

  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    nameAr = parts[0].trim();
    nameEn = parts.slice(1).join(' - ').trim();
  }

  nameAr = nameAr.replace(/^\s+/, '');
  const key = nameEn ? getLineItemKey(nameEn) : 'custom_' + getLineItemKey(nameAr);

  return { key, nameAr, nameEn };
}

// POST: Parse uploaded Excel file with comprehensive Islamic business format
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });

    const companies: {
      id: string;
      companyName: string;
      period: string;
      currency: string;
      data: Record<string, number>;
    }[] = [];

    wb.SheetNames.forEach((sheetName) => {
      if (sheetName.includes('Instructions') || sheetName.includes('تعليمات')) return;

      const ws = wb.Sheets[sheetName];
      const sheetData: (string | number)[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      });

      if (sheetData.length < 3) return;

      const headerRow = sheetData[0] || [];
      const currencyRow = sheetData[1] || [];

      const periods: string[] = [];
      const currencies: string[] = [];

      for (let col = 1; col < headerRow.length; col++) {
        const periodName = String(headerRow[col] || '').trim();
        if (periodName && !periodName.includes('Line Item') && !periodName.includes('البند')) {
          periods.push(periodName);
        }
      }

      for (let col = 1; col < currencyRow.length; col++) {
        const curr = String(currencyRow[col] || 'SAR').trim();
        currencies.push(curr);
      }

      if (periods.length === 0) {
        // Fallback: single period format
        let period = 'N/A';
        let currency = 'SAR';
        const data: Record<string, number> = {};

        sheetData.forEach((row) => {
          const colA = String(row[0] || '').trim();
          const colB = row[1];

          if (colA.includes('Period') || colA.includes('الفترة')) {
            period = String(colB || 'N/A');
            return;
          }
          if (colA.includes('Currency') || colA.includes('العملة')) {
            currency = String(colB || 'SAR');
            return;
          }

          let matched = false;
          PNL_LINE_ITEMS.forEach((item) => {
            if (colA.includes(item.name) || colA.includes(item.nameAr)) {
              const key = getLineItemKey(item.name);
              const value = typeof colB === 'number' ? colB : parseFloat(String(colB).replace(/,/g, '')) || 0;
              data[key] = value;
              matched = true;
            }
          });

          if (!matched && colA) {
            const parsed = parseLineItemName(colA);
            if (parsed) {
              const value = typeof colB === 'number' ? colB : parseFloat(String(colB).replace(/,/g, '')) || 0;
              if (value !== 0) data[parsed.key] = value;
            }
          }
        });

        if (Object.keys(data).length > 0) {
          companies.push({
            id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            companyName: sheetName,
            period,
            currency,
            data,
          });
        }
        return;
      }

      // Multi-period format
      periods.forEach((period, colIdx) => {
        const col = colIdx + 1;
        const currency = currencies[colIdx] || 'SAR';
        const data: Record<string, number> = {};

        sheetData.forEach((row, rowIdx) => {
          if (rowIdx <= 1) return;
          const colA = String(row[0] || '').trim();
          const cellValue = row[col];

          let matched = false;
          PNL_LINE_ITEMS.forEach((item) => {
            if (colA.includes(item.name) || colA.includes(item.nameAr)) {
              const key = getLineItemKey(item.name);
              const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue || '0').replace(/,/g, '')) || 0;
              data[key] = value;
              matched = true;
            }
          });

          if (!matched && colA) {
            const parsed = parseLineItemName(colA);
            if (parsed) {
              const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue || '0').replace(/,/g, '')) || 0;
              if (value !== 0) data[parsed.key] = value;
            }
          }
        });

        if (Object.keys(data).length > 0) {
          companies.push({
            id: `c_${Date.now()}_${colIdx}_${Math.random().toString(36).substr(2, 9)}`,
            companyName: sheetName,
            period,
            currency,
            data,
          });
        }
      });
    });

    if (companies.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم العثور على بيانات صالحة في الملف المرفوع. تأكد من اتباع قالب Excel المطلوب.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحليل الملف. يرجى التأكد من صيغة الملف.' },
      { status: 500 }
    );
  }
}
