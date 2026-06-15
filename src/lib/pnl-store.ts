'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyPnL, PnLLineItem, PNL_LINE_ITEMS } from './pnl-types';

interface PnLStore {
  companies: CompanyPnL[];
  lineItems: PnLLineItem[];
  selectedIds: string[];
  viewMode: 'summary' | 'table' | 'ratios' | 'comparison' | 'charts' | 'trends';
  lastUpdated: string | null;

  addCompanies: (newCompanies: CompanyPnL[]) => void;
  removeDataset: (id: string) => void;
  removeCompanyGroup: (companyName: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setViewMode: (mode: PnLStore['viewMode']) => void;
  clearAll: () => void;
  getSelected: () => CompanyPnL[];
}

export const usePnLStore = create<PnLStore>()(
  persist(
    (set, get) => ({
      companies: [],
      lineItems: PNL_LINE_ITEMS,
      selectedIds: [],
      viewMode: 'summary',
      lastUpdated: null,

      addCompanies: (newCompanies) =>
        set((state) => {
          const existingIds = new Set(state.companies.map((c) => c.id));
          const fresh = newCompanies.filter((c) => !existingIds.has(c.id));
          return {
            companies: [...state.companies, ...fresh],
            selectedIds: [...state.selectedIds, ...fresh.map((c) => c.id)],
            lastUpdated: new Date().toISOString(),
          };
        }),

      removeDataset: (id) =>
        set((state) => ({
          companies: state.companies.filter((c) => c.id !== id),
          selectedIds: state.selectedIds.filter((sid) => sid !== id),
          lastUpdated: new Date().toISOString(),
        })),

      removeCompanyGroup: (companyName) =>
        set((state) => {
          const toRemove = new Set(
            state.companies.filter((c) => c.companyName === companyName).map((c) => c.id)
          );
          return {
            companies: state.companies.filter((c) => c.companyName !== companyName),
            selectedIds: state.selectedIds.filter((id) => !toRemove.has(id)),
            lastUpdated: new Date().toISOString(),
          };
        }),

      toggleSelection: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        })),

      selectAll: () =>
        set((state) => ({ selectedIds: state.companies.map((c) => c.id) })),

      deselectAll: () => set({ selectedIds: [] }),

      setViewMode: (mode) => set({ viewMode: mode }),

      clearAll: () =>
        set({ companies: [], selectedIds: [], lastUpdated: null }),

      getSelected: () => {
        const state = get();
        return state.companies.filter((c) => state.selectedIds.includes(c.id));
      },
    }),
    {
      name: 'pnl-dashboard-storage', // localStorage key
      partialize: (state) => ({
        companies: state.companies,
        selectedIds: state.selectedIds,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
