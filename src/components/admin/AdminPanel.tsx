'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Shield, ScrollText, Settings, Plus, Pencil, Trash2,
  Search, RefreshCw, UserPlus, Crown, AlertTriangle, Building2,
  Activity, CheckCircle2, XCircle, Clock, Database, Eye, Filter,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import {
  PERMISSIONS, PERMISSION_GROUPS, type PermissionGroup,
} from '@/lib/permissions';

// ─── Types ────────────────────────────────────────────────────────────────
interface UserRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string; nameAr: string; color: string; isSystem: boolean };
}

interface RoleRow {
  id: string;
  name: string;
  nameAr: string;
  description: string | null;
  color: string;
  isSystem: boolean;
  permissions: string[];
  usersCount: number;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

interface AdminStats {
  totalUsers?: number;
  activeUsers?: number;
  suspendedUsers?: number;
  totalRoles?: number;
  totalSavedDatasets: number;
  totalAuditLogs: number;
  recentLogins?: number;
  usersByRole?: { roleNameAr: string; color: string; count: number }[];
  serverTime: string;
}

interface SystemSettings {
  'site.name'?: string;
  'site.description'?: string;
  'auth.allowSelfRegistration'?: string;
  'auth.defaultRoleId'?: string;
  'auth.sessionTimeoutMinutes'?: string;
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────
export function AdminPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { hasPermission } = useAuth();

  const visibleTabs: { value: string; label: string; icon: any; perm: string }[] = [];
  if (hasPermission('users.view') || hasPermission('roles.view')) {
    visibleTabs.push({ value: 'users', label: 'المستخدمون', icon: Users, perm: 'users.view' });
  }
  if (hasPermission('roles.view')) {
    visibleTabs.push({ value: 'roles', label: 'الأدوار والصلاحيات', icon: Shield, perm: 'roles.view' });
  }
  if (hasPermission('system.audit')) {
    visibleTabs.push({ value: 'audit', label: 'سجل التدقيق', icon: ScrollText, perm: 'system.audit' });
  }
  if (hasPermission('system.settings')) {
    visibleTabs.push({ value: 'settings', label: 'الإعدادات', icon: Settings, perm: 'system.settings' });
  }

  // Always show dashboard
  visibleTabs.unshift({ value: 'dashboard', label: 'نظرة عامة', icon: Activity, perm: '' });

  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="!max-w-[95vw] lg:!max-w-[1200px] w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl"
        dir="rtl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">لوحة الإدارة</DialogTitle>
        <DialogDescription className="sr-only">إدارة المستخدمين والأدوار والإعدادات</DialogDescription>

        {/* Header */}
        <div className="relative overflow-hidden px-6 py-4 border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary via-primary/90 to-chart-4" />
          <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">لوحة الإدارة</h2>
                <p className="text-white/70 text-[11px]">إدارة المستخدمين، الأدوار، الصلاحيات، وإعدادات النظام</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 rounded-xl"
              onClick={onClose}
            >
              إغلاق
            </Button>
          </div>
        </div>

        {/* Body: tabs + content */}
        <div className="flex flex-col h-[calc(90vh-80px)]">
          <div className="border-b border-border/40 px-4 pt-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/30 border border-border/40 rounded-2xl p-1 h-auto overflow-x-auto max-w-full">
                {visibleTabs.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="gap-1.5 rounded-xl text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="p-5">
                  <TabsContent value="dashboard" className="mt-0">
                    <DashboardTab />
                  </TabsContent>
                  {hasPermission('users.view') && (
                    <TabsContent value="users" className="mt-0">
                      <UsersTab />
                    </TabsContent>
                  )}
                  {hasPermission('roles.view') && (
                    <TabsContent value="roles" className="mt-0">
                      <RolesTab />
                    </TabsContent>
                  )}
                  {hasPermission('system.audit') && (
                    <TabsContent value="audit" className="mt-0">
                      <AuditTab />
                    </TabsContent>
                  )}
                  {hasPermission('system.settings') && (
                    <TabsContent value="settings" className="mt-0">
                      <SettingsTab />
                    </TabsContent>
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────
function DashboardTab() {
  const { hasPermission } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">جاري التحميل...</div>;
  if (!stats) return <div className="py-12 text-center text-sm text-destructive">فشل التحميل</div>;

  const cards = [
    ...(stats.totalUsers !== undefined ? [{ icon: Users, label: 'إجمالي المستخدمين', value: stats.totalUsers, color: 'text-primary bg-primary/10' }] : []),
    ...(stats.activeUsers !== undefined ? [{ icon: CheckCircle2, label: 'نشط', value: stats.activeUsers, color: 'text-emerald-600 bg-emerald-500/10' }] : []),
    ...(stats.suspendedUsers !== undefined ? [{ icon: XCircle, label: 'موقوف', value: stats.suspendedUsers, color: 'text-rose-600 bg-rose-500/10' }] : []),
    ...(stats.recentLogins !== undefined ? [{ icon: Clock, label: 'دخول آخر 7 أيام', value: stats.recentLogins, color: 'text-sky-600 bg-sky-500/10' }] : []),
    ...(stats.totalRoles !== undefined ? [{ icon: Shield, label: 'الأدوار', value: stats.totalRoles, color: 'text-violet-600 bg-violet-500/10' }] : []),
    { icon: Database, label: 'البيانات المحفوظة', value: stats.totalSavedDatasets, color: 'text-amber-600 bg-amber-500/10' },
    { icon: ScrollText, label: 'سجل التدقيق', value: stats.totalAuditLogs, color: 'text-cyan-600 bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold mb-1">نظرة عامة على النظام</h3>
        <p className="text-xs text-muted-foreground">إحصائيات مباشرة عن استخدام النظام</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border/50 bg-card/40 p-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.color} mb-2.5`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Users by role */}
      {stats.usersByRole && stats.usersByRole.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            توزيع المستخدمين حسب الدور
          </h4>
          <div className="space-y-2.5">
            {stats.usersByRole.map((r) => {
              const total = stats.activeUsers || 1;
              const pct = (r.count / total) * 100;
              return (
                <div key={r.roleNameAr}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="font-medium">{r.roleNameAr}</span>
                    </span>
                    <span className="font-bold tabular-nums">{r.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────
function UsersTab() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
      ]);
      if (u.users) setUsers(u.users);
      if (r.roles) setRoles(r.roles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    if (filterRole !== 'all' && u.role.id !== filterRole) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`حذف "${u.email}"؟ لا يمكن التراجع.`)) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'تم الحذف', description: `تم حذف ${u.email}` });
      load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  const handleToggleStatus = async (u: UserRow) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: newStatus === 'active' ? 'تم التفعيل' : 'تم الإيقاف', description: u.email });
      load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold">إدارة المستخدمين</h3>
          <p className="text-xs text-muted-foreground">{users.length} مستخدم مسجّل</p>
        </div>
        {hasPermission('users.create') && (
          <Button
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            مستخدم جديد
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="بحث بالبريد أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs rounded-xl pr-9"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="all">جميع الأدوار</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.nameAr}</option>)}
        </select>
        <Button variant="ghost" size="sm" className="h-9 text-xs gap-1 rounded-xl" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">المستخدم</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">الدور</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">الحالة</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">آخر دخول</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">تاريخ الإنشاء</th>
                <th className="text-center font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/15 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: u.role.color }}
                      >
                        {(u.name || u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{u.name || u.email.split('@')[0]}</p>
                        <p className="text-[10px] text-muted-foreground truncate" dir="ltr">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="text-[10px] rounded-md gap-1"
                      style={{ borderColor: `${u.role.color}40`, color: u.role.color, background: `${u.role.color}08` }}
                    >
                      {u.role.isSystem && <Crown className="h-2.5 w-2.5" />}
                      {u.role.nameAr}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => hasPermission('users.edit') && handleToggleStatus(u)}
                      disabled={!hasPermission('users.edit')}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-0.5 ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      } ${hasPermission('users.edit') ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      title={hasPermission('users.edit') ? 'اضغط للتبديل' : ''}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.status === 'active' ? 'نشط' : 'موقوف'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ar-SA') : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-0.5">
                      {hasPermission('users.edit') && (
                        <button
                          onClick={() => { setEditing(u); setDialogOpen(true); }}
                          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          title="تعديل"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {hasPermission('users.delete') && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="حذف"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">لا يوجد مستخدمون مطابقون</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        roles={roles}
        onSaved={load}
      />
    </div>
  );
}

// ─── User Edit Dialog ─────────────────────────────────────────────────────
function UserEditDialog({
  open, onClose, editing, roles, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: UserRow | null;
  roles: RoleRow[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (open) {
      if (editing) {
        setEmail(editing.email);
        setName(editing.name || '');
        setRoleId(editing.role.id);
        setStatus(editing.status);
        setPassword('');
      } else {
        setEmail(''); setName(''); setRoleId(roles[0]?.id || ''); setStatus('active'); setPassword('');
      }
    }
  }, [open, editing, roles]);

  const handleSubmit = async () => {
    if (!email.trim()) { toast({ variant: 'destructive', title: 'البريد مطلوب' }); return; }
    if (!roleId) { toast({ variant: 'destructive', title: 'الدور مطلوب' }); return; }
    if (!editing && password.length < 6) {
      toast({ variant: 'destructive', title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      return;
    }
    try {
      const url = editing ? `/api/users/${editing.id}` : '/api/users';
      const method = editing ? 'PATCH' : 'POST';
      const body: any = { email: email.toLowerCase().trim(), name: name.trim() || null, roleId, status };
      if (password) body.password = password;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: editing ? 'تم التحديث' : 'تم الإنشاء', description: email });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{editing ? 'تعديل مستخدم' : 'مستخدم جديد'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج بيانات المستخدم</DialogDescription>

        <div className="relative overflow-hidden px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-bl from-primary to-chart-4" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{editing ? 'تعديل المستخدم' : 'مستخدم جديد'}</h2>
              <p className="text-white/70 text-[11px]">{editing ? 'تحديث بيانات المستخدم' : 'إنشاء حساب مستخدم جديد'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">البريد الإلكتروني *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" dir="ltr" disabled={!!editing} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">الاسم</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" placeholder="الاسم الكامل" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              كلمة المرور {editing && <span className="text-muted-foreground font-normal">(اتركها فارغة للإبقاء عليها)</span>}
            </Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl" dir="ltr" placeholder={editing ? '••••••••' : '6 أحرف على الأقل'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الدور *</Label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nameAr}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الحالة</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="active">نشط</option>
                <option value="suspended">موقوف</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" size="sm" className="text-xs rounded-xl" onClick={onClose}>إلغاء</Button>
          <Button size="sm" className="text-xs rounded-xl" onClick={handleSubmit}>
            {editing ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────
function RolesTab() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (res.ok && data.roles) setRoles(data.roles);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (r: RoleRow) => {
    if (!confirm(`حذف دور "${r.nameAr}"؟`)) return;
    try {
      const res = await fetch(`/api/roles/${r.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'تم الحذف', description: r.nameAr });
      load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">الأدوار والصلاحيات</h3>
          <p className="text-xs text-muted-foreground">{roles.length} دور — {roles.filter(r => r.isSystem).length} نظامي</p>
        </div>
        {hasPermission('roles.create') && (
          <Button size="sm" className="gap-1.5 rounded-xl text-xs" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> دور جديد
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
            <div className="h-1" style={{ backgroundColor: r.color }} />
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ backgroundColor: r.color }}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold">{r.nameAr}</h4>
                      {r.isSystem && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 rounded h-4 text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/5">
                          نظامي
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{r.name}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] rounded-md">{r.usersCount} مستخدم</Badge>
              </div>
              {r.description && <p className="text-xs text-muted-foreground mb-3">{r.description}</p>}
              <div className="flex flex-wrap gap-1 mb-3 min-h-[20px]">
                {r.permissions.slice(0, 4).map((p) => {
                  const def = PERMISSIONS.find((x) => x.key === p);
                  return (
                    <Badge key={p} variant="outline" className="text-[9px] px-1.5 py-0 rounded font-mono">
                      {def?.labelAr || p}
                    </Badge>
                  );
                })}
                {r.permissions.length > 4 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded">
                    +{r.permissions.length - 4}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/40">
                {hasPermission('roles.edit') && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs gap-1 rounded-lg"
                    onClick={() => { setEditing(r); setDialogOpen(true); }}
                  >
                    <Pencil className="h-3 w-3" /> تعديل
                  </Button>
                )}
                {hasPermission('roles.delete') && !r.isSystem && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs gap-1 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(r)}
                  >
                    <Trash2 className="h-3 w-3" /> حذف
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <RoleEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

// ─── Role Edit Dialog (with permission matrix) ────────────────────────────
function RoleEditDialog({
  open, onClose, editing, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: RoleRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [perms, setPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name.replace(/^custom_/, ''));
        setNameAr(editing.nameAr);
        setDescription(editing.description || '');
        setColor(editing.color);
        setPerms(new Set(editing.permissions));
      } else {
        setName(''); setNameAr(''); setDescription(''); setColor('#6366f1'); setPerms(new Set());
      }
    }
  }, [open, editing]);

  const togglePerm = (key: string) => {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: PermissionGroup) => {
    const groupKeys = PERMISSIONS.filter((p) => p.group === group).map((p) => p.key);
    const allSelected = groupKeys.every((k) => perms.has(k));
    setPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) groupKeys.forEach((k) => next.delete(k));
      else groupKeys.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!nameAr.trim()) { toast({ variant: 'destructive', title: 'الاسم العربي مطلوب' }); return; }
    if (!editing && !name.trim()) { toast({ variant: 'destructive', title: 'الاسم الإنجليزي مطلوب' }); return; }
    try {
      const url = editing ? `/api/roles/${editing.id}` : '/api/roles';
      const method = editing ? 'PATCH' : 'POST';
      const body: any = {
        name: name.trim(),
        nameAr: nameAr.trim(),
        description: description.trim() || null,
        color,
        permissions: Array.from(perms),
      };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: editing ? 'تم التحديث' : 'تم الإنشاء', description: nameAr });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    }
  };

  const colorOptions = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#64748b'];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-2xl p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{editing ? 'تعديل دور' : 'دور جديد'}</DialogTitle>
        <DialogDescription className="sr-only">نموذج بيانات الدور والصلاحيات</DialogDescription>

        <div className="relative overflow-hidden px-6 py-5">
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom left, ${color}, ${color}dd)` }} />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{editing ? 'تعديل الدور' : 'دور جديد'}</h2>
              <p className="text-white/70 text-[11px]">حدد الصلاحيات التي يملكها هذا الدور</p>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الاسم العربي *</Label>
                <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="rounded-xl" disabled={!!editing?.isSystem} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">الاسم الإنجليزي {editing?.isSystem && <span className="text-muted-foreground">(غير قابل للتعديل)</span>}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" dir="ltr" disabled={!!editing?.isSystem} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">الوصف</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl resize-none" rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">اللون</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">الصلاحيات ({perms.size} مفعّلة)</Label>
                <Button
                  variant="ghost" size="sm" type="button"
                  className="h-6 text-[10px] gap-1 rounded-md"
                  onClick={() => setPerms(new Set(PERMISSIONS.map((p) => p.key)))}
                >
                  تحديد الكل
                </Button>
              </div>
              <div className="space-y-2">
                {PERMISSION_GROUPS.map((group) => {
                  const groupPerms = PERMISSIONS.filter((p) => p.group === group.value);
                  const allSelected = groupPerms.every((p) => perms.has(p.key));
                  const someSelected = groupPerms.some((p) => perms.has(p.key));
                  return (
                    <div key={group.value} className="rounded-xl border border-border/40 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.value)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-xs font-bold flex items-center gap-2">
                          <Shield className="h-3 w-3" style={{ color: allSelected ? '#10b981' : someSelected ? '#f59e0b' : '#94a3b8' }} />
                          {group.labelAr}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({groupPerms.filter((p) => perms.has(p.key)).length}/{groupPerms.length})
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {allSelected ? '✓ الكل' : someSelected ? 'بعض' : 'لا شيء'}
                        </span>
                      </button>
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {groupPerms.map((p) => (
                          <label
                            key={p.key}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/30 cursor-pointer"
                          >
                            <Switch
                              checked={perms.has(p.key)}
                              onCheckedChange={() => togglePerm(p.key)}
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate">{p.labelAr}</p>
                              <p className="text-[9px] text-muted-foreground font-mono truncate" dir="ltr">{p.key}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" size="sm" className="text-xs rounded-xl" onClick={onClose}>إلغاء</Button>
          <Button size="sm" className="text-xs rounded-xl" onClick={handleSubmit}>
            {editing ? 'تحديث الدور' : 'إنشاء الدور'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const actionLabels: Record<string, string> = {
    'user.create': 'إنشاء مستخدم',
    'user.update': 'تعديل مستخدم',
    'user.delete': 'حذف مستخدم',
    'user.change_password': 'تغيير كلمة المرور',
    'role.create': 'إنشاء دور',
    'role.update': 'تعديل دور',
    'role.delete': 'حذف دور',
    'system.settings_update': 'تحديث الإعدادات',
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold">سجل التدقيق</h3>
        <p className="text-xs text-muted-foreground">{total} إجراء مسجّل</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">جميع الإجراءات</option>
          {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button variant="ghost" size="sm" className="h-9 text-xs gap-1 rounded-xl" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">الإجراء</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">المستخدم</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">الهدف</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">IP</th>
                <th className="text-right font-bold uppercase tracking-wider text-muted-foreground/70 px-4 py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/15">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] rounded-md font-mono">
                      {actionLabels[l.action] || l.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {l.user ? (
                      <div>
                        <p className="font-medium">{l.user.name || l.user.email.split('@')[0]}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">{l.user.email}</p>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.targetType ? `${l.targetType}${l.targetId ? ` (${l.targetId.slice(0, 8)})` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-[10px]" dir="ltr">{l.ipAddress || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(l.createdAt).toLocaleString('ar-SA')}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">لا توجد سجلات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="text-xs rounded-xl">
            السابق
          </Button>
          <span className="text-xs text-muted-foreground">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="text-xs rounded-xl">
            التالي
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────
function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({});
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings || {});
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات النظام' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">جاري التحميل...</div>;

  const update = (key: keyof SystemSettings, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h3 className="text-base font-bold">إعدادات النظام</h3>
        <p className="text-xs text-muted-foreground">إعدادات عامة للموقع ونظام المصادقة</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          معلومات الموقع
        </h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">اسم الموقع</Label>
            <Input value={settings['site.name'] || ''} onChange={(e) => update('site.name', e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">وصف الموقع</Label>
            <Input value={settings['site.description'] || ''} onChange={(e) => update('site.description', e.target.value)} className="rounded-xl" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          إعدادات المصادقة
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2.5">
            <div>
              <p className="text-xs font-semibold">السماح بالتسجيل الذاتي</p>
              <p className="text-[10px] text-muted-foreground">السماح لأي شخص بإنشاء حساب</p>
            </div>
            <Switch
              checked={settings['auth.allowSelfRegistration'] === 'true'}
              onCheckedChange={(v) => update('auth.allowSelfRegistration', v ? 'true' : 'false')}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">الدور الافتراضي للمسجلين ذاتياً</Label>
            <select
              value={settings['auth.defaultRoleId'] || ''}
              onChange={(e) => update('auth.defaultRoleId', e.target.value)}
              className="w-full h-9 text-xs rounded-xl border border-border/50 bg-background px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— اختر —</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nameAr}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold mb-1">تنبيه أمني</p>
          <p>تأكد من تغيير كلمة مرور حساب المدير الافتراضي بعد أول تسجيل دخول. الإعداد الافتراضي: admin@dealztree.com / admin123</p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" className="gap-1.5 rounded-xl text-xs" disabled={saving} onClick={handleSave}>
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>
    </div>
  );
}
