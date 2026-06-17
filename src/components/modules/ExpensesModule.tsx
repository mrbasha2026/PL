'use client';

import React from 'react';
import {
  Receipt, Plus, Search, MoreHorizontal, Edit, Trash2, X, Save,
  Building2, Tag, Calendar, FileText, Filter, Download, Upload,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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

import { PageActions } from '@/components/system/PageActions';
interface Company {
  id: string; name: string;
}
interface Category {
  id: string; name: string; nameAr?: string | null; color?: string | null;
}
interface Expense {
  id: string;
  companyId?: string | null;
  categoryId?: string | null;
  amount: number;
  currency?: string | null;
  date: string;
  period?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  vendor?: string | null;
  invoiceNo?: string | null;
  costCenter?: string | null;
  isPrepaid?: boolean | null;
  isApproved?: boolean | null;
  notes?: string | null;
  createdAt: string;
}

const CURRENCIES = ['SAR', 'USD', 'EUR', 'AED', 'GBP'];

export function ExpensesModule() {
  const { toast } = useToast();
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [filterCompany, setFilterCompany] = React.useState('all');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, compRes, catRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/companies'),
        fetch('/api/categories'),
      ]);
      const [exp, comp, cat] = await Promise.all([expRes.json(), compRes.json(), catRes.json()]);
      if (exp.expenses) setExpenses(exp.expenses);
      if (comp.companies) setCompanies(comp.companies);
      if (cat.categories) setCategories(cat.categories);
    } catch (e) {
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = expenses.filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (!e.description?.toLowerCase().includes(q) && !e.vendor?.toLowerCase().includes(q) && !e.invoiceNo?.toLowerCase().includes(q)) return false;
    }
    if (filterCompany !== 'all' && e.companyId !== filterCompany) return false;
    if (filterCategory !== 'all' && e.categoryId !== filterCategory) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

  const deleteExpense = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      toast({ title: 'تم الحذف' });
      load();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="text-sm text-muted-foreground">
          المصروفات
        </div>
        <PageActions onRefresh={load} />
      </div>
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي المصروفات" value={`${total.toLocaleString('ar-SA')} ر.س`} icon={Receipt} color="#7c3aed" />
        <SummaryCard label="عدد السجلات" value={filtered.length} icon={FileText} color="#0d9488" />
        <SummaryCard label="الشركات" value={companies.length} icon={Building2} color="#059669" />
        <SummaryCard label="التصنيفات" value={categories.length} icon={Tag} color="#d97706" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الوصف/المورد/الفاتورة..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/70"
            />
          </div>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="rounded-xl bg-card border border-border/60 px-3 py-1.5 text-sm"
          >
            <option value="all">كل الشركات</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl bg-card border border-border/60 px-3 py-1.5 text-sm"
          >
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient">
          <Plus className="h-4 w-4 ml-1" />
          مصروف جديد
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد مصروفات</div>
              <div className="text-xs text-muted-foreground mb-4">سجّل أول مصروف في النظام</div>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إضافة مصروف
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((e) => {
                  const company = companies.find((c) => c.id === e.companyId);
                  const category = categories.find((c) => c.id === e.categoryId);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{e.descriptionAr || e.description || '—'}</div>
                        {e.invoiceNo && (
                          <div className="text-[10px] text-muted-foreground">فاتورة: {e.invoiceNo}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {company ? (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 ml-1" />
                            {company.name}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {category ? (
                          <Badge variant="secondary" className="text-xs" style={{
                            background: `${category.color || '#0d9488'}15`,
                            color: category.color || '#0d9488',
                          }}>
                            {category.nameAr || category.name}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-mono font-semibold">
                        {Number(e.amount).toLocaleString('ar-SA')} {e.currency || 'SAR'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.date).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.vendor || '—'}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingExpense(e)}>
                              <Edit className="h-3.5 w-3.5 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteExpense(e.id)}>
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

      <ExpenseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
        categories={categories}
        onSaved={load}
      />
      <ExpenseFormDialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
        companies={companies}
        categories={categories}
        editing={editingExpense}
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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{
            background: `${color}20`, color,
          }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpenseFormDialog({
  open, onOpenChange, companies, categories, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  categories: Category[];
  editing?: Expense | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    description: '', descriptionAr: '', amount: '', currency: 'SAR',
    date: new Date().toISOString().slice(0, 10),
    companyId: '', categoryId: '', vendor: '', invoiceNo: '',
    costCenter: '', isPrepaid: false, notes: '',
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description || '',
        descriptionAr: editing.descriptionAr || '',
        amount: String(editing.amount),
        currency: editing.currency || 'SAR',
        date: editing.date.slice(0, 10),
        companyId: editing.companyId || '',
        categoryId: editing.categoryId || '',
        vendor: editing.vendor || '',
        invoiceNo: editing.invoiceNo || '',
        costCenter: editing.costCenter || '',
        isPrepaid: editing.isPrepaid ?? false,
        notes: editing.notes || '',
      });
    } else {
      setForm({
        description: '', descriptionAr: '', amount: '', currency: 'SAR',
        date: new Date().toISOString().slice(0, 10),
        companyId: '', categoryId: '', vendor: '', invoiceNo: '',
        costCenter: '', isPrepaid: false, notes: '',
      });
    }
  }, [editing, open]);

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast({ title: 'تحقق', description: 'المبلغ مطلوب ويجب أن يكون موجباً', variant: 'destructive' });
      return;
    }
    if (!form.date) {
      toast({ title: 'تحقق', description: 'التاريخ مطلوب', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim() || null,
        descriptionAr: form.descriptionAr.trim() || null,
        amount: Number(form.amount),
        currency: form.currency,
        date: new Date(form.date).toISOString(),
        companyId: form.companyId || null,
        categoryId: form.categoryId || null,
        vendor: form.vendor.trim() || null,
        invoiceNo: form.invoiceNo.trim() || null,
        costCenter: form.costCenter.trim() || null,
        isPrepaid: form.isPrepaid,
        notes: form.notes.trim() || null,
      };
      const url = editing ? `/api/expenses/${editing.id}` : '/api/expenses';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {editing ? 'تعديل مصروف' : 'تسجيل مصروف جديد'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">البيان (عربي)</Label>
            <Input
              value={form.descriptionAr}
              onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
              placeholder="مثال: رواتب موظفي شهر يناير"
              dir="rtl"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">البيان (إنجليزي)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Salaries for January"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">المبلغ *</Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">العملة</Label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">التاريخ *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الشركة</Label>
            <select
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— بدون —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">التصنيف</Label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— بدون —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameAr || c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">المورد</Label>
            <Input
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="اسم المورد"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">رقم الفاتورة</Label>
            <Input
              value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              placeholder="INV-0001"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">مركز التكلفة</Label>
            <Input
              value={form.costCenter}
              onChange={(e) => setForm({ ...form, costCenter: e.target.value })}
              placeholder="CC-001"
            />
          </div>
          <div className="space-y-2 sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrepaid"
              checked={form.isPrepaid}
              onChange={(e) => setForm({ ...form, isPrepaid: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="isPrepaid" className="text-xs cursor-pointer">
              هذا مصروف مقدم (سيتم إطفاؤه على عدة فترات)
            </Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="ملاحظات إضافية..."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="bg-brand-gradient">
            {saving ? 'جاري الحفظ...' : (<><Save className="h-4 w-4 ml-1" />{editing ? 'تحديث' : 'حفظ'}</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
