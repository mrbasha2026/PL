'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyPnL, PnLLineItem, PNL_LINE_ITEMS, aggregatePeriods, periodToArabic, sortPeriods, parsePeriod } from './pnl-types';

interface AggregatedCompany {
  companyName: string;
  currency: string;
  aggregatedData: Record<string, number>;
  periodLabel: string;
  periodCount: number;
}

interface PnLStore {
  companies: CompanyPnL[];
  lineItems: PnLLineItem[];
  selectedCompanyNames: string[];
  selectedPeriods: string[];
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  lastUpdated: string | null;
  notes: Record<string, string>;

  addCompanies: (newCompanies: CompanyPnL[]) => void;
  removeDataset: (id: string) => void;
  removeCompanyGroup: (companyName: string) => void;
  toggleCompanyName: (name: string) => void;
  togglePeriod: (period: string) => void;
  selectAllCompanies: () => void;
  deselectAllCompanies: () => void;
  selectAllPeriods: () => void;
  deselectAllPeriods: () => void;
  setDateRange: (start: string | null, end: string | null) => void;
  clearAll: () => void;
  getFiltered: () => CompanyPnL[];
  getAggregatedFiltered: () => AggregatedCompany[];
  setNote: (key: string, value: string) => void;
  deleteNote: (key: string) => void;
  clearNotes: () => void;
}

export const usePnLStore = create<PnLStore>()(
  persist(
    (set, get) => ({
      companies: [],
      lineItems: PNL_LINE_ITEMS,
      selectedCompanyNames: [],
      selectedPeriods: [],
      dateRangeStart: null,
      dateRangeEnd: null,
      lastUpdated: null,
      notes: {},

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
            selectedPeriods: [...new Set([...state.selectedPeriods, ...newPeriods])],
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
            : sortPeriods([...state.selectedPeriods, period]),
        })),

      selectAllCompanies: () =>
        set((state) => ({ selectedCompanyNames: [...new Set(state.companies.map((c) => c.companyName))] })),

      deselectAllCompanies: () => set({ selectedCompanyNames: [] }),

      selectAllPeriods: () =>
        set((state) => ({ selectedPeriods: sortPeriods([...new Set(state.companies.map((c) => c.period))]) })),

      deselectAllPeriods: () => set({ selectedPeriods: [] }),

      setDateRange: (start, end) =>
        set({ dateRangeStart: start, dateRangeEnd: end }),

      clearAll: () =>
        set({ companies: [], selectedCompanyNames: [], selectedPeriods: [], dateRangeStart: null, dateRangeEnd: null, lastUpdated: null, notes: {} }),

      setNote: (key, value) =>
        set((state) => {
          const updated = { ...state.notes };
          if (value.trim() === '') {
            delete updated[key];
          } else {
            updated[key] = value;
          }
          return { notes: updated };
        }),

      deleteNote: (key) =>
        set((state) => {
          const updated = { ...state.notes };
          delete updated[key];
          return { notes: updated };
        }),

      clearNotes: () => set({ notes: {} }),

      getFiltered: () => {
        const state = get();
        return state.companies.filter(
          (c) => state.selectedCompanyNames.includes(c.companyName) && state.selectedPeriods.includes(c.period)
        );
      },

      getAggregatedFiltered: () => {
        const state = get();
        const filtered = state.companies.filter(
          (c) => state.selectedCompanyNames.includes(c.companyName) && state.selectedPeriods.includes(c.period)
        );

        // Group by company
        const companyMap = new Map<string, CompanyPnL[]>();
        filtered.forEach((ds) => {
          const existing = companyMap.get(ds.companyName) || [];
          existing.push(ds);
          companyMap.set(ds.companyName, existing);
        });

        const allPeriods = sortPeriods([...new Set(filtered.map((c) => c.period))]);

        return Array.from(companyMap.entries()).map(([companyName, datasets]) => {
          let datasetsInRange = datasets;

          // Filter by date range if set
          if (state.dateRangeStart && state.dateRangeEnd) {
            const startIdx = allPeriods.indexOf(state.dateRangeStart);
            const endIdx = allPeriods.indexOf(state.dateRangeEnd);
            if (startIdx !== -1 && endIdx !== -1) {
              const rangePeriods = allPeriods.slice(
                Math.min(startIdx, endIdx),
                Math.max(startIdx, endIdx) + 1
              );
              datasetsInRange = datasets.filter((ds) => rangePeriods.includes(ds.period));
            }
          }

          const aggregatedData = aggregatePeriods(datasetsInRange);
          const currency = datasetsInRange[0]?.currency || 'SAR';

          // Build period label
          let periodLabel: string;
          if (state.dateRangeStart && state.dateRangeEnd) {
            periodLabel = `${periodToArabic(state.dateRangeStart)} - ${periodToArabic(state.dateRangeEnd)}`;
          } else if (datasetsInRange.length > 1) {
            const sortedPeriods = sortPeriods(datasetsInRange.map(d => d.period));
            periodLabel = `${periodToArabic(sortedPeriods[0])} - ${periodToArabic(sortedPeriods[sortedPeriods.length - 1])}`;
          } else if (datasetsInRange.length === 1) {
            periodLabel = periodToArabic(datasetsInRange[0].period);
          } else {
            periodLabel = '—';
          }

          return {
            companyName,
            currency,
            aggregatedData,
            periodLabel,
            periodCount: datasetsInRange.length,
          };
        });
      },
    }),
    {
      name: 'pnl-dashboard-storage-v2',
      partialize: (state) => ({
        companies: state.companies,
        selectedCompanyNames: state.selectedCompanyNames,
        selectedPeriods: state.selectedPeriods,
        dateRangeStart: state.dateRangeStart,
        dateRangeEnd: state.dateRangeEnd,
        lastUpdated: state.lastUpdated,
        notes: state.notes,
      }),
    }
  )
);
