'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Building2 } from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { PNL_LINE_ITEMS, getLineItemKey, COMPANY_COLORS } from '@/lib/pnl-types';

function formatNumber(value: number, currency: string = 'SAR'): string {
  if (value === 0) return '-';
  const absVal = Math.abs(value);
  let formatted: string;

  if (absVal >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(1) + 'B';
  } else if (absVal >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(1) + 'M';
  } else if (absVal >= 1_000) {
    formatted = (value / 1_000).toFixed(1) + 'K';
  } else {
    formatted = value.toFixed(0);
  }

  return `${formatted} ${currency}`;
}

export function PnLTable() {
  const { companies, removeCompany, selectedCompanyIds, toggleCompanySelection } =
    usePnLStore();

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            لا توجد بيانات بعد
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            قم برفع ملف Excel لعرض بيانات الأرباح والخسائر
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Company badges */}
      <div className="flex flex-wrap items-center gap-2">
        {companies.map((company, idx) => {
          const color = COMPANY_COLORS[idx % COMPANY_COLORS.length];
          const isSelected = selectedCompanyIds.includes(company.id);
          return (
            <Badge
              key={company.id}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer gap-1.5 px-3 py-1.5 text-sm transition-all ${
                isSelected
                  ? 'text-white hover:opacity-90'
                  : 'hover:bg-muted'
              }`}
              style={
                isSelected
                  ? { backgroundColor: color, borderColor: color }
                  : { borderColor: color, color }
              }
              onClick={() => toggleCompanySelection(company.id)}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {company.name}
              <span className="text-xs opacity-70">({company.period})</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-4 w-4 p-0 text-current opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCompany(company.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </Badge>
          );
        })}
      </div>

      {/* P&L Table */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-3">
          <CardTitle className="text-base">قائمة الأرباح والخسائر</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="min-w-[250px] font-semibold">
                    البند
                  </TableHead>
                  {companies
                    .filter((c) => selectedCompanyIds.includes(c.id))
                    .map((company, idx) => (
                      <TableHead
                        key={company.id}
                        className="min-w-[150px] text-center font-semibold"
                        style={{
                          color: COMPANY_COLORS[
                            companies.indexOf(company) % COMPANY_COLORS.length
                          ],
                        }}
                      >
                        {company.name}
                        <br />
                        <span className="text-xs font-normal opacity-70">
                          {company.period} ({company.currency})
                        </span>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PNL_LINE_ITEMS.map((item) => {
                  const key = getLineItemKey(item.name);
                  const isSelected = item.isSubtotal || item.isTotal;
                  const selectedCompanies = companies.filter((c) =>
                    selectedCompanyIds.includes(c.id)
                  );

                  return (
                    <TableRow
                      key={key}
                      className={
                        isSelected
                          ? 'bg-muted/40 font-semibold'
                          : item.category === 'profit'
                          ? 'bg-emerald-50/50'
                          : ''
                      }
                    >
                      <TableCell
                        className={`${
                          item.indent ? 'pr-' + (item.indent * 6) : ''
                        } ${isSelected ? 'font-bold' : ''}`}
                      >
                        <span
                          style={{
                            paddingRight: `${(item.indent || 0) * 20}px`,
                          }}
                        >
                          {item.nameAr}
                          <span className="mr-1 text-xs text-muted-foreground">
                            ({item.name})
                          </span>
                        </span>
                      </TableCell>
                      {selectedCompanies.map((company) => {
                        const value = company.data[key] || 0;
                        return (
                          <TableCell
                            key={company.id}
                            className={`text-center tabular-nums ${
                              value < 0 ? 'text-red-600' : ''
                            } ${isSelected ? 'font-bold' : ''}`}
                          >
                            {formatNumber(value, company.currency)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
