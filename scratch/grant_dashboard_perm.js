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

async function fix() {
  const r = await pool.query('SELECT id, name, code FROM roles WHERE id IN (334, 16)');
  console.log('Roles:', r.rows);

  // Insert dashboard.view (id 459) for role 334 and role 16
  await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (334, 459) ON CONFLICT DO NOTHING');
  await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (16, 459) ON CONFLICT DO NOTHING');
  console.log('Granted dashboard.view to role 334 and 16');

  // Verify
  const check = await pool.query(`
    SELECT rp.role_id, r.name as role_name, p.code as perm_code
    FROM role_permissions rp 
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id 
    WHERE rp.role_id IN (334, 16) AND p.code = 'dashboard.view'
  `);
  console.log('Verified dashboard perms:', check.rows);

  await pool.end();
}
fix();

