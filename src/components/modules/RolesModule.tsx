'use client';

import React from 'react';
import { Shield, Lock, Users, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PERMISSIONS, PERMISSION_GROUPS, DEFAULT_ROLES } from '@/lib/permissions';

export function RolesModule() {
  return (
    <div className="space-y-5">
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            الأدوار في هذا النظام مُعرَّفة برمجياً في ملف <code className="font-mono bg-muted/50 px-1 rounded">src/lib/permissions.ts</code>.
            كل دور له مجموعة صلاحيات ثابتة لا يمكن تعديلها من الواجهة لضمان أمان النظام. لتعديل الأدوار،
            يجب تحديث الكود المصدري ثم إعادة النشر. يمكنك تعيين دور لأي مستخدم من صفحة "المستخدمون".
          </div>
        </CardContent>
      </Card>

      {/* Roles grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DEFAULT_ROLES.map((role) => (
          <Card key={role.name} className="overflow-hidden">
            <div
              className="h-1.5"
              style={{ background: `linear-gradient(to left, ${role.color}, ${role.color}55)` }}
            />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: `${role.color}20`, color: role.color }}
                  >
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{role.nameAr}</CardTitle>
                    <CardDescription className="text-[10px] font-mono">{role.name}</CardDescription>
                  </div>
                </div>
                {role.isSystem && (
                  <Badge variant="outline" className="text-[9px]">
                    <Lock className="h-2.5 w-2.5 ml-0.5" />
                    نظامي
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">{role.description}</div>
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  الصلاحيات ({role.permissions.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((p) => {
                    const def = PERMISSIONS.find((x) => x.key === p);
                    return (
                      <Badge
                        key={p}
                        variant="secondary"
                        className="text-[9px] font-mono"
                        title={def?.labelAr}
                      >
                        {p}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            كتالوج الصلاحيات الكامل
          </CardTitle>
          <CardDescription className="text-xs">
            قائمة بكل الصلاحيات المتاحة في النظام، مجمّعة حسب القسم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERMISSION_GROUPS.map((group) => {
              const perms = PERMISSIONS.filter((p) => p.group === group.value);
              return (
                <div key={group.value} className="rounded-xl border border-border/60 p-3">
                  <div className="text-xs font-bold mb-2 text-primary">
                    {group.labelAr}
                    <span className="block text-[9px] font-normal text-muted-foreground">{group.labelEn}</span>
                  </div>
                  <div className="space-y-1.5">
                    {perms.map((p) => (
                      <div key={p.key} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{p.labelAr}</div>
                          <div className="text-[9px] font-mono text-muted-foreground">{p.key}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
