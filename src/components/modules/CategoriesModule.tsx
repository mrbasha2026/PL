'use client';

import React from 'react';
import {
  Tag, Plus, Edit, Trash2, Save, X, Folder, FolderTree,
  Building2, Layers, ChevronDown, ChevronLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  nameAr?: string | null;
  code?: string | null;
  parentId?: string | null;
  level?: number | null;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  sortOrder?: number | null;
  children?: Category[];
}

const PRESET_COLORS = [
  '#0d9488', '#7c3aed', '#059669', '#d97706', '#dc2626',
  '#2563eb', '#0891b2', '#9333ea', '#f59e0b', '#64748b',
];

const PRESET_DEPARTMENTS = [
  { name: 'الإدارة العامة', nameAr: 'الإدارة العامة', code: 'ADMIN' },
  { name: 'المالية', nameAr: 'المالية', code: 'FIN' },
  { name: 'الموارد البشرية', nameAr: 'الموارد البشرية', code: 'HR' },
  { name: 'المبيعات', nameAr: 'المبيعات', code: 'SALES' },
  { name: 'التسويق', nameAr: 'التسويق', code: 'MKTG' },
  { name: 'العمليات', nameAr: 'العمليات', code: 'OPS' },
  { name: 'تقنية المعلومات', nameAr: 'تقنية المعلومات', code: 'IT' },
  { name: 'المشتريات', nameAr: 'المشتريات', code: 'PROC' },
  { name: 'الإنتاج', nameAr: 'الإنتاج', code: 'PROD' },
  { name: 'خدمة العملاء', nameAr: 'خدمة العملاء', code: 'CS' },
  { name: 'الشؤون القانونية', nameAr: 'الشؤون القانونية', code: 'LEGAL' },
  { name: 'المرافق', nameAr: 'المرافق', code: 'FAC' },
];

const PRESET_CATEGORIES = [
  { name: 'COGS', nameAr: 'تكلفة المبيعات', code: 'COGS' },
  { name: 'Salaries & Wages', nameAr: 'الرواتب والأجور', code: 'SAL' },
  { name: 'Rent', nameAr: 'الإيجارات', code: 'RENT' },
  { name: 'Utilities', nameAr: 'المرافق', code: 'UTIL' },
  { name: 'Marketing', nameAr: 'التسويق', code: 'MKTG' },
  { name: 'Advertising', nameAr: 'الإعلان', code: 'ADV' },
  { name: 'Insurance', nameAr: 'التأمين', code: 'INS' },
  { name: 'Maintenance', nameAr: 'الصيانة', code: 'MAINT' },
  { name: 'Professional Fees', nameAr: 'الأتعاف المهنية', code: 'PROF' },
  { name: 'Travel & Entertainment', nameAr: 'السفر والاستضافة', code: 'TRAV' },
  { name: 'Office Supplies', nameAr: 'القرطاسية', code: 'OFFICE' },
  { name: 'Depreciation', nameAr: 'الإهلاك', code: 'DEP' },
  { name: 'Software & Subscriptions', nameAr: 'البرمجيات والاشتراكات', code: 'SW' },
  { name: 'Telecommunications', nameAr: 'الاتصالات', code: 'TEL' },
  { name: 'Bank Charges', nameAr: 'الرسوم البنكية', code: 'BANK' },
  { name: 'Zakat', nameAr: 'الزكاة', code: 'ZAKAT' },
];

export function CategoriesModule() {
  const { toast } = useToast();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCat, setEditingCat] = React.useState<Category | null>(null);
  const [expandedParents, setExpandedParents] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل التصنيفات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  // Build tree
  const tree = React.useMemo(() => {
    const byParent = new Map<string | null, Category[]>();
    categories.forEach((c) => {
      const key = c.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    });
    const buildLevel = (parentId: string | null, level: number): Category[] => {
      const items = byParent.get(parentId) || [];
      return items
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((c) => ({ ...c, level, children: buildLevel(c.id, level + 1) }));
    };
    return buildLevel(null, 0);
  }, [categories]);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTree = (items: Category[], level: number = 0): React.ReactNode => {
    return items.map((c) => {
      const hasChildren = c.children && c.children.length > 0;
      const isExpanded = expandedParents.has(c.id);
      return (
        <React.Fragment key={c.id}>
          <div
            className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-foreground/20 hover:bg-muted/30 transition"
            style={{ marginRight: level * 24 }}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(c.id)}
                className="p-1 rounded hover:bg-muted"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: `${c.color || '#0d9488'}20`, color: c.color || '#0d9488' }}
            >
              <Tag className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.nameAr || c.name}</span>
                {c.nameAr && c.name && (
                  <span className="text-[10px] text-muted-foreground">({c.name})</span>
                )}
                {c.code && (
                  <Badge variant="outline" className="text-[9px] font-mono">{c.code}</Badge>
                )}
              </div>
              {hasChildren && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {c.children!.length} تصنيف فرعي
                </div>
              )}
            </div>
            {c.isActive ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px]">نشط</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">موقوف</Badge>
            )}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingCat(c)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                onClick={async () => {
                  if (!confirm(`حذف تصنيف "${c.nameAr || c.name}"؟`)) return;
                  try {
                    await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
                    toast({ title: 'تم الحذف' });
                    load();
                  } catch (e: any) {
                    toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {hasChildren && isExpanded && renderTree(c.children!, level + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي التصنيفات" value={categories.length} icon={Tag} color="#0d9488" />
        <SummaryCard label="تصنيفات رئيسية" value={categories.filter(c => !c.parentId).length} icon={Folder} color="#7c3aed" />
        <SummaryCard label="تصنيفات فرعية" value={categories.filter(c => c.parentId).length} icon={FolderTree} color="#059669" />
        <SummaryCard label="نشطة" value={categories.filter(c => c.isActive).length} icon={Layers} color="#d97706" />
      </div>

      {/* Quick setup */}
      <Card className="bg-gradient-to-br from-primary/5 to-chart-2/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            إعداد سريع للتصنيفات المسبقة
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline" size="sm"
            onClick={async () => {
              if (!confirm(`سيتم إضافة ${PRESET_CATEGORIES.length} تصنيف محاسبي قياسي. متابعة؟`)) return;
              let added = 0;
              for (const c of PRESET_CATEGORIES) {
                try {
                  await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: c.name, nameAr: c.nameAr, code: c.code, color: PRESET_COLORS[added % PRESET_COLORS.length], sortOrder: added }),
                  });
                  added++;
                } catch {}
              }
              toast({ title: 'تم', description: `تمت إضافة ${added} تصنيف` });
              load();
            }}
          >
            <Plus className="h-3.5 w-3.5 ml-1" />
            إضافة تصنيفات محاسبية قياسية ({PRESET_CATEGORIES.length})
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={async () => {
              if (!confirm(`سيتم إضافة ${PRESET_DEPARTMENTS.length} قسم إداري. متابعة؟`)) return;
              let added = 0;
              for (const d of PRESET_DEPARTMENTS) {
                try {
                  await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: d.name, nameAr: d.nameAr, code: `DEPT-${d.code}`, color: PRESET_COLORS[added % PRESET_COLORS.length], sortOrder: added }),
                  });
                  added++;
                } catch {}
              }
              toast({ title: 'تم', description: `تمت إضافة ${added} قسم` });
              load();
            }}
          >
            <Building2 className="h-3.5 w-3.5 ml-1" />
            إضافة أقسام إدارية قياسية ({PRESET_DEPARTMENTS.length})
          </Button>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">شجرة التصنيفات والأقسام</h3>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient">
          <Plus className="h-4 w-4 ml-1" />
          تصنيف جديد
        </Button>
      </div>

      {/* Tree */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد تصنيفات</div>
              <div className="text-xs text-muted-foreground mb-4">استخدم الإعداد السريع أو أضف تصنيفاً يدوياً</div>
            </div>
          ) : (
            <div className="space-y-2">
              {renderTree(tree)}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categories}
        onSaved={load}
      />
      <CategoryFormDialog
        open={!!editingCat}
        onOpenChange={(open) => !open && setEditingCat(null)}
        categories={categories}
        editing={editingCat}
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

function CategoryFormDialog({
  open, onOpenChange, categories, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  editing?: Category | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    name: '', nameAr: '', code: '', parentId: '',
    color: PRESET_COLORS[0], isActive: true, sortOrder: 0,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        nameAr: editing.nameAr || '',
        code: editing.code || '',
        parentId: editing.parentId || '',
        color: editing.color || PRESET_COLORS[0],
        isActive: editing.isActive,
        sortOrder: editing.sortOrder || 0,
      });
    } else {
      setForm({
        name: '', nameAr: '', code: '', parentId: '',
        color: PRESET_COLORS[0], isActive: true, sortOrder: 0,
      });
    }
  }, [editing, open]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تحقق', description: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        code: form.code.trim() || null,
        parentId: form.parentId || null,
        color: form.color,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
        level: form.parentId ? (categories.find(c => c.id === form.parentId)?.level || 0) + 1 : 0,
      };
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories';
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            {editing ? 'تعديل تصنيف' : 'تصنيف جديد'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs">الاسم (إنجليزي) *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rent"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الاسم بالعربية</Label>
            <Input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              placeholder="الإيجارات"
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">الرمز</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="RENT"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">ترتيب العرض</Label>
              <Input
                type="number" min="0"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">التصنيف الأب</Label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— بدون (تصنيف رئيسي) —</option>
              {categories.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">اللون</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-lg border-2 transition ${
                    form.color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="catActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="catActive" className="text-xs cursor-pointer">نشط</Label>
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
