// P&L Data Types — Professional Grade

export interface PnLLineItem {
  name: string;
  nameAr: string;
  category: 'revenue' | 'expense' | 'profit';
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
}

// Each dataset represents ONE company in ONE period
export interface CompanyPnL {
  id: string;
  companyName: string;  // e.g. "الراجحي"
  period: string;       // e.g. "Q1 2024"
  currency: string;
  data: Record<string, number>; // line item key -> value
}

// Derived: unique company with multiple periods
export interface CompanyGroup {
  name: string;
  periods: string[];
  datasets: CompanyPnL[];
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

export function getLineItemKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export const PNL_KEYS = PNL_LINE_ITEMS.map(item => getLineItemKey(item.name));

// Professional color palette (accessible, print-friendly)
export const COMPANY_COLORS = [
  '#0d9488', // teal-600
  '#d97706', // amber-600
  '#dc2626', // red-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#ea580c', // orange-600
  '#db2777', // pink-600
  '#059669', // emerald-600
  '#4f46e5', // indigo-600
  '#65a30d', // lime-600
];

// Financial Ratios
export interface FinancialRatio {
  key: string;
  nameAr: string;
  nameEn: string;
  formula: (data: Record<string, number>) => number | null;
  format: 'percentage' | 'ratio' | 'number';
}

export const FINANCIAL_RATIOS: FinancialRatio[] = [
  {
    key: 'gross_margin',
    nameAr: 'هامش الربح الإجمالي',
    nameEn: 'Gross Margin',
    formula: (d) => d['revenue'] ? (d['gross_profit'] / d['revenue']) * 100 : null,
    format: 'percentage',
  },
  {
    key: 'operating_margin',
    nameAr: 'هامش التشغيلي',
    nameEn: 'Operating Margin',
    formula: (d) => d['revenue'] ? (d['operating_income_ebit'] / d['revenue']) * 100 : null,
    format: 'percentage',
  },
  {
    key: 'net_margin',
    nameAr: 'هامش صافي الربح',
    nameEn: 'Net Margin',
    formula: (d) => d['revenue'] ? (d['net_income'] / d['revenue']) * 100 : null,
    format: 'percentage',
  },
  {
    key: 'cogs_ratio',
    nameAr: 'نسبة تكلفة المبيعات',
    nameEn: 'COGS Ratio',
    formula: (d) => d['revenue'] ? (d['cost_of_goods_sold'] / d['revenue']) * 100 : null,
    format: 'percentage',
  },
  {
    key: 'opex_ratio',
    nameAr: 'نسبة المصروفات التشغيلية',
    nameEn: 'OpEx Ratio',
    formula: (d) => d['revenue'] ? (d['operating_expenses'] / d['revenue']) * 100 : null,
    format: 'percentage',
  },
  {
    key: 'tax_rate',
    nameAr: 'معدل الضريبة الفعلي',
    nameEn: 'Effective Tax Rate',
    formula: (d) => d['income_before_tax'] ? (d['income_tax_expense'] / d['income_before_tax']) * 100 : null,
    format: 'percentage',
  },
  {
    key: 'interest_coverage',
    nameAr: 'نسبة تغطية الفوائد',
    nameEn: 'Interest Coverage',
    formula: (d) => d['interest_expense'] ? d['operating_income_ebit'] / d['interest_expense'] : null,
    format: 'ratio',
  },
];

// Helper: format numbers professionally
export function formatNumber(value: number, currency: string = 'SAR', compact: boolean = true): string {
  if (value === 0) return '-';
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (compact) {
    if (absVal >= 1_000_000_000) return `${sign}${(absVal / 1_000_000_000).toFixed(1)}B ${currency}`;
    if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}M ${currency}`;
    if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(1)}K ${currency}`;
    return `${sign}${absVal.toFixed(0)} ${currency}`;
  }

  // Full format with commas
  return `${sign}${absVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}

export function formatCompact(value: number): string {
  const absVal = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absVal >= 1_000_000_000) return `${sign}${(absVal / 1_000_000_000).toFixed(1)}B`;
  if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(1)}K`;
  return `${sign}${absVal.toFixed(0)}`;
}

export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '' : ''}${value.toFixed(1)}%`;
}

export function formatRatio(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(2) + 'x';
}

// Group datasets by company name
export function groupByCompany(datasets: CompanyPnL[]): CompanyGroup[] {
  const map = new Map<string, CompanyPnL[]>();
  datasets.forEach((ds) => {
    const existing = map.get(ds.companyName) || [];
    existing.push(ds);
    map.set(ds.companyName, existing);
  });

  return Array.from(map.entries()).map(([name, datasets]) => ({
    name,
    periods: datasets.map((d) => d.period),
    datasets: datasets.sort((a, b) => a.period.localeCompare(b.period)),
  }));
}

// Aggregate multiple periods of the same company into a single consolidated data object
export function aggregatePeriods(datasets: CompanyPnL[]): Record<string, number> {
  const result: Record<string, number> = {};
  datasets.forEach(ds => {
    Object.entries(ds.data).forEach(([key, val]) => {
      result[key] = (result[key] || 0) + val;
    });
  });
  return result;
}

// Arabic month names for period label generation
export const ARABIC_MONTHS: Record<string, string> = {
  'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل',
  'May': 'مايو', 'Jun': 'يونيو', 'Jul': 'يوليو', 'Aug': 'أغسطس',
  'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر',
  'Q1': 'الربع الأول', 'Q2': 'الربع الثاني', 'Q3': 'الربع الثالث', 'Q4': 'الربع الرابع',
};

export function periodToArabic(period: string): string {
  // Try patterns like "Jan 2026", "Q1 2024", etc.
  for (const [en, ar] of Object.entries(ARABIC_MONTHS)) {
    if (period.startsWith(en + ' ') || period.startsWith(en + '-')) {
      return period.replace(en, ar);
    }
  }
  return period;
}

// Calculate growth between two datasets
export function calcGrowth(current: Record<string, number>, previous: Record<string, number>, key: string): number | null {
  const curr = current[key];
  const prev = previous[key];
  if (!curr || !prev || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
