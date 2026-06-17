// ─── Permission Catalog ───────────────────────────────────────────────────
// Central definition of all permissions in the system.
// Each permission has: key, Arabic label, English label, group.

export type PermissionGroup =
  | 'pnl'
  | 'prepaid'
  | 'expenses'
  | 'companies'
  | 'budgets'
  | 'forecasts'
  | 'storage'
  | 'users'
  | 'system';

export interface PermissionDef {
  key: string;
  labelAr: string;
  labelEn: string;
  group: PermissionGroup;
  description?: string;
}

export const PERMISSION_GROUPS: { value: PermissionGroup; labelAr: string; labelEn: string; icon?: string }[] = [
  { value: 'pnl', labelAr: 'الأرباح والخسائر', labelEn: 'P&L', icon: 'Table2' },
  { value: 'prepaid', labelAr: 'المصروفات المقدمة', labelEn: 'Prepaid', icon: 'Clock' },
  { value: 'expenses', labelAr: 'المصروفات', labelEn: 'Expenses', icon: 'Receipt' },
  { value: 'companies', labelAr: 'الشركات', labelEn: 'Companies', icon: 'Building2' },
  { value: 'budgets', labelAr: 'الميزانيات', labelEn: 'Budgets', icon: 'Wallet' },
  { value: 'forecasts', labelAr: 'التنبؤات', labelEn: 'Forecasts', icon: 'LineChart' },
  { value: 'storage', labelAr: 'التخزين', labelEn: 'Storage', icon: 'Database' },
  { value: 'users', labelAr: 'المستخدمون والصلاحيات', labelEn: 'Users', icon: 'Users' },
  { value: 'system', labelAr: 'النظام', labelEn: 'System', icon: 'Settings' },
];

export const PERMISSIONS: PermissionDef[] = [
  // P&L
  { key: 'pnl.view', labelAr: 'عرض لوحة P&L', labelEn: 'View P&L', group: 'pnl' },
  { key: 'pnl.upload', labelAr: 'رفع بيانات P&L', labelEn: 'Upload P&L', group: 'pnl' },
  { key: 'pnl.delete', labelAr: 'حذف بيانات P&L', labelEn: 'Delete P&L', group: 'pnl' },
  { key: 'pnl.export', labelAr: 'تصدير P&L', labelEn: 'Export P&L', group: 'pnl' },
  { key: 'pnl.analyze', labelAr: 'التحليل الذكي والتنبؤ', labelEn: 'Smart Analysis', group: 'pnl' },

  // Prepaid
  { key: 'prepaid.view', labelAr: 'عرض المصروفات المقدمة', labelEn: 'View Prepaid', group: 'prepaid' },
  { key: 'prepaid.create', labelAr: 'إنشاء مصروف مقدم', labelEn: 'Create Prepaid', group: 'prepaid' },
  { key: 'prepaid.edit', labelAr: 'تعديل المصروفات المقدمة', labelEn: 'Edit Prepaid', group: 'prepaid' },
  { key: 'prepaid.delete', labelAr: 'حذف المصروفات المقدمة', labelEn: 'Delete Prepaid', group: 'prepaid' },

  // Expenses
  { key: 'expenses.view', labelAr: 'عرض المصروفات', labelEn: 'View Expenses', group: 'expenses' },
  { key: 'expenses.create', labelAr: 'إنشاء مصروف', labelEn: 'Create Expense', group: 'expenses' },
  { key: 'expenses.edit', labelAr: 'تعديل المصروفات', labelEn: 'Edit Expenses', group: 'expenses' },
  { key: 'expenses.delete', labelAr: 'حذف المصروفات', labelEn: 'Delete Expenses', group: 'expenses' },
  { key: 'expenses.categories', labelAr: 'إدارة تصنيفات المصروفات', labelEn: 'Manage Categories', group: 'expenses' },

  // Companies
  { key: 'companies.view', labelAr: 'عرض الشركات', labelEn: 'View Companies', group: 'companies' },
  { key: 'companies.create', labelAr: 'إنشاء شركة', labelEn: 'Create Company', group: 'companies' },
  { key: 'companies.edit', labelAr: 'تعديل الشركات', labelEn: 'Edit Companies', group: 'companies' },
  { key: 'companies.delete', labelAr: 'حذف الشركات', labelEn: 'Delete Companies', group: 'companies' },

  // Budgets
  { key: 'budgets.view', labelAr: 'عرض الميزانيات', labelEn: 'View Budgets', group: 'budgets' },
  { key: 'budgets.create', labelAr: 'إنشاء ميزانية', labelEn: 'Create Budget', group: 'budgets' },
  { key: 'budgets.edit', labelAr: 'تعديل الميزانيات', labelEn: 'Edit Budgets', group: 'budgets' },
  { key: 'budgets.delete', labelAr: 'حذف الميزانيات', labelEn: 'Delete Budgets', group: 'budgets' },

  // Forecasts
  { key: 'forecasts.view', labelAr: 'عرض التنبؤات', labelEn: 'View Forecasts', group: 'forecasts' },
  { key: 'forecasts.run', labelAr: 'تشغيل نماذج التنبؤ', labelEn: 'Run Forecasts', group: 'forecasts' },
  { key: 'forecasts.delete', labelAr: 'حذف نماذج التنبؤ', labelEn: 'Delete Forecasts', group: 'forecasts' },

  // Storage
  { key: 'save.view', labelAr: 'عرض البيانات المحفوظة', labelEn: 'View Saved', group: 'storage' },
  { key: 'save.create', labelAr: 'حفظ بيانات جديدة', labelEn: 'Save Data', group: 'storage' },
  { key: 'save.delete', labelAr: 'حذف البيانات المحفوظة', labelEn: 'Delete Saved', group: 'storage' },

  // Users
  { key: 'users.view', labelAr: 'عرض المستخدمين', labelEn: 'View Users', group: 'users' },
  { key: 'users.create', labelAr: 'إنشاء مستخدمين', labelEn: 'Create Users', group: 'users' },
  { key: 'users.edit', labelAr: 'تعديل المستخدمين', labelEn: 'Edit Users', group: 'users' },
  { key: 'users.delete', labelAr: 'حذف المستخدمين', labelEn: 'Delete Users', group: 'users' },
  { key: 'roles.view', labelAr: 'عرض الأدوار', labelEn: 'View Roles', group: 'users' },
  { key: 'roles.assign', labelAr: 'تعيين الأدوار للمستخدمين', labelEn: 'Assign Roles', group: 'users' },

  // System
  { key: 'system.audit', labelAr: 'عرض سجل التدقيق', labelEn: 'View Audit Log', group: 'system' },
  { key: 'system.settings', labelAr: 'إعدادات النظام', labelEn: 'System Settings', group: 'system' },
  { key: 'system.dashboard', labelAr: 'لوحة تحكم النظام', labelEn: 'Admin Dashboard', group: 'system' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// ─── Default Roles (stored as User.role text field) ────────────────────────
// Role permissions are computed at runtime from this catalog.
export interface RoleDef {
  name: string;
  nameAr: string;
  description: string;
  color: string;
  isSystem: boolean;
  permissions: string[];
}

export const DEFAULT_ROLES: RoleDef[] = [
  {
    name: 'admin',
    nameAr: 'مدير عام',
    description: 'صلاحيات كاملة على النظام',
    color: '#dc2626',
    isSystem: true,
    permissions: PERMISSION_KEYS,
  },
  {
    name: 'manager',
    nameAr: 'مدير',
    description: 'إدارة البيانات بدون إدارة المستخدمين',
    color: '#7c3aed',
    isSystem: true,
    permissions: [
      'pnl.view', 'pnl.upload', 'pnl.delete', 'pnl.export', 'pnl.analyze',
      'prepaid.view', 'prepaid.create', 'prepaid.edit', 'prepaid.delete',
      'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'expenses.categories',
      'companies.view', 'companies.create', 'companies.edit',
      'budgets.view', 'budgets.create', 'budgets.edit', 'budgets.delete',
      'forecasts.view', 'forecasts.run', 'forecasts.delete',
      'save.view', 'save.create', 'save.delete',
      'system.audit',
    ],
  },
  {
    name: 'accountant',
    nameAr: 'محاسب',
    description: 'إدخال وتعديل المصروفات والمصروفات المقدمة',
    color: '#059669',
    isSystem: true,
    permissions: [
      'pnl.view', 'pnl.export',
      'prepaid.view', 'prepaid.create', 'prepaid.edit',
      'expenses.view', 'expenses.create', 'expenses.edit',
      'companies.view',
      'budgets.view',
      'forecasts.view',
      'save.view',
    ],
  },
  {
    name: 'analyst',
    nameAr: 'محلل مالي',
    description: 'التحليل والتنبؤ بدون تعديل البيانات',
    color: '#d97706',
    isSystem: true,
    permissions: [
      'pnl.view', 'pnl.export', 'pnl.analyze',
      'prepaid.view',
      'expenses.view',
      'companies.view',
      'budgets.view', 'budgets.create',
      'forecasts.view', 'forecasts.run',
      'save.view', 'save.create',
    ],
  },
  {
    name: 'viewer',
    nameAr: 'مشاهد',
    description: 'عرض فقط بدون تعديل',
    color: '#2563eb',
    isSystem: true,
    permissions: ['pnl.view', 'prepaid.view', 'expenses.view', 'companies.view', 'budgets.view', 'forecasts.view', 'save.view'],
  },
];

export function getRoleDef(name: string): RoleDef | undefined {
  return DEFAULT_ROLES.find((r) => r.name === name);
}

export function getRolePermissions(name: string): string[] {
  return getRoleDef(name)?.permissions ?? [];
}

export function getRoleNameAr(name: string): string {
  return getRoleDef(name)?.nameAr ?? name;
}

export function getRoleColor(name: string): string {
  return getRoleDef(name)?.color ?? '#64748b';
}

// ─── Helpers ──────────────────────────────────────────────────────────────
export function getPermissionDef(key: string): PermissionDef | undefined {
  return PERMISSIONS.find((p) => p.key === key);
}

export function getPermissionsByGroup(perms: string[]): Record<PermissionGroup, string[]> {
  const result = {} as Record<PermissionGroup, string[]>;
  PERMISSION_GROUPS.forEach((g) => (result[g.value] = []));
  perms.forEach((p) => {
    const def = getPermissionDef(p);
    if (def) result[def.group].push(p);
  });
  return result;
}
