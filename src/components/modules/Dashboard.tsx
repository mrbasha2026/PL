'use client';

import React from 'react';
import {
  Building2, Receipt, Table2, Clock, Wallet, LineChart, Users,
  TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle2,
  Database, ArrowUpRight, ArrowDownRight, Sparkles, FileText,
  Shield, ScrollText, Brain, CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/use-auth';
import type { SystemModule } from '@/components/system/SystemShell';

interface DashboardProps {
  onNavigate: (m: SystemModule) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  })();

  const modules: Array<{
    id: SystemModule;
    label: string;
    description: string;
    icon: any;
    color: string;
    permission?: string;
    stat?: string;
  }> = [
    {
      id: 'companies', label: 'الشركات', description: 'إدارة الشركات والمجموعات',
      icon: Building2, color: '#0d9488', permission: 'companies.view',
      stat: stats ? `${stats.totalCompanies} (${stats.activeCompanies} نشطة)` : undefined,
    },
    {
      id: 'expenses', label: 'المصروفات', description: 'تسجيل ومتابعة المصروفات',
      icon: Receipt, color: '#7c3aed', permission: 'expenses.view',
      stat: stats ? `${stats.totalExpenses} مصروف` : undefined,
    },
    {
      id: 'pnl', label: 'الأرباح والخسائر', description: 'P&L ورفع بيانات Excel',
      icon: Table2, color: '#059669', permission: 'pnl.view',
      stat: stats ? `${stats.totalSavedDatasets} مجموعة بيانات` : undefined,
    },
    {
      id: 'prepaid', label: 'المصروفات المقدمة', description: 'إطفاء المصروفات المقدمة',
      icon: Clock, color: '#d97706', permission: 'prepaid.view',
      stat: stats ? `${stats.totalPrepaids} مصروف مقدم` : undefined,
    },
    {
      id: 'budgets', label: 'الميزانيات', description: 'إعداد ومتابعة الميزانيات',
      icon: Wallet, color: '#dc2626', permission: 'budgets.view',
      stat: stats ? `${stats.totalBudgets} ميزانية` : undefined,
    },
    {
      id: 'forecasts', label: 'التنبؤات', description: 'نماذج التنبؤ الإحصائي',
      icon: LineChart, color: '#2563eb', permission: 'forecasts.view',
      stat: stats ? `${stats.totalForecasts} نموذج` : undefined,
    },
    {
      id: 'analysis', label: 'التحليل الذكي', description: 'النسب المالية والتحليل الإحصائي',
      icon: Brain, color: '#9333ea', permission: 'pnl.analyze',
    },
    {
      id: 'users', label: 'المستخدمون', description: 'إدارة الحسابات',
      icon: Users, color: '#0891b2', permission: 'users.view',
      stat: stats ? `${stats.totalUsers} (${stats.activeUsers} نشط)` : undefined,
    },
  ];

  const visibleModules = modules.filter((m) => !m.permission || hasPermission(m.permission));

  // Build recent activity from audit log (admin only)
  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
  React.useEffect(() => {
    if (hasPermission('system.audit')) {
      fetch('/api/admin/audit?limit=5')
        .then((r) => r.json())
        .then((data) => {
          if (data.logs) setRecentActivity(data.logs);
        })
        .catch(() => {});
    }
  }, [hasPermission]);

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-green-deep)] to-[var(--brand-green)] p-6 sm:p-8 text-white shadow-xl shadow-[var(--brand-green-deep)]/20">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,white,transparent_50%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium opacity-80 mb-1">
              {greeting}، {user?.name || user?.email}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              مرحباً بك في نظام التحليل المالي
            </h2>
            <p className="text-sm opacity-90 max-w-2xl">
              منصة موحدة لإدارة الشركات والمصروفات وقيود الأرباح والخسائر، مع تحليل ذكي مبني على أسس رياضية ومحاسبية.
              ابدأ من اختيار أحد الأقسام أدناه أو استعرض آخر الأنشطة.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-white/15 text-white border-0 backdrop-blur">
              <Shield className="h-3 w-3 ml-1" />
              {user?.roleNameAr || user?.role}
            </Badge>
            <div className="text-xs opacity-80">
              {new Date().toLocaleDateString('ar-SA', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-4 w-20 bg-muted rounded mb-2" />
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="الشركات"
            value={stats.totalCompanies || 0}
            subValue={`${stats.activeCompanies || 0} نشطة`}
            icon={Building2}
            color="#0d9488"
            trend={0}
          />
          <StatCard
            label="المصروفات"
            value={stats.totalExpenses || 0}
            subValue={`${stats.totalCategories || 0} تصنيف`}
            icon={Receipt}
            color="#7c3aed"
            trend={0}
          />
          <StatCard
            label="بيانات P&L"
            value={stats.totalSavedDatasets || 0}
            subValue={`${stats.totalPrepaids || 0} مقدم`}
            icon={Table2}
            color="#059669"
            trend={0}
          />
          {hasPermission('users.view') ? (
            <StatCard
              label="المستخدمون"
              value={stats.totalUsers || 0}
              subValue={`${stats.activeUsers || 0} نشط`}
              icon={Users}
              color="#dc2626"
              trend={0}
            />
          ) : (
            <StatCard
              label="التنبؤات"
              value={stats.totalForecasts || 0}
              subValue={`${stats.totalBudgets || 0} ميزانية`}
              icon={LineChart}
              color="#2563eb"
              trend={0}
            />
          )}
        </div>
      ) : null}

      {/* Module grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">الأقسام</h3>
          <span className="text-xs text-muted-foreground">{visibleModules.length} أقسام متاحة</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleModules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onNavigate(m.id)}
                className="group text-right p-4 rounded-2xl bg-card border border-border/60 hover:border-foreground/20 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl group-hover:scale-110 transition-transform"
                    style={{
                      background: `linear-gradient(135deg, ${m.color}25, ${m.color}10)`,
                      color: m.color,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:rotate-12 transition" />
                </div>
                <div className="text-sm font-bold mb-1">{m.label}</div>
                <div className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{m.description}</div>
                {m.stat && (
                  <div className="text-[10px] text-muted-foreground/80 bg-muted/40 inline-block px-2 py-0.5 rounded-md">
                    {m.stat}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent activity + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">آخر الأنشطة</CardTitle>
              </div>
              {hasPermission('system.audit') && (
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => onNavigate('audit')}
                >
                  عرض الكل
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                لا يوجد نشاط مسجل بعد. ابدأ باستخدام النظام لرؤية السجل هنا.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{log.action}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {log.user?.email || 'النظام'} · {new Date(log.createdAt).toLocaleString('ar-SA')}
                      </div>
                    </div>
                    {log.ipAddress && (
                      <Badge variant="outline" className="text-[9px] font-mono">{log.ipAddress}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasPermission('pnl.upload') && (
              <button
                onClick={() => onNavigate('pnl')}
                className="w-full text-right p-3 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 transition flex items-center gap-3"
              >
                <Database className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="text-xs font-semibold">رفع بيانات P&L</div>
                  <div className="text-[10px] text-muted-foreground">من ملف Excel إلى قاعدة البيانات</div>
                </div>
              </button>
            )}
            {hasPermission('prepaid.create') && (
              <button
                onClick={() => onNavigate('prepaid')}
                className="w-full text-right p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition flex items-center gap-3"
              >
                <Clock className="h-4 w-4 text-amber-600" />
                <div className="flex-1">
                  <div className="text-xs font-semibold">إضافة مصروف مقدم</div>
                  <div className="text-[10px] text-muted-foreground">إطفاء تلقائي من-إلى</div>
                </div>
              </button>
            )}
            {hasPermission('expenses.create') && (
              <button
                onClick={() => onNavigate('expenses')}
                className="w-full text-right p-3 rounded-xl bg-violet-500/5 border border-violet-500/15 hover:bg-violet-500/10 transition flex items-center gap-3"
              >
                <Receipt className="h-4 w-4 text-violet-600" />
                <div className="flex-1">
                  <div className="text-xs font-semibold">تسجيل مصروف</div>
                  <div className="text-[10px] text-muted-foreground">مصروف جديد بتصنيفه</div>
                </div>
              </button>
            )}
            {hasPermission('pnl.analyze') && (
              <button
                onClick={() => onNavigate('analysis')}
                className="w-full text-right p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 transition flex items-center gap-3"
              >
                <Brain className="h-4 w-4 text-purple-600" />
                <div className="flex-1">
                  <div className="text-xs font-semibold">تحليل ذكي</div>
                  <div className="text-[10px] text-muted-foreground">نسب مالية وتنبؤ إحصائي</div>
                </div>
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  icon: any;
  color: string;
  trend?: number;
}

function StatCard({ label, value, subValue, icon: Icon, color, trend }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {subValue && (
              <div className="text-[11px] text-muted-foreground mt-1">{subValue}</div>
            )}
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color}25, ${color}10)`,
              color,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-rose-600" />
            )}
            <span className={trend > 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {Math.abs(trend)}%
            </span>
            <span className="text-muted-foreground">عن الفترة السابقة</span>
          </div>
        )}
      </CardContent>
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(to left, ${color}, transparent)` }}
      />
    </Card>
  );
}
