const fs = require('fs');
const env = fs.readFileSync('d:/edubird/.env', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const { Pool } = require('pg');
const pool = new Pool({ connectionString: match[1] });

async function run() {
  const staffParams = [162];
  const staffWhereClause = `
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND (
      -- Institution Members (Institution Admin, Teachers, etc.)
      EXISTS (
        SELECT 1 FROM institution_memberships im_filter
        INNER JOIN roles r_filter ON r_filter.id = im_filter.role_id
        WHERE im_filter.user_id = u.id
          AND im_filter.institution_id = $1
          AND im_filter.is_active = TRUE
          AND COALESCE(im_filter.is_deleted, FALSE) = FALSE
          AND LOWER(COALESCE(r_filter.code, '')) NOT IN ('student', 'parent', 'guardian')
      )
      -- Platform Admins (counted as staff also)
      OR EXISTS (
        SELECT 1 FROM user_roles ur_pa
        INNER JOIN roles r_pa ON r_pa.id = ur_pa.role_id
        WHERE ur_pa.user_id = u.id
          AND r_pa.code = 'platform_admin'
      )
      -- User Profile linked to institution
      OR (
        up.under_institution_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM institution_memberships im_ex
          INNER JOIN roles r_ex ON r_ex.id = im_ex.role_id
          WHERE im_ex.user_id = u.id AND LOWER(COALESCE(r_ex.code, '')) IN ('student', 'parent', 'guardian')
        )
      )
      OR EXISTS (
        SELECT 1 FROM staff_attendance sa_filter
        WHERE sa_filter.staff_user_id = u.id
          AND sa_filter.institution_id = $1
      )
      OR EXISTS (
        SELECT 1 FROM operations_tasks ot_filter
        WHERE (ot_filter.assigned_employee_id = u.id OR ot_filter.created_by = u.id)
          AND ot_filter.institution_id = $1
      )
    )
  `;

  const staffQuery = `
    SELECT 
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.avatar_url,
      u.is_active,
      COALESCE(
        (
          SELECT r.name 
          FROM institution_memberships im 
          INNER JOIN roles r ON r.id = im.role_id
          WHERE im.user_id = u.id AND im.institution_id = $1 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          LIMIT 1
        ),
        (
          SELECT r.name 
          FROM user_roles ur 
          INNER JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id
          LIMIT 1
        ),
        d.name,
        'Staff Member'
      ) AS role_name,
      COALESCE(
        (
          SELECT r.code 
          FROM institution_memberships im 
          INNER JOIN roles r ON r.id = im.role_id
          WHERE im.user_id = u.id AND im.institution_id = $1 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          LIMIT 1
        ),
        (
          SELECT r.code 
          FROM user_roles ur 
          INNER JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id
          LIMIT 1
        ),
        'staff'
      ) AS role_code,
      d.name AS designation_title,
      COALESCE(im_active.institution_id, up.under_institution_id, $1) AS institution_id,
      ip.name AS institution_name
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN designations d ON d.id = up.designation_id
    LEFT JOIN LATERAL (
      SELECT im.institution_id
      FROM institution_memberships im
      WHERE im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
      ORDER BY im.id DESC
      LIMIT 1
    ) im_active ON TRUE
    LEFT JOIN institution_profiles ip ON ip.id = COALESCE(im_active.institution_id, up.under_institution_id)
    ${staffWhereClause}
    ORDER BY u.full_name ASC
    LIMIT 200
  `;

  const res = await pool.query(staffQuery, staffParams);
  console.log('Result count:', res.rows.length);
  console.table(res.rows.map(r => ({ id: r.id, name: r.full_name, email: r.email, role_name: r.role_name, role_code: r.role_code })));

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
