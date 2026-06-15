import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { PNL_LINE_ITEMS, getLineItemKey } from '@/lib/pnl-types';

// GET: Download Excel template
export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // Instructions sheet
    const instructionsData = [
      ['تعليمات - Instructions'],
      [''],
      ['العربية:', 'قم بملء بيانات كل شركة في ورقة منفصلة'],
      ['', 'اسم الورقة = اسم الشركة'],
      ['', 'الخلية B1 = الفترة المالية (مثل: Q1 2024)'],
      ['', 'الخلية B2 = العملة (مثل: SAR, USD)'],
      ['', 'عمود A = اسم البند المالي'],
      ['', 'عمود B = القيمة'],
      [''],
      ['English:', 'Fill each company data in a separate sheet'],
      ['', 'Sheet name = Company name'],
      ['', 'Cell B1 = Financial period (e.g., Q1 2024)'],
      ['', 'Cell B2 = Currency (e.g., SAR, USD)'],
      ['', 'Column A = Line item name'],
      ['', 'Column B = Value'],
    ];
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'تعليمات Instructions');

    // Template sheet with sample data
    const templateData: (string | number)[][] = [
      ['البند Line Item', 'القيمة Value'],
      ['', ''],
      ['الفترة المالية Period', 'Q1 2024'],
      ['العملة Currency', 'SAR'],
      ['', ''],
    ];

    PNL_LINE_ITEMS.forEach((item) => {
      const indent = item.indent || 0;
      const prefix = '  '.repeat(indent);
      const nameStr = `${prefix}${item.nameAr} - ${item.name}`;
      templateData.push([nameStr, 0]);
    });

    const templateWs = XLSX.utils.aoa_to_sheet(templateData);
    templateWs['!cols'] = [{ wch: 45 }, { wch: 20 }];

    XLSX.utils.book_append_sheet(wb, templateWs, 'شركة نموذجية Sample Company');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="PnL_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate template' },
      { status: 500 }
    );
  }
}

// POST: Parse uploaded Excel file
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
      name: string;
      period: string;
      currency: string;
      data: Record<string, number>;
    }[] = [];

    wb.SheetNames.forEach((sheetName) => {
      if (
        sheetName.includes('Instructions') ||
        sheetName.includes('تعليمات')
      ) {
        return;
      }

      const ws = wb.Sheets[sheetName];
      const sheetData: string[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: '',
      });

      let period = 'N/A';
      let currency = 'SAR';
      const data: Record<string, number> = {};

      sheetData.forEach((row) => {
        const colA = String(row[0] || '').trim();
        const colB = row[1];

        if (
          colA.includes('Period') ||
          colA.includes('الفترة')
        ) {
          period = String(colB || 'N/A');
          return;
        }

        if (
          colA.includes('Currency') ||
          colA.includes('العملة')
        ) {
          currency = String(colB || 'SAR');
          return;
        }

        PNL_LINE_ITEMS.forEach((item) => {
          if (
            colA.includes(item.name) ||
            colA.includes(item.nameAr)
          ) {
            const key = getLineItemKey(item.name);
            const value =
              typeof colB === 'number'
                ? colB
                : parseFloat(String(colB).replace(/,/g, '')) || 0;
            data[key] = value;
          }
        });
      });

      if (Object.keys(data).length > 0) {
        companies.push({
          id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: sheetName,
          period,
          currency,
          data,
        });
      }
    });

    if (companies.length === 0) {
      return NextResponse.json(
        { error: 'No valid company data found in the uploaded file' },
        { status: 400 }
      );
    }

    return NextResponse.json({ companies });
  } catch (error) {
    console.error('File parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse Excel file' },
      { status: 500 }
    );
  }
}
