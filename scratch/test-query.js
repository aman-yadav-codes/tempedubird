const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const currentUserId = 81;
  const query = `
    SELECT u.id, u.full_name, u.email, u.created_by
    FROM users u
    WHERE (
      (
        EXISTS (
          SELECT 1
          FROM institution_memberships staff_member
          INNER JOIN roles staff_role ON staff_role.id = staff_member.role_id
          WHERE staff_member.user_id = u.id
            AND staff_member.is_active = TRUE
            AND COALESCE(staff_member.is_deleted, FALSE) = FALSE
            AND staff_role.code NOT IN ('student', 'guardian', 'parent')
        )
        OR EXISTS (
          SELECT 1
          FROM user_profiles scoped_up
          JOIN user_roles scoped_ur ON scoped_ur.user_id = u.id
          JOIN roles scoped_r ON scoped_r.id = scoped_ur.role_id
          WHERE scoped_up.user_id = u.id
            AND scoped_r.code NOT IN ('student', 'guardian', 'parent')
        )
        OR EXISTS (
          SELECT 1
          FROM user_roles global_ur
          JOIN roles global_r ON global_r.id = global_ur.role_id
          WHERE global_ur.user_id = u.id
            AND global_r.code NOT IN ('student', 'guardian', 'parent')
        )
      )
      AND (
        u.created_by = $1
        OR u.id = $1
        OR EXISTS (
          SELECT 1 FROM user_roles pur
          JOIN roles pr ON pr.id = pur.role_id
          WHERE pur.user_id = u.id AND pr.code IN ('platform_admin', 'super_admin', 'accountant', 'platform_staff')
        )
      )
    );
  `;
  const res = await pool.query(query, [currentUserId]);
  console.log('Matched users:', res.rows);
  pool.end();
}
run();

