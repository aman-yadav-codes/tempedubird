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
  const u92 = await pool.query(`
    SELECT u.id, u.email, u.full_name, r.id as role_id, r.name as role_name, r.code as role_code, ur.role_id as ur_role_id
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.id = 92 OR u.email = 'ama@gm.com'
  `);
  console.log('User 92:', u92.rows);

  const r18 = await pool.query('SELECT * FROM roles WHERE code = \'accountant\' OR id = 18');
  console.log('Role 18:', r18.rows);

  // Check what permissions exist for finance, dashboard, etc.
  const r61 = await pool.query(`
    SELECT p.code FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = 61
  `);
  console.log('Role 61 (institution_accountant) perms count:', r61.rows.length);
  console.log('Role 61 perms sample:', r61.rows.slice(0, 15).map(r => r.code));

  await pool.end();
}
main();

