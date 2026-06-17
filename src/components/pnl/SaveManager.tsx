'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Save, Database, Trash2, Download, RefreshCw, Loader2,
  AlertCircle, FileText, Calendar, Building2,
  HardDrive, Cloud, Plus, Clock,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { useToast } from '@/hooks/use-toast';
import type { CompanyPnL, JournalEntry } from '@/lib/pnl-types';

// ─── localStorage-backed persistent storage ─────────────────────────────
// Replaces the old /api/pnl/save Prisma+SQLite endpoint which fails on
// serverless hosts (Vercel) because SQLite needs a persistent filesystem.
// localStorage works everywhere, syncs with the existing Zustand persist
// pattern, and never produces 500 errors.

const STORAGE_KEY = 'pnl-saved-datasets-v1';

interface SavedDataset {
  id: string;
  name: string;
  description: string | null;
  companies: CompanyPnL[];
  journalEntries: JournalEntry[];
  notes: Record<string, string>;
  companyCount: number;
  periodCount: number;
  datasetCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SavedDatasetSummary {
  id: string;
  name: string;
  description: string | null;
  companyCount: number;
  periodCount: number;
  datasetCount: number;
  createdAt: string;
  updatedAt: string;
}

function readAllDatasets(): SavedDataset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllDatasets(datasets: SavedDataset[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
    // Notify other tabs / same-tab listeners
    window.dispatchEvent(new CustomEvent('pnl-saved-datasets-changed'));
  } catch (err) {
    console.error('Failed to write saved datasets:', err);
  }
}

function toSummary(ds: SavedDataset): SavedDatasetSummary {
  return {
    id: ds.id,
    name: ds.name,
    description: ds.description,
    companyCount: ds.companyCount,
    periodCount: ds.periodCount,
    datasetCount: ds.datasetCount,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
  };
}

interface SaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveManager({ isOpen, onClose }: SaveManagerProps) {
  const { companies, journalEntries, notes, clearAll, addCompanies, addJournalEntries, setNote } = usePnLStore();
  const { toast } = useToast();

  const [mode, setMode] = useState<'list' | 'save'>('list');
  const [datasets, setDatasets] = useState<SavedDatasetSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Save form state
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      // Simulate async for UI feedback consistency
      await new Promise((r) => setTimeout(r, 120));
      const all = readAllDatasets().map(toSummary);
      setDatasets(all);
    } catch {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'فشل في قراءة البيانات المحفوظة',
      });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadList();
      setMode('list');
      setSaveName('');
      setSaveDescription('');
    }
  }, [isOpen, loadList]);

  // Listen for cross-tab updates
  useEffect(() => {
    const handler = () => loadList();
    window.addEventListener('pnl-saved-datasets-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('pnl-saved-datasets-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [loadList]);

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast({
        variant: 'destructive',
        title: 'الاسم مطلوب',
        description: 'يرجى إدخال اسم للمجموعة',
      });
      return;
    }
    if (companies.length === 0) {
      toast({
        variant: 'destructive',
        title: 'لا توجد بيانات',
        description: 'ارفع بيانات أولاً قبل الحفظ',
      });
      return;
    }

    setSaving(true);
    try {
      // Simulate slight delay for UX feedback
      await new Promise((r) => setTimeout(r, 200));

      const all = readAllDatasets();
      const existingIdx = all.findIndex(
        (d) => d.name.trim().toLowerCase() === saveName.trim().toLowerCase()
      );

      const companyNames = new Set(companies.map((c) => c.companyName));
      const periods = new Set(companies.map((c) => c.period));
      const now = new Date().toISOString();

      const dataset: SavedDataset = {
        id: existingIdx >= 0 ? all[existingIdx].id : `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: saveName.trim(),
        description: saveDescription.trim() || null,
        companies,
        journalEntries,
        notes,
        companyCount: companyNames.size,
        periodCount: periods.size,
        datasetCount: companies.length,
        createdAt: existingIdx >= 0 ? all[existingIdx].createdAt : now,
        updatedAt: now,
      };

      let action: 'created' | 'updated';
      if (existingIdx >= 0) {
        all[existingIdx] = dataset;
        action = 'updated';
      } else {
        all.push(dataset);
        action = 'created';
      }
      writeAllDatasets(all);

      toast({
        title: 'تم الحفظ بنجاح',
        description: action === 'updated'
          ? `تم تحديث المجموعة "${dataset.name}"`
          : `تم حفظ المجموعة "${dataset.name}"`,
      });
      setMode('list');
      setSaveName('');
      setSaveDescription('');
      loadList();
    } catch {
      toast({
        variant: 'destructive',
        title: 'فشل الحفظ',
        description: 'حدث خطأ غير متوقع',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string, name: string) => {
    setLoadingId(id);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const all = readAllDatasets();
      const dataset = all.find((d) => d.id === id);
      if (!dataset) {
        toast({
          variant: 'destructive',
          title: 'فشل التحميل',
          description: 'المجموعة غير موجودة',
        });
        return;
      }
      // Replace current state with loaded data
      clearAll();
      if (dataset.companies?.length > 0) {
        addCompanies(dataset.companies);
      }
      if (dataset.journalEntries?.length > 0) {
        addJournalEntries(dataset.journalEntries);
      }
      if (dataset.notes && typeof dataset.notes === 'object') {
        Object.entries(dataset.notes).forEach(([k, v]) => {
          setNote(k, v as string);
        });
      }
      toast({
        title: 'تم التحميل',
        description: `تم تحميل مجموعة "${name}" — ${dataset.companies.length} مجموعة بيانات`,
      });
      onClose();
    } catch {
      toast({
        variant: 'destructive',
        title: 'فشل التحميل',
        description: 'حدث خطأ غير متوقع',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مجموعة "${name}"؟ لا يمكن التراجع.`)) return;
    setDeletingId(id);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const all = readAllDatasets();
      const next = all.filter((d) => d.id !== id);
      writeAllDatasets(next);
      toast({
        title: 'تم الحذف',
        description: `تم حذف مجموعة "${name}"`,
      });
      loadList();
    } catch {
      toast({
        variant: 'destructive',
        title: 'فشل الحذف',
        description: 'حدث خطأ غير متوقع',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasData = companies.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" aria-describedby={undefined}>
        {/* Accessible title/description for screen readers (visually hidden) */}
        <DialogTitle className="sr-only">إدارة الحفظ الدائم</DialogTitle>
        <DialogDescription className="sr-only">
          احفظ بياناتك محلياً في المتصفح — تبقى محفوظة بشكل دائم حتى بعد إغلاق المتصفح
        </DialogDescription>

        {/* Header */}
        <div className="relative overflow-hidden px-7 py-6">
          <div className="absolute inset-0 bg-gradient-to-bl from-violet-600 via-purple-500 to-fuchsia-600" />
          <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-xl" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10 shadow-lg">
                <HardDrive className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white leading-tight tracking-tight">
                  الحفظ الدائم
                </h2>
                <p className="text-white/80 text-xs mt-1 font-medium">
                  احفظ بياناتك في المتصفح — تبقى محفوظة حتى بعد مسح ذاكرة الجلسة
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all"
              aria-label="إغلاق"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="border-b bg-muted/20 px-7 py-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 w-fit">
            <button
              onClick={() => setMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                mode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              المحفوظات ({datasets.length})
            </button>
            <button
              onClick={() => setMode('save')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                mode === 'save'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              حفظ جديد
            </button>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-220px)]">
          <div className="px-7 py-5">
            {/* LIST MODE */}
            {mode === 'list' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">
                    {loadingList ? 'جارٍ التحميل...' : `${datasets.length} مجموعة محفوظة`}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={loadList}
                    disabled={loadingList}
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingList ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                </div>

                {loadingList && datasets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
                  </div>
                ) : datasets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                      <Database className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">لا توجد مجموعات محفوظة</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      احفظ بياناتك الحالية بالضغط على "حفظ جديد" لتبقى محفوظة بشكل دائم
                    </p>
                    {hasData && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 gap-1.5"
                        onClick={() => setMode('save')}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        حفظ البيانات الحالية
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {datasets.map((ds) => (
                      <div
                        key={ds.id}
                        className="group rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-border/80 transition-all p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <FileText className="h-4 w-4 text-violet-500 shrink-0" />
                              <h4 className="text-sm font-bold truncate">{ds.name}</h4>
                            </div>
                            {ds.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ds.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              <Badge variant="outline" className="gap-1 text-[10px] py-0 px-1.5 rounded-md bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400 border-violet-200/50 dark:border-violet-800/30">
                                <Building2 className="h-2.5 w-2.5" />
                                {ds.companyCount} شركة
                              </Badge>
                              <Badge variant="outline" className="gap-1 text-[10px] py-0 px-1.5 rounded-md">
                                <Calendar className="h-2.5 w-2.5" />
                                {ds.periodCount} فترة
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 rounded-md">
                                {ds.datasetCount} مجموعة
                              </Badge>
                              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(ds.updatedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs rounded-lg"
                              onClick={() => handleLoad(ds.id, ds.name)}
                              disabled={loadingId === ds.id}
                            >
                              {loadingId === ds.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              تحميل
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                              onClick={() => handleDelete(ds.id, ds.name)}
                              disabled={deletingId === ds.id}
                              title="حذف"
                            >
                              {deletingId === ds.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SAVE MODE */}
            {mode === 'save' && (
              <div className="space-y-4">
                {!hasData ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-base font-semibold mb-1">لا توجد بيانات حالياً</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      ارفع ملف Excel أولاً، ثم عد هنا لحفظه بشكل دائم
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Current Data Summary */}
                    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Cloud className="h-4 w-4 text-violet-500" />
                        <p className="text-xs font-bold text-violet-700 dark:text-violet-400">البيانات الحالية التي ستُحفظ</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xl font-bold tabular-nums">
                            {new Set(companies.map((c) => c.companyName)).size}
                          </p>
                          <p className="text-[10px] text-muted-foreground">شركة</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold tabular-nums">
                            {new Set(companies.map((c) => c.period)).size}
                          </p>
                          <p className="text-[10px] text-muted-foreground">فترة</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold tabular-nums">
                            {companies.length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">مجموعة</p>
                        </div>
                      </div>
                      {journalEntries.length > 0 && (
                        <p className="mt-2 text-[10px] text-muted-foreground text-center">
                          + {journalEntries.length} قيد محاسبي
                        </p>
                      )}
                    </div>

                    {/* Save Form */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="save-name" className="text-xs font-semibold">
                          اسم المجموعة <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="save-name"
                          value={saveName}
                          onChange={(e) => setSaveName(e.target.value)}
                          placeholder="مثال: بيانات الربع الأول 2026"
                          className="rounded-xl"
                          maxLength={100}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          إذا كان الاسم موجوداً مسبقاً سيتم تحديث المجموعة
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="save-desc" className="text-xs font-semibold">
                          الوصف (اختياري)
                        </Label>
                        <Textarea
                          id="save-desc"
                          value={saveDescription}
                          onChange={(e) => setSaveDescription(e.target.value)}
                          placeholder="وصف مختصر لمحتوى هذه المجموعة..."
                          className="rounded-xl resize-none"
                          rows={2}
                          maxLength={300}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setMode('list')}
                        disabled={saving}
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs bg-gradient-to-l from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                        onClick={handleSave}
                        disabled={saving || !saveName.trim()}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            جارٍ الحفظ...
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            حفظ دائم
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
