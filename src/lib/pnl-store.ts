'use client';

import { create } from 'zustand';
import { CompanyPnL, PnLLineItem, PNL_LINE_ITEMS } from './pnl-types';

interface PnLStore {
  companies: CompanyPnL[];
  lineItems: PnLLineItem[];
  selectedCompanyIds: string[];
  viewMode: 'table' | 'comparison' | 'charts';

  addCompany: (company: CompanyPnL) => void;
  removeCompany: (id: string) => void;
  updateCompany: (id: string, data: Partial<CompanyPnL>) => void;
  setSelectedCompanyIds: (ids: string[]) => void;
  toggleCompanySelection: (id: string) => void;
  setViewMode: (mode: 'table' | 'comparison' | 'charts') => void;
  clearAll: () => void;
  getSelectedCompanies: () => CompanyPnL[];
}

export const usePnLStore = create<PnLStore>((set, get) => ({
  companies: [],
  lineItems: PNL_LINE_ITEMS,
  selectedCompanyIds: [],
  viewMode: 'table',

  addCompany: (company) =>
    set((state) => ({
      companies: [...state.companies, company],
      selectedCompanyIds: [...state.selectedCompanyIds, company.id],
    })),

  removeCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
      selectedCompanyIds: state.selectedCompanyIds.filter((cid) => cid !== id),
    })),

  updateCompany: (id, data) =>
    set((state) => ({
      companies: state.companies.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
    })),

  setSelectedCompanyIds: (ids) => set({ selectedCompanyIds: ids }),

  toggleCompanySelection: (id) =>
    set((state) => {
      const isSelected = state.selectedCompanyIds.includes(id);
      return {
        selectedCompanyIds: isSelected
          ? state.selectedCompanyIds.filter((cid) => cid !== id)
          : [...state.selectedCompanyIds, id],
      };
    }),

  setViewMode: (mode) => set({ viewMode: mode }),

  clearAll: () => set({ companies: [], selectedCompanyIds: [] }),

  getSelectedCompanies: () => {
    const state = get();
    return state.companies.filter((c) =>
      state.selectedCompanyIds.includes(c.id)
    );
  },
}));
