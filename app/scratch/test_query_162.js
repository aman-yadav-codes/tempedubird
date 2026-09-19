const fs = require('fs');
const env = fs.readFileSync('d:/edubird/.env', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const dbUrl = match ? match[1] : null;
const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl });

async function run() {
  const targetInstitutionId = 162;
  const staffParams = [targetInstitutionId];
  let staffWhereClause = `
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    AND (
      EXISTS (
        SELECT 1 FROM institution_memberships im_filter
        INNER JOIN roles r_filter ON r_filter.id = im_filter.role_id
        WHERE im_filter.user_id = u.id
          AND im_filter.institution_id = $1
          AND im_filter.is_active = TRUE
          AND COALESCE(im_filter.is_deleted, FALSE) = FALSE
          AND LOWER(COALESCE(r_filter.code, '')) NOT IN ('student', 'parent', 'guardian')
      )
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
      COALESCE(
        (
          SELECT r.name 
          FROM institution_memberships im 
          INNER JOIN roles r ON r.id = im.role_id
          WHERE im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          LIMIT 1
        ),
        'Staff Member'
      ) AS role_name,
      COALESCE(
        (
          SELECT r.code 
          FROM institution_memberships im 
          INNER JOIN roles r ON r.id = im.role_id
          WHERE im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          LIMIT 1
        ),
        'staff'
      ) AS role_code
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    ${staffWhereClause}
  `;

  const res = await pool.query(staffQuery, staffParams);
  console.log('Query result count:', res.rows.length);
  console.log('Rows:', res.rows);

  // Check if role filter was applied
  // Also check what targetInstitutionId was sent from client:
  const inst162 = await pool.query('SELECT * FROM institution_profiles WHERE id = 162');
  console.log('Institution 162 profile:', inst162.rows);

  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
