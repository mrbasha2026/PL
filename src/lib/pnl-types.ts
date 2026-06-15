// P&L Data Types

export interface PnLLineItem {
  name: string;
  nameAr: string;
  category: 'revenue' | 'expense' | 'profit';
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

export interface CompanyPnL {
  id: string;
  name: string;
  period: string; // e.g. "Q1 2024", "FY 2024"
  currency: string;
  data: Record<string, number>; // line item key -> value
}

export interface PnLComparison {
  companies: CompanyPnL[];
  lineItems: PnLLineItem[];
}

// Standard P&L line items template
export const PNL_LINE_ITEMS: PnLLineItem[] = [
  { name: 'Revenue', nameAr: 'الإيرادات', category: 'revenue', isTotal: true, indent: 0 },
  { name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', category: 'expense', indent: 1 },
  { name: 'Gross Profit', nameAr: 'إجمالي الربح', category: 'profit', isSubtotal: true, indent: 0 },
  { name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', category: 'expense', isTotal: true, indent: 0 },
  { name: 'Selling Expenses', nameAr: 'مصروفات البيع', category: 'expense', indent: 1 },
  { name: 'General & Administrative', nameAr: 'مصروفات إدارية وعمومية', category: 'expense', indent: 1 },
  { name: 'Depreciation & Amortization', nameAr: 'الإهلاك والاستنفاد', category: 'expense', indent: 1 },
  { name: 'Operating Income (EBIT)', nameAr: 'الدخل التشغيلي', category: 'profit', isSubtotal: true, indent: 0 },
  { name: 'Interest Income', nameAr: 'إيرادات الفوائد', category: 'revenue', indent: 1 },
  { name: 'Interest Expense', nameAr: 'مصروفات الفوائد', category: 'expense', indent: 1 },
  { name: 'Other Income/Expense', nameAr: 'إيرادات/مصروفات أخرى', category: 'revenue', indent: 1 },
  { name: 'Income Before Tax', nameAr: 'الدخل قبل الضريبة', category: 'profit', isSubtotal: true, indent: 0 },
  { name: 'Income Tax Expense', nameAr: 'مصروف ضريبة الدخل', category: 'expense', indent: 1 },
  { name: 'Net Income', nameAr: 'صافي الدخل', category: 'profit', isTotal: true, indent: 0 },
];

// Map English line item names to keys
export function getLineItemKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Generate line item keys
export const PNL_KEYS = PNL_LINE_ITEMS.map(item => getLineItemKey(item.name));

// Color palette for companies
export const COMPANY_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];
