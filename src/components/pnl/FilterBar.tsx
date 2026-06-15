'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { COMPANY_COLORS, groupByCompany, periodToArabic } from '@/lib/pnl-types';

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
  const allPeriods = [...new Set(companies.map((c) => c.period))].sort();

  const isCompanyFiltered = selectedCompanyNames.length < allCompanyNames.length;
  const isPeriodFiltered = selectedPeriods.length < allPeriods.length;
  const isDateRangeActive = !!(dateRangeStart && dateRangeEnd);
  const hasAnyFilter = isCompanyFiltered || isPeriodFiltered || isDateRangeActive;

  if (companies.length === 0) return null;

  return (
    <Card className="shadow-sm border-muted/60">
      <CardContent className="p-3">
        {/* Main filter row - compact single line */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Company filter popover */}
          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-xs font-medium ${isCompanyFiltered ? 'border-[#4CAF50] text-[#4CAF50] bg-[#4CAF50]/5' : ''}`}
              >
                <Building2 className="h-3.5 w-3.5" />
                الشركات
                <Badge variant="secondary" className="h-4 min-w-[20px] px-1 text-[10px]">
                  {selectedCompanyNames.length}/{allCompanyNames.length}
                </Badge>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">اختر الشركات</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllCompanies}>
                      تحديد الكل
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={deselectAllCompanies}>
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
                          className={`flex-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all ${
                            isSelected ? 'bg-muted/50 font-medium' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                            isSelected ? 'border-[#4CAF50] bg-[#4CAF50]' : 'border-muted-foreground/30'
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
                          className="h-7 w-7 shrink-0 text-muted-foreground/30 hover:text-red-500"
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
                className={`h-8 gap-1.5 text-xs font-medium ${isPeriodFiltered ? 'border-[#4CAF50] text-[#4CAF50] bg-[#4CAF50]/5' : ''}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                الفترات
                <Badge variant="secondary" className="h-4 min-w-[20px] px-1 text-[10px]">
                  {selectedPeriods.length}/{allPeriods.length}
                </Badge>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">اختر الفترات</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={selectAllPeriods}>
                      تحديد الكل
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={deselectAllPeriods}>
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
                        className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs transition-all text-right ${
                          isSelected ? 'bg-muted/50 font-medium' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                          isSelected ? 'border-[#4CAF50] bg-[#4CAF50]' : 'border-muted-foreground/30'
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
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-medium">التجميع:</span>
            <select
              value={dateRangeStart || ''}
              onChange={(e) => setDateRange(e.target.value || null, dateRangeEnd)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
            >
              <option value="">من</option>
              {allPeriods.map((p) => (
                <option key={p} value={p}>{periodToArabic(p)}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground">—</span>
            <select
              value={dateRangeEnd || ''}
              onChange={(e) => setDateRange(dateRangeStart, e.target.value || null)}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
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
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
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
              <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] text-amber-800">
                <Filter className="h-3 w-3" />
                <span>
                  {selectedCompanyNames.length} شركة × {selectedPeriods.length} فترة
                  {isDateRangeActive && ` • مجمّع`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[10px] text-red-500 hover:text-red-600 px-2"
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
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
            {/* Hidden companies */}
            {isCompanyFiltered && allCompanyNames.filter(n => !selectedCompanyNames.includes(n)).map(name => {
              const gIdx = allCompanyNames.indexOf(name);
              const color = COMPANY_COLORS[gIdx % COMPANY_COLORS.length];
              return (
                <button
                  key={name}
                  onClick={() => toggleCompanyName(name)}
                  className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
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
                className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
              >
                + {periodToArabic(period)}
              </button>
            ))}
            {/* Date range indicator */}
            {isDateRangeActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] text-green-800">
                <ArrowRightLeft className="h-2.5 w-2.5" />
                تجميع: {periodToArabic(dateRangeStart!)} → {periodToArabic(dateRangeEnd!)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
