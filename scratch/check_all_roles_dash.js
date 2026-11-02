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
  const roles = await pool.query(`
    SELECT r.id, r.name, r.code, r.scope_id,
      COUNT(CASE WHEN p.code LIKE '%dashboard%' THEN 1 END) as dash_perms_count,
      COUNT(rp.permission_id) as total_perms_count
    FROM roles r
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE r.is_deleted = false
    GROUP BY r.id, r.name, r.code, r.scope_id
    ORDER BY r.id ASC
  `);

  console.log('Roles status:');
  roles.rows.forEach(r => {
    console.log(`  Role ${r.id} (${r.name} - ${r.code}): total perms=${r.total_perms_count}, dash perms=${r.dash_perms_count}`);
  });

  await pool.end();
}
main();

