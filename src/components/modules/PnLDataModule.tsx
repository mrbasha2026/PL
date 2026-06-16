'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, Plus, Trash2, Loader2, Database, History, Calculator, Download } from 'lucide-react';
import { PageActions } from '@/components/system/PageActions';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Company { id: string; name: string; color: string; }
interface Section { id: string; name: string; nameAr: string; type: string; order: number; categories: { id: string; name: string; nameAr: string; order: number; isSubtotal: boolean; lineItems: { id: string; name: string; nameAr: string; key: string; order: number; isTotal: boolean; isSubtotal: boolean; description?: string | null }[] }[]; }
interface PnLDatum {
  id: string; companyId: string; companyName: string; companyColor: string;
  period: string; periodType: string; currency: string; source: string; uploadedAt: string;
  valuesByItem: { key: string; name: string; nameAr: string; value: number; section: string; category: string; isTotal: boolean; isSubtotal: boolean }[];
}

export function PnLDataModule() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [data, setData] = useState<PnLDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, dRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/pnl-structure'),
        fetch('/api/pnl-data'),
      ]);
      const [c, s, d] = await Promise.all([cRes.json(), sRes.json(), dRes.json()]);
      setCompanies(c.companies || []);
      setSections(s.sections || []);
      setData(d.data || []);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleExcelUpload(file: File) {
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      let totalSaved = 0;
      let errors: string[] = [];

      // Build lookup: name (lowercase) → lineItem ID
      const itemByName: Record<string, { id: string; sectionName: string; categoryName: string }> = {};
      sections.forEach(s => s.categories.forEach(c => c.lineItems.forEach(li => {
        itemByName[li.name.toLowerCase()] = { id: li.id, sectionName: s.nameAr, categoryName: c.nameAr };
      })));

      // Build company lookup: name → id
      const companyByName: Record<string, Company> = {};
      companies.forEach(c => { companyByName[c.name.toLowerCase()] = c; companyByName[c.name] = c; });

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) continue;

        // Detect format: either "wide" (period in columns) or "long" (section/category/item/value per row)
        const header = rows[0].map((h: any) => String(h).trim());
        // Long format: ['القسم', 'الفئة', 'البند (إنجليزي)', 'البند (عربي)', 'القيمة'] OR [company, period, periodType, currency]
        if (header.some(h => h.includes('القسم') || h.includes('الفئة') || h.includes('البند'))) {
          // Long format — needs company & period from somewhere. Try sheetName as "company | period"
          // Or look for a metadata row above
          let companyName = sheetName;
          let period = '';
          // Find data rows (skip header)
          const dataRows = rows.slice(1).filter(r => r[0] && String(r[0]).trim() !== '');
          // Detect company/period from first row if it's metadata
          if (dataRows[0] && !itemByName[String(dataRows[0][0]).toLowerCase()]) {
            // Could be metadata row "company, period, ..."
            const firstCell = String(dataRows[0][0]).trim();
            if (companyByName[firstCell.toLowerCase()]) {
              companyName = firstCell;
              period = String(dataRows[0][1] || '').trim();
              dataRows.shift();
            }
          }
          const company = companyByName[companyName.toLowerCase()];
          if (!company) { errors.push(`الشركة غير موجودة: ${companyName}`); continue; }
          if (!period) { errors.push(`الفترة غير محددة في الورقة: ${sheetName}`); continue; }

          const values: Record<string, number> = {};
          for (const row of dataRows) {
            const itemName = String(row[2] || row[3] || '').trim(); // English name preferred
            const value = parseFloat(String(row[4] || '0'));
            if (!itemName || isNaN(value)) continue;
            const lookup = itemByName[itemName.toLowerCase()];
            if (lookup) {
              values[lookup.id] = (values[lookup.id] || 0) + value;
            }
          }
          if (Object.keys(values).length === 0) { errors.push(`لا توجد بيانات صالحة في الورقة: ${sheetName}`); continue; }

          // Save
          const res = await fetch('/api/pnl-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyId: company.id, period, source: 'EXCEL', values }),
          });
          if (!res.ok) { const e = await res.json(); errors.push(`${sheetName}: ${e.error}`); }
          else totalSaved++;
        } else {
          // Wide format: each column after company name is a period
          // First column = line item name, other columns = periods
          // Sheet name = company name
          const company = companyByName[sheetName.toLowerCase()] || companyByName[sheetName];
          if (!company) { errors.push(`الشركة غير موجودة: ${sheetName}`); continue; }

          const periods = header.slice(1).map(h => String(h).trim()).filter(Boolean);
          for (let pIdx = 0; pIdx < periods.length; pIdx++) {
            const period = periods[pIdx];
            const colIdx = pIdx + 1;
            const values: Record<string, number> = {};
            for (let r = 1; r < rows.length; r++) {
              const row = rows[r];
              const itemName = String(row[0] || '').trim();
              if (!itemName) continue;
              const lookup = itemByName[itemName.toLowerCase()];
              if (lookup) {
                const v = parseFloat(String(row[colIdx] || ''));
                if (!isNaN(v)) values[lookup.id] = (values[lookup.id] || 0) + v;
              }
            }
            if (Object.keys(values).length === 0) continue;
            const res = await fetch('/api/pnl-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ companyId: company.id, period, source: 'EXCEL', values }),
            });
            if (!res.ok) { const e = await res.json(); errors.push(`${sheetName} - ${period}: ${e.error}`); }
            else totalSaved++;
          }
        }
      }

      if (totalSaved > 0) {
        toast.success(`تم رفع بيانات ${totalSaved} فترة بنجاح`);
      }
      if (errors.length > 0) {
        toast.warning(`تحذيرات: ${errors.length} خطأ — انظر للحdetails`);
        console.log('Upload errors:', errors);
      }
      load();
    } catch (e: any) {
      toast.error('فشل رفع الملف: ' + e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`حذف بيانات ${label}؟`)) return;
    try {
      await fetch(`/api/pnl-data?id=${id}`, { method: 'DELETE' });
      toast.success('تم الحذف');
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-2xl font-bold">بيانات P&L</h2>
          <p className="text-sm text-muted-foreground mt-1">رفع Excel + إدخال يدوي — كل البيانات تُخزن في قاعدة البيانات</p>
        </div>
        <div className="flex gap-2">
          <PageActions onRefresh={load} hideExcel hidePrint />
        </div>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload"><Upload className="w-4 h-4 ml-1" /> رفع Excel</TabsTrigger>
          <TabsTrigger value="manual"><Calculator className="w-4 h-4 ml-1" /> إدخال يدوي</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 ml-1" /> البيانات الحالية ({data.length})</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-[#4CAF50]" /> رفع ملف Excel</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-[#4CAF50] transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) handleExcelUpload(e.dataTransfer.files[0]);
                }}
              >
                {uploading ? (
                  <><Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-[#4CAF50]" /><p className="font-medium">جارٍ المعالجة...</p></>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium mb-1">اسحب ملف Excel هنا أو اضغط للاختيار</p>
                    <p className="text-xs text-muted-foreground">يدعم الصيغتين: طويلة (بنود في صفوف) أو عريضة (فترات في أعمدة)</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleExcelUpload(e.target.files[0])}
                />
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                <p className="font-semibold mb-1">تنسيق الملف:</p>
                <ul className="text-xs space-y-1 list-disc pr-4 text-muted-foreground">
                  <li>كل ورقة تمثل شركة — اسم الورقة = اسم الشركة</li>
                  <li>الصف الأول: أسماء البنود بالإنجليزية أو العربية</li>
                  <li>العمود الأول: اسم البند، بقية الأعمدة: الفترات (مثال: 2024-01, 2024-02)</li>
                  <li>أو الصيغة الطويلة: القسم، الفئة، البند، القيمة</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <ManualEntryForm companies={companies} sections={sections} onSaved={load} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4 text-[#4CAF50]" /> البيانات المحفوظة</CardTitle>
            </CardHeader>
            <CardContent>
              {data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  لا توجد بيانات محفوظة بعد
                </div>
              ) : (
                <div className="space-y-2">
                  {data.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.companyColor }} />
                        <div>
                          <div className="font-medium text-sm">{d.companyName}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.period} · {d.valuesByItem.length} بند · {d.currency} · {d.source === 'EXCEL' ? 'Excel' : 'يدوي'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.uploadedAt).toLocaleDateString('ar-SA')}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDelete(d.id, `${d.companyName} - ${d.period}`)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ManualEntryForm({ companies, sections, onSaved }: {
  companies: Company[];
  sections: Section[];
  onSaved: () => void;
}) {
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [currency, setCurrency] = useState('SAR');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!companyId || !period) { toast.error('يرجى اختيار الشركة والفترة'); return; }
    setSaving(true);
    try {
      // Convert string values to numbers, filter zeros/empty
      const numValues: Record<string, number> = {};
      for (const [k, v] of Object.entries(values)) {
        const n = parseFloat(v);
        if (!isNaN(n) && n !== 0) numValues[k] = n;
      }
      const res = await fetch('/api/pnl-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, period, periodType, currency, source: 'MANUAL', values: numValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`تم حفظ ${Object.keys(numValues).length} قيمة`);
      setValues({});
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Calculator className="w-4 h-4 text-[#4CAF50]" /> إدخال يدوي</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>الشركة</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="اختر شركة" /></SelectTrigger>
              <SelectContent>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>الفترة</Label>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div>
            <Label>نوع الفترة</Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">شهري</SelectItem>
                <SelectItem value="QUARTERLY">ربعي</SelectItem>
                <SelectItem value="YEARLY">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>العملة</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          {sections.map(s => (
            <div key={s.id} className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 p-2 font-semibold text-sm flex items-center gap-2">
                <span className="w-1.5 h-4 rounded bg-[#4CAF50]" />
                {s.nameAr}
              </div>
              <div className="p-2 space-y-1">
                {s.categories.map(c => (
                  <div key={c.id} className="space-y-1">
                    <div className="text-xs text-muted-foreground px-2 pt-1">{c.nameAr}</div>
                    {c.lineItems.map(li => (
                      <div key={li.id} className="grid grid-cols-3 gap-2 items-center px-2 py-1">
                        <div className="col-span-2 text-sm flex items-center gap-1">
                          {li.nameAr}
                          {li.isTotal && <Badge className="bg-[#4CAF50] text-[10px]">إجمالي</Badge>}
                          {li.isSubtotal && <Badge variant="secondary" className="text-[10px]">فرعي</Badge>}
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={values[li.id] || ''}
                          onChange={(e) => setValues(v => ({ ...v, [li.id]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setValues({})}>مسح</Button>
          <Button onClick={handleSave} disabled={saving || !companyId} className="bg-[#4CAF50] hover:bg-[#388E3C]">
            {saving ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جارٍ الحفظ</> : <>حفظ البيانات</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
