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
  const getStaffForOrg = async (orgId) => {
    const isPlatformOrg = !orgId || orgId === 1;

    let query = '';
    let params = [];

    if (isPlatformOrg) {
      query = `
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
            AND (
              u.id = 1
              OR u.created_by = 1
              OR r.code IN ('platform_admin', 'super_admin', 'admin', 'platform_staff')
              OR st.code = 'platform'
              OR (
                up.under_institution_id = 1
                AND up.designation_id IS NOT NULL
              )
            )
            -- Strictly exclude students and parents
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
    } else {
      params.push(orgId);
      query = `
        WITH inst_staff AS (
          SELECT DISTINCT ON (u.id)
            u.id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
            u.email,
            u.phone,
            COALESCE(d.name, r.name, r.code, 'Staff Member') AS role,
            COALESCE(r.code, 'staff') AS role_code
          FROM users u
          JOIN institution_memberships scoped_im ON scoped_im.user_id = u.id
          JOIN roles r ON r.id = scoped_im.role_id
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN designations d ON d.id = up.designation_id
          WHERE scoped_im.institution_id = $1::int
            AND scoped_im.is_active = TRUE
            AND COALESCE(scoped_im.is_deleted, FALSE) = FALSE
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND r.code NOT IN ('student', 'parent', 'guardian')
          ORDER BY u.id, scoped_im.updated_at DESC NULLS LAST
        )
        SELECT * FROM inst_staff ORDER BY name ASC;
      `;
    }

    const res = await pool.query(query, params);
    return res.rows;
  };

  const platformStaff = await getStaffForOrg(1);
  console.log('Platform/Edubird organization staff:');
  platformStaff.forEach(s => console.log(`  Staff ID ${s.id}: ${s.name} (${s.email}) - Role: ${s.role}`));

  const inst5Staff = await getStaffForOrg(5);
  console.log('\nInstitution 5 (Maa Sharda) staff:');
  inst5Staff.forEach(s => console.log(`  Staff ID ${s.id}: ${s.name} (${s.email}) - Role: ${s.role}`));

  await pool.end();
}
main();

