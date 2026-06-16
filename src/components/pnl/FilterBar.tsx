'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Building2, Calendar, Check, X, Trash2, Filter, ArrowRightLeft,
  ChevronDown, RotateCcw,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { COMPANY_COLORS, groupByCompany, periodToArabic, sortPeriods } from '@/lib/pnl-types';

export function FilterBar() {
  const {
    companies,
    selectedCompanyNames,
    selectedPeriods,
    dateRangeStart,
    dateRangeEnd,
    toggleCompanyName,
    togglePeriod,
    selectAllCompanies,
    deselectAllCompanies,
    selectAllPeriods,
    deselectAllPeriods,
    removeCompanyGroup,
    setDateRange,
  } = usePnLStore();

  const [companyOpen, setCompanyOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  const groups = groupByCompany(companies);
  const allCompanyNames = [...new Set(companies.map((c) => c.companyName))];
  const allPeriods = sortPeriods([...new Set(companies.map((c) => c.period))]);

  const isCompanyFiltered = selectedCompanyNames.length < allCompanyNames.length;
  const isPeriodFiltered = selectedPeriods.length < allPeriods.length;
  const isDateRangeActive = !!(dateRangeStart && dateRangeEnd);
  const hasAnyFilter = isCompanyFiltered || isPeriodFiltered || isDateRangeActive;

  if (companies.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        {/* Main filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company filter popover */}
          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-1.5 text-xs font-medium rounded-xl border-border/60 ${isCompanyFiltered ? 'border-primary/50 text-primary bg-primary/5' : ''}`}
              >
                <Building2 className="h-3.5 w-3.5" />
                الشركات
                <Badge variant="secondary" className="h-5 min-w-[22px] px-1.5 text-[10px] rounded-md">
                  {selectedCompanyNames.length}/{allCompanyNames.length}
                </Badge>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 rounded-2xl border-border/60" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">اختر الشركات</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-lg" onClick={selectAllCompanies}>
                      تحديد الكل
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-lg" onClick={deselectAllCompanies}>
                      إلغاء الكل
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {groups.map((group, gIdx) => {
                    const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
                    const isSelected = selectedCompanyNames.includes(group.name);
                    return (
                      <div key={group.name} className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCompanyName(group.name)}
                          className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-all ${
                            isSelected ? 'bg-primary/8 font-medium' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="truncate">{group.name}</span>
                          <span className="text-[10px] text-muted-foreground mr-auto">({group.periods.length})</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground/30 hover:text-destructive rounded-lg"
                          onClick={() => removeCompanyGroup(group.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Period filter popover */}
          <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-1.5 text-xs font-medium rounded-xl border-border/60 ${isPeriodFiltered ? 'border-primary/50 text-primary bg-primary/5' : ''}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                الفترات
                <Badge variant="secondary" className="h-5 min-w-[22px] px-1.5 text-[10px] rounded-md">
                  {selectedPeriods.length}/{allPeriods.length}
                </Badge>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 rounded-2xl border-border/60" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">اختر الفترات</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-lg" onClick={selectAllPeriods}>
                      تحديد الكل
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-lg" onClick={deselectAllPeriods}>
                      إلغاء الكل
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto">
                  {allPeriods.map((period) => {
                    const isSelected = selectedPeriods.includes(period);
                    return (
                      <button
                        key={period}
                        onClick={() => togglePeriod(period)}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-all text-right ${
                          isSelected ? 'bg-primary/8 font-medium' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        {periodToArabic(period)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/50 px-2 py-1">
            <span className="text-[10px] text-muted-foreground font-medium">التجميع:</span>
            <select
              value={dateRangeStart || ''}
              onChange={(e) => setDateRange(e.target.value || null, dateRangeEnd)}
              className="h-7 rounded-lg bg-transparent px-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">من</option>
              {allPeriods.map((p) => (
                <option key={p} value={p}>{periodToArabic(p)}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground/40">→</span>
            <select
              value={dateRangeEnd || ''}
              onChange={(e) => setDateRange(dateRangeStart, e.target.value || null)}
              className="h-7 rounded-lg bg-transparent px-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">إلى</option>
              {allPeriods.map((p) => (
                <option key={p} value={p}>{periodToArabic(p)}</option>
              ))}
            </select>
            {isDateRangeActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive rounded-md"
                onClick={() => setDateRange(null, null)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Active filter summary / Reset */}
          {hasAnyFilter && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                <Filter className="h-3 w-3" />
                <span>
                  {selectedCompanyNames.length} شركة × {selectedPeriods.length} فترة
                  {isDateRangeActive && ` • مجمّع`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/8 px-2 rounded-lg"
                onClick={() => {
                  selectAllCompanies();
                  selectAllPeriods();
                  setDateRange(null, null);
                }}
              >
                <RotateCcw className="h-3 w-3" />
                إعادة تعيين
              </Button>
            </div>
          )}
        </div>

        {/* Active tags row */}
        {(isCompanyFiltered || isPeriodFiltered || isDateRangeActive) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/30 pt-3">
            {/* Hidden companies */}
            {isCompanyFiltered && allCompanyNames.filter(n => !selectedCompanyNames.includes(n)).map(name => {
              const gIdx = allCompanyNames.indexOf(name);
              const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
              return (
                <button
                  key={name}
                  onClick={() => toggleCompanyName(name)}
                  className="inline-flex items-center gap-1 rounded-full bg-muted/40 hover:bg-primary/8 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  + {name}
                </button>
              );
            })}
            {/* Hidden periods */}
            {isPeriodFiltered && allPeriods.filter(p => !selectedPeriods.includes(p)).map(period => (
              <button
                key={period}
                onClick={() => togglePeriod(period)}
                className="inline-flex items-center gap-1 rounded-full bg-muted/40 hover:bg-primary/8 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                + {periodToArabic(period)}
              </button>
            ))}
            {/* Date range indicator */}
            {isDateRangeActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                <ArrowRightLeft className="h-2.5 w-2.5" />
                تجميع: {periodToArabic(dateRangeStart!)} → {periodToArabic(dateRangeEnd!)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
