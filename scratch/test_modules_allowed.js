process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/^["']|["']$/g, '');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const permsRes = await pool.query(`
    SELECT p.code
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = 334
  `);
  const perms = new Set(permsRes.rows.map(r => r.code));

  // Let's check ADMIN_PERMISSION_MODULES keys:
  // dashboard, analytics, users.allusers, affiliate, managestaff.allstaff, rolespermissions..., settings...
  const modules = [
    { key: "dashboard", page: "/admin" },
    { key: "analytics", page: "/admin/analytics" },
    { key: "users.allusers", page: "/admin/users" },
    { key: "affiliate", page: "/admin/affiliate" },
    { key: "managestaff.allstaff", page: "/admin/staff" },
    { key: "rolespermissions.scopetypes", page: "/admin/access-control/scope-types" },
    { key: "rolespermissions.permissions", page: "/admin/access-control/permissions" },
    { key: "rolespermissions.roles", page: "/admin/access-control/roles" },
    { key: "rolespermissions.rolepermissions", page: "/admin/access-control/role-permissions" },
    { key: "settings.general", page: "/admin/settings" },
    { key: "settings.ai", page: "/admin/ai-settings" },
  ];

  for (const m of modules) {
    const has = perms.has(`${m.key}.view`);
    console.log(`Module ${m.key} (${m.page}): ${has}`);
  }

  await pool.end();
}
main();

