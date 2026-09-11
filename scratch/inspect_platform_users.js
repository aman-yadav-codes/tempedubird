const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) require('dotenv').config({ path: '.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function inspect() {
  const pAdmins = await pool.query(
    "SELECT u.id, u.full_name, u.email, r.code as role_code FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.code = 'platform_admin'"
  );
  console.log('Platform Admins:', pAdmins.rows);
  const adminIds = pAdmins.rows.map(r => r.id);

  const createdByAdmins = await pool.query(
    "SELECT u.id, u.full_name, u.email, u.created_by, array_agg(COALESCE(r.name, r.code)) as roles FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id WHERE u.created_by = ANY($1::int[]) GROUP BY u.id, u.full_name, u.email, u.created_by",
    [adminIds]
  );
  console.log('Users created by platform admins:', JSON.stringify(createdByAdmins.rows, null, 2));

  const platformUsers = await pool.query(
    "SELECT u.id, u.full_name, u.email, r.name as role_name, r.code as role_code, st.code as scope FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id LEFT JOIN scope_types st ON st.id = r.scope_id WHERE st.code = 'platform' OR r.code LIKE '%platform%'"
  );
  console.log('Platform scoped users:', JSON.stringify(platformUsers.rows, null, 2));

  pool.end();
}
inspect().catch(e => { console.error(e); pool.end(); });
