'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Building2, Calendar, CheckCheck, X, Trash2, Filter,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { COMPANY_COLORS, groupByCompany } from '@/lib/pnl-types';

export function FilterBar() {
  const {
    companies,
    selectedCompanyNames,
    selectedPeriods,
    toggleCompanyName,
    togglePeriod,
    selectAllCompanies,
    deselectAllCompanies,
    selectAllPeriods,
    deselectAllPeriods,
    removeCompanyGroup,
  } = usePnLStore();

  const groups = groupByCompany(companies);
  const allCompanyNames = [...new Set(companies.map((c) => c.companyName))];
  const allPeriods = [...new Set(companies.map((c) => c.period))].sort();

  if (companies.length === 0) return null;

  return (
    <Card className="shadow-sm border-muted/60">
      <CardContent className="p-4 space-y-4">
        {/* Company Filter */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4" />
              الشركات
              <span className="text-xs font-normal">
                ({selectedCompanyNames.length} من {allCompanyNames.length})
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={selectAllCompanies}
              >
                <CheckCheck className="h-3 w-3 ml-1" />
                الكل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={deselectAllCompanies}
              >
                <X className="h-3 w-3 ml-1" />
                إلغاء
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((group, gIdx) => {
              const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
              const isSelected = selectedCompanyNames.includes(group.name);
              return (
                <div key={group.name} className="flex items-center gap-1">
                  <button
                    onClick={() => toggleCompanyName(group.name)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all border ${
                      isSelected
                        ? 'text-white shadow-sm'
                        : 'bg-background text-muted-foreground hover:bg-muted border-muted/60'
                    }`}
                    style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? 'white' : color }}
                    />
                    {group.name}
                    <span className="text-xs opacity-70">({group.periods.length})</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground/40 hover:text-red-500"
                    onClick={() => removeCompanyGroup(group.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="!my-1" />

        {/* Period Filter */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Calendar className="h-4 w-4" />
              الفترات
              <span className="text-xs font-normal">
                ({selectedPeriods.length} من {allPeriods.length})
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={selectAllPeriods}
              >
                <CheckCheck className="h-3 w-3 ml-1" />
                الكل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={deselectAllPeriods}
              >
                <X className="h-3 w-3 ml-1" />
                إلغاء
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allPeriods.map((period) => {
              const isSelected = selectedPeriods.includes(period);
              return (
                <button
                  key={period}
                  onClick={() => togglePeriod(period)}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all border ${
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-background text-muted-foreground hover:bg-muted border-muted/60'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {period}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active filter summary */}
        {(selectedCompanyNames.length < allCompanyNames.length || selectedPeriods.length < allPeriods.length) && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
            <Filter className="h-3.5 w-3.5 shrink-0" />
            <span>
              فلتر نشط: {selectedCompanyNames.length} شركة × {selectedPeriods.length} فترة
              {selectedCompanyNames.length < allCompanyNames.length && ` (مخفي ${allCompanyNames.length - selectedCompanyNames.length} شركة)`}
              {selectedPeriods.length < allPeriods.length && ` (مخفي ${allPeriods.length - selectedPeriods.length} فترة)`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
