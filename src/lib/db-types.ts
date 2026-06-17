// ────────────────────────────────────────────────────────────────────────────
// Database types matching the existing Supabase schema (Postgres).
// These mirror the actual tables in the project: User, Company, HoldingGroup,
// Expense, ExpenseCategory, PrepaidExpense, PnLDataset, AuditLog, Budget,
// ForecastModel, UserCompanyAccess.
// ────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  nameAr: string | null;
  passwordHash: string;
  role: string; // admin | manager | accountant | viewer
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingGroup {
  id: string;
  name: string;
  nameAr: string | null;
  logo: string | null;
  currency: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  nameAr: string | null;
  holdingGroupId: string | null;
  parentId: string | null;
  type: string | null;
  currency: string | null;
  industry: string | null;
  registrationNo: string | null;
  // Branding fields — stored as JSON in `registrationNo` until SQL migration is run.
  // Once `color` and `logoUrl` columns exist, these are populated directly.
  color?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  ownership: number | null;
  createdAt: string;
  updatedAt: string;
}

// Parse branding from company row (handles both native columns and JSON fallback)
export function getCompanyColor(c: Company): string {
  if (c.color) return c.color;
  // Try parsing from registrationNo JSON
  if (c.registrationNo) {
    try {
      const parsed = JSON.parse(c.registrationNo);
      if (parsed && typeof parsed.color === 'string') return parsed.color;
    } catch { /* not JSON */ }
  }
  // Default palette based on company name hash
  const palette = ['#0d9488', '#4CAF50', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#EA580C', '#DB2777'];
  const hash = (c.name || '').split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

export function getCompanyLogo(c: Company): string | null {
  if (c.logoUrl) return c.logoUrl;
  if (c.registrationNo) {
    try {
      const parsed = JSON.parse(c.registrationNo);
      if (parsed && typeof parsed.logoUrl === 'string') return parsed.logoUrl;
    } catch { /* not JSON */ }
  }
  return null;
}

// Encode branding into registrationNo (if native columns not available)
export function encodeBranding(opts: { color?: string; logoUrl?: string | null; regNo?: string | null }): string | null {
  const hasColor = !!opts.color;
  const hasLogo = !!opts.logoUrl;
  const hasRegNo = !!opts.regNo;
  if (!hasColor && !hasLogo && !hasRegNo) return null;
  // If only regNo, store as plain string
  if (hasRegNo && !hasColor && !hasLogo) return opts.regNo || null;
  // Otherwise store as JSON
  return JSON.stringify({
    regNo: opts.regNo || null,
    color: opts.color || null,
    logoUrl: opts.logoUrl || null,
  });
}

export interface ExpenseCategory {
  id: string;
  name: string;
  nameAr: string | null;
  code: string | null;
  parentId: string | null;
  level: number | null;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  companyId: string | null;
  categoryId: string | null;
  amount: number;
  currency: string | null;
  date: string;
  period: string | null;
  description: string | null;
  descriptionAr: string | null;
  vendor: string | null;
  invoiceNo: string | null;
  costCenter: string | null;
  isPrepaid: boolean | null;
  allocationMonths: number | null;
  isApproved: boolean | null;
  approvedBy: string | null;
  notes: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrepaidExpense {
  id: string;
  companyId: string | null;
  name: string;
  nameAr: string | null;
  totalAmount: number;
  currency: string | null;
  startDate: string;
  months: number | null; // legacy — we ignore UI input and auto-calc from startDate→endDate
  endDate?: string | null; // stored in allocations JSON if we need it
  monthlyAmount: number | null;
  allocations: string | null; // JSON: { endDate, amortizationSchedule: [{period, amount, recognized}] }
  vendor: string | null;
  description: string | null;
  categoryId: string | null;
  isFullyRecognized: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface PnLDataset {
  id: string;
  companyId: string | null;
  companyName: string | null;
  period: string | null;
  currency: string | null;
  data: string; // JSON string: { lineItems: [{name, key, category, subCategory, amount, sortOrder}] }
  uploadedBy: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  changes: string | null; // JSON
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  companyId: string | null;
  year: number | null;
  period: string | null;
  data: string; // JSON
  notes: string | null;
  isApproved: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastModel {
  id: string;
  companyId: string | null;
  name: string;
  method: string; // linear | moving_average | exponential | arima | seasonal
  targetMetric: string;
  parameters: string; // JSON
  accuracy: number | null;
  forecastData: string; // JSON: { historical, forecast, lower, upper }
  periodsAhead: number | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserCompanyAccess {
  id: string;
  userId: string;
  companyId: string;
  permission: string; // view | edit | admin
  createdAt: string;
}

// ─── P&L Line Item (parsed from PnLDataset.data JSON) ──────────────────────
export interface PnLLineItem {
  name: string;
  key: string;
  category?: string; // Revenue | COGS | Gross Profit | Operating Expense | etc.
  subCategory?: string;
  amount: number;
  sortOrder?: number;
}

export interface PnLDatasetData {
  lineItems: PnLLineItem[];
  meta?: {
    source?: string;
    periodType?: string; // monthly | quarterly | yearly
    fileName?: string;
    uploadedAt?: string;
  };
}
