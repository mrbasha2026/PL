'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useAuth, ROLE_LABELS } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, Building2, FileSpreadsheet, Wallet, Users,
  ShieldCheck, Settings, LogOut, Menu, Sun, Moon, Bell,
  ChevronLeft, Calculator, BookOpen, TrendingUp, BarChart3,
  GitCompareArrows, Sparkles, Download, ChevronDown, UserCircle, KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type View =
  | 'dashboard' | 'companies' | 'pnl-data' | 'pnl-structure' | 'prepaid' | 'expenses'
  | 'reports' | 'forecast' | 'ai-analysis' | 'users' | 'roles' | 'audit' | 'settings';

interface NavItem {
  id: View;
  label: string;
  icon: any;
  group: 'main' | 'data' | 'analysis' | 'admin';
  roles?: string[]; // If specified, only these roles can see it
}

const NAV_ITEMS: NavItem[] = [
  // Main
  { id: 'dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard, group: 'main' },
  // Data Management
  { id: 'companies', label: 'إدارة الشركات', icon: Building2, group: 'data' },
  { id: 'pnl-structure', label: 'بنود P&L', icon: FileSpreadsheet, group: 'data', roles: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'] },
  { id: 'pnl-data', label: 'بيانات P&L', icon: Calculator, group: 'data' },
  { id: 'prepaid', label: 'المصروفات المقدمة', icon: Wallet, group: 'data' },
  { id: 'expenses', label: 'المصروفات', icon: TrendingUp, group: 'data' },
  // Analysis
  { id: 'reports', label: 'التقارير', icon: BarChart3, group: 'analysis' },
  { id: 'forecast', label: 'التنبؤات', icon: TrendingUp, group: 'analysis' },
  { id: 'ai-analysis', label: 'التحليل الذكي', icon: Sparkles, group: 'analysis' },
  // Admin
  { id: 'users', label: 'المستخدمون', icon: Users, group: 'admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { id: 'roles', label: 'الأدوار والصلاحيات', icon: KeyRound, group: 'admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { id: 'audit', label: 'سجل التدقيق', icon: ShieldCheck, group: 'admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { id: 'settings', label: 'الإعدادات', icon: Settings, group: 'admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

const GROUP_LABELS: Record<string, string> = {
  main: 'الرئيسية',
  data: 'إدارة البيانات',
  analysis: 'التحليلات',
  admin: 'الإدارة',
};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 hover:bg-muted"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
    </Button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initials = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 px-2 sm:px-3 gap-2 hover:bg-muted">
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.image || ''} />
            <AvatarFallback className="bg-[#4CAF50] text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium">{user.name || 'مستخدم'}</span>
            <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name || 'مستخدم'}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Badge variant="secondary" className="mt-1 w-fit text-[10px]">{ROLE_LABELS[user.role]}</Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.hash = '#settings'}>
          <UserCircle className="h-4 w-4" /> الملف الشخصي
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.location.hash = '#settings'}>
          <ShieldCheck className="h-4 w-4" /> المصادقة الثنائية
          {user.twoFactorEnabled && <Badge className="mr-auto bg-[#4CAF50] text-[10px]">مفعّلة</Badge>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:text-red-600">
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLinks({ current, onSelect }: { current: View; onSelect: (v: View) => void }) {
  const { user } = useAuth();
  const groups = ['main', 'data', 'analysis', 'admin'] as const;

  return (
    <nav className="flex flex-col gap-5 p-3">
      {groups.map(group => {
        const items = NAV_ITEMS.filter(item => {
          if (item.group !== group) return false;
          if (item.roles && user && !item.roles.includes(user.role)) return false;
          return true;
        });
        if (items.length === 0) return null;
        return (
          <div key={group} className="space-y-1">
            <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold">
              {GROUP_LABELS[group]}
            </div>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  'system-nav-item w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/90',
                  current === item.id && 'active'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export function SystemLayout({
  current, onChange, children, title, subtitle, actions,
}: {
  current: View;
  onChange: (v: View) => void;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const handleSelect = (v: View) => {
    onChange(v);
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-sidebar text-sidebar-foreground border-l border-sidebar-border sticky top-0 h-screen no-print">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border bg-sidebar-primary/5">
          <Image src="/logo.png" alt="Dealz Tree" width={36} height={36} className="rounded-lg" />
          <div className="leading-tight">
            <div className="text-sm font-bold text-sidebar-primary">Dealz Tree</div>
            <div className="text-[10px] text-sidebar-foreground/60">نظام الإدارة المالية</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks current={current} onSelect={handleSelect} />
        </div>
        <div className="border-t border-sidebar-border p-3 text-[10px] text-sidebar-foreground/50 text-center">
          v2.0 · {new Date().getFullYear()}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0 bg-sidebar text-sidebar-foreground">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
            <Image src="/logo.png" alt="Dealz Tree" width={36} height={36} className="rounded-lg" />
            <div className="leading-tight">
              <div className="text-sm font-bold text-sidebar-primary">Dealz Tree</div>
              <div className="text-[10px] text-sidebar-foreground/60">نظام الإدارة المالية</div>
            </div>
          </div>
          <div className="overflow-y-auto">
            <NavLinks current={current} onSelect={handleSelect} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-border flex items-center px-4 sm:px-6 gap-3 no-print shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate flex items-center gap-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <Button variant="ghost" size="icon" className="relative hover:bg-muted">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-white dark:bg-slate-900 py-3 px-6 no-print">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>© {new Date().getFullYear()} Dealz Tree — نظام الإدارة المالية</span>
            <span>جميع البيانات محفوظة في قاعدة البيانات</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { NAV_ITEMS };
