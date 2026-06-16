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

    // ─── Realistic sample data for a Saudi trading company ────────────────
    // Monthly figures showing gradual growth, seasonal patterns, realistic ratios
    const sampleData: Record<string, number[]> = {
      // REVENUE — ~8M SAR/month average, growing trend
      'revenue':                        [7200000, 7500000, 7800000, 8100000, 8500000, 8900000],
      'sales_revenue':                  [6500000, 6800000, 7000000, 7300000, 7700000, 8000000],
      'service_revenue':                [500000, 520000, 550000, 570000, 550000, 600000],
      'other_revenue':                  [200000, 180000, 250000, 230000, 250000, 300000],

      // COST OF SALES — ~55% of revenue
      'cost_of_goods_sold':             [3960000, 4125000, 4290000, 4455000, 4675000, 4895000],
      'raw_materials':                  [2160000, 2250000, 2340000, 2430000, 2550000, 2670000],
      'direct_labor':                   [900000, 937500, 975000, 1012500, 1062500, 1113750],
      'manufacturing_overhead':         [540000, 562500, 585000, 607500, 637500, 668250],
      'purchases':                      [360000, 375000, 390000, 405000, 425000, 443000],

      // GROSS PROFIT
      'gross_profit':                   [3240000, 3375000, 3510000, 3645000, 3825000, 4005000],

      // OPERATING EXPENSES — ~35% of revenue
      'operating_expenses':             [2520000, 2625000, 2730000, 2835000, 2975000, 3115000],

      // Selling & Marketing — ~10% of revenue
      'selling_expenses':               [720000, 750000, 780000, 810000, 850000, 890000],
      'sales_commissions':              [195000, 204000, 210000, 219000, 231000, 240000],
      'advertising':                    [144000, 150000, 156000, 162000, 170000, 178000],
      'marketing_expenses':             [216000, 225000, 234000, 243000, 255000, 267000],
      'delivery_shipping':              [108000, 112500, 117000, 121500, 127500, 133500],
      'customer_service':               [57000, 58500, 63000, 64500, 66500, 71500],

      // G&A — ~18% of revenue
      'general_administrative':         [1296000, 1350000, 1404000, 1458000, 1530000, 1602000],
      'salaries_wages':                 [540000, 540000, 540000, 567000, 567000, 567000],
      'employee_benefits':              [162000, 162000, 162000, 170100, 170100, 170100],
      'gosi_contributions':             [75600, 75600, 75600, 79380, 79380, 79380],
      'rent_expense':                   [120000, 120000, 120000, 120000, 120000, 120000],
      'utilities':                      [45000, 42000, 40000, 48000, 54000, 58000],
      'telecommunications':             [18000, 18000, 18000, 18000, 18000, 18000],
      'office_supplies':                [12000, 11500, 10000, 13000, 12500, 11000],
      'professional_fees':              [60000, 55000, 75000, 50000, 65000, 80000],
      'travel_entertainment':           [35000, 30000, 28000, 45000, 50000, 65000],
      'insurance_expense':              [24000, 24000, 24000, 24000, 24000, 24000],
      'maintenance_repairs':            [30000, 35000, 25000, 40000, 32000, 38000],
      'licenses_permits':               [15000, 10000, 8000, 12000, 9000, 8000],
      'subscriptions_software':         [36000, 36000, 36000, 36000, 36000, 36000],
      'bad_debts':                      [45000, 48000, 52000, 50000, 55000, 60000],
      'miscellaneous_expenses':         [77400, 80900, 84400, 83520, 88020, 93520],

      // Depreciation & Amortization — ~5% of revenue
      'depreciation_amortization':      [360000, 360000, 360000, 360000, 375000, 375000],
      'depreciation_of_buildings':       [80000, 80000, 80000, 80000, 80000, 80000],
      'depreciation_of_equipment':      [180000, 180000, 180000, 180000, 180000, 180000],
      'depreciation_of_vehicles':       [60000, 60000, 60000, 60000, 75000, 75000],
      'amortization_of_intangibles':    [40000, 40000, 40000, 40000, 40000, 40000],

      // OPERATING INCOME (EBIT)
      'operating_income_ebit':          [720000, 750000, 780000, 810000, 850000, 890000],

      // NON-OPERATING ITEMS
      'interest_income':                [45000, 42000, 48000, 50000, 55000, 52000],
      'finance_cost':                   [120000, 115000, 110000, 105000, 100000, 95000],
      'other_income':                   [30000, 25000, 35000, 40000, 28000, 45000],
      'other_expenses':                 [15000, 18000, 12000, 20000, 15000, 10000],

      // INCOME BEFORE ZAKAT
      'income_before_zakat':            [660000, 684000, 741000, 775000, 818000, 882000],

      // ZAKAT — ~2.5% of zakat base
      'zakat_expense':                  [16500, 17100, 18525, 19375, 20450, 22050],

      // NET INCOME
      'net_income':                     [643500, 666900, 722475, 755625, 797550, 859950],
    };

    PNL_LINE_ITEMS.forEach((item) => {
      const indent = item.indent || 0;
      const prefix = '  '.repeat(indent);
      const nameStr = `${prefix}${item.nameAr} - ${item.name}`;
      const key = getLineItemKey(item.name);
      const rowValues = sampleData[key] || [0, 0, 0, 0, 0, 0];
      templateData.push([nameStr, ...rowValues]);
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
