'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { COMPANY_COLORS } from './pnl-types';

// ─── Types ────────────────────────────────────────────────────────────────
export type PrepaidCategory =
  | 'rent'
  | 'insurance'
  | 'subscription'
  | 'maintenance'
  | 'license'
  | 'advertising'
  | 'other';

export type PrepaidStatus = 'active' | 'completed' | 'deferred' | 'cancelled';

/**
 * Companies are UNIFIED with the P&L dashboard.
 *
 * The single source of truth for the company list is:
 *   1. P&L companies (derived from `usePnLStore().companies` by unique `companyName`)
 *   2. Standalone company names (added directly in the tracker when no P&L data exists)
 *
 * Both lists are merged in the UI; colors are assigned via `COMPANY_COLORS`
 * (same array used by the P&L dashboard) so the same company shows the same
 * color everywhere. Prepaid expenses reference companies by NAME (not id),
 * so a company added in one place is automatically recognized in the other.
 */
export interface PrepaidExpense {
  id: string;
  name: string;
  companyName: string; // unified identifier (matches P&L `companyName` when applicable)
  category: PrepaidCategory;
  status: PrepaidStatus;
  totalAmount: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  monthsCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const PREPAID_CATEGORIES: { value: PrepaidCategory; labelAr: string; labelEn: string; color: string }[] = [
  { value: 'rent', labelAr: 'إيجار', labelEn: 'Rent', color: '#3b82f6' },
  { value: 'insurance', labelAr: 'تأمين', labelEn: 'Insurance', color: '#8b5cf6' },
  { value: 'subscription', labelAr: 'اشتراكات', labelEn: 'Subscriptions', color: '#06b6d4' },
  { value: 'maintenance', labelAr: 'صيانة', labelEn: 'Maintenance', color: '#f59e0b' },
  { value: 'license', labelAr: 'ترخيص', labelEn: 'License', color: '#10b981' },
  { value: 'advertising', labelAr: 'دعاية وإعلان', labelEn: 'Advertising', color: '#ec4899' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other', color: '#64748b' },
];

export const PREPAID_STATUSES: { value: PrepaidStatus; labelAr: string; color: string; bg: string }[] = [
  { value: 'active', labelAr: 'نشط', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40' },
  { value: 'completed', labelAr: 'منتهي', color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/40' },
  { value: 'deferred', labelAr: 'مؤجل', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40' },
  { value: 'cancelled', labelAr: 'ملغي', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40' },
];

export function getCategoryInfo(value: PrepaidCategory) {
  return PREPAID_CATEGORIES.find((c) => c.value === value) || PREPAID_CATEGORIES[PREPAID_CATEGORIES.length - 1];
}

export function getStatusInfo(value: PrepaidStatus) {
  return PREPAID_STATUSES.find((s) => s.value === value) || PREPAID_STATUSES[0];
}

/**
 * Get a consistent color for a company NAME, using the same palette as the
 * P&L dashboard so the same company always shows the same color in both views.
 */
export function getCompanyColor(companyName: string, allNames: string[]): string {
  const idx = allNames.indexOf(companyName);
  if (idx === -1) return COMPANY_COLORS[0];
  return COMPANY_COLORS[idx % COMPANY_COLORS.length];
}

// ─── Computed helpers ────────────────────────────────────────────────────
export function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1);
}

export function getMonthlyInstallment(total: number, months: number): number {
  if (months <= 0) return 0;
  return total / months;
}

export function getConsumedInfo(expense: PrepaidExpense, now: Date = new Date()) {
  const start = new Date(expense.startDate);
  if (isNaN(start.getTime())) return { consumed: 0, remaining: expense.totalAmount, monthsElapsed: 0, percent: 0 };

  const monthsElapsed = Math.max(0, Math.min(
    expense.monthsCount,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1
  ));
  const monthly = getMonthlyInstallment(expense.totalAmount, expense.monthsCount);
  const consumed = monthly * monthsElapsed;
  const remaining = Math.max(0, expense.totalAmount - consumed);
  const percent = expense.monthsCount > 0 ? Math.round((monthsElapsed / expense.monthsCount) * 100) : 0;
  return { consumed, remaining, monthsElapsed, percent };
}

// ─── Store ────────────────────────────────────────────────────────────────
interface PrepaidStore {
  // Standalone company names (used when no P&L data is uploaded yet).
  // When P&L data exists, those company names are also recognized here.
  standaloneCompanyNames: string[];
  expenses: PrepaidExpense[];
  selectedCompanyName: string | null; // null = "all"
  searchQuery: string;
  filterCategory: PrepaidCategory | 'all';
  filterStatus: PrepaidStatus | 'all';
  filterYear: number | 'all';

  addStandaloneCompany: (name: string) => void;
  deleteStandaloneCompany: (name: string) => void;

  addExpense: (data: Omit<PrepaidExpense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, data: Partial<Omit<PrepaidExpense, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteExpense: (id: string) => void;

  setSelectedCompanyName: (name: string | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterCategory: (c: PrepaidCategory | 'all') => void;
  setFilterStatus: (s: PrepaidStatus | 'all') => void;
  setFilterYear: (y: number | 'all') => void;

  getFilteredExpenses: (allCompanyNames: string[]) => PrepaidExpense[];
  getExpenseCountByCompany: (companyName: string) => number;
}

// ─── Migration: convert old `companyId` references to `companyName` ────────
// Previous versions stored a separate `PrepaidCompany` list with IDs. When
// loading persisted state from such a version, we map any orphaned expenses
// (whose company no longer exists) to a placeholder name so no data is lost.
function migrateState(state: any): Partial<PrepaidStore> {
  if (!state) return state;
  const next: any = { ...state };
  // If old `companies` array exists, build a lookup id → name and migrate expenses
  if (Array.isArray(state.companies) && state.companies.length > 0) {
    const idToName = new Map<string, string>();
    state.companies.forEach((c: any) => {
      if (c && c.id && c.name) idToName.set(c.id, c.name);
    });
    if (Array.isArray(state.expenses)) {
      next.expenses = state.expenses.map((e: any) => {
        if (e.companyId && !e.companyName) {
          return { ...e, companyName: idToName.get(e.companyId) || 'شركة محذوفة', companyId: undefined };
        }
        return e;
      });
    }
    // Carry old company names into standalone list so they remain visible
    next.standaloneCompanyNames = state.companies.map((c: any) => c.name).filter(Boolean);
    next.companies = undefined;
  }
  // Rename selectedCompanyId → selectedCompanyName if needed
  if (state.selectedCompanyId !== undefined && state.selectedCompanyName === undefined) {
    const oldCompanies: any[] = state.companies || [];
    const found = oldCompanies.find((c: any) => c.id === state.selectedCompanyId);
    next.selectedCompanyName = found ? found.name : null;
    next.selectedCompanyId = undefined;
  }
  return next;
}

export const usePrepaidStore = create<PrepaidStore>()(
  persist(
    (set, get) => ({
      standaloneCompanyNames: [],
      expenses: [],
      selectedCompanyName: null,
      searchQuery: '',
      filterCategory: 'all',
      filterStatus: 'all',
      filterYear: 'all',

      addStandaloneCompany: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          if (state.standaloneCompanyNames.includes(trimmed)) return state;
          return { standaloneCompanyNames: [...state.standaloneCompanyNames, trimmed] };
        }),

      deleteStandaloneCompany: (name) =>
        set((state) => ({
          standaloneCompanyNames: state.standaloneCompanyNames.filter((n) => n !== name),
          expenses: state.expenses.filter((e) => e.companyName !== name),
          selectedCompanyName: state.selectedCompanyName === name ? null : state.selectedCompanyName,
        })),

      addExpense: (data) =>
        set((state) => ({
          expenses: [
            ...state.expenses,
            {
              ...data,
              id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        })),

      updateExpense: (id, data) =>
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
          ),
        })),

      deleteExpense: (id) =>
        set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

      setSelectedCompanyName: (name) => set({ selectedCompanyName: name }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilterCategory: (c) => set({ filterCategory: c }),
      setFilterStatus: (s) => set({ filterStatus: s }),
      setFilterYear: (y) => set({ filterYear: y }),

      getFilteredExpenses: (allCompanyNames) => {
        const state = get();
        let list = state.expenses;
        // Filter to only companies that actually exist in the unified list
        const validNames = new Set(allCompanyNames);
        list = list.filter((e) => validNames.has(e.companyName));
        if (state.selectedCompanyName) {
          list = list.filter((e) => e.companyName === state.selectedCompanyName);
        }
        if (state.filterCategory !== 'all') {
          list = list.filter((e) => e.category === state.filterCategory);
        }
        if (state.filterStatus !== 'all') {
          list = list.filter((e) => e.status === state.filterStatus);
        }
        if (state.filterYear !== 'all') {
          list = list.filter((e) => new Date(e.startDate).getFullYear() === state.filterYear);
        }
        if (state.searchQuery.trim()) {
          const q = state.searchQuery.trim().toLowerCase();
          list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q));
        }
        return list;
      },

      getExpenseCountByCompany: (companyName) =>
        get().expenses.filter((e) => e.companyName === companyName).length,
    }),
    {
      name: 'prepaid-expense-storage-v2', // bumped from v1 to trigger migration
      partialize: (state) => ({
        standaloneCompanyNames: state.standaloneCompanyNames,
        expenses: state.expenses,
        selectedCompanyName: state.selectedCompanyName,
      }),
      migrate: (persistedState: any) => migrateState(persistedState) as Partial<PrepaidStore>,
      version: 2,
    }
  )
);
