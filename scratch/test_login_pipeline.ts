import { db } from '../lib/db/db';
import { loginUser } from '../services/authService';
import { getUserById } from '../lib/queries/user';
import { toSessionUser } from '../lib/auth/session-user';
import { hasAdminPagePermission, getFirstAllowedAdminPath } from '../lib/auth/permissions';
import { toRoleRoutePath } from '../lib/auth/role-routes';
import { getSubscriptionRedirectForUser } from '../lib/queries/subscriptions';

async function main() {
  console.log("Calling loginUser...");
  const loginRes = await loginUser('dino@gmail.com', '123456');
  console.log("loginRes user:", loginRes.user);

  console.log("Calling getUserById...");
  const fullUser = await getUserById(db, loginRes.user.id);
  console.log("fullUser:", fullUser ? { id: fullUser.id, role_codes: fullUser.role_codes } : null);

  console.log("Calling toSessionUser...");
  const sessionUser = toSessionUser(fullUser!);
  console.log("sessionUser:", sessionUser ? { id: sessionUser.id, role_codes: sessionUser.role_codes } : null);

  const hasDashboardAccess = hasAdminPagePermission(sessionUser, "/admin");
  console.log("hasDashboardAccess:", hasDashboardAccess);

  const targetPath = hasDashboardAccess ? "/admin" : (getFirstAllowedAdminPath(sessionUser) || "/admin/account");
  console.log("targetPath:", targetPath);

  const roleRedirect = toRoleRoutePath(targetPath, sessionUser);
  console.log("roleRedirect:", roleRedirect);

  const subscriptionRedirectTo = await getSubscriptionRedirectForUser(db, fullUser!);
  console.log("subscriptionRedirectTo:", subscriptionRedirectTo);

  console.log("ALL SUCCESSFUL! Target redirect is:", subscriptionRedirectTo || roleRedirect);
  process.exit(0);
}

main().catch(err => {
  console.error("PIPELINE ERROR:", err);
  process.exit(1);
});

