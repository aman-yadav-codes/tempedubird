const fs = require('fs');
const env = fs.readFileSync('d:/edubird/.env', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const dbUrl = match ? match[1] : null;
const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl });

async function check() {
  const members162 = await pool.query(`
    SELECT u.id, u.full_name, u.email, im.institution_id, r.id as role_id, r.name as role_name, r.code as role_code, im.is_active
    FROM institution_memberships im
    JOIN users u ON u.id = im.user_id
    LEFT JOIN roles r ON r.id = im.role_id
    WHERE im.institution_id = 162
  `);
  console.log('Members of institution 162 (Maa sharda 2):', members162.rows);

  const underInst162 = await pool.query(`
    SELECT u.id, u.full_name, u.email, up.under_institution_id
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    WHERE up.under_institution_id = 162
  `);
  console.log('Users under_institution_id = 162:', underInst162.rows);

  const allPlatformAdmins = await pool.query(`
    SELECT u.id, u.full_name, u.email, r.name as role_name, r.code as role_code
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    JOIN users u ON u.id = ur.user_id
    WHERE r.code = 'platform_admin'
  `);
  console.log('Platform admins:', allPlatformAdmins.rows);

  const roles = await pool.query(`
    SELECT id, name, code, is_system, scope_id, is_deleted 
    FROM roles 
    WHERE COALESCE(is_deleted, false) = false 
    ORDER BY id
  `);
  console.log('All Roles in DB:');
  console.table(roles.rows);

  await pool.end();
}

check().catch(e => { console.error(e); process.exit(1); });
