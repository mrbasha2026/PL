'use client';

import React from 'react';
import Image from 'next/image';
import {
  Building2, Plus, Search, Edit, Trash2, TreePine, CheckCircle2,
  Upload, Palette, Save, X, Crown,
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageActions } from '@/components/system/PageActions';
import { useToast } from '@/hooks/use-toast';

// Curated palette for company colors — used as defaults
const BRAND_PALETTE = [
  '#0d9488', '#4CAF50', '#D97706', '#7C3AED', '#DC2626',
  '#0891B2', '#EA580C', '#DB2777', '#2563EB', '#65A30D',
];

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
  color?: string | null;
  logoUrl?: string | null;
  ownership?: number | null;
  isActive: boolean;
  createdAt: string;
}

interface HoldingGroup {
  id: string;
  name: string;
  nameAr?: string | null;
  logo?: string | null;
  description?: string | null;
  currency?: string | null;
  isActive: boolean;
}

export function CompaniesModule() {
  const { toast } = useToast();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [groups, setGroups] = React.useState<HoldingGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);
  const [deleteCompany, setDeleteCompany] = React.useState<Company | null>(null);
  const [editingGroup, setEditingGroup] = React.useState(false);

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

  // The single holding company (first holding group, or null)
  const holdingGroup = groups[0] || null;
  const subsidiaries = companies.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.nameAr?.toLowerCase().includes(search.toLowerCase()));

  async function ensureHoldingGroup(name: string = 'الشركة القابضة') {
    // Create the single holding group if it doesn't exist
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHoldingGroup: true, name }),
      });
      if (res.ok) {
        toast({ title: 'تم', description: 'تم إنشاء الشركة القابضة' });
        load();
      }
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between no-print">
        <div className="flex flex-1 gap-2 items-center flex-wrap">
          <div className="flex items-center gap-2 rounded-xl bg-card border border-border/60 px-3 py-1.5 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الشركة الفرعية..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground/70"
            />
          </div>
          <Badge variant="secondary" className="text-xs">
            {subsidiaries.length} شركة فرعية
          </Badge>
        </div>
        <PageActions onRefresh={load} hideExcel hidePrint>
          <Button onClick={() => setCreateOpen(true)} className="bg-brand-gradient hover:opacity-90">
            <Plus className="h-4 w-4 ml-1" />
            شركة فرعية جديدة
          </Button>
        </PageActions>
      </div>

      {/* Single Holding Company Card */}
      <Card className="border-2 border-primary/30 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-6">
          {holdingGroup ? (
            <div className="flex items-center gap-6 flex-wrap">
              {/* Logo */}
              <div className="flex-shrink-0">
                {holdingGroup.logo ? (
                  <Image
                    src={holdingGroup.logo}
                    alt={holdingGroup.name}
                    width={80}
                    height={80}
                    className="rounded-2xl border-2 border-primary/30 shadow-sm object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-md">
                    <Crown className="h-10 w-10" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                    <Crown className="h-3 w-3 ml-1" />
                    الشركة القابضة
                  </Badge>
                  <Badge variant="outline" className="text-xs">واحدة فقط</Badge>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">{holdingGroup.nameAr || holdingGroup.name}</h2>
                {holdingGroup.nameAr && (
                  <div className="text-sm text-muted-foreground">{holdingGroup.name}</div>
                )}
                {holdingGroup.description && (
                  <p className="text-sm text-muted-foreground mt-1">{holdingGroup.description}</p>
                )}
                <div className="flex gap-4 mt-3 text-xs">
                  <span className="text-muted-foreground">العملة: <span className="font-mono">{holdingGroup.currency || 'SAR'}</span></span>
                  <span className="text-muted-foreground">الشركات التابعة: <span className="font-semibold text-foreground">{companies.length}</span></span>
                </div>
              </div>
              {/* Edit button */}
              <Button variant="outline" size="sm" onClick={() => setEditingGroup(true)}>
                <Edit className="h-3.5 w-3.5 ml-1" />
                تعديل بيانات الشركة القابضة
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Crown className="h-12 w-12 mx-auto mb-3 text-primary/40" />
              <h3 className="text-base font-semibold mb-1">لا توجد شركة قابضة بعد</h3>
              <p className="text-sm text-muted-foreground mb-4">
                النظام يدعم شركة قابضة واحدة فقط. أنشئها الآن لربط الشركات الفرعية بها.
              </p>
              <Button onClick={() => ensureHoldingGroup()} className="bg-brand-gradient">
                <Crown className="h-4 w-4 ml-1" />
                إنشاء الشركة القابضة
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subsidiary Companies Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            الشركات الفرعية
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
          ) : subsidiaries.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <div className="text-sm font-medium mb-1">لا توجد شركات فرعية</div>
              <div className="text-xs text-muted-foreground mb-4">
                ابدأ بإضافة أول شركة فرعية إلى المجموعة
              </div>
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إضافة شركة فرعية
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشركة</TableHead>
                  <TableHead className="text-right">اللون</TableHead>
                  <TableHead className="text-right">القطاع</TableHead>
                  <TableHead className="text-right">العملة</TableHead>
                  <TableHead className="text-right">الملكية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subsidiaries.map((c) => {
                  const color = c.color || '#0d9488';
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {/* Logo or color circle */}
                          {c.logoUrl ? (
                            <Image
                              src={c.logoUrl}
                              alt={c.name}
                              width={36}
                              height={36}
                              className="rounded-lg border object-cover"
                              style={{ borderColor: `${color}40` }}
                            />
                          ) : (
                            <div
                              className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                              style={{ background: color }}
                            >
                              {(c.nameAr || c.name).charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{c.name}</div>
                            {c.nameAr && (
                              <div className="text-[11px] text-muted-foreground">{c.nameAr}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-5 w-5 rounded-full border-2 border-white shadow-sm"
                            style={{ background: color }}
                          />
                          <code className="text-[10px] font-mono text-muted-foreground">{color}</code>
                        </div>
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
                              <Edit className="h-4 w-4" />
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

      {/* Edit holding group dialog */}
      {editingGroup && holdingGroup && (
        <HoldingGroupFormDialog
          group={holdingGroup}
          onOpenChange={(open) => !open && setEditingGroup(false)}
          onSaved={() => { load(); setEditingGroup(false); }}
        />
      )}

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
    name: '', nameAr: '', parentId: '',
    type: 'subsidiary', currency: 'SAR', industry: '',
    registrationNo: '', ownership: '', isActive: true,
    color: BRAND_PALETTE[Math.floor(Math.random() * BRAND_PALETTE.length)],
    logoUrl: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        nameAr: editing.nameAr || '',
        parentId: editing.parentId || '',
        type: editing.type || 'subsidiary',
        currency: editing.currency || 'SAR',
        industry: editing.industry || '',
        registrationNo: editing.registrationNo || '',
        ownership: editing.ownership !== null && editing.ownership !== undefined ? String(editing.ownership) : '',
        isActive: editing.isActive,
        color: editing.color || BRAND_PALETTE[0],
        logoUrl: editing.logoUrl || '',
      });
    } else {
      setForm({
        name: '', nameAr: '', parentId: '',
        type: 'subsidiary', currency: 'SAR', industry: '',
        registrationNo: '', ownership: '', isActive: true,
        color: BRAND_PALETTE[Math.floor(Math.random() * BRAND_PALETTE.length)],
        logoUrl: '',
      });
    }
  }, [editing, open]);

  async function uploadLogo(file: File) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      // Use a placeholder ID for new companies — server will save and return URL
      const tempId = editing?.id || 'new';
      fd.append('companyId', tempId);
      const res = await fetch('/api/upload-logo', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل رفع الشعار');
      }
      const data = await res.json();
      setForm((f) => ({ ...f, logoUrl: data.logoUrl }));
      toast({ title: 'تم', description: 'تم رفع الشعار' });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  }

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تحقق', description: 'اسم الشركة مطلوب', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const holdingGroupId = groups[0]?.id || null;
      const payload = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        holdingGroupId, // Auto-assign to the single holding group
        parentId: form.parentId || null,
        type: form.type,
        currency: form.currency,
        industry: form.industry.trim() || null,
        registrationNo: form.registrationNo.trim() || null,
        ownership: form.ownership ? Number(form.ownership) : null,
        isActive: form.isActive,
        color: form.color,
        logoUrl: form.logoUrl || null,
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
      // If logo was uploaded with tempId='new', update the newly created company
      if (!editing && form.logoUrl && form.logoUrl.includes('logo-new-')) {
        const created = await res.json();
        // Re-upload logo with correct company ID
        // (The logo file is already saved, just need to associate it)
        await fetch(`/api/companies/${created.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logoUrl: form.logoUrl, color: form.color }),
        });
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
            {editing ? 'تعديل شركة' : 'إضافة شركة فرعية جديدة'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          {/* Logo + Color preview */}
          <div className="sm:col-span-2 flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/40">
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden"
              style={{ background: form.color }}
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="logo" className="h-full w-full object-cover" />
              ) : (
                (form.nameAr || form.name || '?').charAt(0) || '?'
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1 block">شعار الشركة (اختياري)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 ml-1" />
                  {uploadingLogo ? 'جاري الرفع...' : 'رفع شعار'}
                </Button>
                {form.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, logoUrl: '' })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                />
              </div>
            </div>
          </div>

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

          {/* Color picker */}
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs flex items-center gap-1">
              <Palette className="h-3 w-3" />
              اللون المميز للشركة (يظهر في كل الموقع)
            </Label>
            <div className="flex gap-2 flex-wrap items-center">
              {BRAND_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    form.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-8 w-8 rounded cursor-pointer border border-input"
              />
              <code className="text-xs font-mono text-muted-foreground mr-2">{form.color}</code>
            </div>
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

// Dialog for editing the single holding company
function HoldingGroupFormDialog({ group, onOpenChange, onSaved }: {
  group: HoldingGroup;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    name: group.name,
    nameAr: group.nameAr || '',
    description: group.description || '',
    currency: group.currency || 'SAR',
    logo: group.logo || '',
  });
  const [saving, setSaving] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function uploadLogo(file: File) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('companyId', group.id);
      const res = await fetch('/api/upload-logo', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل رفع الشعار');
      }
      const data = await res.json();
      setForm((f) => ({ ...f, logo: data.logoUrl }));
      toast({ title: 'تم', description: 'تم رفع شعار الشركة القابضة' });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      // Update the holding group via a custom endpoint or PATCH /api/companies with isHoldingGroup
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isHoldingGroup: true,
          updateId: group.id,
          ...form,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل الحفظ');
      }
      toast({ title: 'تم', description: 'تم تحديث بيانات الشركة القابضة' });
      onSaved();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            تعديل الشركة القابضة
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Logo */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <div className="h-20 w-20 rounded-xl bg-brand-gradient flex items-center justify-center text-white overflow-hidden flex-shrink-0">
              {form.logo ? (
                <img src={form.logo} alt="logo" className="h-full w-full object-cover" />
              ) : (
                <Crown className="h-10 w-10" />
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs mb-1 block">شعار الشركة القابضة</Label>
              <Button type="button" variant="outline" size="sm" disabled={uploadingLogo} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 ml-1" />
                {uploadingLogo ? 'جاري الرفع...' : 'رفع شعار'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">الاسم (إنجليزي)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">الاسم (عربي)</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} dir="rtl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الوصف</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="وصف مختصر للشركة القابضة..."
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
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving} className="bg-brand-gradient">
            {saving ? 'جاري الحفظ...' : (
              <>
                <Save className="h-4 w-4 ml-1" />
                تحديث
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
