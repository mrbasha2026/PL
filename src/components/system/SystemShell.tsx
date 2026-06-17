'use client';

import React from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, Building2, Receipt, Table2, Clock, Wallet,
  LineChart, Users, Shield, ScrollText, Settings as SettingsIcon,
  Sun, Moon, Search, ChevronLeft, ChevronRight, Menu, X,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/use-auth';
import { UserMenu } from '@/components/auth/UserMenu';

export type SystemModule =
  | 'dashboard'
  | 'companies'
  | 'expenses'
  | 'categories'
  | 'pnl'
  | 'prepaid'
  | 'budgets'
  | 'forecasts'
  | 'analysis'
  | 'users'
  | 'roles'
  | 'audit'
  | 'settings';

interface NavItem {
  id: SystemModule;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  group: 'main' | 'finance' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { id: 'companies', label: 'إدارة الشركات', labelEn: 'Companies', icon: Building2, permission: 'companies.view', group: 'main' },
  { id: 'expenses', label: 'إدارة المصروفات', labelEn: 'Expenses', icon: Receipt, permission: 'expenses.view', group: 'main' },
  { id: 'categories', label: 'التصنيفات والأقسام', labelEn: 'Categories', icon: BookOpen, permission: 'expenses.categories', group: 'main' },

  { id: 'pnl', label: 'الأرباح والخسائر', labelEn: 'P&L', icon: Table2, permission: 'pnl.view', group: 'finance' },
  { id: 'prepaid', label: 'المصروفات المقدمة', labelEn: 'Prepaid', icon: Clock, permission: 'prepaid.view', group: 'finance' },
  { id: 'budgets', label: 'الميزانيات', labelEn: 'Budgets', icon: Wallet, permission: 'budgets.view', group: 'finance' },
  { id: 'forecasts', label: 'التنبؤات', labelEn: 'Forecasts', icon: LineChart, permission: 'forecasts.view', group: 'finance' },
  { id: 'analysis', label: 'التحليل الذكي', labelEn: 'Smart Analysis', icon: LineChart, permission: 'pnl.analyze', group: 'finance' },

  { id: 'users', label: 'المستخدمون', labelEn: 'Users', icon: Users, permission: 'users.view', group: 'admin' },
  { id: 'roles', label: 'الأدوار والصلاحيات', labelEn: 'Roles', icon: Shield, permission: 'roles.view', group: 'admin' },
  { id: 'audit', label: 'سجل التدقيق', labelEn: 'Audit Log', icon: ScrollText, permission: 'system.audit', group: 'admin' },
  { id: 'settings', label: 'إعدادات النظام', labelEn: 'Settings', icon: SettingsIcon, permission: 'system.settings', group: 'admin' },
];

const GROUP_LABELS: Record<NavItem['group'], { ar: string; en: string }> = {
  main: { ar: 'الرئيسية', en: 'Main' },
  finance: { ar: 'الإدارة المالية', en: 'Finance' },
  admin: { ar: 'الإدارة', en: 'Administration' },
};

interface SystemShellProps {
  activeModule: SystemModule;
  onModuleChange: (m: SystemModule) => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function SystemShell({
  activeModule,
  onModuleChange,
  children,
  title,
  subtitle,
  actions,
}: SystemShellProps) {
  const { user, isAuthenticated, hasPermission } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!isAuthenticated || !user) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
  const grouped: Record<NavItem['group'], NavItem[]> = { main: [], finance: [], admin: [] };
  visibleItems.forEach((item) => grouped[item.group].push(item));

  const activeItem = NAV_ITEMS.find((i) => i.id === activeModule);

  return (
    <div className="min-h-screen flex bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 z-50 h-screen flex-shrink-0
          sys-sidebar border-l border-sidebar-border
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
          ${mobileOpen ? 'right-0' : '-right-[280px] lg:right-0'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-green-deep)] to-[var(--brand-green)] overflow-hidden shadow-lg shadow-[var(--brand-green-deep)]/30">
              <Image src="/logo.png" alt="Dealz Tree" width={26} height={26} className="h-7 w-auto" priority />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">ديلز تري</h1>
                  <span className="text-[9px] text-sidebar-foreground/50 tracking-wider">Dealz Tree</span>
                </div>
                <p className="text-[10px] text-sidebar-foreground/60 truncate">نظام التحليل المالي</p>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {(Object.keys(grouped) as NavItem['group'][]).map((group) => {
              const items = grouped[group];
              if (!items.length) return null;
              return (
                <div key={group}>
                  {!sidebarCollapsed && (
                    <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
                      {GROUP_LABELS[group].ar}
                      <span className="block text-[8px] opacity-60">{GROUP_LABELS[group].en}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onModuleChange(item.id);
                            setMobileOpen(false);
                          }}
                          className={`sys-sidebar-item w-full ${isActive ? 'active' : ''} ${
                            sidebarCollapsed ? 'justify-center px-0' : ''
                          }`}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <span className="flex-1 text-right truncate">{item.label}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <Avatar className="h-9 w-9 border-2 border-sidebar-primary/40">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: `linear-gradient(135deg, var(--brand-green-deep), var(--brand-green))`,
                    color: 'white',
                  }}
                >
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-sidebar-foreground truncate">
                    {user.name || user.email}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: user.roleColor || '#10b981' }}
                    />
                    <span className="text-[10px] text-sidebar-foreground/70 truncate">
                      {user.roleNameAr || user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center h-9 border-t border-sidebar-border text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition"
          >
            {sidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 no-print">
          <div className="flex h-full items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {activeItem && <activeItem.icon className="h-4 w-4 text-brand" />}
                <h2 className="text-base font-bold truncate">
                  {title || activeItem?.label}
                </h2>
              </div>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
              )}
            </div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}

            <div className="hidden md:flex items-center gap-2 rounded-xl bg-muted/50 border border-border/40 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="بحث سريع..."
                className="bg-transparent text-xs outline-none w-32 lg:w-48 placeholder:text-muted-foreground/70"
              />
              <kbd className="hidden lg:inline text-[9px] px-1 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground">⌘K</kbd>
            </div>

            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 rounded-xl hover:bg-primary/8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-primary" />}
              </Button>
            )}

            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
