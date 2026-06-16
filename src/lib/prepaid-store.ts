'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface PrepaidCompany {
  id: string;
  name: string;
  description: string;
  color: string; // hex color
  createdAt: string;
}

export interface PrepaidExpense {
  id: string;
  name: string;
  companyId: string;
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

export const PREPAID_COMPANY_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#06b6d4', '#ef4444', '#84cc16',
  '#f97316', '#a855f7', '#14b8a6', '#6366f1',
];

export function getCategoryInfo(value: PrepaidCategory) {
  return PREPAID_CATEGORIES.find((c) => c.value === value) || PREPAID_CATEGORIES[PREPAID_CATEGORIES.length - 1];
}

export function getStatusInfo(value: PrepaidStatus) {
  return PREPAID_STATUSES.find((s) => s.value === value) || PREPAID_STATUSES[0];
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
  companies: PrepaidCompany[];
  expenses: PrepaidExpense[];
  selectedCompanyId: string | null; // null = "all"
  searchQuery: string;
  filterCategory: PrepaidCategory | 'all';
  filterStatus: PrepaidStatus | 'all';
  filterYear: number | 'all';

  addCompany: (data: Omit<PrepaidCompany, 'id' | 'createdAt'>) => void;
  updateCompany: (id: string, data: Partial<Omit<PrepaidCompany, 'id' | 'createdAt'>>) => void;
  deleteCompany: (id: string) => void;
  setSelectedCompany: (id: string | null) => void;

  addExpense: (data: Omit<PrepaidExpense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, data: Partial<Omit<PrepaidExpense, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteExpense: (id: string) => void;

  setSearchQuery: (q: string) => void;
  setFilterCategory: (c: PrepaidCategory | 'all') => void;
  setFilterStatus: (s: PrepaidStatus | 'all') => void;
  setFilterYear: (y: number | 'all') => void;

  getFilteredExpenses: () => PrepaidExpense[];
  getExpenseCountByCompany: (companyId: string) => number;
}

export const usePrepaidStore = create<PrepaidStore>()(
  persist(
    (set, get) => ({
      companies: [],
      expenses: [],
      selectedCompanyId: null,
      searchQuery: '',
      filterCategory: 'all',
      filterStatus: 'all',
      filterYear: 'all',

      addCompany: (data) =>
        set((state) => ({
          companies: [
            ...state.companies,
            { ...data, id: `co_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() },
          ],
        })),

      updateCompany: (id, data) =>
        set((state) => ({
          companies: state.companies.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),

      deleteCompany: (id) =>
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== id),
          expenses: state.expenses.filter((e) => e.companyId !== id),
          selectedCompanyId: state.selectedCompanyId === id ? null : state.selectedCompanyId,
        })),

      setSelectedCompany: (id) => set({ selectedCompanyId: id }),

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

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilterCategory: (c) => set({ filterCategory: c }),
      setFilterStatus: (s) => set({ filterStatus: s }),
      setFilterYear: (y) => set({ filterYear: y }),

      getFilteredExpenses: () => {
        const state = get();
        let list = state.expenses;
        if (state.selectedCompanyId) {
          list = list.filter((e) => e.companyId === state.selectedCompanyId);
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

      getExpenseCountByCompany: (companyId) =>
        get().expenses.filter((e) => e.companyId === companyId).length,
    }),
    {
      name: 'prepaid-expense-storage-v1',
      partialize: (state) => ({
        companies: state.companies,
        expenses: state.expenses,
        selectedCompanyId: state.selectedCompanyId,
      }),
    }
  )
);
