'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import {
  Building2, Lock, Mail, Eye, EyeOff, LogIn, Shield, Zap,
  TrendingUp, BarChart3, Users, Fingerprint,
} from 'lucide-react';

export function LoginPage() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ variant: 'destructive', title: 'البيانات ناقصة', description: 'يرجى إدخال البريد وكلمة المرور' });
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.toLowerCase().trim(), password, totp || undefined);
      if (result.error) {
        toast({ variant: 'destructive', title: 'فشل الدخول', description: result.error });
      } else if (result.requires2FA) {
        setRequires2FA(true);
        toast({ title: 'مطلوب مصادقة ثنائية', description: 'أدخل رمز التحقق من تطبيق المصادقة' });
      } else {
        toast({ title: 'مرحباً بك', description: 'تم تسجيل الدخول بنجاح' });
        window.location.reload();
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'خطأ', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-bl from-[var(--brand-green-deep)]/5 via-background to-[var(--brand-green)]/5">
      {/* ─── Left/Top: Brand & Features ─── */}
      <div className="relative flex-1 overflow-hidden bg-gradient-to-bl from-[var(--brand-green-deep)] via-[var(--brand-green-deep)]/95 to-[var(--brand-green)] p-8 lg:p-16 text-white">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[var(--brand-green)]/30 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-amber-300/10 blur-2xl" />

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
              <p className="text-xs text-white/70 tracking-wider">Dealz Tree — Financial System</p>
            </div>
          </div>

          {/* Hero */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" />
              منصة مالية مؤسسية آمنة
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              نظام التحليل
              <br />
              المالي المتكامل
            </h2>
            <p className="text-white/80 text-base lg:text-lg leading-relaxed">
              منصة موحدة لإدارة الشركات والمصروفات وقيود الأرباح والخسائر، مع تحليل ذكي
              وتنبؤ إحصائي مبني على أسس رياضية ومحاسبية، ونظام صلاحيات متكامل
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BarChart3, label: 'إدارة P&L ومقارنات' },
              { icon: Users, label: 'مستخدمون وصلاحيات' },
              { icon: TrendingUp, label: 'تنبؤ إحصائي رياضي' },
              { icon: Zap, label: 'تحليل ذكي ونسب مالية' },
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
                  disabled={requires2FA}
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

            {requires2FA && (
              <div className="space-y-1.5">
                <Label htmlFor="totp" className="text-xs font-semibold flex items-center gap-1.5">
                  <Fingerprint className="h-3.5 w-3.5 text-primary" />
                  رمز المصادقة الثنائية (6 أرقام)
                </Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="rounded-xl h-11 text-center text-lg tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                  autoFocus
                  dir="ltr"
                />
              </div>
            )}

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

          {/* 2FA notice (only shown when 2FA is required) */}
          {requires2FA && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
              <Fingerprint className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-primary mb-1">المصادقة الثنائية مطلوبة</div>
                <p className="text-muted-foreground leading-relaxed">
                  أدخل رمز التحقق المكوّن من 6 أرقام من تطبيق المصادقة في حقل "رمز المصادقة" أعلاه ثم اضغط "دخول".
                </p>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
            © {new Date().getFullYear()} ديلز تري — جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
