import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { PNL_LINE_ITEMS, getLineItemKey, detectCategory } from '@/lib/pnl-types';

// GET: Download Excel template with multi-period support
export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ['تعليمات - Instructions'],
      [''],
      ['العربية:', 'قم بملء بيانات كل شركة في ورقة منفصلة'],
      ['', 'اسم الورقة = اسم الشركة (مثال: الراجحي)'],
      ['', 'الصف 1: الفترة المالية | كل عمود يمثل فترة مختلفة'],
      ['', 'B1 = الفترة الأولى (مثل: يناير 2026 أو Jan 2026)'],
      ['', 'C1 = الفترة الثانية (مثل: فبراير 2026 أو Feb 2026)'],
      ['', 'D1 = الفترة الثالثة (مثل: مارس 2026 أو Mar 2026)'],
      ['', '... وهكذا'],
      ['', 'الخلية A2 = العملة (مثل: SAR, USD)'],
      ['', 'عمود A = اسم البند المالي'],
      ['', 'الأعمدة B,C,D... = القيم لكل فترة'],
      ['', ''],
      ['', 'يمكنك إضافة أي بنود مخصصة جديدة!'],
      ['', 'فقط اكتب اسم البند في عمود A والقيمة في الأعمدة التالية'],
      ['', 'النظام سيتعرف عليه تلقائياً ويصنفه حسب الاسم'],
      [''],
      ['English:', 'Fill each company data in a separate sheet'],
      ['', 'Sheet name = Company name (e.g., Al Rajhi)'],
      ['', 'Row 1: Financial period | Each column represents a different period'],
      ['', 'B1 = First period (e.g., Jan 2026)'],
      ['', 'C1 = Second period (e.g., Feb 2026)'],
      ['', 'D1 = Third period (e.g., Mar 2026)'],
      ['', '... and so on'],
      ['', 'Cell A2 = Currency (e.g., SAR, USD)'],
      ['', 'Column A = Line item name'],
      ['', 'Columns B,C,D... = Values for each period'],
      ['', ''],
      ['', 'You can add ANY custom line items!'],
      ['', 'Just type the item name in column A and values in subsequent columns'],
      ['', 'The system will auto-detect and categorize them by name'],
    ];
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'تعليمات Instructions');

    // Template sheet with multi-period columns
    const headerRow = ['البند Line Item', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];
    const currencyRow = ['العملة Currency', 'SAR', 'SAR', 'SAR', 'SAR', 'SAR', 'SAR'];
    const emptyRow = ['', '', '', '', '', '', ''];

    const templateData: (string | number)[][] = [headerRow, currencyRow, emptyRow];

    PNL_LINE_ITEMS.forEach((item) => {
      const indent = item.indent || 0;
      const prefix = '  '.repeat(indent);
      const nameStr = `${prefix}${item.nameAr} - ${item.name}`;
      templateData.push([nameStr, 0, 0, 0, 0, 0, 0]);
    });

    // Add examples of custom items
    templateData.push(['', '', '', '', '', '', '']);
    templateData.push(['--- بنود مخصصة (أمثلة) --- Custom Items (Examples) ---', '', '', '', '', '', '']);
    templateData.push(['مصروفات زكاة - Zakat Expense', 0, 0, 0, 0, 0, 0]);
    templateData.push(['إيجار المحل - Shop Rent', 0, 0, 0, 0, 0, 0]);
    templateData.push(['مصروفات نقل - Transportation Cost', 0, 0, 0, 0, 0, 0]);

    const templateWs = XLSX.utils.aoa_to_sheet(templateData);
    templateWs['!cols'] = [{ wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, templateWs, 'شركة نموذجية Sample Co');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="PnL_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

// ─── Parse a line item name from Excel cell ──────────────────────────────────
// Handles formats like: "مصروفات البيع - Selling Expenses", "Selling Expenses", "مصروفات زكاة"
function parseLineItemName(cellText: string): { key: string; nameAr: string; nameEn: string } | null {
  const trimmed = cellText.trim();
  if (!trimmed) return null;

  // Skip separator rows, headers, and currency rows
  if (trimmed.startsWith('---') || trimmed.startsWith('العملة') || trimmed.startsWith('Currency') ||
      trimmed.startsWith('البند') || trimmed.startsWith('Line Item')) {
    return null;
  }

  // Check if it matches any standard line item first
  for (const item of PNL_LINE_ITEMS) {
    if (trimmed.includes(item.name) || trimmed.includes(item.nameAr)) {
      return {
        key: getLineItemKey(item.name),
        nameAr: item.nameAr,
        nameEn: item.name,
      };
    }
  }

  // Custom item — parse the name
  let nameAr = trimmed;
  let nameEn = '';

  // If format is "عربي - English", split it
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    nameAr = parts[0].trim();
    nameEn = parts[1].trim();
  } else if (trimmed.includes(' -')) {
    const parts = trimmed.split(' -');
    nameAr = parts[0].trim();
    nameEn = parts.slice(1).join('-').trim();
  }

  // Remove leading spaces/indentation
  nameAr = nameAr.replace(/^\s+/, '');

  // Generate key from English name if available, otherwise from Arabic
  const key = nameEn
    ? getLineItemKey(nameEn)
    : 'custom_' + getLineItemKey(nameAr);

  return { key, nameAr, nameEn };
}

// POST: Parse uploaded Excel file with multi-period + custom items support
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
      customItems?: { key: string; nameAr: string; nameEn: string; category: string }[];
    }[] = [];

    wb.SheetNames.forEach((sheetName) => {
      if (sheetName.includes('Instructions') || sheetName.includes('تعليمات')) return;

      const ws = wb.Sheets[sheetName];
      const sheetData: (string | number)[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      });

      if (sheetData.length < 3) return;

      // Row 0: headers — col A is label, cols B+ are period names
      const headerRow = sheetData[0] || [];
      // Row 1: currency — col A is "Currency", cols B+ are currency codes
      const currencyRow = sheetData[1] || [];

      const periods: string[] = [];
      const currencies: string[] = [];

      // Extract periods from header row (cols B+)
      for (let col = 1; col < headerRow.length; col++) {
        const periodName = String(headerRow[col] || '').trim();
        if (periodName && !periodName.includes('Line Item') && !periodName.includes('البند')) {
          periods.push(periodName);
        }
      }

      // Extract currencies from row 1 (cols B+)
      for (let col = 1; col < currencyRow.length; col++) {
        const curr = String(currencyRow[col] || 'SAR').trim();
        currencies.push(curr);
      }

      // If no periods found, try old format (single period)
      if (periods.length === 0) {
        let period = 'N/A';
        let currency = 'SAR';
        const data: Record<string, number> = {};
        const customItemsList: { key: string; nameAr: string; nameEn: string; category: string }[] = [];

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

          // Try standard items first
          let matched = false;
          PNL_LINE_ITEMS.forEach((item) => {
            if (colA.includes(item.name) || colA.includes(item.nameAr)) {
              const key = getLineItemKey(item.name);
              const value = typeof colB === 'number' ? colB : parseFloat(String(colB).replace(/,/g, '')) || 0;
              data[key] = value;
              matched = true;
            }
          });

          // If not matched, try as custom item
          if (!matched && colA) {
            const parsed = parseLineItemName(colA);
            if (parsed) {
              const value = typeof colB === 'number' ? colB : parseFloat(String(colB).replace(/,/g, '')) || 0;
              if (value !== 0) {
                data[parsed.key] = value;
                const category = detectCategory(colA);
                customItemsList.push({
                  key: parsed.key,
                  nameAr: parsed.nameAr,
                  nameEn: parsed.nameEn,
                  category,
                });
              }
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
            customItems: customItemsList.length > 0 ? customItemsList : undefined,
          });
        }
        return;
      }

      // New multi-period format: create a dataset for each period
      periods.forEach((period, colIdx) => {
        const col = colIdx + 1; // column index in sheet (1-based after A)
        const currency = currencies[colIdx] || 'SAR';
        const data: Record<string, number> = {};
        const customItemsList: { key: string; nameAr: string; nameEn: string; category: string }[] = [];

        sheetData.forEach((row, rowIdx) => {
          if (rowIdx <= 1) return; // skip header and currency rows
          const colA = String(row[0] || '').trim();
          const cellValue = row[col];

          // Try standard items first
          let matched = false;
          PNL_LINE_ITEMS.forEach((item) => {
            if (colA.includes(item.name) || colA.includes(item.nameAr)) {
              const key = getLineItemKey(item.name);
              const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue || '0').replace(/,/g, '')) || 0;
              data[key] = value;
              matched = true;
            }
          });

          // If not matched, try as custom item
          if (!matched && colA) {
            const parsed = parseLineItemName(colA);
            if (parsed) {
              const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue || '0').replace(/,/g, '')) || 0;
              if (value !== 0) {
                data[parsed.key] = value;
                const category = detectCategory(colA);
                customItemsList.push({
                  key: parsed.key,
                  nameAr: parsed.nameAr,
                  nameEn: parsed.nameEn,
                  category,
                });
              }
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
            customItems: customItemsList.length > 0 ? customItemsList : undefined,
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
