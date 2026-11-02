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
  const currentUserId = 1;

  // This is the exact WHERE clause from lib/queries/user.ts for platform admin viewer:
  const q = `
    SELECT u.id, u.full_name, u.email, r.name as role_name, r.code as role_code, d.name as desig_name
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN designations d ON d.id = up.designation_id
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
      AND (
        u.id = $1
        OR
        (
          -- Platform admin or platform-scoped role
          EXISTS (
            SELECT 1 FROM user_roles pur
            JOIN roles pr ON pr.id = pur.role_id
            LEFT JOIN scope_types pst ON pst.id = pr.scope_id
            WHERE pur.user_id = u.id AND (pr.code IN ('platform_admin', 'super_admin', 'accountant', 'platform_staff') OR pst.code = 'platform')
          )
          -- Staff added by current platform admin or any platform admin
          OR u.created_by = $1
          OR u.created_by IN (
            SELECT pur.user_id FROM user_roles pur
            JOIN roles pr ON pr.id = pur.role_id
            WHERE pr.code = 'platform_admin'
          )
        )
      )
      AND (
        -- staffScope = all check:
        EXISTS (
          SELECT 1
          FROM user_roles cur_ur
          JOIN roles cur_r ON cur_r.id = cur_ur.role_id
          WHERE cur_ur.user_id = u.id AND cur_r.code NOT IN ('student', 'guardian', 'parent')
        )
        OR EXISTS (
          SELECT 1
          FROM institution_memberships staff_member
          INNER JOIN roles staff_role ON staff_role.id = staff_member.role_id
          WHERE staff_member.user_id = u.id
            AND staff_member.is_active = TRUE
            AND COALESCE(staff_member.is_deleted, FALSE) = FALSE
            AND staff_role.code NOT IN ('student', 'guardian', 'parent')
        )
        OR up.designation_id IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles sur
        JOIN roles sr ON sr.id = sur.role_id
        WHERE sur.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent')
      )
      AND NOT EXISTS (
        SELECT 1 FROM institution_memberships sim
        JOIN roles sr ON sr.id = sim.role_id
        WHERE sim.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent')
      )
    ORDER BY u.full_name ASC
  `;

  const res = await pool.query(q, [currentUserId]);
  console.log('Exact platform staff count:', res.rows.length);
  res.rows.forEach(r => console.log(`  Staff: ${r.full_name} (${r.email}) - Role: ${r.role_name} (${r.role_code}) - Desig: ${r.desig_name}`));

  await pool.end();
}
main();

