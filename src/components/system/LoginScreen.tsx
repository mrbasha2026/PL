'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Mail, KeyRound, Eye, EyeOff, Loader2, Fingerprint } from 'lucide-react';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, totp || undefined);
      if (result.error) {
        setError(result.error);
      } else if (result.requires2FA) {
        setRequires2FA(true);
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-slate-50">
      {/* Left side — brand panel */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, white 0%, transparent 40%), radial-gradient(circle at 80% 70%, white 0%, transparent 40%)'
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur rounded-2xl p-3">
              <Image src="/logo.png" alt="Dealz Tree" width={48} height={48} className="rounded-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dealz Tree</h1>
              <p className="text-white/80 text-sm">نظام الإدارة المالية</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              منصة مالية متكاملة
              <br />
              <span className="text-white/90">للحلول الذكية</span>
            </h2>
            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              إدارة قوائم الأرباح والخسائر، المصروفات المقدمة، التحليلات الذكية والتنبؤات المالية
              على أسس رياضية ومحاسبية
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {[
                { icon: ShieldCheck, title: 'مصادقة ثنائية', desc: 'حماية متقدمة للحساب' },
                { icon: KeyRound, title: 'صلاحيات دقيقة', desc: 'أدوار مستخدمين مرنة' },
                { icon: Fingerprint, title: 'سجل تدقيق', desc: 'تتبع كل العمليات' },
                { icon: Lock, title: 'تشفير كامل', desc: 'بياناتك محمية دائماً' },
              ].map((f, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <f.icon className="w-6 h-6 mb-2 text-white" />
                  <div className="font-semibold text-sm">{f.title}</div>
                  <div className="text-xs text-white/70">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-white/60 text-xs">
            © {new Date().getFullYear()} Dealz Tree — جميع الحقوق محفوظة
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <div className="bg-[#4CAF50]/10 p-3 rounded-2xl">
                <Image src="/logo.png" alt="Dealz Tree" width={56} height={56} className="rounded-xl" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-[#388E3C]">تسجيل الدخول</CardTitle>
            <CardDescription className="text-base">
              أدخل بياناتك للوصول إلى نظام الإدارة المالية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="pr-10"
                    required
                    autoComplete="email"
                    autoFocus={!requires2FA}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10 pl-10"
                    required
                    autoComplete="current-password"
                    disabled={requires2FA}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {requires2FA && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="totp" className="text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
                    رمز التحقق الثنائي
                  </Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة
                  </p>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#4CAF50] hover:bg-[#388E3C] text-white"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحقق...</>
                ) : requires2FA ? (
                  <><ShieldCheck className="w-4 h-4" /> تحقق ودخول</>
                ) : (
                  <>تسجيل الدخول</>
                )}
              </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  النظام محمي بالمصادقة الثنائية · جميع العمليات مسجلة
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
