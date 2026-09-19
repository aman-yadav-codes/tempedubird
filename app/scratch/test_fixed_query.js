const fs = require('fs');
const env = fs.readFileSync('d:/edubird/.env', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const dbUrl = match ? match[1] : null;
const { Pool } = require('pg');
const pool = new Pool({ connectionString: dbUrl });

async function run() {
  const staffParams = [162];
  const staffWhereClause = `
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
      OR EXISTS (
        SELECT 1 FROM user_roles ur_pa
        INNER JOIN roles r_pa ON r_pa.id = ur_pa.role_id
        WHERE ur_pa.user_id = u.id
          AND r_pa.code = 'platform_admin'
      )
    )
  `;

  // Original staff query from route.ts
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

  try {
    const res = await pool.query(staffQuery, staffParams);
    console.log('Success! Staff rows found:', res.rows);
  } catch (err) {
    console.error('Error in query:', err.message);
  }

  await pool.end();
}

run();
