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
  const rolesWithDashboard = await pool.query(`
    SELECT r.id, r.name, r.code, p.code as perm_code
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE p.code = 'dashboard.view'
  `);
  console.log('Roles with dashboard.view:');
  rolesWithDashboard.rows.forEach(r => console.log(`  Role ${r.id}: ${r.name} (${r.code})`));

  await pool.end();
}
main();

