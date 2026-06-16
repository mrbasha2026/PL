// ─── Permission Catalog ───────────────────────────────────────────────────
// Central definition of all permissions in the system.
// Each permission has: key, Arabic label, English label, group.

export type PermissionGroup =
  | 'pnl'
  | 'prepaid'
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

export const PERMISSION_GROUPS: { value: PermissionGroup; labelAr: string; labelEn: string }[] = [
  { value: 'pnl', labelAr: 'الأرباح والخسائر', labelEn: 'P&L' },
  { value: 'prepaid', labelAr: 'المصروفات المقدمة', labelEn: 'Prepaid' },
  { value: 'storage', labelAr: 'التخزين', labelEn: 'Storage' },
  { value: 'users', labelAr: 'المستخدمون', labelEn: 'Users' },
  { value: 'system', labelAr: 'النظام', labelEn: 'System' },
];

export const PERMISSIONS: PermissionDef[] = [
  // P&L
  { key: 'pnl.view', labelAr: 'عرض لوحة P&L', labelEn: 'View P&L', group: 'pnl' },
  { key: 'pnl.upload', labelAr: 'رفع بيانات P&L', labelEn: 'Upload P&L', group: 'pnl' },
  { key: 'pnl.delete', labelAr: 'حذف بيانات P&L', labelEn: 'Delete P&L', group: 'pnl' },
  { key: 'pnl.export', labelAr: 'تصدير P&L', labelEn: 'Export P&L', group: 'pnl' },
  // Prepaid
  { key: 'prepaid.view', labelAr: 'عرض المصروفات المقدمة', labelEn: 'View Prepaid', group: 'prepaid' },
  { key: 'prepaid.create', labelAr: 'إنشاء مصروف مقدم', labelEn: 'Create Prepaid', group: 'prepaid' },
  { key: 'prepaid.edit', labelAr: 'تعديل المصروفات المقدمة', labelEn: 'Edit Prepaid', group: 'prepaid' },
  { key: 'prepaid.delete', labelAr: 'حذف المصروفات المقدمة', labelEn: 'Delete Prepaid', group: 'prepaid' },
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
  { key: 'roles.create', labelAr: 'إنشاء أدوار', labelEn: 'Create Roles', group: 'users' },
  { key: 'roles.edit', labelAr: 'تعديل الأدوار', labelEn: 'Edit Roles', group: 'users' },
  { key: 'roles.delete', labelAr: 'حذف الأدوار', labelEn: 'Delete Roles', group: 'users' },
  // System
  { key: 'system.audit', labelAr: 'عرض سجل التدقيق', labelEn: 'View Audit Log', group: 'system' },
  { key: 'system.settings', labelAr: 'إعدادات النظام', labelEn: 'System Settings', group: 'system' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// ─── Default Roles ────────────────────────────────────────────────────────
export const DEFAULT_ROLES = [
  {
    name: 'admin',
    nameAr: 'مدير عام',
    description: 'صلاحيات كاملة على النظام',
    color: '#ef4444',
    isSystem: true,
    permissions: PERMISSION_KEYS, // all permissions
  },
  {
    name: 'manager',
    nameAr: 'مدير',
    description: 'إدارة البيانات بدون إدارة المستخدمين',
    color: '#8b5cf6',
    isSystem: true,
    permissions: [
      'pnl.view', 'pnl.upload', 'pnl.delete', 'pnl.export',
      'prepaid.view', 'prepaid.create', 'prepaid.edit', 'prepaid.delete',
      'save.view', 'save.create', 'save.delete',
    ],
  },
  {
    name: 'accountant',
    nameAr: 'محاسب',
    description: 'إدخال وتعديل المصروفات المقدمة',
    color: '#10b981',
    isSystem: true,
    permissions: [
      'pnl.view', 'pnl.export',
      'prepaid.view', 'prepaid.create', 'prepaid.edit',
      'save.view',
    ],
  },
  {
    name: 'viewer',
    nameAr: 'مشاهد',
    description: 'عرض فقط بدون تعديل',
    color: '#3b82f6',
    isSystem: true,
    permissions: ['pnl.view', 'prepaid.view', 'save.view'],
  },
] as const;

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
