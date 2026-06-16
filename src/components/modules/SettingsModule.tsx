'use client';

import React from 'react';
import {
  Settings as SettingsIcon, Database, Globe, Shield, Lock,
  Server, Cpu, HardDrive, Activity, CheckCircle2, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            إعدادات النظام تُدار من ملف البيئة <code className="font-mono bg-muted/50 px-1 rounded">.env</code> على الخادم.
            القيم المعروضة هنا للقراءة فقط. لتعديلها، حدّث ملف البيئة وأعد تشغيل الخادم.
          </div>
        </CardContent>
      </Card>

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
            <InfoBox icon={Shield} label="المصادقة" value="NextAuth + bcrypt" />
          </div>
        </CardContent>
      </Card>
    </div>
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
