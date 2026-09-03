const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.created_by, 
        creator.full_name as creator_name, 
        cr_r.code as creator_role,
        COALESCE(
          (SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1),
          (SELECT r.name FROM institution_memberships im JOIN roles r ON r.id = im.role_id WHERE im.user_id = u.id AND im.is_active = TRUE LIMIT 1)
        ) as user_role
      FROM users u
      LEFT JOIN users creator ON creator.id = u.created_by
      LEFT JOIN user_roles cr_ur ON cr_ur.user_id = u.created_by
      LEFT JOIN roles cr_r ON cr_r.id = cr_ur.role_id
      WHERE (
        u.created_by = 1 
        OR cr_r.code IN ('platform_admin', 'super_admin')
        OR u.id IN (SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code IN ('platform_admin', 'super_admin'))
        OR u.created_by IN (SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code IN ('platform_admin', 'super_admin'))
      )
      AND COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.id DESC
      LIMIT 30;
    `);
    console.log("=== USERS ADDED BY PLATFORM ADMIN OR PLATFORM ADMINS THEMSELVES ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
