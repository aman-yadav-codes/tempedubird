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
  const users = await pool.query(`
    SELECT u.id, u.email, u.full_name, u.created_by, r.name as role_name, r.code as role_code,
      up.under_institution_id, ip.name as inst_name
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN institution_profiles ip ON ip.id = up.under_institution_id
    WHERE u.id IN (16, 17, 18, 19, 21, 22, 23, 24, 25, 27, 28, 32, 14, 5, 33, 1, 3)
    ORDER BY u.id ASC
  `);

  console.log('Sample users details:');
  users.rows.forEach(u => {
    console.log(`  User ${u.id}: ${u.full_name} (${u.email}) - created_by: ${u.created_by}, role: ${u.role_name} (${u.role_code}), inst: ${u.under_institution_id} (${u.inst_name})`);
  });

  await pool.end();
}
main();

