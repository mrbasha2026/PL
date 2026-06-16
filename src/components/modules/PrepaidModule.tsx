'use client';

import React from 'react';
import {
  Clock, Plus, Search, MoreHorizontal, Edit, Trash2, Save, X,
  Building2, Calendar, TrendingDown, CheckCircle2, AlertCircle,
  Wallet, BarChart3, Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface Company { id: string; name: string; }
interface Category { id: string; name: string; nameAr?: string | null; color?: string | null; }
interface Prepaid {
  id: string;
  companyId?: string | null;
  categoryId?: string | null;
  name: string;
  nameAr?: string | null;
  totalAmount: number;
  currency?: string | null;
  startDate: string;
  months?: number | null;
  monthlyAmount?: number | null;
  allocations?: string | null; // JSON: { endDate, schedule: [{period, amount, cumulative, remaining}] }
  vendor?: string | null;
  description?: string | null;
  isFullyRecognized?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleEntry { period: string; amount: number; cumulative: number; remaining: number; }

export function PrepaidModule() {
  const { toast } = useToast();
  const [prepaids, setPrepaids] = React.useState<Prepaid[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingPrepaid, setEditingPrepaid] = React.useState<Prepaid | null>(null);
  const [viewingSchedule, setViewingSchedule] = React.useState<Prepaid | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, catRes] = await Promise.all([
        fetch('/api/prepaids'),
        fetch('/api/companies'),
        fetch('/api/categories'),
      ]);
      const [p, c, cat] = await Promise.all([pRes.json(), cRes.json(), catRes.json()]);
      if (p.prepaids) setPrepaids(p.prepaids);
      if (c.companies) setCompanies(c.companies);
      if (cat.categories) setCategories(cat.categories);
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = prepaids.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.nameAr?.toLowerCase().includes(q) && !p.vendor?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Compute amortization status
  const getSchedule = (p: Prepaid): ScheduleEntry[] => {
    if (!p.allocations) return [];
    try {
      const parsed = JSON.parse(p.allocations);
      return parsed.schedule || [];
    } catch { return []; }
  };

  const getEndDate = (p: Prepaid): string | null => {
    if (!p.allocations) return null;
    try {
      const parsed = JSON.parse(p.allocations);
      return parsed.endDate || null;
    } catch { return null; }
  };

  const getAmortizationStatus = (p: Prepaid): {
    recognized: number; remaining: number; percent: number; currentPeriod?: string;
  } => {
    const schedule = getSchedule(p);
    if (schedule.length === 0) {
      return { recognized: 0, remaining: p.totalAmount, percent: 0 };
    }
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    let recognized = 0;
    for (const entry of schedule) {
      if (entry.period <= currentPeriod) {
        recognized = entry.cumulative;
      } else break;
    }
    const remaining = p.totalAmount - recognized;
    const percent = (recognized / p.totalAmount) * 100;
    return { recognized, remaining, percent, currentPeriod };
  };

  const totalAmount = filtered.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
  const totalRecognized = filtered.reduce((s, p) => s + getAmortizationStatus(p).recognized, 0);
  const totalRemaining = filtered.reduce((s, p) => s + getAmortizationStatus(p).remaining, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي المصروفات المقدمة" value={`${totalAmount.toLocaleString('ar-SA')}`} subValue="ر.س" icon={Wallet} color="#d97706" />
        <SummaryCard label="المُطفأ حتى الآن" value={`${totalRecognized.toLocaleString('ar-SA')}`} subValue="ر.س" icon={CheckCircle2} color="#059669" />
        <SummaryCard label="المتبقي" value={`${totalRemaining.toLocaleString('ar-SA')}`} subValue="ر.س" icon={Clock} color="#dc2626" />
        <SummaryCard label="عدد المصروفات" value={filtered.length} subValue="سجل" icon={BarChart3} color="#7c3aed" />
      </div>

      {/* Info banner */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex-shrink-0">
            <Calculator className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold mb-1">حساب الإطفاء التلقائي</div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              يقوم النظام تلقائياً بحساب <strong>القسط الشهري</strong> و<strong>جدول الإطفاء</strong> بناءً على
              تاريخ البداية والنهاية فقط. يتم توزيع المبلغ على الأشهر الفعلية مع مراعاة تجزئة الشهر الأول والأخير
              تناسباً مع عدد الأيام. يستند الحساب إلى معيار المحاسبة السعودي (الإطفاء الخطي على الفترات المحاسبية).
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المصروفات المقدمة..."
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/70"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient">
          <Plus className="h-4 w-4 ml-1" />
          مصروف مقدم جديد
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد مصروفات مقدمة</div>
              <div className="text-xs text-muted-foreground mb-4">سجّل أول مصروف مقدم</div>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إضافة مصروف مقدم
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المصروف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">القسط الشهري</TableHead>
                  <TableHead className="text-right">من - إلى</TableHead>
                  <TableHead className="text-right">الإطفاء</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const company = companies.find((c) => c.id === p.companyId);
                  const category = categories.find((c) => c.id === p.categoryId);
                  const status = getAmortizationStatus(p);
                  const endDate = getEndDate(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{p.nameAr || p.name}</div>
                        <div className="flex items-center gap-1 mt-1">
                          {company && (
                            <Badge variant="outline" className="text-[9px]">
                              <Building2 className="h-2.5 w-2.5 ml-0.5" />
                              {company.name}
                            </Badge>
                          )}
                          {category && (
                            <Badge variant="secondary" className="text-[9px]" style={{
                              background: `${category.color || '#0d9488'}15`,
                              color: category.color || '#0d9488',
                            }}>
                              {category.nameAr || category.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono font-semibold">
                        {Number(p.totalAmount).toLocaleString('ar-SA')} {p.currency || 'SAR'}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {p.monthlyAmount ? Number(p.monthlyAmount).toLocaleString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{new Date(p.startDate).toLocaleDateString('ar-SA')}</div>
                        {endDate && (
                          <div className="opacity-60">← {new Date(endDate).toLocaleDateString('ar-SA')}</div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <Progress value={status.percent} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-mono text-muted-foreground w-10 text-left">
                            {status.percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          مُطفأ: {status.recognized.toLocaleString('ar-SA')} | متبقي: {status.remaining.toLocaleString('ar-SA')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.isFullyRecognized || status.percent >= 100 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 ml-0.5" />
                            مُطفأ بالكامل
                          </Badge>
                        ) : status.percent > 0 ? (
                          <Badge variant="secondary" className="text-[10px]">قيد الإطفاء</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">لم يبدأ</Badge>
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
                            <DropdownMenuItem onClick={() => setViewingSchedule(p)}>
                              <Calendar className="h-3.5 w-3.5 ml-2" />
                              عرض جدول الإطفاء
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingPrepaid(p)}>
                              <Edit className="h-3.5 w-3.5 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                if (!confirm('حذف هذا المصروف المقدم؟')) return;
                                try {
                                  await fetch(`/api/prepaids/${p.id}`, { method: 'DELETE' });
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PrepaidFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
        categories={categories}
        onSaved={load}
      />
      <PrepaidFormDialog
        open={!!editingPrepaid}
        onOpenChange={(open) => !open && setEditingPrepaid(null)}
        companies={companies}
        categories={categories}
        editing={editingPrepaid}
        onSaved={load}
      />

      <ScheduleDialog
        prepaid={viewingSchedule}
        open={!!viewingSchedule}
        onOpenChange={(open) => !open && setViewingSchedule(null)}
        getSchedule={getSchedule}
        getEndDate={getEndDate}
      />
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon: Icon, color }: { label: string; value: any; subValue?: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold">{value}</span>
              {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}20`, color }}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PrepaidFormDialog({
  open, onOpenChange, companies, categories, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  categories: Category[];
  editing?: Prepaid | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    name: '', nameAr: '', totalAmount: '', currency: 'SAR',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '', companyId: '', categoryId: '',
    vendor: '', description: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<{ months: number; monthly: number; schedule: any[] } | null>(null);

  React.useEffect(() => {
    if (editing) {
      // Parse endDate from allocations
      let endDate = '';
      if (editing.allocations) {
        try {
          const parsed = JSON.parse(editing.allocations);
          if (parsed.endDate) endDate = parsed.endDate.slice(0, 10);
        } catch {}
      }
      setForm({
        name: editing.name,
        nameAr: editing.nameAr || '',
        totalAmount: String(editing.totalAmount),
        currency: editing.currency || 'SAR',
        startDate: editing.startDate.slice(0, 10),
        endDate,
        companyId: editing.companyId || '',
        categoryId: editing.categoryId || '',
        vendor: editing.vendor || '',
        description: editing.description || '',
      });
    } else {
      setForm({
        name: '', nameAr: '', totalAmount: '', currency: 'SAR',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '', companyId: '', categoryId: '',
        vendor: '', description: '',
      });
    }
    setPreview(null);
  }, [editing, open]);

  // Live preview of amortization schedule
  React.useEffect(() => {
    if (!form.totalAmount || !form.startDate || !form.endDate) {
      setPreview(null);
      return;
    }
    const amount = Number(form.totalAmount);
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start || amount <= 0) {
      setPreview(null);
      return;
    }
    // Compute preview using the same algorithm as server
    const periods: { year: number; month: number }[] = [];
    let y = start.getFullYear(), m = start.getMonth();
    const y1 = end.getFullYear(), m1 = end.getMonth();
    while (y < y1 || (y === y1 && m <= m1)) {
      periods.push({ year: y, month: m });
      m++; if (m > 11) { m = 0; y++; }
    }
    const months = periods.length;
    const monthlyAmount = amount / months;
    setPreview({
      months,
      monthly: Math.round(monthlyAmount * 100) / 100,
      schedule: periods.map((p, i) => ({
        period: `${p.year}-${String(p.month + 1).padStart(2, '0')}`,
      })),
    });
  }, [form.totalAmount, form.startDate, form.endDate]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تحقق', description: 'الاسم مطلوب', variant: 'destructive' });
      return;
    }
    if (!form.totalAmount || Number(form.totalAmount) <= 0) {
      toast({ title: 'تحقق', description: 'المبلغ مطلوب ويجب أن يكون موجباً', variant: 'destructive' });
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast({ title: 'تحقق', description: 'تاريخ البداية والنهاية مطلوبان', variant: 'destructive' });
      return;
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      toast({ title: 'تحقق', description: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        totalAmount: Number(form.totalAmount),
        currency: form.currency,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        companyId: form.companyId || null,
        categoryId: form.categoryId || null,
        vendor: form.vendor.trim() || null,
        description: form.description.trim() || null,
      };
      const url = editing ? `/api/prepaids/${editing.id}` : '/api/prepaids';
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
            <Clock className="h-5 w-5 text-primary" />
            {editing ? 'تعديل مصروف مقدم' : 'مصروف مقدم جديد'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">الاسم (إنجليزي) *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Insurance Premium Q1 2026"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الاسم بالعربية</Label>
            <Input
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              placeholder="قسط التأمين الربع الأول 2026"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">المبلغ الإجمالي *</Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              placeholder="12000.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">العملة</Label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="SAR">SAR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">من تاريخ *</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">إلى تاريخ *</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
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
          <div className="space-y-2">
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
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">الوصف</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="ملاحظات..."
              rows={2}
            />
          </div>
        </div>

        {/* Live amortization preview */}
        {preview && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">معاينة حساب الإطفاء التلقائي</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs mb-3">
              <div>
                <div className="text-muted-foreground">عدد الأشهر</div>
                <div className="font-bold text-base">{preview.months}</div>
              </div>
              <div>
                <div className="text-muted-foreground">القسط الشهري</div>
                <div className="font-bold text-base">{preview.monthly.toLocaleString('ar-SA')} {form.currency}</div>
              </div>
              <div>
                <div className="text-muted-foreground">الإجمالي</div>
                <div className="font-bold text-base">{Number(form.totalAmount).toLocaleString('ar-SA')} {form.currency}</div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              سيتم إنشاء جدول إطفاء بـ {preview.months} قسط شهري، مع تجزئة الشهر الأول والأخير تناسباً مع عدد الأيام.
            </div>
          </div>
        )}

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

function ScheduleDialog({
  prepaid, open, onOpenChange, getSchedule, getEndDate,
}: {
  prepaid: Prepaid | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getSchedule: (p: Prepaid) => ScheduleEntry[];
  getEndDate: (p: Prepaid) => string | null;
}) {
  if (!prepaid) return null;
  const schedule = getSchedule(prepaid);
  const endDate = getEndDate(prepaid);
  const currentPeriod = new Date().toISOString().slice(0, 7);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            جدول إطفاء المصروف المقدم
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">المبلغ الإجمالي</div>
              <div className="font-bold text-sm">{Number(prepaid.totalAmount).toLocaleString('ar-SA')} {prepaid.currency}</div>
            </div>
            <div>
              <div className="text-muted-foreground">القسط الشهري</div>
              <div className="font-bold text-sm">{prepaid.monthlyAmount ? Number(prepaid.monthlyAmount).toLocaleString('ar-SA') : '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">من</div>
              <div className="font-bold text-sm">{new Date(prepaid.startDate).toLocaleDateString('ar-SA')}</div>
            </div>
            <div>
              <div className="text-muted-foreground">إلى</div>
              <div className="font-bold text-sm">{endDate ? new Date(endDate).toLocaleDateString('ar-SA') : '—'}</div>
            </div>
          </div>

          {schedule.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              لا يوجد جدول إطفاء محفوظ
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الفترة</TableHead>
                    <TableHead className="text-right">قسط الإطفاء</TableHead>
                    <TableHead className="text-right">المُطفأ تراكمياً</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((entry, i) => {
                    const isPast = entry.period < currentPeriod;
                    const isCurrent = entry.period === currentPeriod;
                    const isFuture = entry.period > currentPeriod;
                    return (
                      <TableRow key={i} className={isCurrent ? 'bg-primary/5' : ''}>
                        <TableCell className="font-mono text-sm">{entry.period}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.amount.toLocaleString('ar-SA')}</TableCell>
                        <TableCell className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
                          {entry.cumulative.toLocaleString('ar-SA')}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-amber-700 dark:text-amber-400">
                          {entry.remaining.toLocaleString('ar-SA')}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPast && <Badge variant="secondary" className="text-[9px]">مُطفأ</Badge>}
                          {isCurrent && <Badge className="bg-primary text-primary-foreground text-[9px]">الشهر الحالي</Badge>}
                          {isFuture && <Badge variant="outline" className="text-[9px]">مستقبلي</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
