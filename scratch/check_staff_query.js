process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  const staffRes = await pool.query(`
    WITH unique_staff AS (
      SELECT DISTINCT ON (u.id)
        u.id,
        COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
        u.email,
        u.phone,
        COALESCE(d.name, r.name, r.code, 'Staff Member') AS role,
        COALESCE(r.code, 'staff') AS role_code
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN designations d ON d.id = up.designation_id
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
        -- Strictly exclude students, parents, and guardians
        AND NOT EXISTS (
          SELECT 1 FROM user_roles sur JOIN roles sr ON sr.id = sur.role_id
          WHERE sur.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent')
        )
        AND NOT EXISTS (
          SELECT 1 FROM institution_memberships sim JOIN roles sr ON sr.id = sim.role_id
          WHERE sim.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent')
        )
      ORDER BY u.id, CASE WHEN r.code = 'platform_admin' THEN 1 WHEN r.code = 'institution_admin' THEN 2 ELSE 3 END
    )
    SELECT * FROM unique_staff ORDER BY name ASC;
  `);
  console.log('Unique staff count:', staffRes.rows.length);
  console.log('Staff list:', staffRes.rows);
  await pool.end();
}
test().catch(console.error);
