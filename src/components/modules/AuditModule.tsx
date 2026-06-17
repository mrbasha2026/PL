'use client';

import React from 'react';
import {
  ScrollText, Search, Filter, Activity, User, Globe, Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageActions } from '@/components/system/PageActions';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface AuditLog {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { email: string; name: string | null } | null;
}

const ACTION_LABELS: Record<string, { ar: string; color: string }> = {
  'auth.login': { ar: 'تسجيل دخول', color: '#059669' },
  'auth.bootstrap': { ar: 'تأسيس النظام', color: '#dc2626' },
  'user.create': { ar: 'إنشاء مستخدم', color: '#7c3aed' },
  'user.update': { ar: 'تعديل مستخدم', color: '#d97706' },
  'user.delete': { ar: 'حذف مستخدم', color: '#dc2626' },
  'user.change_password': { ar: 'تغيير كلمة المرور', color: '#0891b2' },
  'company.create': { ar: 'إنشاء شركة', color: '#059669' },
  'company.update': { ar: 'تعديل شركة', color: '#d97706' },
  'company.delete': { ar: 'حذف شركة', color: '#dc2626' },
  'expense.create': { ar: 'تسجيل مصروف', color: '#7c3aed' },
  'expense.update': { ar: 'تعديل مصروف', color: '#d97706' },
  'expense.delete': { ar: 'حذف مصروف', color: '#dc2626' },
  'category.create': { ar: 'إنشاء تصنيف', color: '#059669' },
  'category.update': { ar: 'تعديل تصنيف', color: '#d97706' },
  'category.delete': { ar: 'حذف تصنيف', color: '#dc2626' },
  'prepaid.create': { ar: 'إنشاء مصروف مقدم', color: '#059669' },
  'prepaid.update': { ar: 'تعديل مصروف مقدم', color: '#d97706' },
  'prepaid.delete': { ar: 'حذف مصروف مقدم', color: '#dc2626' },
  'pnl.upload': { ar: 'رفع بيانات P&L', color: '#7c3aed' },
  'budget.create': { ar: 'إنشاء ميزانية', color: '#059669' },
  'budget.delete': { ar: 'حذف ميزانية', color: '#dc2626' },
  'forecast.create': { ar: 'تشغيل تنبؤ', color: '#2563eb' },
  'forecast.delete': { ar: 'حذف تنبؤ', color: '#dc2626' },
  'system.settings_attempted_update': { ar: 'محاولة تعديل إعدادات', color: '#d97706' },
};

export function AuditModule() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('all');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit?limit=200');
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      if (!l.action.toLowerCase().includes(q) && !l.user?.email?.toLowerCase().includes(q)) return false;
    }
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    return true;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="text-sm text-muted-foreground">
          سجل التدقيق
        </div>
        <PageActions onRefresh={load} />
      </div>
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي السجلات" value={logs.length} icon={ScrollText} color="#0d9488" />
        <SummaryCard label="أنواع الإجراءات" value={uniqueActions.length} icon={Activity} color="#7c3aed" />
        <SummaryCard label="آخر 24 ساعة" value={logs.filter((l) => Date.now() - new Date(l.createdAt).getTime() < 86400000).length} icon={Clock} color="#059669" />
        <SummaryCard label="مستخدمون نشطون" value={new Set(logs.map((l) => l.user?.email).filter(Boolean)).size} icon={User} color="#d97706" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 min-w-[240px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الإجراء أو المستخدم..."
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/70"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl bg-card border border-border/60 px-3 py-1.5 text-sm"
        >
          <option value="all">كل الإجراءات</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]?.ar || a}</option>
          ))}
        </select>
        <Badge variant="secondary" className="text-xs">
          {filtered.length} سجل
        </Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ScrollText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد سجلات</div>
              <div className="text-xs text-muted-foreground">سيظهر هنا سجل كامل لكل إجراء في النظام</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">IP</TableHead>
                  <TableHead className="text-right">الوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((l) => {
                  const label = ACTION_LABELS[l.action] || { ar: l.action, color: '#64748b' };
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" style={{
                          background: `${label.color}15`,
                          color: label.color,
                          borderColor: `${label.color}30`,
                        }}>
                          {label.ar}
                        </Badge>
                        {l.entityType && (
                          <span className="text-[10px] text-muted-foreground mr-2 font-mono">
                            {l.entityType}:{l.entityId?.slice(0, 8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {l.user ? (
                          <div>
                            <div className="font-medium">{l.user.name || l.user.email}</div>
                            <div className="text-[10px] text-muted-foreground">{l.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">النظام</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{l.action}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {l.ipAddress ? (
                          <Badge variant="outline" className="text-[9px] font-mono">{l.ipAddress}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString('ar-SA')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
            <div className="text-lg font-bold">{value}</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}20`, color }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
