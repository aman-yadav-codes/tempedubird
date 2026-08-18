const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes("localhost") ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT DISTINCT ON (u.id)
        u.id,
        u.full_name,
        u.avatar_url,
        u.email,
        COALESCE(ip1.name, ip2.name, 'EduBird Partner Institute') AS institution_name,
        COALESCE(ip1.id, ip2.id) AS institution_id,
        COALESCE(l1.name, l2.name, 'Varanasi, UP') AS location
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r_ur ON r_ur.id = ur.role_id
      LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
      LEFT JOIN roles r_im ON r_im.id = im.role_id
      LEFT JOIN institution_profiles ip1 ON ip1.id = im.institution_id
      LEFT JOIN institution_profiles ip2 ON ip2.id = up.under_institution_id
      LEFT JOIN locations l1 ON l1.id = ip1.location_id
      LEFT JOIN locations l2 ON l2.id = ip2.location_id
      WHERE u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND (
          r_im.code = 'teacher' 
          OR r_ur.code = 'teacher'
          OR COALESCE(up.is_teacher, FALSE) = TRUE
          OR u.email LIKE '%teacher%'
        )
      ORDER BY u.id DESC
      LIMIT 100
    `);

    console.log("SUCCESS! TOTAL TEACHERS FOUND:", res.rows.length);
    console.log(JSON.stringify(res.rows.slice(0, 5), null, 2));
  } catch (err) {
    console.error("QUERY ERROR:", err);
  } finally {
    await pool.end();
  }
}

main();
