'use client';

import React from 'react';
import {
  Settings as SettingsIcon, Database, Globe, Shield, Lock,
  Server, Cpu, HardDrive, Activity, CheckCircle2, Info, QrCode, KeyRound, X,
  Smartphone, Fingerprint, AlertCircle, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageActions } from '@/components/system/PageActions';
import { useToast } from '@/hooks/use-toast';

export function SettingsModule() {
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      title: 'معلومات الموقع',
      icon: Globe,
      color: '#0d9488',
      keys: ['site.name', 'site.description'],
    },
    {
      title: 'المصادقة والأمان',
      icon: Lock,
      color: '#dc2626',
      keys: ['auth.allowSelfRegistration', 'auth.defaultRole', 'auth.sessionTimeoutMinutes'],
    },
    {
      title: 'قاعدة البيانات',
      icon: Database,
      color: '#7c3aed',
      keys: ['database.provider', 'database.url'],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-xl font-bold">الإعدادات</h2>
          <p className="text-sm text-muted-foreground mt-1">إعدادات النظام وملف المستخدم</p>
        </div>
        <PageActions hideExcel hidePrint />
      </div>

      <Card className="bg-blue-500/5 border-blue-500/20 no-print">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            إعدادات النظام تُدار من ملف البيئة <code className="font-mono bg-muted/50 px-1 rounded">.env</code> على الخادم.
            القيم المعروضة هنا للقراءة فقط. لتعديلها، حدّث ملف البيئة وأعد تشغيل الخادم.
          </div>
        </CardContent>
      </Card>

      {/* 2FA Section — interactive */}
      <TwoFactorSection />

      {/* PWA Install Section */}
      <PWAInstallSection />

      {/* Settings sections (read-only) */}
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل...</div>
      ) : (
        sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `${section.color}20`, color: section.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.keys.map((key) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-muted-foreground">{key}</div>
                      <div className="text-sm font-medium truncate">
                        {key === 'database.url' && settings[key]
                          ? settings[key].replace(/\/\/([^:]+):([^@]+)@/, '//$1:••••@')
                          : settings[key] || '—'}
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* System info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            معلومات النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoBox icon={Cpu} label="الإطار" value="Next.js 16" />
            <InfoBox icon={HardDrive} label="قاعدة البيانات" value="Supabase / Postgres" />
            <InfoBox icon={Activity} label="وقت الخادم" value={new Date().toLocaleString('ar-SA')} />
            <InfoBox icon={Shield} label="المصادقة" value="NextAuth + bcrypt + TOTP" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── 2FA Setup Section ─────────────────────────────────────────────────────
function TwoFactorSection() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<{ enabled: boolean; pending: boolean } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [setupData, setSetupData] = React.useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const loadStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/2fa');
      const data = await res.json();
      setStatus({ enabled: data.enabled, pending: data.pending });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { loadStatus(); }, [loadStatus]);

  async function startSetup() {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetupData({ secret: data.secret, uri: data.uri });
      toast({ title: 'تم', description: 'تم إنشاء سر المصادقة — أكمل الإعداد' });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  }

  async function verifyAndEnable() {
    if (!code.trim() || code.trim().length !== 6) {
      toast({ title: 'تحقق', description: 'أدخل الرمز المكوّن من 6 أرقام', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'تم', description: 'تم تفعيل المصادقة الثنائية بنجاح' });
      setSetupData(null);
      setCode('');
      loadStatus();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  }

  async function disable() {
    if (!code.trim() || code.trim().length !== 6) {
      toast({ title: 'تحقق', description: 'أدخل رمز المصادقة الحالي للتعطيل', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'تم', description: 'تم تعطيل المصادقة الثنائية' });
      setCode('');
      loadStatus();
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  }

  if (loading) {
    return <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">جاري التحقق من حالة المصادقة...</div></CardContent></Card>;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Fingerprint className="h-4 w-4" />
          </div>
          المصادقة الثنائية (2FA)
          {status?.enabled && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 ml-1" />
              مفعّلة
            </Badge>
          )}
          {status?.pending && (
            <Badge variant="outline" className="text-amber-600">
              <AlertCircle className="h-3 w-3 ml-1" />
              قيد الإعداد
            </Badge>
          )}
          {!status?.enabled && !status?.pending && (
            <Badge variant="secondary">غير مفعّلة</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          أضف طبقة حماية إضافية لحسابك. عند التفعيل، سيُطلب منك رمز تحقق من تطبيق المصادقة عند كل تسجيل دخول.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Setup flow */}
        {setupData && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="text-sm font-semibold flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                إعداد المصادقة الثنائية
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSetupData(null); setCode(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ol className="text-xs space-y-1.5 text-muted-foreground list-decimal pr-4">
              <li>ثبّت تطبيق مصادقة على هاتفك (Google Authenticator, Authy, Microsoft Authenticator)</li>
              <li>امسح رمز QR أدناه أو أدخل السر يدوياً</li>
              <li>أدخل الرمز المكوّن من 6 أرقام الذي يظهر في التطبيق لتأكيد الإعداد</li>
            </ol>

            {/* QR code placeholder — uses external API since we don't have a QR library */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="bg-white p-2 rounded-lg border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.uri)}`}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="rounded"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">السر (في حال لم ينجح المسح)</Label>
                <code className="block p-2 rounded bg-muted font-mono text-xs break-all">
                  {setupData.secret}
                </code>
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">رمز التحقق (6 أرقام)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              <Button onClick={verifyAndEnable} disabled={busy || code.length !== 6} className="bg-brand-gradient">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 ml-1" />}
                تأكيد وتفعيل
              </Button>
            </div>
          </div>
        )}

        {/* Disable flow */}
        {!setupData && status?.enabled && (
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              تعطيل المصادقة الثنائية
            </div>
            <p className="text-xs text-muted-foreground">
              أدخل رمز المصادقة الحالي لتأكيد التعطيل. سيُطلب منك فقط كلمة المرور عند تسجيل الدخول بعد التعطيل.
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">رمز المصادقة الحالي</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
              <Button variant="destructive" onClick={disable} disabled={busy || code.length !== 6}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 ml-1" />}
                تعطيل
              </Button>
            </div>
          </div>
        )}

        {/* Action button */}
        {!setupData && !status?.enabled && (
          <Button onClick={startSetup} disabled={busy} className="bg-brand-gradient">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4 ml-1" />}
            إعداد المصادقة الثنائية
          </Button>
        )}
        {!setupData && status?.pending && !status?.enabled && (
          <Button onClick={startSetup} disabled={busy} variant="outline">
            متابعة الإعداد
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── PWA Install Section ───────────────────────────────────────────────────
function PWAInstallSection() {
  const [canInstall, setCanInstall] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const deferredPromptRef = React.useRef<any>(null);

  React.useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    const handler = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setCanInstall(false); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const choice = await deferredPromptRef.current.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setCanInstall(false);
    }
    deferredPromptRef.current = null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Smartphone className="h-4 w-4" />
          </div>
          تثبيت التطبيق (PWA)
          {installed && (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 ml-1" />
              مثبّت
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          ثبّت النظام كتطبيق على جهازك للوصول السريع وتجربة شبيهة بالتطبيقات الأصلية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {installed ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            التطبيق مثبّت على هذا الجهاز
          </div>
        ) : canInstall ? (
          <Button onClick={install} className="bg-brand-gradient">
            <Smartphone className="h-4 w-4 ml-1" />
            تثبيت التطبيق
          </Button>
        ) : (
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="flex items-start gap-2">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              لتثبيت التطبيق:
            </p>
            <ul className="list-disc pr-6 space-y-1">
              <li><strong>Chrome / Edge:</strong> اضغط أيقونة التثبيت (⊕) في شريط العنوان</li>
              <li><strong>Safari (iOS):</strong> زر المشاركة → "إلى الشاشة الرئيسية"</li>
              <li><strong>Firefox / Chrome (Android):</strong> القائمة → "تثبيت التطبيق"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border border-border/40 bg-card">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-semibold truncate">{value}</div>
    </div>
  );
}
