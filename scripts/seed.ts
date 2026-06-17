// ─── Seed Script ──────────────────────────────────────────────────────────
// Creates default roles and an initial admin user if they don't exist.
// Run with: bun run scripts/seed.ts

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLES } from '../src/lib/permissions';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create default roles
  console.log('  → Creating default roles...');
  for (const role of DEFAULT_ROLES) {
    await db.role.upsert({
      where: { name: role.name },
      create: {
        name: role.name,
        nameAr: role.nameAr,
        description: role.description,
        color: role.color,
        isSystem: role.isSystem,
        permissionsJson: JSON.stringify(role.permissions),
      },
      update: {
        // Only update permissions for system roles to keep them in sync
        permissionsJson: role.isSystem ? JSON.stringify(role.permissions) : undefined,
        description: role.description,
        color: role.color,
      },
    });
    console.log(`    ✓ ${role.nameAr} (${role.name}) — ${role.permissions.length} permissions`);
  }

  // 2. Create default admin user
  console.log('  → Creating default admin user...');
  const adminEmail = 'admin@dealztree.com';
  const adminPassword = 'admin123';
  const adminRole = await db.role.findUnique({ where: { name: 'admin' } });

  if (!adminRole) {
    throw new Error('Admin role not found');
  }

  const existing = await db.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.user.create({
      data: {
        email: adminEmail,
        name: 'مدير النظام',
        passwordHash,
        roleId: adminRole.id,
        status: 'active',
      },
    });
    console.log(`    ✓ Admin user created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`    ✓ Admin user already exists: ${adminEmail}`);
  }

  // 3. Create default system settings
  console.log('  → Creating default system settings...');
  const settings = [
    { key: 'site.name', value: 'ديلز تري — Dealz Tree' },
    { key: 'site.description', value: 'لوحة مقارنة الأرباح والخسائر' },
    { key: 'auth.allowSelfRegistration', value: 'false' },
    { key: 'auth.defaultRoleId', value: '' }, // will be set to viewer role below
    { key: 'auth.sessionTimeoutMinutes', value: '10080' }, // 7 days
  ];
  for (const s of settings) {
    await db.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: {}, // don't override existing
    });
  }
  // Set default role to viewer
  const viewerRole = await db.role.findUnique({ where: { name: 'viewer' } });
  if (viewerRole) {
    await db.systemSetting.upsert({
      where: { key: 'auth.defaultRoleId' },
      create: { key: 'auth.defaultRoleId', value: viewerRole.id },
      update: { value: viewerRole.id },
    });
  }
  console.log(`    ✓ ${settings.length} system settings configured`);

  console.log('\n✅ Seed completed successfully!');
  console.log(`\n📋 Admin login:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n⚠️  Change the admin password after first login!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
