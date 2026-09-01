const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    const instRes = await pool.query(`SELECT id, name FROM institution_profiles LIMIT 5`);
    console.log("Institutions:", instRes.rows);

    const testInstId = instRes.rows[0]?.id || null;
    console.log("Testing with inst ID:", testInstId);

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
        LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN designations d ON d.id = up.designation_id
        LEFT JOIN roles r ON r.id = im.role_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND ($1::int IS NULL OR im.institution_id = $1::int OR up.under_institution_id = $1::int)
          AND (r.code IS NULL OR r.code NOT IN ('student', 'parent', 'guardian'))
        ORDER BY u.id, im.updated_at DESC NULLS LAST
      )
      SELECT * FROM unique_staff ORDER BY name ASC;
    `, [testInstId]);

    console.log("Unique staff count:", staffRes.rows.length);
    console.log("Unique staff list:", staffRes.rows.slice(0, 10));
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await pool.end();
  }
}

main();
