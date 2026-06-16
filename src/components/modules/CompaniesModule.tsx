'use client';

import React from 'react';
import {
  Building2, Plus, Search, Filter, MoreHorizontal, Edit, Trash2,
  TreePine, Tag, MapPin, FileText, X, Save, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  nameAr?: string | null;
  holdingGroupId?: string | null;
  parentId?: string | null;
  type?: string | null;
  currency?: string | null;
  industry?: string | null;
  registrationNo?: string | null;
  ownership?: number | null;
  isActive: boolean;
  createdAt: string;
}

interface HoldingGroup {
  id: string;
  name: string;
  nameAr?: string | null;
  isActive: boolean;
}

export function CompaniesModule() {
  const { toast } = useToast();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [groups, setGroups] = React.useState<HoldingGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterGroup, setFilterGroup] = React.useState<string>('all');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);
  const [deleteCompany, setDeleteCompany] = React.useState<Company | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.companies) setCompanies(data.companies);
      if (data.holdingGroups) setGroups(data.holdingGroups);
    } catch (e) {
      toast({ title: 'خطأ', description: 'فشل تحميل الشركات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = companies.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.nameAr?.toLowerCase().includes(q)) return false;
    }
    if (filterGroup !== 'all') {
      if (filterGroup === 'none' && c.holdingGroupId) return false;
      if (filterGroup !== 'none' && c.holdingGroupId !== filterGroup) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الشركة..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/70"
            />
          </div>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="rounded-xl bg-card border border-border/60 px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">كل المجموعات</option>
            <option value="none">بدون مجموعة</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <Badge variant="secondary" className="text-xs">
            {filtered.length} شركة
          </Badge>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient hover:opacity-90">
          <Plus className="h-4 w-4 ml-1" />
          شركة جديدة
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد شركات</div>
              <div className="text-xs text-muted-foreground mb-4">
                ابدأ بإضافة أول شركة إلى النظام
              </div>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إضافة شركة
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">المجموعة</TableHead>
                  <TableHead className="text-right">القطاع</TableHead>
                  <TableHead className="text-right">العملة</TableHead>
                  <TableHead className="text-right">الملكية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const group = groups.find((g) => g.id === c.holdingGroupId);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{c.name}</div>
                            {c.nameAr && (
                              <div className="text-[11px] text-muted-foreground">{c.nameAr}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {group ? (
                          <Badge variant="outline" className="text-xs">
                            <TreePine className="h-3 w-3 ml-1" />
                            {group.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.industry || '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="secondary" className="font-mono text-[10px]">{c.currency || 'SAR'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.ownership !== null && c.ownership !== undefined ? `${c.ownership}%` : '—'}
                      </TableCell>
                      <TableCell>
                        {c.isActive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-xs">
                            <CheckCircle2 className="h-3 w-3 ml-1" />
                            نشطة
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">موقوفة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingCompany(c)}>
                              <Edit className="h-3.5 w-3.5 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteCompany(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <CompanyFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groups}
        companies={companies}
        onSaved={load}
      />

      {/* Edit dialog */}
      <CompanyFormDialog
        open={!!editingCompany}
        onOpenChange={(open) => !open && setEditingCompany(null)}
        groups={groups}
        companies={companies}
        editing={editingCompany}
        onSaved={load}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteCompany} onOpenChange={(open) => !open && setDeleteCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف شركة "{deleteCompany?.name}"؟
              سيتم حذف جميع المصروفات والمصروفات المقدمة وبيانات P&L المرتبطة بها.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteCompany) return;
                try {
                  const res = await fetch(`/api/companies/${deleteCompany.id}`, { method: 'DELETE' });
                  if (!res.ok) throw new Error('فشل الحذف');
                  toast({ title: 'تم الحذف', description: `تم حذف ${deleteCompany.name}` });
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

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: HoldingGroup[];
  companies: Company[];
  editing?: Company | null;
  onSaved: () => void;
}

function CompanyFormDialog({ open, onOpenChange, groups, companies, editing, onSaved }: CompanyFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    name: '', nameAr: '', holdingGroupId: '', parentId: '',
    type: 'subsidiary', currency: 'SAR', industry: '',
    registrationNo: '', ownership: '', isActive: true,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        nameAr: editing.nameAr || '',
        holdingGroupId: editing.holdingGroupId || '',
        parentId: editing.parentId || '',
        type: editing.type || 'subsidiary',
        currency: editing.currency || 'SAR',
        industry: editing.industry || '',
        registrationNo: editing.registrationNo || '',
        ownership: editing.ownership !== null && editing.ownership !== undefined ? String(editing.ownership) : '',
        isActive: editing.isActive,
      });
    } else {
      setForm({
        name: '', nameAr: '', holdingGroupId: '', parentId: '',
        type: 'subsidiary', currency: 'SAR', industry: '',
        registrationNo: '', ownership: '', isActive: true,
      });
    }
  }, [editing, open]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تحقق', description: 'اسم الشركة مطلوب', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        holdingGroupId: form.holdingGroupId || null,
        parentId: form.parentId || null,
        type: form.type,
        currency: form.currency,
        industry: form.industry.trim() || null,
        registrationNo: form.registrationNo.trim() || null,
        ownership: form.ownership ? Number(form.ownership) : null,
        isActive: form.isActive,
      };
      const url = editing ? `/api/companies/${editing.id}` : '/api/companies';
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
      toast({
        title: editing ? 'تم التحديث' : 'تمت الإضافة',
        description: editing ? `تم تحديث ${form.name}` : `تمت إضافة ${form.name}`,
      });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {editing ? 'تعديل شركة' : 'إضافة شركة جديدة'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">اسم الشركة (إنجليزي) *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: Al Rajhi Trading"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الاسم بالعربية</Label>
            <Input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              placeholder="مثال: الراجحي للتجارة"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">المجموعة القابضة</Label>
            <select
              value={form.holdingGroupId}
              onChange={(e) => setForm({ ...form, holdingGroupId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— بدون مجموعة —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الشركة الأم</Label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— بدون شركة أم —</option>
              {companies.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">القطاع / النشاط</Label>
            <Input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="مثال: تجارة تجزئة"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">العملة</Label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="SAR">SAR — ريال سعودي</option>
              <option value="USD">USD — دولار أمريكي</option>
              <option value="EUR">EUR — يورو</option>
              <option value="AED">AED — درهم إماراتي</option>
              <option value="GBP">GBP — جنيه إسترليني</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">رقم التسجيل</Label>
            <Input
              value={form.registrationNo}
              onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
              placeholder="مثال: 1010xxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">نسبة الملكية (%)</Label>
            <Input
              type="number"
              min="0" max="100" step="0.01"
              value={form.ownership}
              onChange={(e) => setForm({ ...form, ownership: e.target.value })}
              placeholder="مثال: 100"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">النوع</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'subsidiary', label: 'شركة تابعة' },
                { value: 'parent', label: 'شركة أم' },
                { value: 'branch', label: 'فرع' },
                { value: 'division', label: 'وحدة أعمال' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                    form.type === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="bg-brand-gradient">
            {saving ? 'جاري الحفظ...' : (
              <>
                <Save className="h-4 w-4 ml-1" />
                {editing ? 'تحديث' : 'حفظ'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
