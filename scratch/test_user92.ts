process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../lib/db/db');
  const { syncPermissionRegistry } = await import('../lib/auth/sync-permission-registry');
  const { getUserById } = await import('../lib/queries/user');
  const { toSessionUser } = await import('../lib/auth/session-user');
  const { canAccessAdminArea, hasAdminPagePermission, getFirstAllowedAdminPath } = await import('../lib/auth/permissions');

  console.log('--- Testing syncPermissionRegistry ---');
  try {
    await syncPermissionRegistry(db, true);
    console.log('syncPermissionRegistry SUCCESS');
  } catch (err: any) {
    console.error('syncPermissionRegistry ERROR:', err);
  }

  console.log('--- Testing User 92 ---');
  const user = await getUserById(db, 92);
  const sessionUser = toSessionUser(user);
  console.log('User 92 primary_role:', sessionUser?.primary_role);
  console.log('User 92 role_codes:', sessionUser?.role_codes);
  console.log('User 92 permissions count:', sessionUser?.permissions?.length);
  console.log('canAccessAdminArea:', canAccessAdminArea(sessionUser));
  console.log('hasAdminPagePermission /platformadmin:', hasAdminPagePermission(sessionUser, '/platformadmin'));
  console.log('hasAdminPagePermission /admin:', hasAdminPagePermission(sessionUser, '/admin'));
  console.log('hasAdminPagePermission /platformadmin/finance/income:', hasAdminPagePermission(sessionUser, '/platformadmin/finance/income'));
  console.log('getFirstAllowedAdminPath:', getFirstAllowedAdminPath(sessionUser));

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
