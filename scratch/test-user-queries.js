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
    console.log("1. Testing getUsersPaginatedQuery...");
    // Let's find an existing user ID that is not current user (say current user id is 0)
    const usersResult = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email
      FROM users u
      LIMIT 5;
    `);
    console.log("Users in DB:", usersResult.rows);

    if (usersResult.rows.length > 0) {
      const targetUserId = usersResult.rows[0].id;
      console.log(`2. Testing getAdminUserDetails for user ID: ${targetUserId}...`);
      
      const [
        userResult,
        profileResult,
        locationResult,
        experiencesResult,
        educationResult,
        certificationsResult,
      ] = await Promise.all([
        pool.query(
          `
            SELECT
              u.id,
              u.full_name,
              u.email,
              u.phone,
              u.avatar_url,
              u.login_provider,
              u.is_active,
              u.is_verified,
              u.created_at,
              u.updated_at,
              MIN(ur.role_id) AS role_id,
              COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = $1
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            GROUP BY u.id
          `,
          [targetUserId]
        ),
        pool.query(
          `
            SELECT about, gender, hourly_charges
            FROM user_profiles
            WHERE user_id = $1
          `,
          [targetUserId]
        ),
        pool.query(
          `
            SELECT
              country.name AS country,
              state.name AS state,
              city.name AS city,
              area.name AS area,
              ul.full_address,
              ul.formatted_address,
              ul.latitude,
              ul.longitude,
              ul.pincode,
              ul.place_id
            FROM user_locations ul
            LEFT JOIN locations country ON country.id = ul.country_id
            LEFT JOIN locations state ON state.id = ul.state_id
            LEFT JOIN locations city ON city.id = ul.city_id
            LEFT JOIN locations area ON area.id = ul.area_id
            WHERE ul.user_id = $1
          `,
          [targetUserId]
        ),
        pool.query(
          `
         SELECT
      ue.id,
      ue.job_title,
      ue.company_name,
      ue.from_month,
      ue.from_year,
      ue.to_month,
      ue.to_year,
      ue.is_current
    FROM user_experience ue
    WHERE ue.user_id = $1
    ORDER BY ue.is_current DESC, ue.from_year DESC, ue.from_month DESC, ue.id DESC
          `,
          [targetUserId]
        ),
        pool.query(
          `
           SELECT
      ue.id,
      ue.qualification,
      ue.institution_name,
      ue.from_year,
      ue.to_year
    FROM user_education ue
    WHERE ue.user_id = $1
    ORDER BY ue.to_year DESC, ue.from_year DESC, ue.id DESC
          `,
          [targetUserId]
        ),
        pool.query(
          `
            SELECT id, name, issued_authority, duration
            FROM user_certifications
            WHERE user_id = $1
            ORDER BY id DESC
          `,
          [targetUserId]
        ),
      ]);

      console.log("Successfully ran getAdminUserDetails subqueries!");
      console.log("User:", userResult.rows[0]);
      console.log("Experiences:", experiencesResult.rows);
      console.log("Education:", educationResult.rows);
    } else {
      console.log("No users found in database to test getAdminUserDetails.");
    }
  } catch (err) {
    console.error("CRITICAL QUERY ERROR:", err);
  } finally {
    await pool.end();
  }
}

main();
