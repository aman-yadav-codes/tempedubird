process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Simulate permissions logic from permissions.ts and page.tsx
const {
  isPermissionAssignableToRole,
  isPlatformOnlyPermission,
  FULL_ACCESS_PERMISSION,
} = require('../lib/auth/permissions');

function filterPermissionsForRoleScope(permissions, roleScope, roleCode) {
  if (!roleScope) return permissions;
  return permissions.filter((permission) => {
    const code = permission.code ? String(permission.code) : "";
    if (!isPermissionAssignableToRole(code, roleCode, roleScope)) return false;
    return roleScope === "institution"
      ? !isPlatformOnlyPermission(code)
      : isPlatformOnlyPermission(code);
  });
}

function getPermissionOptionsForField(configTitle, permissions, roleScope, roleCode, defaultPermissionIds) {
  const scopedPermissions = filterPermissionsForRoleScope(permissions, roleScope, roleCode);
  if (configTitle !== "Institution Role Permissions") return scopedPermissions;
  if (defaultPermissionIds.size === 0) return [];
  return scopedPermissions.filter((permission) => defaultPermissionIds.has(String(permission.id)));
}

async function checkDialogOptions() {
  const permsRes = await pool.query("SELECT id, name, code FROM permissions WHERE COALESCE(is_deleted, false) = false");
  const permissions = permsRes.rows;

  const rolesRes = await pool.query(`
    SELECT r.id, r.name, r.code, st.code as scope_code
    FROM roles r
    LEFT JOIN scope_types st ON st.id = r.scope_id
  `);
  const roles = rolesRes.rows;

  console.log('Testing "Role Permissions" dialog for all roles:');
  for (const r of roles) {
    const opts = getPermissionOptionsForField("Role Permissions", permissions, r.scope_code, r.code, new Set());
    console.log(`Role: ${r.name} (${r.code}, scope: ${r.scope_code}) -> ${opts.length} assignable permissions`);
  }

  await pool.end();
}
checkDialogOptions().catch(console.error);
