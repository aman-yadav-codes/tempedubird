process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkUser78() {
  const { db } = await import('../lib/db/db');
  const { getUserById } = await import('../lib/queries/user');
  const { toSessionUser } = await import('../lib/auth/session-user');
  const { toRoleRoutePath } = await import('../lib/auth/role-routes');
  const { hasAdminPagePermission, getFirstAllowedAdminPath } = await import('../lib/auth/permissions');

  const user = await getUserById(db, 78);
  const sessionUser = toSessionUser(user);
  console.log('User 78 session:', {
    id: sessionUser?.id,
    email: sessionUser?.email,
    role_codes: sessionUser?.role_codes,
    primary_role: sessionUser?.primary_role,
    memberships: sessionUser?.memberships?.map((m: any) => ({
      inst_id: m.institution_id,
      inst_name: m.institution_name,
      role: m.role_code,
    })),
  });

  const hasAccess = hasAdminPagePermission(sessionUser, '/admin');
  const target = hasAccess ? '/admin' : (getFirstAllowedAdminPath(sessionUser) || '/admin');
  const roleRedirect = toRoleRoutePath(target, sessionUser);
  console.log('Target:', target, 'Role redirect:', roleRedirect);

  process.exit(0);
}
checkUser78().catch(console.error);

