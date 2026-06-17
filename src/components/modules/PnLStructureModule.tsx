'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronLeft, Plus, Edit, Trash2, FileSpreadsheet, Loader2, FolderTree, ListTree, FileText, Download } from 'lucide-react';
import { PageActions } from '@/components/system/PageActions';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface LineItem { id: string; name: string; nameAr: string; key: string; order: number; description?: string | null; isTotal: boolean; isSubtotal: boolean; }
interface Category { id: string; sectionId: string; name: string; nameAr: string; order: number; isSubtotal: boolean; lineItems: LineItem[]; }
interface Section { id: string; name: string; nameAr: string; type: string; order: number; categories: Category[]; }

export function PnLStructureModule() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pnl-structure');
      const data = await res.json();
      setSections(data.sections || []);
      // Auto-expand all
      const exp: Record<string, boolean> = {};
      (data.sections || []).forEach((s: Section) => { exp[s.id] = true; s.categories.forEach((c) => { exp[c.id] = true; }); });
      setExpanded(exp);
    } catch { toast.error('فشل تحميل البنية'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  async function handleCreate(level: 'section' | 'category' | 'item', data: any) {
    try {
      const res = await fetch('/api/pnl-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('تم الإنشاء بنجاح');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleUpdate(level: 'section' | 'category' | 'item', id: string, data: any) {
    try {
      const res = await fetch('/api/pnl-structure', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, id, ...data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('تم التحديث');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(level: 'section' | 'category' | 'item', id: string, name: string) {
    if (!confirm(`حذف "${name}"؟ سيتم حذف جميع البنود الفرعية والبيانات المرتبطة.`)) return;
    try {
      const res = await fetch(`/api/pnl-structure?level=${level}&id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('تم الحذف');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  function downloadTemplate() {
    // Generate dynamic Excel template based on the current P&L structure
    const rows: any[] = [];
    rows.push(['الشركة', 'الفترة', 'نوع الفترة', 'العملة']);
    rows.push(['مثال: شركة أ', '2024-01', 'MONTHLY', 'SAR']);
    rows.push([]);
    rows.push(['القسم', 'الفئة', 'البند (إنجليزي)', 'البند (عربي)', 'القيمة']);

    sections.forEach(s => {
      s.categories.forEach(c => {
        c.lineItems.forEach(li => {
          rows.push([s.nameAr, c.nameAr, li.name, li.nameAr, '']);
        });
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب P&L');
    XLSX.writeFile(wb, 'pnl-template.xlsx');
    toast.success('تم تنزيل قالب Excel الديناميكي');
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const sectionTypeColors: Record<string, string> = {
    INCOME: 'bg-emerald-100 text-emerald-700',
    EXPENSE: 'bg-red-100 text-red-700',
    PROFIT: 'bg-blue-100 text-blue-700',
    OTHER: 'bg-amber-100 text-amber-700',
  };
  const sectionTypeLabels: Record<string, string> = {
    INCOME: 'إيرادات', EXPENSE: 'مصاريف', PROFIT: 'أرباح', OTHER: 'أخرى',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold">بنود P&L</h2>
          <p className="text-sm text-muted-foreground mt-1">
            البنية الهرمية: أقسام ← فئات ← بنود — قالب Excel يتعدل تلقائياً حسب البنية
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 ml-1" /> قالب Excel</Button>
          <PageActions onRefresh={load} hideExcel hidePrint />
          <SectionDialog onAdd={(data) => handleCreate('section', data)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FolderTree className="w-4 h-4 text-[#4CAF50]" /> الشجرة الهرمية للبنود</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.map(s => (
            <div key={s.id} className="tree-section">
              {/* Section header — root level */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-l from-[#4CAF50]/10 to-transparent border-r-4 border-[#4CAF50] hover:from-[#4CAF50]/20 transition">
                <button onClick={() => toggle(s.id)} className="flex items-center gap-2 flex-1 text-right">
                  {expanded[s.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4CAF50]/15 text-[#4CAF50]">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2 flex-wrap">
                      {s.nameAr}
                      <Badge className={`text-[10px] ${sectionTypeColors[s.type]}`}>{sectionTypeLabels[s.type]}</Badge>
                      <Badge variant="outline" className="text-[10px]">قسم رئيسي</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">{s.name} · ترتيب {s.order}</div>
                  </div>
                </button>
                <div className="flex gap-1 no-print">
                  <CategoryDialog sectionId={s.id} onAdd={(data) => handleCreate('category', { sectionId: s.id, ...data })} />
                  <EditDialog
                    title="تعديل القسم"
                    defaults={{ name: s.name, nameAr: s.nameAr, type: s.type, order: s.order }}
                    onSave={(data) => handleUpdate('section', s.id, data)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete('section', s.id, s.nameAr)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Categories — children of section, with tree connector lines */}
              {expanded[s.id] && (
                <div className="relative mr-5 mt-1 space-y-1">
                  {/* Vertical connector line */}
                  <div className="absolute right-4 top-0 bottom-4 w-px bg-border" />
                  {s.categories.length === 0 && (
                    <div className="text-xs text-muted-foreground py-2 pr-8 italic">
                      لا توجد فئات — أضف فئة مثل "إيرادات عامة" أو "رواتب"
                    </div>
                  )}
                  {s.categories.map(c => (
                    <div key={c.id} className="relative">
                      {/* Horizontal connector to vertical line */}
                      <div className="absolute right-0 top-5 w-4 h-px bg-border" />
                      <div className="mr-8">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D9488]/5 border-r-2 border-[#0D9488] hover:bg-[#0D9488]/10 transition">
                          <button onClick={() => toggle(c.id)} className="flex items-center gap-2 flex-1 text-right">
                            {expanded[c.id] ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0D9488]/15 text-[#0D9488]">
                              <ListTree className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                                {c.nameAr}
                                {c.isSubtotal && <Badge variant="secondary" className="text-[10px]">إجمالي فرعي</Badge>}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">{c.name}</div>
                            </div>
                          </button>
                        <div className="flex gap-1 no-print">
                          <ItemDialog categoryId={c.id} onAdd={(data) => handleCreate('item', { categoryId: c.id, ...data })} />
                          <EditDialog
                            title="تعديل الفئة"
                            defaults={{ name: c.name, nameAr: c.nameAr, order: c.order, isSubtotal: c.isSubtotal }}
                            includeSubtotal
                            onSave={(data) => handleUpdate('category', c.id, data)}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete('category', c.id, c.nameAr)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {expanded[c.id] && (
                        <div className="relative mr-5 mt-1 space-y-0.5">
                          <div className="absolute right-4 top-0 bottom-3 w-px bg-border" />
                          {c.lineItems.length === 0 && (
                            <div className="text-xs text-muted-foreground py-1.5 pr-8 italic">
                              لا توجد بنود — أضف بنداً مثل "إيرادات المبيعات"
                            </div>
                          )}
                          {c.lineItems.map(li => (
                            <div key={li.id} className="relative">
                              <div className="absolute right-0 top-4 w-4 h-px bg-border" />
                              <div className="mr-8 flex items-center justify-between p-2 rounded hover:bg-muted/40 transition">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground">
                                    <FileText className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <div className="text-sm flex items-center gap-2 flex-wrap">
                                      {li.nameAr}
                                      {li.isTotal && <Badge className="bg-[#4CAF50] text-[10px]">إجمالي</Badge>}
                                      {li.isSubtotal && <Badge variant="secondary" className="text-[10px]">فرعي</Badge>}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{li.key} · {li.name}</div>
                                  </div>
                                </div>
                              <div className="flex gap-1 no-print">
                                <EditDialog
                                  title="تعديل البند"
                                  defaults={{ name: li.name, nameAr: li.nameAr, order: li.order, description: li.description, isTotal: li.isTotal, isSubtotal: li.isSubtotal }}
                                  includeItemFlags
                                  onSave={(data) => handleUpdate('item', li.id, data)}
                                />
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => handleDelete('item', li.id, li.nameAr)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40" />
              لا توجد أقسام بعد. ابدأ بإضافة قسم رئيسي مثل "المبيعات".
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SectionDialog({ onAdd }: { onAdd: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#4CAF50] hover:bg-[#388E3C]"><Plus className="w-4 h-4 ml-1" /> قسم</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>إضافة قسم جديد</DialogTitle></DialogHeader>
        <form action={(fd) => { onAdd(Object.fromEntries(fd.entries())); setOpen(false); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم (إنجليزي)</Label><Input name="name" required placeholder="e.g. Sales" /></div>
            <div><Label>الاسم (عربي)</Label><Input name="nameAr" required placeholder="مثال: المبيعات" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>النوع</Label>
              <Select name="type" defaultValue="INCOME">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">إيرادات</SelectItem>
                  <SelectItem value="EXPENSE">مصاريف</SelectItem>
                  <SelectItem value="PROFIT">أرباح</SelectItem>
                  <SelectItem value="OTHER">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>الترتيب</Label><Input name="order" type="number" defaultValue="0" /></div>
          </div>
          <DialogFooter><Button type="submit" className="bg-[#4CAF50] hover:bg-[#388E3C]">إنشاء</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ sectionId, onAdd }: { sectionId: string; onAdd: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 ml-1" /> فئة</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>إضافة فئة</DialogTitle></DialogHeader>
        <form action={(fd) => { onAdd(Object.fromEntries(fd.entries())); setOpen(false); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم (إنجليزي)</Label><Input name="name" required /></div>
            <div><Label>الاسم (عربي)</Label><Input name="nameAr" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div><Label>الترتيب</Label><Input name="order" type="number" defaultValue="0" /></div>
            <div className="flex items-center gap-2 pb-2">
              <Switch name="isSubtotal" id="cat-sub" /><Label htmlFor="cat-sub">إجمالي فرعي</Label>
            </div>
          </div>
          <DialogFooter><Button type="submit" className="bg-[#4CAF50] hover:bg-[#388E3C]">إنشاء</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({ categoryId, onAdd }: { categoryId: string; onAdd: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-6 text-xs"><Plus className="w-3 h-3 ml-1" /> بند</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>إضافة بند</DialogTitle></DialogHeader>
        <form action={(fd) => {
          const data = Object.fromEntries(fd.entries());
          data.order = Number(data.order) || 0;
          data.isTotal = data.isTotal === 'on';
          data.isSubtotal = data.isSubtotal === 'on';
          onAdd(data); setOpen(false);
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم (إنجليزي)</Label><Input name="name" required /></div>
            <div><Label>الاسم (عربي)</Label><Input name="nameAr" required /></div>
          </div>
          <div><Label>الوصف (اختياري)</Label><Input name="description" /></div>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div><Label>الترتيب</Label><Input name="order" type="number" defaultValue="0" /></div>
            <div className="flex items-center gap-2 pb-2"><Switch name="isSubtotal" id="i-sub" /><Label htmlFor="i-sub">فرعي</Label></div>
            <div className="flex items-center gap-2 pb-2"><Switch name="isTotal" id="i-tot" /><Label htmlFor="i-tot">إجمالي</Label></div>
          </div>
          <DialogFooter><Button type="submit" className="bg-[#4CAF50] hover:bg-[#388E3C]">إنشاء</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ title, defaults, includeSubtotal, includeItemFlags, onSave }: {
  title: string;
  defaults: any;
  includeSubtotal?: boolean;
  includeItemFlags?: boolean;
  onSave: (data: any) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form action={(fd) => {
          const data = Object.fromEntries(fd.entries());
          if (data.order) data.order = Number(data.order);
          if (includeSubtotal) data.isSubtotal = data.isSubtotal === 'on';
          if (includeItemFlags) {
            data.isTotal = data.isTotal === 'on';
            data.isSubtotal = data.isSubtotal === 'on';
          }
          onSave(data); setOpen(false);
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>الاسم (إنجليزي)</Label><Input name="name" defaultValue={defaults.name} required /></div>
            <div><Label>الاسم (عربي)</Label><Input name="nameAr" defaultValue={defaults.nameAr} required /></div>
          </div>
          {defaults.type !== undefined && (
            <div>
              <Label>النوع</Label>
              <Select name="type" defaultValue={defaults.type}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">إيرادات</SelectItem>
                  <SelectItem value="EXPENSE">مصاريف</SelectItem>
                  <SelectItem value="PROFIT">أرباح</SelectItem>
                  <SelectItem value="OTHER">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {defaults.description !== undefined && <div><Label>الوصف</Label><Input name="description" defaultValue={defaults.description || ''} /></div>}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div><Label>الترتيب</Label><Input name="order" type="number" defaultValue={defaults.order} /></div>
            {includeSubtotal && <div className="flex items-center gap-2 pb-2"><Switch name="isSubtotal" id="ed-sub" defaultChecked={defaults.isSubtotal} /><Label htmlFor="ed-sub">فرعي</Label></div>}
          </div>
          {includeItemFlags && (
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><Switch name="isSubtotal" id="ed-is" defaultChecked={defaults.isSubtotal} /><Label htmlFor="ed-is">إجمالي فرعي</Label></div>
              <div className="flex items-center gap-2"><Switch name="isTotal" id="ed-it" defaultChecked={defaults.isTotal} /><Label htmlFor="ed-it">إجمالي كلي</Label></div>
            </div>
          )}
          <DialogFooter><Button type="submit" className="bg-[#4CAF50] hover:bg-[#388E3C]">حفظ</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
