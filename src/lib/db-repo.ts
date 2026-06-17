import { supabaseAdmin } from './supabase';
import type {
  User,
  Company,
  HoldingGroup,
  ExpenseCategory,
  Expense,
  PrepaidExpense,
  PnLDataset,
  AuditLog,
  Budget,
  ForecastModel,
  UserCompanyAccess,
  PnLDatasetData,
} from './db-types';
import { v4 as uuidv4 } from 'uuid';

// ─── Audit Logging ──────────────────────────────────────────────────────────
export async function logAudit(opts: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await supabaseAdmin.from('AuditLog').insert({
      id: uuidv4(),
      userId: opts.userId ?? null,
      action: opts.action,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      changes: opts.changes ? JSON.stringify(opts.changes) : null,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[audit] failed to log', e);
  }
}

// ─── Users ──────────────────────────────────────────────────────────────────
export const UserRepo = {
  async list(): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(opts: {
    email: string;
    name?: string;
    nameAr?: string;
    passwordHash: string;
    role?: string;
    isActive?: boolean;
  }): Promise<User> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('User')
      .insert({
        id,
        email: opts.email,
        name: opts.name ?? null,
        nameAr: opts.nameAr ?? null,
        passwordHash: opts.passwordHash,
        role: opts.role ?? 'viewer',
        isActive: opts.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('User')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('User').delete().eq('id', id);
    if (error) throw error;
  },

  async touchLogin(id: string): Promise<void> {
    await supabaseAdmin
      .from('User')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', id);
  },
};

// ─── Holding Groups ─────────────────────────────────────────────────────────
export const HoldingGroupRepo = {
  async list(): Promise<HoldingGroup[]> {
    const { data, error } = await supabaseAdmin
      .from('HoldingGroup')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(opts: Partial<HoldingGroup> & { name: string }): Promise<HoldingGroup> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('HoldingGroup')
      .insert({
        id,
        name: opts.name,
        nameAr: opts.nameAr ?? null,
        logo: opts.logo ?? null,
        currency: opts.currency ?? 'SAR',
        description: opts.description ?? null,
        isActive: opts.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<HoldingGroup>): Promise<HoldingGroup> {
    const { data, error } = await supabaseAdmin
      .from('HoldingGroup')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('HoldingGroup').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Companies ──────────────────────────────────────────────────────────────
export const CompanyRepo = {
  async list(): Promise<Company[]> {
    const { data, error } = await supabaseAdmin
      .from('Company')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findById(id: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from('Company')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByName(name: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from('Company')
      .select('*')
      .eq('name', name)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(opts: Partial<Company> & { name: string }): Promise<Company> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('Company')
      .insert({
        id,
        name: opts.name,
        nameAr: opts.nameAr ?? null,
        holdingGroupId: opts.holdingGroupId ?? null,
        parentId: opts.parentId ?? null,
        type: opts.type ?? 'subsidiary',
        currency: opts.currency ?? 'SAR',
        industry: opts.industry ?? null,
        registrationNo: opts.registrationNo ?? null,
        isActive: opts.isActive ?? true,
        ownership: opts.ownership ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsertByName(name: string, patch?: Partial<Company>): Promise<Company> {
    const existing = await CompanyRepo.findByName(name);
    if (existing) {
      if (patch && Object.keys(patch).length) {
        return await CompanyRepo.update(existing.id, patch);
      }
      return existing;
    }
    return await CompanyRepo.create({ name, ...patch });
  },

  async update(id: string, patch: Partial<Company>): Promise<Company> {
    const { data, error } = await supabaseAdmin
      .from('Company')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('Company').delete().eq('id', id);
    if (error) throw error;
  },
};

/**
 * Ensure a default "Uncategorized" company exists in the DB.
 * Used as a fallback when other tables (Expense, PrepaidExpense, PnLDataset)
 * require a non-null companyId but the caller didn't provide one.
 */
let _defaultCompanyCache: { id: string } | null = null;
async function ensureDefaultCompany(): Promise<{ id: string }> {
  if (_defaultCompanyCache) return _defaultCompanyCache;
  const existing = await CompanyRepo.findByName('Uncategorized');
  if (existing) {
    _defaultCompanyCache = { id: existing.id };
    return _defaultCompanyCache;
  }
  const created = await CompanyRepo.create({
    name: 'Uncategorized',
    nameAr: 'غير مصنف',
    type: 'default',
    industry: 'عام',
    isActive: true,
  });
  _defaultCompanyCache = { id: created.id };
  return _defaultCompanyCache;
}

// ─── Expense Categories ────────────────────────────────────────────────────
export const CategoryRepo = {
  async list(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabaseAdmin
      .from('ExpenseCategory')
      .select('*')
      .order('sortOrder', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data || [];
  },

  async create(opts: Partial<ExpenseCategory> & { name: string }): Promise<ExpenseCategory> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('ExpenseCategory')
      .insert({
        id,
        name: opts.name,
        nameAr: opts.nameAr ?? null,
        code: opts.code ?? null,
        parentId: opts.parentId ?? null,
        level: opts.level ?? 0,
        color: opts.color ?? '#0d9488',
        icon: opts.icon ?? null,
        isActive: opts.isActive ?? true,
        sortOrder: opts.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const { data, error } = await supabaseAdmin
      .from('ExpenseCategory')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('ExpenseCategory').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Expenses ───────────────────────────────────────────────────────────────
export const ExpenseRepo = {
  async list(filter?: {
    companyId?: string;
    categoryId?: string;
    periodFrom?: string;
    periodTo?: string;
    limit?: number;
  }): Promise<Expense[]> {
    let q = supabaseAdmin.from('Expense').select('*');
    if (filter?.companyId) q = q.eq('companyId', filter.companyId);
    if (filter?.categoryId) q = q.eq('categoryId', filter.categoryId);
    if (filter?.periodFrom) q = q.gte('date', filter.periodFrom);
    if (filter?.periodTo) q = q.lte('date', filter.periodTo);
    if (filter?.limit) q = q.limit(filter.limit);
    q = q.order('date', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async create(opts: Partial<Expense>): Promise<Expense> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const date = opts.date ?? now;
    const period = opts.period ?? date.slice(0, 7);
    // companyId is NOT NULL in DB — fallback to "Uncategorized" company
    const companyId = opts.companyId ?? (await ensureDefaultCompany()).id;
    const { data, error } = await supabaseAdmin
      .from('Expense')
      .insert({
        id,
        companyId,
        categoryId: opts.categoryId ?? null,
        amount: opts.amount ?? 0,
        currency: opts.currency ?? 'SAR',
        date,
        period,
        description: opts.description ?? null,
        descriptionAr: opts.descriptionAr ?? null,
        vendor: opts.vendor ?? null,
        invoiceNo: opts.invoiceNo ?? null,
        costCenter: opts.costCenter ?? null,
        isPrepaid: opts.isPrepaid ?? false,
        allocationMonths: opts.allocationMonths ?? null,
        isApproved: opts.isApproved ?? true,
        approvedBy: opts.approvedBy ?? null,
        notes: opts.notes ?? null,
        attachmentUrl: opts.attachmentUrl ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, patch: Partial<Expense>): Promise<Expense> {
    const { data, error } = await supabaseAdmin
      .from('Expense')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('Expense').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Prepaid Expenses ───────────────────────────────────────────────────────
// NOTE: We honor the user's request — UI uses only startDate→endDate.
// The `months` column is legacy and we auto-calculate it from the dates.
// We store endDate + amortization schedule in the `allocations` JSON column.
export const PrepaidRepo = {
  async list(): Promise<PrepaidExpense[]> {
    const { data, error } = await supabaseAdmin
      .from('PrepaidExpense')
      .select('*')
      .order('startDate', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(opts: {
    name: string;
    nameAr?: string;
    totalAmount: number;
    currency?: string;
    startDate: string; // ISO date
    endDate: string;   // ISO date
    companyId?: string;
    categoryId?: string;
    vendor?: string;
    description?: string;
    createdBy?: string;
  }): Promise<PrepaidExpense> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { months, monthlyAmount, schedule } = computeAmortization(
      opts.totalAmount,
      opts.startDate,
      opts.endDate,
    );
    // companyId is NOT NULL in DB — fallback to "Uncategorized" company
    const companyId = opts.companyId ?? (await ensureDefaultCompany()).id;

    const { data, error } = await supabaseAdmin
      .from('PrepaidExpense')
      .insert({
        id,
        companyId,
        name: opts.name,
        nameAr: opts.nameAr ?? null,
        totalAmount: opts.totalAmount,
        currency: opts.currency ?? 'SAR',
        startDate: opts.startDate,
        months, // legacy field, auto-calculated
        monthlyAmount,
        allocations: JSON.stringify({
          endDate: opts.endDate,
          schedule,
          createdBy: opts.createdBy ?? null,
        }),
        vendor: opts.vendor ?? null,
        description: opts.description ?? null,
        categoryId: opts.categoryId ?? null,
        isFullyRecognized: false,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    patch: {
      name?: string;
      nameAr?: string;
      totalAmount?: number;
      currency?: string;
      startDate?: string;
      endDate?: string;
      companyId?: string;
      categoryId?: string;
      vendor?: string;
      description?: string;
    },
  ): Promise<PrepaidExpense> {
    // Fetch existing to merge
    const existing = await supabaseAdmin
      .from('PrepaidExpense')
      .select('*')
      .eq('id', id)
      .single();
    if (existing.error) throw existing.error;
    const curr = existing.data;
    const totalAmount = patch.totalAmount ?? curr.totalAmount;
    const startDate = patch.startDate ?? curr.startDate;
    // endDate may be in allocations JSON
    let endDate = patch.endDate;
    if (!endDate && curr.allocations) {
      try {
        const parsed = JSON.parse(curr.allocations);
        endDate = parsed.endDate;
      } catch {}
    }
    if (!endDate) endDate = startDate; // fallback
    const { months, monthlyAmount, schedule } = computeAmortization(
      totalAmount,
      startDate,
      endDate,
    );
    // companyId is NOT NULL in DB — fallback to "Uncategorized" company
    const companyId = patch.companyId ?? curr.companyId ?? (await ensureDefaultCompany()).id;
    const { data, error } = await supabaseAdmin
      .from('PrepaidExpense')
      .update({
        name: patch.name ?? curr.name,
        nameAr: patch.nameAr ?? curr.nameAr,
        totalAmount,
        currency: patch.currency ?? curr.currency,
        startDate,
        months,
        monthlyAmount,
        allocations: JSON.stringify({ endDate, schedule }),
        vendor: patch.vendor ?? curr.vendor,
        description: patch.description ?? curr.description,
        companyId,
        categoryId: patch.categoryId ?? curr.categoryId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('PrepaidExpense').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Amortization Computation ──────────────────────────────────────────────
// Mathematical basis:
//   months = round((end - start) / 30.4375 days)  // average month length
//   monthlyAmount = totalAmount / months
//   schedule = [{ period: 'YYYY-MM', amount, cumulative, remaining }]
// The schedule is built from actual calendar months so periodization
// follows accounting periods (not 30-day chunks).
export function computeAmortization(
  totalAmount: number,
  startDateISO: string,
  endDateISO: string,
): { months: number; monthlyAmount: number; schedule: AmortizationEntry[] } {
  const start = new Date(startDateISO);
  const end = new Date(endDateISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return { months: 1, monthlyAmount: totalAmount, schedule: [] };
  }

  // Build month-by-month periods from start month → end month (inclusive)
  const periods: { year: number; month: number }[] = [];
  const y0 = start.getFullYear();
  const m0 = start.getMonth();
  const y1 = end.getFullYear();
  const m1 = end.getMonth();
  let y = y0, m = m0;
  while (y < y1 || (y === y1 && m <= m1)) {
    periods.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }

  const months = periods.length;
  if (months === 0) return { months: 1, monthlyAmount: totalAmount, schedule: [] };
  const monthlyAmount = totalAmount / months;

  // Pro-rate first and last month by actual days in period
  // For accounting accuracy, use straight-line over full months
  // but we also support day-based proration for the start/end months.
  const schedule: AmortizationEntry[] = [];
  let cumulative = 0;
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const periodStr = `${p.year}-${String(p.month + 1).padStart(2, '0')}`;
    let amt = monthlyAmount;

    // Proration: first month
    if (i === 0) {
      const daysInStartMonth = new Date(p.year, p.month + 1, 0).getDate();
      const daysFromStart = daysInStartMonth - start.getDate() + 1;
      const ratio = Math.max(0, Math.min(1, daysFromStart / daysInStartMonth));
      amt = monthlyAmount * ratio;
    }
    // Proration: last month
    if (i === periods.length - 1) {
      const daysInEndMonth = new Date(p.year, p.month + 1, 0).getDate();
      const daysToEnd = end.getDate();
      const ratio = Math.max(0, Math.min(1, daysToEnd / daysInEndMonth));
      amt = monthlyAmount * ratio;
    }
    // If only one period and it's both first and last
    if (periods.length === 1) {
      const daysInMonth = new Date(p.year, p.month + 1, 0).getDate();
      const days = Math.max(
        0,
        Math.min(daysInMonth, end.getDate() - start.getDate() + 1),
      );
      amt = totalAmount * (days / daysInMonth);
    }

    cumulative += amt;
    const remaining = totalAmount - cumulative;
    schedule.push({
      period: periodStr,
      amount: round2(amt),
      cumulative: round2(cumulative),
      remaining: round2(Math.max(0, remaining)),
    });
  }

  // Adjust last entry to ensure totals reconcile (rounding drift)
  if (schedule.length) {
    const drift = totalAmount - schedule[schedule.length - 1].cumulative;
    schedule[schedule.length - 1].amount = round2(
      schedule[schedule.length - 1].amount + drift,
    );
    schedule[schedule.length - 1].cumulative = round2(totalAmount);
    schedule[schedule.length - 1].remaining = 0;
  }

  return {
    months,
    monthlyAmount: round2(totalAmount / months),
    schedule,
  };
}

export interface AmortizationEntry {
  period: string; // YYYY-MM
  amount: number;
  cumulative: number;
  remaining: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── P&L Datasets ──────────────────────────────────────────────────────────
export const PnLRepo = {
  async list(): Promise<PnLDataset[]> {
    const { data, error } = await supabaseAdmin
      .from('PnLDataset')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async findByCompanyPeriod(companyName: string, period: string): Promise<PnLDataset | null> {
    const { data, error } = await supabaseAdmin
      .from('PnLDataset')
      .select('*')
      .eq('companyName', companyName)
      .eq('period', period)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(opts: {
    companyName: string;
    period: string;
    data: PnLDatasetData;
    companyId?: string;
    currency?: string;
    uploadedBy?: string;
    source?: string;
  }): Promise<PnLDataset> {
    const existing = await PnLRepo.findByCompanyPeriod(opts.companyName, opts.period);
    // companyId is NOT NULL in DB — upsert by company name if not provided
    const companyId = opts.companyId ?? (await CompanyRepo.upsertByName(opts.companyName)).id;
    const payload = {
      companyName: opts.companyName,
      period: opts.period,
      currency: opts.currency ?? 'SAR',
      data: JSON.stringify(opts.data),
      companyId,
      uploadedBy: opts.uploadedBy ?? null,
      source: opts.source ?? 'excel',
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('PnLDataset')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const id = uuidv4();
      const { data, error } = await supabaseAdmin
        .from('PnLDataset')
        .insert({ id, createdAt: new Date().toISOString(), ...payload })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('PnLDataset').delete().eq('id', id);
    if (error) throw error;
  },

  /** Bulk insert P&L data (one row per company×period). */
  async bulkUpsert(records: Array<{
    companyName: string;
    period: string;
    data: PnLDatasetData;
    companyId?: string;
    currency?: string;
    uploadedBy?: string;
    source?: string;
  }>): Promise<void> {
    for (const r of records) {
      await PnLRepo.upsert(r);
    }
  },

  /** Parse a PnLDataset.data JSON column back into structured form. */
  parseData(row: PnLDataset): PnLDatasetData {
    try {
      return JSON.parse(row.data) as PnLDatasetData;
    } catch {
      return { lineItems: [] };
    }
  },
};

// ─── Audit Log ──────────────────────────────────────────────────────────────
export const AuditRepo = {
  async list(limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabaseAdmin
      .from('AuditLog')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },
};

// ─── Forecast Models ────────────────────────────────────────────────────────
export const ForecastRepo = {
  async list(): Promise<ForecastModel[]> {
    const { data, error } = await supabaseAdmin
      .from('ForecastModel')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async save(opts: {
    name: string;
    method: string;
    targetMetric: string;
    parameters: Record<string, unknown>;
    accuracy: number;
    forecastData: Record<string, unknown>;
    periodsAhead: number;
    companyId?: string;
    isActive?: boolean;
  }): Promise<ForecastModel> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('ForecastModel')
      .insert({
        id,
        companyId: opts.companyId ?? null,
        name: opts.name,
        method: opts.method,
        targetMetric: opts.targetMetric,
        parameters: JSON.stringify(opts.parameters),
        accuracy: opts.accuracy,
        forecastData: JSON.stringify(opts.forecastData),
        periodsAhead: opts.periodsAhead,
        isActive: opts.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('ForecastModel').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Budgets ────────────────────────────────────────────────────────────────
export const BudgetRepo = {
  async list(): Promise<Budget[]> {
    const { data, error } = await supabaseAdmin
      .from('Budget')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async save(opts: {
    companyId?: string;
    year: number;
    period?: string;
    data: Record<string, unknown>;
    notes?: string;
    isApproved?: boolean;
  }): Promise<Budget> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('Budget')
      .insert({
        id,
        companyId: opts.companyId ?? null,
        year: opts.year,
        period: opts.period ?? null,
        data: JSON.stringify(opts.data),
        notes: opts.notes ?? null,
        isApproved: opts.isApproved ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('Budget').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── User Company Access ───────────────────────────────────────────────────
export const AccessRepo = {
  async listForUser(userId: string): Promise<UserCompanyAccess[]> {
    const { data, error } = await supabaseAdmin
      .from('UserCompanyAccess')
      .select('*')
      .eq('userId', userId);
    if (error) throw error;
    return data || [];
  },

  async grant(userId: string, companyId: string, permission: string): Promise<void> {
    const id = uuidv4();
    const { error } = await supabaseAdmin.from('UserCompanyAccess').insert({
      id,
      userId,
      companyId,
      permission,
      createdAt: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('UserCompanyAccess').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Roles Config (stored as JSON in HoldingGroup.description) ──────────────
// Since we can't easily add a new table via REST, custom roles and role overrides
// are stored as a JSON blob in the single holding group's `description` field.
// The format is: { "description": "<text>", "rolesConfig": { "overrides": [...], "customRoles": [...] } }

export interface RoleOverride {
  name: string;
  permissions?: string[];
  nameAr?: string;
  color?: string;
  description?: string;
}

export interface CustomRole {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  color: string;
  permissions: string[];
  isSystem: false;
}

export interface RolesConfig {
  overrides: RoleOverride[];
  customRoles: CustomRole[];
}

export const RolesConfigRepo = {
  async load(): Promise<RolesConfig> {
    const groups = await HoldingGroupRepo.list();
    if (groups.length === 0) return { overrides: [], customRoles: [] };
    const desc = groups[0].description;
    if (!desc) return { overrides: [], customRoles: [] };
    try {
      const parsed = JSON.parse(desc);
      if (parsed && typeof parsed === 'object' && parsed.rolesConfig) {
        return {
          overrides: parsed.rolesConfig.overrides || [],
          customRoles: parsed.rolesConfig.customRoles || [],
        };
      }
    } catch { /* not JSON */ }
    return { overrides: [], customRoles: [] };
  },

  async save(config: RolesConfig): Promise<void> {
    const groups = await HoldingGroupRepo.list();
    if (groups.length === 0) {
      // Create holding group with roles config
      await HoldingGroupRepo.create({
        name: 'Holding Company',
        description: JSON.stringify({ description: '', rolesConfig: config }),
      });
      return;
    }
    // Preserve existing description text (if it's not JSON), otherwise overwrite
    const existing = groups[0];
    let descText = '';
    try {
      const parsed = JSON.parse(existing.description || '');
      if (parsed && typeof parsed === 'object' && parsed.description) {
        descText = parsed.description;
      }
    } catch { /* not JSON, preserve */ }
    const newDescription = JSON.stringify({ description: descText, rolesConfig: config });
    await HoldingGroupRepo.update(existing.id, { description: newDescription });
  },

  async addCustomRole(role: CustomRole): Promise<void> {
    const config = await this.load();
    if (config.customRoles.some((r) => r.id === role.id || r.name === role.name)) {
      throw new Error('يوجد دور بنفس الاسم أو المعرف');
    }
    config.customRoles.push(role);
    await this.save(config);
  },

  async updateCustomRole(id: string, patch: Partial<CustomRole>): Promise<void> {
    const config = await this.load();
    const idx = config.customRoles.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('الدور غير موجود');
    config.customRoles[idx] = { ...config.customRoles[idx], ...patch };
    await this.save(config);
  },

  async deleteCustomRole(id: string): Promise<void> {
    const config = await this.load();
    config.customRoles = config.customRoles.filter((r) => r.id !== id);
    await this.save(config);
  },

  async setOverride(override: RoleOverride): Promise<void> {
    const config = await this.load();
    const idx = config.overrides.findIndex((o) => o.name === override.name);
    if (idx === -1) {
      config.overrides.push(override);
    } else {
      config.overrides[idx] = { ...config.overrides[idx], ...override };
    }
    await this.save(config);
  },

  async clearOverride(name: string): Promise<void> {
    const config = await this.load();
    config.overrides = config.overrides.filter((o) => o.name !== name);
    await this.save(config);
  },
};

// ─── Two-Factor Auth (TOTP secrets stored in HoldingGroup.description JSON) ──
// Same JSON blob approach as RolesConfigRepo — we extend the JSON structure to
// also include `totpSecrets: { [userId]: secret }`.

export const TwoFactorRepo = {
  async _loadRaw(): Promise<any> {
    const groups = await HoldingGroupRepo.list();
    if (groups.length === 0) return {};
    const desc = groups[0].description;
    if (!desc) return {};
    try {
      const parsed = JSON.parse(desc);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* not JSON */ }
    return {};
  },

  async _saveRaw(data: any): Promise<void> {
    const groups = await HoldingGroupRepo.list();
    if (groups.length === 0) {
      await HoldingGroupRepo.create({
        name: 'Holding Company',
        description: JSON.stringify(data),
      });
      return;
    }
    const existing = groups[0];
    let descText = '';
    try {
      const parsed = JSON.parse(existing.description || '');
      if (parsed && typeof parsed === 'object' && parsed.description) {
        descText = parsed.description;
      }
    } catch { /* not JSON, preserve */ }
    await HoldingGroupRepo.update(existing.id, {
      description: JSON.stringify({ ...data, description: descText }),
    });
  },

  async getSecret(userId: string): Promise<string | null> {
    const raw = await this._loadRaw();
    return raw.totpSecrets?.[userId] || null;
  },

  async setSecret(userId: string, secret: string): Promise<void> {
    const raw = await this._loadRaw();
    if (!raw.totpSecrets) raw.totpSecrets = {};
    raw.totpSecrets[userId] = secret;
    await this._saveRaw(raw);
  },

  async clearSecret(userId: string): Promise<void> {
    const raw = await this._loadRaw();
    if (raw.totpSecrets) {
      delete raw.totpSecrets[userId];
      await this._saveRaw(raw);
    }
  },

  async isEnabled(userId: string): Promise<boolean> {
    const secret = await this.getSecret(userId);
    return !!secret;
  },
};

// ─── Unified session helper (replaces getServerSession from NextAuth) ───────
// Reads the `session_token` cookie set by /api/auth?action=login
// Returns the same shape as NextAuth's session for compatibility.
// NOTE: The actual implementation is in src/lib/session.ts to avoid circular imports.

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleNameAr?: string;
  roleColor?: string;
  permissions: string[];
  status: string;
}

export interface Session {
  user: SessionUser;
}
