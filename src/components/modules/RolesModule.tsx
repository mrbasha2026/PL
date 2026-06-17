'use client';

import React from 'react';
import {
  Shield, Plus, Edit, Trash2, Save, X, Lock, CheckCircle2,
  Users, Crown, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageActions } from '@/components/system/PageActions';
import { useToast } from '@/hooks/use-toast';

interface Role {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  color: string;
  isSystem: boolean;
  permissions: string[];
  usersCount: number;
}

interface PermDef {
  key: string;
  labelAr: string;
  labelEn: string;
  group: string;
}

interface PermGroup {
  value: string;
  labelAr: string;
  labelEn: string;
}

const ROLE_PALETTE = ['#dc2626', '#7c3aed', '#059669', '#d97706', '#2563eb', '#0891b2', '#db2777', '#65a30d', '#ea580c'];

export function RolesModule() {
  const { toast } = useToast();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [permCatalog, setPermCatalog] = React.useState<PermDef[]>([]);
  const [permGroups, setPermGroups] = React.useState<PermGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [canEdit, setCanEdit] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<Role | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteRole, setDeleteRole] = React.useState<Role | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (data.roles) setRoles(data.roles);
      if (data.permissionCatalog) setPermCatalog(data.permissionCatalog);
      if (data.permissionGroups) setPermGroups(data.permissionGroups);
      setCanEdit(!!data.canEdit);
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold">إدارة الأدوار والصلاحيات</h2>
          <p className="text-sm text-muted-foreground mt-1">
            إضافة وتعديل الأدوار، وتخصيص الصلاحيات لكل دور
          </p>
        </div>
        <PageActions onRefresh={load} hideExcel hidePrint>
          {canEdit && (
            <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient">
              <Plus className="h-4 w-4 ml-1" />
              دور جديد
            </Button>
          )}
        </PageActions>
      </div>

      {/* Info banner */}
      <Card className="bg-blue-500/5 border-blue-500/20 no-print">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">الأدوار الأساسية</strong> (مدير عام، مدير، محاسب، محلل مالي، مشاهد) يمكن تعديل صلاحياتها ولا يمكن حذفها.
            <strong className="text-foreground"> الأدوار المخصصة</strong> يمكن إضافتها وتعديلها وحذفها بالكامل. جميع التغييرات تُحفظ في قاعدة البيانات وتُطبَّق فوراً عند تسجيل دخول المستخدمين.
          </div>
        </CardContent>
      </Card>

      {/* Roles grid */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="overflow-hidden">
              <div
                className="h-1.5"
                style={{ background: `linear-gradient(to left, ${role.color}, ${role.color}55)` }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {role.isSystem ? (
                      <Shield className="h-5 w-5 flex-shrink-0" style={{ color: role.color }} />
                    ) : (
                      <Users className="h-5 w-5 flex-shrink-0" style={{ color: role.color }} />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{role.nameAr}</CardTitle>
                      <CardDescription className="font-mono text-xs">{role.name}</CardDescription>
                    </div>
                  </div>
                  {role.isSystem ? (
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      <Lock className="h-2.5 w-2.5 ml-1" />
                      أساسي
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0">مخصص</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">المستخدمون:</span>
                  <Badge variant="secondary" className="font-mono">{role.usersCount}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الصلاحيات:</span>
                  <Badge variant="secondary" className="font-mono">{role.permissions.length}</Badge>
                </div>
                {canEdit && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setEditingRole(role)}
                    >
                      <Edit className="h-3 w-3 ml-1" />
                      تعديل الصلاحيات
                    </Button>
                    {!role.isSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteRole(role)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingRole && (
        <RoleEditDialog
          role={editingRole}
          permCatalog={permCatalog}
          permGroups={permGroups}
          onOpenChange={(open) => !open && setEditingRole(null)}
          onSaved={() => { load(); setEditingRole(null); }}
        />
      )}

      {/* Create dialog */}
      {createOpen && (
        <RoleEditDialog
          permCatalog={permCatalog}
          permGroups={permGroups}
          onOpenChange={(open) => !open && setCreateOpen(false)}
          onSaved={() => { load(); setCreateOpen(false); }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRole} onOpenChange={(open) => !open && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الدور</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف دور "{deleteRole?.nameAr}"؟
              {deleteRole && deleteRole.usersCount > 0 && (
                <span className="block mt-2 text-destructive">
                  تنبيه: يوجد {deleteRole.usersCount} مستخدم بهذا الدور. سيحتاجون لإعادة تعيين دورهم.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteRole) return;
                try {
                  const res = await fetch(`/api/roles?id=${deleteRole.id}&name=${deleteRole.name}`, { method: 'DELETE' });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'فشل الحذف');
                  }
                  toast({ title: 'تم', description: `تم حذف دور ${deleteRole.nameAr}` });
                  load();
                } catch (e: any) {
                  toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
                }
              }}
            >
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Role Edit Dialog ──────────────────────────────────────────────────────
function RoleEditDialog({
  role,
  permCatalog,
  permGroups,
  onOpenChange,
  onSaved,
}: {
  role?: Role | null;
  permCatalog: PermDef[];
  permGroups: PermGroup[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = React.useState(role?.name || '');
  const [nameAr, setNameAr] = React.useState(role?.nameAr || '');
  const [description, setDescription] = React.useState(role?.description || '');
  const [color, setColor] = React.useState(role?.color || ROLE_PALETTE[Math.floor(Math.random() * ROLE_PALETTE.length)]);
  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set(role?.permissions || []));
  const [saving, setSaving] = React.useState(false);
  const isSystem = role?.isSystem ?? false;
  const isEdit = !!role;

  function togglePerm(key: string) {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleGroup(group: string) {
    const groupPerms = permCatalog.filter((p) => p.group === group).map((p) => p.key);
    const allSelected = groupPerms.every((p) => selectedPerms.has(p));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupPerms.forEach((p) => next.delete(p));
      } else {
        groupPerms.forEach((p) => next.add(p));
      }
      return next;
    });
  }

  async function submit() {
    if (!nameAr.trim()) {
      toast({ title: 'تحقق', description: 'الاسم بالعربي مطلوب', variant: 'destructive' });
      return;
    }
    if (selectedPerms.size === 0) {
      toast({ title: 'تحقق', description: 'يجب اختيار صلاحية واحدة على الأقل', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const body = {
        action: isEdit ? 'update' : 'create_custom',
        id: role?.id,
        name: isSystem ? role?.name : name.toLowerCase().replace(/\s+/g, '_'),
        nameAr,
        description,
        color,
        permissions: Array.from(selectedPerms),
      };
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الحفظ');
      }
      toast({
        title: isEdit ? 'تم التحديث' : 'تم الإنشاء',
        description: isEdit ? 'تم تحديث دور ' + nameAr : 'تم إنشاء دور ' + nameAr,
      });
      onSaved();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEdit ? `تعديل دور: ${role?.nameAr}` : 'إنشاء دور مخصص جديد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Role info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">الاسم بالعربي *</Label>
              <Input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: مدقق حسابات"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">
                {isSystem ? 'الاسم (إنجليزي — غير قابل للتعديل)' : 'الاسم (إنجليزي)'}
              </Label>
              <Input
                value={isSystem ? role?.name : name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: auditor"
                disabled={isSystem}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">الوصف</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="وصف مختصر لمسؤوليات هذا الدور..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">اللون المميز للدور</Label>
            <div className="flex gap-2 flex-wrap items-center">
              {ROLE_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 rounded cursor-pointer border border-input"
              />
            </div>
          </div>

          {/* Permissions matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">الصلاحيات ({selectedPerms.size} مفعّلة)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPerms(new Set(permCatalog.map((p) => p.key)))}
                className="text-xs h-7"
              >
                تحديد الكل
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPerms(new Set())}
                className="text-xs h-7"
              >
                مسح الكل
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {permGroups.map((group) => {
                const groupPerms = permCatalog.filter((p) => p.group === group.value);
                const selectedCount = groupPerms.filter((p) => selectedPerms.has(p.key)).length;
                const allSelected = groupPerms.length > 0 && selectedCount === groupPerms.length;
                return (
                  <Card key={group.value} className="border-border/60">
                    <CardHeader className="p-3 pb-2">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.value)}
                        className="flex items-center justify-between w-full text-right"
                      >
                        <span className="text-xs font-semibold">{group.labelAr}</span>
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                          allSelected ? 'bg-primary border-primary' : 'border-input'
                        }`}>
                          {allSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </button>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-1.5">
                      {groupPerms.map((p) => (
                        <label
                          key={p.key}
                          className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 px-1.5 py-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPerms.has(p.key)}
                            onChange={() => togglePerm(p.key)}
                            className="h-3 w-3 rounded accent-primary"
                          />
                          <span className="flex-1">{p.labelAr}</span>
                        </label>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="bg-brand-gradient">
            {saving ? 'جاري الحفظ...' : (
              <>
                <Save className="h-4 w-4 ml-1" />
                {isEdit ? 'تحديث الدور' : 'إنشاء الدور'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
