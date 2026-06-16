'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Save, Database, Trash2, Download, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, FileText, Calendar, Building2,
  HardDrive, Cloud, Plus, Pencil,
} from 'lucide-react';
import { usePnLStore } from '@/lib/pnl-store';
import { useToast } from '@/hooks/use-toast';

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

interface SaveManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveManager({ isOpen, onClose }: SaveManagerProps) {
  const { companies, journalEntries, notes, clearAll, addCompanies, addJournalEntries } = usePnLStore();
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
      const res = await fetch('/api/pnl/save');
      const data = await res.json();
      if (res.ok) {
        setDatasets(data.datasets || []);
      } else {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: data.error || 'فشل في جلب القائمة',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'تعذّر الاتصال بالخادم',
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
      const res = await fetch('/api/pnl/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          description: saveDescription.trim(),
          companies,
          journalEntries,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'تم الحفظ بنجاح',
          description: data.action === 'updated'
            ? `تم تحديث المجموعة "${data.name}"`
            : `تم حفظ المجموعة "${data.name}"`,
        });
        setMode('list');
        setSaveName('');
        setSaveDescription('');
        loadList();
      } else {
        toast({
          variant: 'destructive',
          title: 'فشل الحفظ',
          description: data.error || 'حدث خطأ',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'فشل الحفظ',
        description: 'تعذّر الاتصال بالخادم',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = async (id: string, name: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/pnl/save/${id}`);
      const data = await res.json();
      if (res.ok) {
        // Replace current state with loaded data
        clearAll();
        if (data.companies?.length > 0) {
          addCompanies(data.companies);
        }
        if (data.journalEntries?.length > 0) {
          addJournalEntries(data.journalEntries);
        }
        // Notes — set via store directly (we need a way to set notes; for now we use individual setNote)
        if (data.notes && typeof data.notes === 'object') {
          const { setNote } = usePnLStore.getState();
          Object.entries(data.notes).forEach(([k, v]) => {
            setNote(k, v as string);
          });
        }
        toast({
          title: 'تم التحميل',
          description: `تم تحميل مجموعة "${name}" — ${data.companies.length} مجموعة بيانات`,
        });
        onClose();
      } else {
        toast({
          variant: 'destructive',
          title: 'فشل التحميل',
          description: data.error || 'حدث خطأ',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'فشل التحميل',
        description: 'تعذّر الاتصال بالخادم',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف مجموعة "${name}"؟ لا يمكن التراجع.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/pnl/save/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'تم الحذف',
          description: `تم حذف مجموعة "${name}"`,
        });
        loadList();
      } else {
        toast({
          variant: 'destructive',
          title: 'فشل الحذف',
          description: data.error || 'حدث خطأ',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'فشل الحذف',
        description: 'تعذّر الاتصال بالخادم',
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
      <DialogContent className="!max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl">
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
                  احفظ بياناتك في قاعدة البيانات — تبقى محفوظة حتى بعد مسح المتصفح
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all"
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

// Inline clock icon (avoid extra import)
function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
