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
  const perms = permsRes.rows.map(r => r.code);

  const user = {
    id: 33,
    role_codes: ['admin'],
    roles: ['admin'],
    permissions: perms,
    is_super_admin: false,
    memberships: []
  };

  console.log('User permissions length:', perms.length);

  // Let's test what getFirstAllowedAdminPath returns
  // Let's check ADMIN_PERMISSION_MODULES from lib/auth/permissions.ts
  await pool.end();
}
main();

