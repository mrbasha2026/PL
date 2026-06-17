'use client';

import React from 'react';
import {
  Wallet, Plus, Trash2, Calendar, FileText, Save, TrendingUp,
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
import { useToast } from '@/hooks/use-toast';

import { PageActions } from '@/components/system/PageActions';
interface Company { id: string; name: string; }
interface Budget {
  id: string;
  companyId?: string | null;
  year: number;
  period?: string | null;
  data: string; // JSON
  notes?: string | null;
  isApproved: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export function BudgetsModule() {
  const { toast } = useToast();
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/companies'),
      ]);
      const [b, c] = await Promise.all([bRes.json(), cRes.json()]);
      if (b.budgets) setBudgets(b.budgets);
      if (c.companies) setCompanies(c.companies);
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحميل', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="text-sm text-muted-foreground">
          الميزانيات
        </div>
        <PageActions onRefresh={load} />
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي الميزانيات" value={budgets.length} icon={Wallet} color="#dc2626" />
        <SummaryCard label="معتمدة" value={budgets.filter(b => b.isApproved).length} icon={TrendingUp} color="#059669" />
        <SummaryCard label="مسودة" value={budgets.filter(b => !b.isApproved).length} icon={FileText} color="#d97706" />
        <SummaryCard label="السنة الحالية" value={budgets.filter(b => b.year === new Date().getFullYear()).length} icon={Calendar} color="#7c3aed" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">الميزانيات</h3>
        <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient">
          <Plus className="h-4 w-4 ml-1" />
          ميزانية جديدة
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : budgets.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد ميزانيات</div>
              <div className="text-xs text-muted-foreground mb-4">أنشئ أول ميزانية للشركة</div>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 ml-1" />إضافة ميزانية
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">السنة</TableHead>
                  <TableHead className="text-right">الفترة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">ملاحظات</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((b) => {
                  const company = companies.find((c) => c.id === b.companyId);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="text-sm">{company?.name || '—'}</TableCell>
                      <TableCell className="text-sm font-mono font-semibold">{b.year}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.period || 'سنوي'}</TableCell>
                      <TableCell>
                        {b.isApproved ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-xs">معتمدة</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">مسودة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {b.notes || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={async () => {
                            if (!confirm('حذف هذه الميزانية؟')) return;
                            await fetch(`/api/budgets/${b.id}`, { method: 'DELETE' });
                            toast({ title: 'تم الحذف' });
                            load();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BudgetFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companies={companies}
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

function BudgetFormDialog({
  open, onOpenChange, companies, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    companyId: '',
    year: new Date().getFullYear(),
    period: '',
    notes: '',
    isApproved: false,
    // Simple line items as JSON
    revenue: '',
    cogs: '',
    operatingExpenses: '',
    netIncome: '',
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({
        companyId: '', year: new Date().getFullYear(), period: '', notes: '',
        isApproved: false, revenue: '', cogs: '', operatingExpenses: '', netIncome: '',
      });
    }
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      const data: Record<string, number> = {};
      if (form.revenue) data.revenue = Number(form.revenue);
      if (form.cogs) data.cogs = Number(form.cogs);
      if (form.operatingExpenses) data.operatingExpenses = Number(form.operatingExpenses);
      if (form.netIncome) data.netIncome = Number(form.netIncome);

      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: form.companyId || null,
          year: Number(form.year),
          period: form.period || null,
          data,
          notes: form.notes || null,
          isApproved: form.isApproved,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الحفظ');
      }
      toast({ title: 'تم إنشاء الميزانية' });
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            ميزانية جديدة
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">الشركة</Label>
            <select
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— عامة —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">السنة *</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">الفترة (اختياري)</Label>
            <Input
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="مثال: Q1 أو January"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الإيرادات</Label>
            <Input
              type="number" step="0.01"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">تكلفة المبيعات</Label>
            <Input
              type="number" step="0.01"
              value={form.cogs}
              onChange={(e) => setForm({ ...form, cogs: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">المصروفات التشغيلية</Label>
            <Input
              type="number" step="0.01"
              value={form.operatingExpenses}
              onChange={(e) => setForm({ ...form, operatingExpenses: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">صافي الربح المستهدف</Label>
            <Input
              type="number" step="0.01"
              value={form.netIncome}
              onChange={(e) => setForm({ ...form, netIncome: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">ملاحظات</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="افتراضات الميزانية..."
              rows={2}
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="budgetApproved"
              checked={form.isApproved}
              onChange={(e) => setForm({ ...form, isApproved: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="budgetApproved" className="text-xs cursor-pointer">معتمدة</Label>
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
