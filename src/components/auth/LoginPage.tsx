'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Building2, Lock, Mail, Eye, EyeOff, LogIn, Shield, Zap,
  TrendingUp, BarChart3, Users, ArrowLeft,
} from 'lucide-react';

export function LoginPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ variant: 'destructive', title: 'البيانات ناقصة', description: 'يرجى إدخال البريد وكلمة المرور' });
      return;
    }
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        toast({ variant: 'destructive', title: 'فشل الدخول', description: res.error });
      } else if (res?.ok) {
        toast({ title: 'مرحباً بك', description: 'تم تسجيل الدخول بنجاح' });
        // Force full reload to refresh session
        window.location.reload();
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-bl from-primary/5 via-background to-chart-4/5">
      {/* ─── Left/Top: Brand & Features ─── */}
      <div className="relative flex-1 overflow-hidden bg-gradient-to-bl from-primary via-primary/90 to-chart-4 p-8 lg:p-16 text-white">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-chart-4/20 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-chart-2/10 blur-2xl" />

        <div className="relative max-w-xl mx-auto lg:mx-0 flex flex-col h-full justify-between gap-12">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-white/20 blur-md" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 overflow-hidden">
                <Image src="/logo.png" alt="Dealz Tree" width={36} height={36} className="h-9 w-auto" priority />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ديلز تري</h1>
              <p className="text-xs text-white/70 tracking-wider">Dealz Tree — P&L Platform</p>
            </div>
          </div>

          {/* Hero */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" />
              منصة مالية مؤسسية آمنة
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              نظام إدارة الأرباح
              <br />
              والخسائر المتكامل
            </h2>
            <p className="text-white/80 text-base lg:text-lg leading-relaxed">
              منصة متعددة المستخدمين مع نظام صلاحيات متقدم، تحليل مالي احترافي،
              وتتبع المصروفات المقدمة — كل ذلك في مكان واحد
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BarChart3, label: 'تحليل مالي متقدم' },
              { icon: Users, label: 'إدارة مستخدمين وصلاحيات' },
              { icon: TrendingUp, label: 'مقارنات سنوية وربعية' },
              { icon: Zap, label: 'تحليل ذكي بالـ AI' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-3">
                <f.icon className="h-4 w-4 text-white/90" />
                <span className="text-xs font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right/Bottom: Login Form ─── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-right">
            <h2 className="text-2xl font-bold mb-1.5">تسجيل الدخول</h2>
            <p className="text-sm text-muted-foreground">
              ادخل بياناتك للوصول إلى لوحة التحكم
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl pr-10 h-11"
                  autoComplete="email"
                  autoFocus
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl pr-10 pl-10 h-11"
                  autoComplete="current-password"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl gap-2 text-sm font-semibold"
              size="lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  جاري الدخول...
                </span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  دخول
                </>
              )}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                بيانات الدخول التجريبية
              </p>
              <button
                type="button"
                onClick={() => setShowHint((s) => !s)}
                className="text-[10px] text-primary hover:underline"
              >
                {showHint ? 'إخفاء' : 'عرض'}
              </button>
            </div>
            {showHint && (
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between rounded-md bg-background/60 px-2.5 py-1.5">
                  <span className="text-muted-foreground">البريد:</span>
                  <code className="font-mono">admin@dealztree.com</code>
                </div>
                <div className="flex items-center justify-between rounded-md bg-background/60 px-2.5 py-1.5">
                  <span className="text-muted-foreground">كلمة المرور:</span>
                  <code className="font-mono">admin123</code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@dealztree.com');
                    setPassword('admin123');
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  تعبئة تلقائية
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} ديلز تري — جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
