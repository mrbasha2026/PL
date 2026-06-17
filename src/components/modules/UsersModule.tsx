'use client';

import React from 'react';
import {
  Users as UsersIcon, Plus, MoreHorizontal, Edit, Trash2, Save,
  Shield, Mail, Clock, Power, UserCheck, UserX, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_ROLES } from '@/lib/permissions';

import { PageActions } from '@/components/system/PageActions';
interface UserRow {
  id: string;
  email: string;
  name?: string | null;
  nameAr?: string | null;
  role: string;
  roleNameAr: string;
  roleColor: string;
  isActive: boolean;
  status: string;
  createdAt: string;
}

export function UsersModule() {
  const { toast } = useToast();
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل المستخدمين', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase().includes(q) ?? false) ||
      (u.nameAr?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="text-sm text-muted-foreground">
          إدارة المستخدمين
        </div>
        <PageActions onRefresh={load} />
      </div>
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي المستخدمين" value={users.length} icon={UsersIcon} color="#0d9488" />
        <SummaryCard label="نشط" value={users.filter(u => u.isActive).length} icon={UserCheck} color="#059669" />
        <SummaryCard label="موقوف" value={users.filter(u => !u.isActive).length} icon={UserX} color="#dc2626" />
        <SummaryCard label="الأدوار" value={DEFAULT_ROLES.length} icon={Shield} color="#7c3aed" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 min-w-[240px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالبريد أو الاسم..."
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/70"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient">
          <Plus className="h-4 w-4 ml-1" />
          مستخدم جديد
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UsersIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا يوجد مستخدمون</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className="text-xs font-bold"
                            style={{ background: `linear-gradient(135deg, ${u.roleColor}, ${u.roleColor}99)`, color: 'white' }}
                          >
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{u.name || u.nameAr || u.email}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs" style={{
                        background: `${u.roleColor}15`,
                        color: u.roleColor,
                        borderColor: `${u.roleColor}30`,
                      }}>
                        <Shield className="h-3 w-3 ml-1" />
                        {u.roleNameAr}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-xs">
                          <UserCheck className="h-3 w-3 ml-1" />نشط
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <UserX className="h-3 w-3 ml-1" />موقوف
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingUser(u)}>
                            <Edit className="h-3.5 w-3.5 ml-2" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                await fetch(`/api/users/${u.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: u.isActive ? 'suspended' : 'active' }),
                                });
                                toast({ title: 'تم التحديث' });
                                load();
                              } catch (e: any) {
                                toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
                              }
                            }}
                          >
                            <Power className="h-3.5 w-3.5 ml-2" />
                            {u.isActive ? 'إيقاف' : 'تفعيل'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={async () => {
                              if (!confirm(`حذف المستخدم ${u.email}؟`)) return;
                              try {
                                await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
                                toast({ title: 'تم الحذف' });
                                load();
                              } catch (e: any) {
                                toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 ml-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={load}
      />
      <UserFormDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        editing={editingUser}
        onSaved={load}
      />
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

function UserFormDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: UserRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    email: '', name: '', nameAr: '', password: '', role: 'viewer', isActive: true,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({
        email: editing.email,
        name: editing.name || '',
        nameAr: editing.nameAr || '',
        password: '',
        role: editing.role,
        isActive: editing.isActive,
      });
    } else {
      setForm({ email: '', name: '', nameAr: '', password: '', role: 'viewer', isActive: true });
    }
  }, [editing, open]);

  const submit = async () => {
    if (!form.email.trim()) {
      toast({ title: 'تحقق', description: 'البريد مطلوب', variant: 'destructive' });
      return;
    }
    if (!editing && !form.password) {
      toast({ title: 'تحقق', description: 'كلمة المرور مطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        email: form.email.trim().toLowerCase(),
        name: form.name.trim() || null,
        nameAr: form.nameAr.trim() || null,
        role: form.role,
        status: form.isActive ? 'active' : 'suspended',
      };
      if (form.password) payload.password = form.password;
      const url = editing ? `/api/users/${editing.id}` : '/api/users';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الحفظ');
      }
      toast({ title: editing ? 'تم التحديث' : 'تمت الإضافة' });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            {editing ? 'تعديل مستخدم' : 'مستخدم جديد'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <div className="space-y-2">
            <Label className="text-xs">البريد الإلكتروني *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">الاسم (إنجليزي)</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الاسم بالعربية</Label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="محمد علي"
                dir="rtl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">كلمة المرور {editing && '(اتركها فارغة للإبقاء)'}</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الدور</Label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {DEFAULT_ROLES.map((r) => (
                <option key={r.name} value={r.name}>{r.nameAr} — {r.description}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="userActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="userActive" className="text-xs cursor-pointer">الحساب نشط</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="bg-brand-gradient">
            {saving ? 'جاري الحفظ...' : (<><Save className="h-4 w-4 ml-1" />حفظ</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
