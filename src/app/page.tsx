'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { SystemShell, type SystemModule } from '@/components/system/SystemShell';
import { Dashboard } from '@/components/modules/Dashboard';
import { CompaniesModule } from '@/components/modules/CompaniesModule';
import { ExpensesModule } from '@/components/modules/ExpensesModule';
import { CategoriesModule } from '@/components/modules/CategoriesModule';
import { PnLModule } from '@/components/modules/PnLModule';
import { PrepaidModule } from '@/components/modules/PrepaidModule';
import { BudgetsModule } from '@/components/modules/BudgetsModule';
import { ForecastsModule } from '@/components/modules/ForecastsModule';
import { SmartAnalysisModule } from '@/components/modules/SmartAnalysisModule';
import { UsersModule } from '@/components/modules/UsersModule';
import { RolesModule } from '@/components/modules/RolesModule';
import { AuditModule } from '@/components/modules/AuditModule';
import { SettingsModule } from '@/components/modules/SettingsModule';
import { LoginPage } from '@/components/auth/LoginPage';
import { UserMenu } from '@/components/auth/UserMenu';

export default function Home() {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission } = useAuth();
  const [activeModule, setActiveModule] = React.useState<SystemModule>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-14 w-14">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand-green-deep)] to-[var(--brand-green)] blur-md opacity-40" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-green-deep)] to-[var(--brand-green)] overflow-hidden">
              <span className="text-2xl font-bold text-white">DZ</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            جاري التحميل...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Check if user has any access at all
  const hasAnyAccess = hasAnyPermission([
    'pnl.view', 'prepaid.view', 'expenses.view', 'companies.view',
    'budgets.view', 'forecasts.view', 'pnl.analyze',
    'users.view', 'roles.view', 'system.audit', 'system.settings',
  ]);

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10">
            <Lock className="h-7 w-7 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">لا تملك صلاحية الوصول</h2>
          <p className="text-sm text-muted-foreground mb-5">
            حسابك لا يملك صلاحيات للوصول إلى أي قسم في النظام. تواصل مع المدير لمنحك الصلاحيات المناسبة.
          </p>
          <UserMenu />
        </div>
      </div>
    );
  }

  // Render active module
  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveModule} />;
      case 'companies':
        return hasPermission('companies.view') ? <CompaniesModule /> : <AccessDenied />;
      case 'expenses':
        return hasPermission('expenses.view') ? <ExpensesModule /> : <AccessDenied />;
      case 'categories':
        return hasPermission('expenses.categories') ? <CategoriesModule /> : <AccessDenied />;
      case 'pnl':
        return hasPermission('pnl.view') ? <PnLModule /> : <AccessDenied />;
      case 'prepaid':
        return hasPermission('prepaid.view') ? <PrepaidModule /> : <AccessDenied />;
      case 'budgets':
        return hasPermission('budgets.view') ? <BudgetsModule /> : <AccessDenied />;
      case 'forecasts':
        return hasPermission('forecasts.view') ? <ForecastsModule /> : <AccessDenied />;
      case 'analysis':
        return hasPermission('pnl.analyze') ? <SmartAnalysisModule /> : <AccessDenied />;
      case 'users':
        return hasPermission('users.view') ? <UsersModule /> : <AccessDenied />;
      case 'roles':
        return hasPermission('roles.view') ? <RolesModule /> : <AccessDenied />;
      case 'audit':
        return hasPermission('system.audit') ? <AuditModule /> : <AccessDenied />;
      case 'settings':
        return hasPermission('system.settings') ? <SettingsModule /> : <AccessDenied />;
      default:
        return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  return (
    <SystemShell activeModule={activeModule} onModuleChange={setActiveModule}>
      {renderModule()}
    </SystemShell>
  );
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
        <div className="text-sm font-medium mb-1">لا تملك صلاحية الوصول لهذا القسم</div>
        <div className="text-xs text-muted-foreground">تواصل مع المدير لمنحك الصلاحية</div>
      </div>
    </div>
  );
}
