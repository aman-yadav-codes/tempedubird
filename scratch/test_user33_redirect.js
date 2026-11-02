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

async function check() {
  // Let's see what /api/auth/login returns for user 33 or what user object looks like
  // fetch /api/auth/me or simulate user object
  const userRes = await pool.query(`
    SELECT u.id, u.email, u.full_name, r.name as role_name, r.code as role_code, ur.role_id
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = 33
  `);

  const permsRes = await pool.query(`
    SELECT p.code
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = 334
  `);

  const perms = permsRes.rows.map(r => r.code);
  const user = {
    id: 33,
    email: 'ramashish@gmail.com',
    full_name: 'Ram Ashish Yadav',
    role_codes: ['admin'],
    roles: ['admin'],
    permissions: perms,
    is_super_admin: false,
    memberships: []
  };

  console.log('User 33 role_codes:', user.role_codes);
  console.log('User 33 perms count:', user.permissions.length);

  await pool.end();
}
check();

