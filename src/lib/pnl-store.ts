'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyPnL, PnLLineItem, PNL_LINE_ITEMS } from './pnl-types';

interface PnLStore {
  companies: CompanyPnL[];
  lineItems: PnLLineItem[];
  selectedCompanyNames: string[];
  selectedPeriods: string[];
  lastUpdated: string | null;

  addCompanies: (newCompanies: CompanyPnL[]) => void;
  removeDataset: (id: string) => void;
  removeCompanyGroup: (companyName: string) => void;
  toggleCompanyName: (name: string) => void;
  togglePeriod: (period: string) => void;
  selectAllCompanies: () => void;
  deselectAllCompanies: () => void;
  selectAllPeriods: () => void;
  deselectAllPeriods: () => void;
  clearAll: () => void;
  getFiltered: () => CompanyPnL[];
}

export const usePnLStore = create<PnLStore>()(
  persist(
    (set, get) => ({
      companies: [],
      lineItems: PNL_LINE_ITEMS,
      selectedCompanyNames: [],
      selectedPeriods: [],
      lastUpdated: null,

      addCompanies: (newCompanies) =>
        set((state) => {
          const existingKeys = new Set(state.companies.map((c) => `${c.companyName}::${c.period}`));
          const fresh = newCompanies.filter((c) => !existingKeys.has(`${c.companyName}::${c.period}`));
          const allCompanies = [...state.companies, ...fresh];
          // Auto-select new companies and periods
          const newCompanyNames = [...new Set(fresh.map((c) => c.companyName))];
          const newPeriods = [...new Set(fresh.map((c) => c.period))];
          return {
            companies: allCompanies,
            selectedCompanyNames: [...new Set([...state.selectedCompanyNames, ...newCompanyNames])],
            selectedPeriods: [...new Set([...state.selectedPeriods, ...newPeriods])].sort(),
            lastUpdated: new Date().toISOString(),
          };
        }),

      removeDataset: (id) =>
        set((state) => {
          const remaining = state.companies.filter((c) => c.id !== id);
          // Clean up orphaned selections
          const remainingNames = new Set(remaining.map((c) => c.companyName));
          const remainingPeriods = new Set(remaining.map((c) => c.period));
          return {
            companies: remaining,
            selectedCompanyNames: state.selectedCompanyNames.filter((n) => remainingNames.has(n)),
            selectedPeriods: state.selectedPeriods.filter((p) => remainingPeriods.has(p)),
            lastUpdated: new Date().toISOString(),
          };
        }),

      removeCompanyGroup: (companyName) =>
        set((state) => {
          const remaining = state.companies.filter((c) => c.companyName !== companyName);
          const remainingPeriods = new Set(remaining.map((c) => c.period));
          return {
            companies: remaining,
            selectedCompanyNames: state.selectedCompanyNames.filter((n) => n !== companyName),
            selectedPeriods: state.selectedPeriods.filter((p) => remainingPeriods.has(p)),
            lastUpdated: new Date().toISOString(),
          };
        }),

      toggleCompanyName: (name) =>
        set((state) => ({
          selectedCompanyNames: state.selectedCompanyNames.includes(name)
            ? state.selectedCompanyNames.filter((n) => n !== name)
            : [...state.selectedCompanyNames, name],
        })),

      togglePeriod: (period) =>
        set((state) => ({
          selectedPeriods: state.selectedPeriods.includes(period)
            ? state.selectedPeriods.filter((p) => p !== period)
            : [...state.selectedPeriods, period].sort(),
        })),

      selectAllCompanies: () =>
        set((state) => ({ selectedCompanyNames: [...new Set(state.companies.map((c) => c.companyName))] })),

      deselectAllCompanies: () => set({ selectedCompanyNames: [] }),

      selectAllPeriods: () =>
        set((state) => ({ selectedPeriods: [...new Set(state.companies.map((c) => c.period))].sort() })),

      deselectAllPeriods: () => set({ selectedPeriods: [] }),

      clearAll: () =>
        set({ companies: [], selectedCompanyNames: [], selectedPeriods: [], lastUpdated: null }),

      getFiltered: () => {
        const state = get();
        return state.companies.filter(
          (c) => state.selectedCompanyNames.includes(c.companyName) && state.selectedPeriods.includes(c.period)
        );
      },
    }),
    {
      name: 'pnl-dashboard-storage-v2',
      partialize: (state) => ({
        companies: state.companies,
        selectedCompanyNames: state.selectedCompanyNames,
        selectedPeriods: state.selectedPeriods,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
