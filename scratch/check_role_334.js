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
  const usersWith334 = await pool.query(`
    SELECT u.id, u.email, u.full_name, r.id as role_id, r.name as role_name, r.code as role_code 
    FROM user_roles ur 
    JOIN users u ON u.id = ur.user_id 
    JOIN roles r ON r.id = ur.role_id 
    WHERE ur.role_id = 334
  `);
  console.log('Users with role 334:', usersWith334.rows);

  const allUserRoles = await pool.query(`
    SELECT ur.user_id, u.email, u.full_name, r.id as role_id, r.name as role_name, r.code as role_code
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    JOIN roles r ON r.id = ur.role_id
    ORDER BY ur.user_id ASC
  `);
  console.log('All user_roles assignments:');
  allUserRoles.rows.forEach(ur => {
    console.log(`  User ${ur.user_id} (${ur.email}): Role ${ur.role_name} (${ur.role_code}, ID: ${ur.role_id})`);
  });

  await pool.end();
}
check();

