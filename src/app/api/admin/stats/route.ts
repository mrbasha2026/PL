import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  UserRepo, CompanyRepo, ExpenseRepo, PrepaidRepo, PnLRepo,
  AuditRepo, CategoryRepo, BudgetRepo, ForecastRepo,
} from '@/lib/db-repo';
import { DEFAULT_ROLES } from '@/lib/permissions';

// GET /api/admin/stats
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
    const canViewUsers = session.user.permissions.includes('users.view');

    const [
      users, companies, expenses, prepaids, pnlDatasets,
      auditLogs, categories, budgets, forecasts,
    ] = await Promise.all([
      UserRepo.list(),
      CompanyRepo.list(),
      ExpenseRepo.list({ limit: 1000 }),
      PrepaidRepo.list(),
      PnLRepo.list(),
      AuditRepo.list(500),
      CategoryRepo.list(),
      BudgetRepo.list(),
      ForecastRepo.list(),
    ]);

    const activeUsers = users.filter((u) => u.isActive).length;
    const result: any = {
      totalSavedDatasets: pnlDatasets.length,
      totalAuditLogs: auditLogs.length,
      totalCompanies: companies.length,
      activeCompanies: companies.filter((c) => c.isActive).length,
      totalExpenses: expenses.length,
      totalPrepaids: prepaids.length,
      totalCategories: categories.length,
      totalBudgets: budgets.length,
      totalForecasts: forecasts.length,
      serverTime: new Date().toISOString(),
    };

    if (canViewUsers) {
      result.totalUsers = users.length;
      result.activeUsers = activeUsers;
      result.suspendedUsers = users.length - activeUsers;
      result.totalRoles = DEFAULT_ROLES.length;

      // Users by role
      result.usersByRole = DEFAULT_ROLES.map((r) => ({
        roleName: r.name,
        roleNameAr: r.nameAr,
        color: r.color,
        count: users.filter((u) => u.role === r.name).length,
      }));
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
