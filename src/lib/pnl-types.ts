// P&L Data Types — Islamic/Saudi Business Format with Comprehensive Expense Categories

export interface PnLLineItem {
  name: string;
  nameAr: string;
  category: 'revenue' | 'expense' | 'profit';
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number;
  description?: string;
  isCustom?: boolean;
}

// Each dataset represents ONE company in ONE period
export interface CompanyPnL {
  id: string;
  companyName: string;
  period: string;
  currency: string;
  data: Record<string, number>;
}

// Derived: unique company with multiple periods
export interface CompanyGroup {
  name: string;
  periods: string[];
  datasets: CompanyPnL[];
}

// ─── Comprehensive P&L Line Items — Islamic Business Format ────────────────
// NO income tax — replaced with Zakat. Expanded expense categories.
export const PNL_LINE_ITEMS: PnLLineItem[] = [
  // ═══ REVENUE ═══
  { name: 'Revenue', nameAr: 'الإيرادات', category: 'revenue', isTotal: true, indent: 0,
    description: 'إجمالي الإيرادات من المبيعات والخدمات — Total revenue from sales and services' },
  { name: 'Sales Revenue', nameAr: 'إيرادات المبيعات', category: 'revenue', indent: 1,
    description: 'إيرادات بيع المنتجات — Revenue from product sales' },
  { name: 'Service Revenue', nameAr: 'إيرادات الخدمات', category: 'revenue', indent: 1,
    description: 'إيرادات تقديم الخدمات — Revenue from services rendered' },
  { name: 'Other Revenue', nameAr: 'إيرادات أخرى', category: 'revenue', indent: 1,
    description: 'إيرادات غير تشغيلية — Non-operating revenue' },

  // ═══ COST OF SALES ═══
  { name: 'Cost of Goods Sold', nameAr: 'تكلفة البضاعة المباعة', category: 'expense', indent: 1,
    description: 'التكلفة المباشرة للمنتجات المباعة — Direct cost of products sold' },
  { name: 'Raw Materials', nameAr: 'المواد الخام', category: 'expense', indent: 2,
    description: 'تكلفة المواد الخام المستخدمة — Cost of raw materials used' },
  { name: 'Direct Labor', nameAr: 'العمالة المباشرة', category: 'expense', indent: 2,
    description: 'أجور العمالة المباشرة في الإنتاج — Direct production labor costs' },
  { name: 'Manufacturing Overhead', nameAr: 'مصروفات التصنيع غير المباشرة', category: 'expense', indent: 2,
    description: 'تكاليف التصنيع غير المباشرة — Indirect manufacturing costs' },
  { name: 'Purchases', nameAr: 'المشتريات', category: 'expense', indent: 2,
    description: 'مشتريات البضاعة لإعادة البيع — Purchases of goods for resale' },

  // ═══ GROSS PROFIT ═══
  { name: 'Gross Profit', nameAr: 'إجمالي الربح', category: 'profit', isSubtotal: true, indent: 0,
    description: 'الإيرادات ناقص تكلفة المبيعات — Revenue minus COGS' },

  // ═══ OPERATING EXPENSES ═══
  { name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', category: 'expense', isTotal: true, indent: 0,
    description: 'إجمالي المصروفات التشغيلية — Total operating expenses' },

  // ─── Selling & Marketing ───
  { name: 'Selling Expenses', nameAr: 'مصروفات البيع والتسويق', category: 'expense', isSubtotal: true, indent: 1,
    description: 'مصروفات البيع والتسويق والإعلان — Selling and marketing expenses' },
  { name: 'Sales Commissions', nameAr: 'عمولات المبيعات', category: 'expense', indent: 2,
    description: 'عمولات مندوبي المبيعات — Sales representatives commissions' },
  { name: 'Advertising', nameAr: 'الإعلان والترويج', category: 'expense', indent: 2,
    description: 'تكاليف الإعلان والترويج والحملات التسويقية — Advertising and promotion costs' },
  { name: 'Marketing Expenses', nameAr: 'مصروفات التسويق', category: 'expense', indent: 2,
    description: 'مصروفات التسويق الرقمي والتقليدي — Digital and traditional marketing expenses' },
  { name: 'Delivery & Shipping', nameAr: 'التوصيل والشحن', category: 'expense', indent: 2,
    description: 'تكاليف شحن وتوصيل المنتجات — Delivery and shipping costs' },
  { name: 'Customer Service', nameAr: 'خدمة العملاء', category: 'expense', indent: 2,
    description: 'مصروفات خدمة العملاء وما بعد البيع — Customer service and after-sales costs' },

  // ─── General & Administrative ───
  { name: 'General & Administrative', nameAr: 'المصروفات الإدارية والعمومية', category: 'expense', isSubtotal: true, indent: 1,
    description: 'المصروفات الإدارية والعمومية — General and administrative expenses' },
  { name: 'Salaries & Wages', nameAr: 'الرواتب والأجور', category: 'expense', indent: 2,
    description: 'رواتب وأجور الموظفين الإداريين — Administrative staff salaries and wages' },
  { name: 'Employee Benefits', nameAr: 'بدلات ومزايا الموظفين', category: 'expense', indent: 2,
    description: 'بدلات سكن ونقل وتأمينات — Housing, transport, and insurance allowances' },
  { name: 'GOSI Contributions', nameAr: 'اشتراكات التأمينات الاجتماعية (GOSI)', category: 'expense', indent: 2,
    description: 'حصة المنشأة من التأمينات الاجتماعية — Employer GOSI contributions' },
  { name: 'Rent Expense', nameAr: 'الإيجارات', category: 'expense', indent: 2,
    description: 'إيجارات المكاتب والمستودعات والمحلات — Office, warehouse, and shop rent' },
  { name: 'Utilities', nameAr: 'المرافق (كهرباء وماء وغاز)', category: 'expense', indent: 2,
    description: 'فواتير الكهرباء والماء والغاز — Electricity, water, and gas bills' },
  { name: 'Telecommunications', nameAr: 'الاتصالات والإنترنت', category: 'expense', indent: 2,
    description: 'فواتير الهاتف والإنترنت والاتصالات — Phone, internet, and telecom bills' },
  { name: 'Office Supplies', nameAr: 'القرطاسية واللوازم المكتبية', category: 'expense', indent: 2,
    description: 'لوازم مكتبية وقرطاسية — Office supplies and stationery' },
  { name: 'Professional Fees', nameAr: 'الأتعاب المهنية', category: 'expense', indent: 2,
    description: 'أتعاب المحاسبين والمستشارين والمحامين — Accounting, consulting, and legal fees' },
  { name: 'Travel & Entertainment', nameAr: 'السفر والضيافة', category: 'expense', indent: 2,
    description: 'مصروفات السفر والانتقال والضيافة — Travel, hospitality, and entertainment' },
  { name: 'Insurance Expense', nameAr: 'التأمين', category: 'expense', indent: 2,
    description: 'أقساط التأمين على الممتلكات والمسؤولية — Property and liability insurance premiums' },
  { name: 'Maintenance & Repairs', nameAr: 'الصيانة والإصلاحات', category: 'expense', indent: 2,
    description: 'صيانة وإصلاح المباني والمعدات — Building and equipment maintenance and repairs' },
  { name: 'Licenses & Permits', nameAr: 'التراخيص والرسوم الحكومية', category: 'expense', indent: 2,
    description: 'رسوم التراخيص والتصاريح الحكومية — Government licenses and permit fees' },
  { name: 'Subscriptions & Software', nameAr: 'الاشتراكات والبرمجيات', category: 'expense', indent: 2,
    description: 'اشتراكات البرمجيات والأنظمة — Software subscriptions and systems' },
  { name: 'Bad Debts', nameAr: 'الديون المعدومة', category: 'expense', indent: 2,
    description: 'مخصص الديون المشكوك في تحصيلها — Provision for doubtful debts' },
  { name: 'Miscellaneous Expenses', nameAr: 'مصروفات متنوعة', category: 'expense', indent: 2,
    description: 'مصروفات متنوعة وأخرى — Sundry and other miscellaneous expenses' },

  // ─── Depreciation & Amortization ───
  { name: 'Depreciation & Amortization', nameAr: 'الإهلاك والاستنفاد', category: 'expense', indent: 1,
    description: 'توزيع تكلفة الأصول الثابتة على عمرها — Allocating asset costs over useful life' },
  { name: 'Depreciation of Buildings', nameAr: 'إهلاك المباني', category: 'expense', indent: 2,
    description: 'إهلاك المباني والمنشآت — Buildings depreciation' },
  { name: 'Depreciation of Equipment', nameAr: 'إهلاك المعدات والأجهزة', category: 'expense', indent: 2,
    description: 'إهلاك المعدات والأجهزة والآلات — Equipment and machinery depreciation' },
  { name: 'Depreciation of Vehicles', nameAr: 'إهلاك السيارات', category: 'expense', indent: 2,
    description: 'إهلاك السيارات والمركبات — Vehicles depreciation' },
  { name: 'Amortization of Intangibles', nameAr: 'استنفاد الأصول غير الملموسة', category: 'expense', indent: 2,
    description: 'استنفاد الشهرة والبرمجيات وحقوق الملكية — Intangible assets amortization' },

  // ═══ OPERATING INCOME ═══
  { name: 'Operating Income (EBIT)', nameAr: 'الدخل التشغيلي', category: 'profit', isSubtotal: true, indent: 0,
    description: 'الربح من العمليات قبل الفوائد والزكاة — Operating profit before interest and zakat' },

  // ═══ NON-OPERATING ITEMS ═══
  { name: 'Interest Income', nameAr: 'إيرادات الاستثمارات', category: 'revenue', indent: 1,
    description: 'عوائد الاستثمارات — Investment returns (Islamic-compliant)' },
  { name: 'Finance Cost', nameAr: 'تكلفة التمويل', category: 'expense', indent: 1,
    description: 'تكلفة التمويل الإسلامي (المرابحة، الإجارة) — Islamic financing cost (Murabaha, Ijara)' },
  { name: 'Other Income', nameAr: 'إيرادات أخرى', category: 'revenue', indent: 1,
    description: 'أرباح استثنائية وإيرادات أخرى — Exceptional gains and other income' },
  { name: 'Other Expenses', nameAr: 'مصروفات أخرى', category: 'expense', indent: 1,
    description: 'خسائر استثنائية ومصروفات أخرى — Exceptional losses and other expenses' },

  // ═══ INCOME BEFORE ZAKAT ═══
  { name: 'Income Before Zakat', nameAr: 'الدخل قبل الزكاة', category: 'profit', isSubtotal: true, indent: 0,
    description: 'الربح قبل خصم الزكاة — Profit before deducting zakat' },

  // ═══ ZAKAT (instead of Income Tax) ═══
  { name: 'Zakat Expense', nameAr: 'مصروف الزكاة', category: 'expense', indent: 1,
    description: 'الزكاة الشرعية المستحقة — Zakat payable (2.5% of zakat base)' },

  // ═══ NET INCOME ═══
  { name: 'Net Income', nameAr: 'صافي الدخل', category: 'profit', isTotal: true, indent: 0,
    description: 'الربح النهائي بعد خصم جميع التكاليف والزكاة — Final profit after all costs and zakat' },
];

// ─── Keyword-based category detection for custom items ────────────────────────
const EXPENSE_KEYWORDS_AR = [
  'مصروف', 'تكلفة', 'إهلاك', 'استنفاد', 'زكاة', 'فائدة', 'إيجار',
  'رواتب', 'أجور', 'مخصص', 'خسارة', 'مصاريف', 'عمولة', 'خصم', 'ديون',
  'مخزون', 'بضاعة', 'تسويق', 'إعلان', 'صيانة', 'تأمين', 'سفر', 'نقل',
  'اتصالات', 'كهرباء', 'ماء', 'غاز', 'مواد', 'لوازم', 'استشارات',
  'محاسبة', 'قانوني', 'تراخيص', 'رسوم', 'غرامات', 'عقوبات', 'متفرقة',
  'تمويل', 'مرابحة', 'إجارة', 'صكوك', 'ضريبة',
];
const EXPENSE_KEYWORDS_EN = [
  'expense', 'cost', 'depreciat', 'amortiz', 'zakat', 'interest', 'rent',
  'salary', 'wage', 'provision', 'loss', 'commission', 'discount', 'debt',
  'inventory', 'marketing', 'advertis', 'maintenanc', 'insuranc', 'travel', 'transport',
  'telecom', 'electric', 'water', 'gas', 'material', 'suppl', 'consult',
  'account', 'legal', 'licens', 'fee', 'fine', 'penalty', 'miscellaneous',
  'finance', 'murabaha', 'ijara', 'sukuk', 'tax',
];
const REVENUE_KEYWORDS_AR = [
  'إيراد', 'دخل', 'ربح', 'عائد', 'مبيعات', 'حاصلات', 'أرباح',
];
const REVENUE_KEYWORDS_EN = [
  'revenue', 'income', 'profit', 'return', 'sales', 'gain', 'earning',
];

export function detectCategory(name: string): 'revenue' | 'expense' | 'profit' {
  const lower = name.toLowerCase();
  if (EXPENSE_KEYWORDS_AR.some(kw => name.includes(kw)) || EXPENSE_KEYWORDS_EN.some(kw => lower.includes(kw))) {
    return 'expense';
  }
  if (REVENUE_KEYWORDS_AR.some(kw => name.includes(kw)) || REVENUE_KEYWORDS_EN.some(kw => lower.includes(kw))) {
    return 'revenue';
  }
  return 'expense';
}

// ─── Build merged line items: standard + custom from data ──────────────────────
export function getAllLineItems(datasets: CompanyPnL[]): PnLLineItem[] {
  const standardKeys = new Set(PNL_LINE_ITEMS.map(item => getLineItemKey(item.name)));
  const customKeys = new Set<string>();

  datasets.forEach(ds => {
    Object.keys(ds.data).forEach(key => {
      if (!standardKeys.has(key) && ds.data[key] !== 0) {
        customKeys.add(key);
      }
    });
  });

  if (customKeys.size === 0) return PNL_LINE_ITEMS;

  const customItems: PnLLineItem[] = Array.from(customKeys).map(key => {
    const nameAr = key.replace(/_/g, ' ');
    return {
      name: key,
      nameAr,
      category: detectCategory(nameAr),
      indent: 1,
      isCustom: true,
      description: 'بند مخصص من ملف Excel — Custom item from uploaded Excel',
    };
  });

  const categoryOrder = { revenue: 0, expense: 1, profit: 2 };
  customItems.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);

  const result = [...PNL_LINE_ITEMS];
  const netIncomeIdx = result.findIndex(item => item.name === 'Net Income');
  if (netIncomeIdx !== -1) {
    result.splice(netIncomeIdx, 0, ...customItems);
  } else {
    result.push(...customItems);
  }

  return result;
}

export function getLineItemKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export const PNL_KEYS = PNL_LINE_ITEMS.map(item => getLineItemKey(item.name));

// Professional color palette
export const COMPANY_COLORS = [
  '#0d9488', '#d97706', '#dc2626', '#7c3aed', '#0891b2',
  '#ea580c', '#db2777', '#059669', '#4f46e5', '#65a30d',
];

// Financial Ratios — Islamic Business Format
export interface FinancialRatio {
  key: string;
  nameAr: string;
  nameEn: string;
  formula: (data: Record<string, number>) => number | null;
  format: 'percentage' | 'ratio' | 'number';
  description?: string;
}

export const FINANCIAL_RATIOS: FinancialRatio[] = [
  {
    key: 'gross_margin',
    nameAr: 'هامش الربح الإجمالي',
    nameEn: 'Gross Margin',
    formula: (d) => d['revenue'] ? (d['gross_profit'] / d['revenue']) * 100 : null,
    format: 'percentage',
    description: 'نسبة الربح الإجمالي إلى الإيرادات — كلما ارتفعت كان أفضل',
  },
  {
    key: 'operating_margin',
    nameAr: 'هامش التشغيلي',
    nameEn: 'Operating Margin',
    formula: (d) => d['revenue'] ? (d['operating_income_ebit'] / d['revenue']) * 100 : null,
    format: 'percentage',
    description: 'نسبة الدخل التشغيلي إلى الإيرادات — أعلى = أكثر كفاءة',
  },
  {
    key: 'net_margin',
    nameAr: 'هامش صافي الربح',
    nameEn: 'Net Margin',
    formula: (d) => d['revenue'] ? (d['net_income'] / d['revenue']) * 100 : null,
    format: 'percentage',
    description: 'نسبة صافي الدخل إلى الإيرادات — النسبة المئوية من كل ريال تحقق كربح صافٍ',
  },
  {
    key: 'cogs_ratio',
    nameAr: 'نسبة تكلفة المبيعات',
    nameEn: 'COGS Ratio',
    formula: (d) => d['revenue'] ? (d['cost_of_goods_sold'] / d['revenue']) * 100 : null,
    format: 'percentage',
    description: 'نسبة تكلفة المبيعات إلى الإيرادات — أقل = هوامش أعلى',
  },
  {
    key: 'opex_ratio',
    nameAr: 'نسبة المصروفات التشغيلية',
    nameEn: 'OpEx Ratio',
    formula: (d) => d['revenue'] ? (d['operating_expenses'] / d['revenue']) * 100 : null,
    format: 'percentage',
    description: 'نسبة المصروفات التشغيلية إلى الإيرادات — أقل = تحكم أفضل في التكاليف',
  },
  {
    key: 'zakat_rate',
    nameAr: 'معدل الزكاة الفعلي',
    nameEn: 'Effective Zakat Rate',
    formula: (d) => d['income_before_zakat'] ? (d['zakat_expense'] / d['income_before_zakat']) * 100 : null,
    format: 'percentage',
    description: 'معدل الزكاة الفعلي — المفروض حوالي 2.5% من الوعاء الزكوي',
  },
  {
    key: 'finance_coverage',
    nameAr: 'نسبة تغطية التمويل',
    nameEn: 'Finance Coverage',
    formula: (d) => d['finance_cost'] ? d['operating_income_ebit'] / d['finance_cost'] : null,
    format: 'ratio',
    description: 'عدد مرات تغطية الدخل التشغيلي لتكلفة التمويل — أعلى من 3x آمن',
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

// Chronological period sort
const MONTH_ORDER: Record<string, number> = {
  'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
  'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
  'q1': 1, 'q2': 4, 'q3': 7, 'q4': 10,
  'h1': 1, 'h2': 7,
};

export function parsePeriod(period: string): { year: number; month: number } | null {
  const parts = period.trim().split(/[\s\-]+/);
  if (parts.length < 2) return null;
  const prefix = parts[0].toLowerCase();
  const year = parseInt(parts[parts.length - 1], 10);
  if (isNaN(year)) return null;
  const month = MONTH_ORDER[prefix];
  if (month === undefined) return null;
  return { year, month };
}

export function sortPeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) => {
    const pa = parsePeriod(a);
    const pb = parsePeriod(b);
    if (!pa && !pb) return a.localeCompare(b);
    if (!pa) return 1;
    if (!pb) return -1;
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.month - pb.month;
  });
}

export function sortDatasetsByPeriod(datasets: CompanyPnL[]): CompanyPnL[] {
  return [...datasets].sort((a, b) => {
    const pa = parsePeriod(a.period);
    const pb = parsePeriod(b.period);
    if (!pa && !pb) return a.period.localeCompare(b.period);
    if (!pa) return 1;
    if (!pb) return -1;
    if (pa.year !== pb.year) return pa.year - pb.year;
    return pa.month - pb.month;
  });
}

export function groupByCompany(datasets: CompanyPnL[]): CompanyGroup[] {
  const map = new Map<string, CompanyPnL[]>();
  datasets.forEach((ds) => {
    const existing = map.get(ds.companyName) || [];
    existing.push(ds);
    map.set(ds.companyName, existing);
  });

  return Array.from(map.entries()).map(([name, datasets]) => {
    const sorted = sortDatasetsByPeriod(datasets);
    return { name, periods: sorted.map((d) => d.period), datasets: sorted };
  });
}

export interface PeriodGroup {
  period: string;
  periodAr: string;
  datasets: CompanyPnL[];
}

export function groupByPeriod(datasets: CompanyPnL[]): PeriodGroup[] {
  const map = new Map<string, CompanyPnL[]>();
  datasets.forEach((ds) => {
    const existing = map.get(ds.period) || [];
    existing.push(ds);
    map.set(ds.period, existing);
  });

  const periods = sortPeriods(Array.from(map.keys()));

  return periods.map((period) => ({
    period,
    periodAr: periodToArabic(period),
    datasets: map.get(period) || [],
  }));
}

export function aggregatePeriods(datasets: CompanyPnL[]): Record<string, number> {
  const result: Record<string, number> = {};
  datasets.forEach(ds => {
    Object.entries(ds.data).forEach(([key, val]) => {
      result[key] = (result[key] || 0) + val;
    });
  });
  return result;
}

export const ARABIC_MONTHS: Record<string, string> = {
  'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس', 'Apr': 'أبريل',
  'May': 'مايو', 'Jun': 'يونيو', 'Jul': 'يوليو', 'Aug': 'أغسطس',
  'Sep': 'سبتمبر', 'Oct': 'أكتوبر', 'Nov': 'نوفمبر', 'Dec': 'ديسمبر',
  'Q1': 'الربع الأول', 'Q2': 'الربع الثاني', 'Q3': 'الربع الثالث', 'Q4': 'الربع الرابع',
};

export function periodToArabic(period: string): string {
  for (const [en, ar] of Object.entries(ARABIC_MONTHS)) {
    if (period.startsWith(en + ' ') || period.startsWith(en + '-')) {
      return period.replace(en, ar);
    }
  }
  return period;
}

export function calcGrowth(current: Record<string, number>, previous: Record<string, number>, key: string): number | null {
  const curr = current[key];
  const prev = previous[key];
  if (!curr || !prev || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// ─── Journal Entry Types (القيود المحاسبية) ─────────────────────────────────
// Represents individual accounting transactions posted to P&L accounts

export interface JournalEntry {
  id: string;
  companyName: string;
  date: string;           // التاريخ — e.g. "2026-01-15"
  entryNumber: string;    // رقم القيد — e.g. "JV-001"
  accountKey: string;     // مفتاح الحساب — maps to getLineItemKey()
  accountNameAr: string;  // اسم الحساب بالعربي
  description: string;    // البيان — explanation of the transaction
  debit: number;          // مدين — debit amount
  credit: number;         // دائن — credit amount
  reference: string;      // المرجع — invoice/contract reference
  period: string;         // الفترة — e.g. "Jan 2026" (for filtering)
  currency: string;       // العملة
}

// Grouped journal entries for a single account (دفتر الأستاذ)
export interface AccountLedger {
  accountKey: string;
  accountNameAr: string;
  companyName: string;
  entries: JournalEntry[];
  totalDebit: number;
  totalCredit: number;
  netBalance: number;     // totalDebit - totalCredit
}

// Get journal entries for a specific account
export function getEntriesForAccount(
  entries: JournalEntry[],
  accountKey: string,
  companyName?: string
): JournalEntry[] {
  return entries.filter((e) => {
    if (e.accountKey !== accountKey) return false;
    if (companyName && e.companyName !== companyName) return false;
    return true;
  });
}

// Build account ledger (دفتر الأستاذ) from journal entries
export function buildAccountLedger(
  entries: JournalEntry[],
  accountKey: string,
  accountNameAr: string,
  companyName: string
): AccountLedger {
  const filtered = getEntriesForAccount(entries, accountKey, companyName);
  const totalDebit = filtered.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = filtered.reduce((sum, e) => sum + e.credit, 0);
  return {
    accountKey,
    accountNameAr,
    companyName,
    entries: filtered.sort((a, b) => a.date.localeCompare(b.date)),
    totalDebit,
    totalCredit,
    netBalance: totalDebit - totalCredit,
  };
}

// Get unique accounts that have journal entries
export function getAccountsWithEntries(entries: JournalEntry[]): string[] {
  return [...new Set(entries.map((e) => e.accountKey))];
}

// Compute running balance for ledger entries
export function computeRunningBalance(entries: JournalEntry[]): { entry: JournalEntry; runningBalance: number }[] {
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { entry, runningBalance: balance };
  });
}
