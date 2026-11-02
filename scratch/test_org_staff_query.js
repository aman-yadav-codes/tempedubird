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
  const targetInstId = 1;

  // Let's test the query that gets staff who BELONG to institution 1 (or platform org)
  // Let's check who the users on /platformadmin/staff are:
  const staffQuery = `
    WITH org_staff AS (
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
      LEFT JOIN scope_types st ON st.id = r.scope_id
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
        -- Must belong to this organization or be a platform admin
        AND (
          -- 1. Explicit membership in this institution with staff/admin role
          EXISTS (
            SELECT 1 FROM institution_memberships im
            LEFT JOIN roles mr ON mr.id = im.role_id
            WHERE im.user_id = u.id
              AND im.institution_id = $1::int
              AND im.is_active = TRUE
              AND COALESCE(im.is_deleted, FALSE) = FALSE
              AND COALESCE(mr.code, '') NOT IN ('student', 'guardian', 'parent')
          )
          -- 2. User profile assigned under this institution (for teachers/staff/designations)
          OR (
            up.under_institution_id = $1::int
            AND (up.is_teacher = TRUE OR up.designation_id IS NOT NULL OR u.created_by = 1)
          )
          -- 3. Platform admin / platform staff role
          OR r.code IN ('platform_admin', 'super_admin', 'platform_staff', 'admin')
          OR st.code = 'platform'
          -- 4. Created by platform admin
          OR u.created_by = 1
        )
        -- Exclude students and parents
        AND NOT EXISTS (
          SELECT 1 FROM user_roles sur JOIN roles sr ON sr.id = sur.role_id
          WHERE sur.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent')
        )
        AND NOT EXISTS (
          SELECT 1 FROM institution_memberships sim JOIN roles sr ON sr.id = sim.role_id
          WHERE sim.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent')
        )
      ORDER BY u.id, CASE WHEN r.code = 'platform_admin' THEN 1 WHEN r.code = 'admin' THEN 2 ELSE 3 END
    )
    SELECT * FROM org_staff ORDER BY name ASC;
  `;

  const res = await pool.query(staffQuery, [targetInstId]);
  console.log('Returned staff count:', res.rows.length);
  res.rows.forEach(s => {
    console.log(`  Staff: ${s.name} (${s.email}) - Role: ${s.role}`);
  });

  await pool.end();
}
main();

