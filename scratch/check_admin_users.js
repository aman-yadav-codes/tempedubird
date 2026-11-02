const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const users = await pool.query(
    "SELECT u.id, u.full_name, u.email, r.code as role_code FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id WHERE u.email ILIKE '%admin%' OR u.full_name ILIKE '%platform%'"
  );
  console.log('Admin users:', users.rows);
  const ram = await pool.query("SELECT u.id, u.full_name, u.email, r.code as role_code FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id WHERE u.full_name = 'Ram'");
  console.log('Ram user:', ram.rows);
}
check().finally(() => pool.end());
