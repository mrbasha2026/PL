'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ChevronDown, LogOut, User as UserIcon, KeyRound, Shield,
  Circle, Settings,
} from 'lucide-react';

export function UserMenu({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleChangePassword = async () => {
    if (newPwd.length < 6) {
      toast({ variant: 'destructive', title: 'كلمة المرور قصيرة', description: '6 أحرف على الأقل' });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ variant: 'destructive', title: 'كلمتا المرور غير متطابقتين' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');
      toast({ title: 'تم التحديث', description: 'تم تغيير كلمة المرور بنجاح' });
      setPwdDialogOpen(false);
      setCurPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-2 gap-1.5 rounded-xl hover:bg-muted/60">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-[11px] font-bold shrink-0"
              style={{ backgroundColor: user.roleColor }}
            >
              {initials}
            </div>
            <div className="hidden sm:flex flex-col items-start gap-0 leading-none">
              <span className="text-xs font-semibold truncate max-w-[120px]">
                {user.name || user.email.split('@')[0]}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{user.roleNameAr}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5" dir="rtl">
          {/* Header */}
          <DropdownMenuLabel className="px-2 py-2 mb-1 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: user.roleColor }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{user.name || user.email.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md px-2 py-0.5"
                style={{ backgroundColor: `${user.roleColor}15`, color: user.roleColor }}
              >
                <Shield className="h-2.5 w-2.5" />
                {user.roleNameAr}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                <Circle className="h-1.5 w-1.5 fill-current" />
                نشط
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Quick stats */}
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
            {user.permissions.length} صلاحية مفعّلة
          </div>

          <DropdownMenuGroup>
            {onOpenAdmin && user.permissions.length > 0 && (
              <DropdownMenuItem
                className="rounded-lg text-xs gap-2 cursor-pointer"
                onClick={() => onOpenAdmin()}
              >
                <Settings className="h-3.5 w-3.5" />
                لوحة الإدارة
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="rounded-lg text-xs gap-2 cursor-pointer"
              onClick={() => setPwdDialogOpen(true)}
            >
              <KeyRound className="h-3.5 w-3.5" />
              تغيير كلمة المرور
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="rounded-lg text-xs gap-2 cursor-pointer text-destructive hover:bg-destructive/8 hover:text-destructive focus:bg-destructive/8 focus:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Password Dialog */}
      <Dialog open={pwdDialogOpen} onOpenChange={(o) => !o && setPwdDialogOpen(false)}>
        <DialogContent className="!max-w-md p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl" dir="rtl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">تغيير كلمة المرور</DialogTitle>
          <DialogDescription className="sr-only">نموذج تغيير كلمة المرور</DialogDescription>

          <div className="relative overflow-hidden px-6 py-5">
            <div className="absolute inset-0 bg-gradient-to-bl from-primary to-chart-4" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/10">
                <KeyRound className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">تغيير كلمة المرور</h2>
                <p className="text-white/70 text-[11px]">أدخل كلمة المرور الحالية ثم الجديدة</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">كلمة المرور الحالية</Label>
              <Input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className="rounded-xl" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">كلمة المرور الجديدة</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="rounded-xl" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">تأكيد كلمة المرور</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="rounded-xl" dir="ltr" />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="ghost" size="sm" className="text-xs rounded-xl" onClick={() => setPwdDialogOpen(false)}>إلغاء</Button>
            <Button size="sm" className="text-xs rounded-xl" disabled={loading} onClick={handleChangePassword}>
              {loading ? 'جاري...' : 'تحديث'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
