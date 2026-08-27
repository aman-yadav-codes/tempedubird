const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    // Check all users / staff in institution 160
    const inst160Users = await pool.query(`
      SELECT u.id, u.full_name, u.email, up.is_teacher, up.teacher_type, up.designation_id, d.name as designation_name,
             im.role_id as membership_role_id, r_mem.name as membership_role_name, r_mem.code as membership_role_code
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN designations d ON d.id = up.designation_id
      LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.institution_id = 160
      LEFT JOIN roles r_mem ON r_mem.id = im.role_id
      WHERE up.under_institution_id = 160 OR im.institution_id = 160
      ORDER BY u.id;
    `);
    console.log("=== USERS / STAFF IN SHARDA (160) ===");
    console.log(inst160Users.rows);

    // Check all designations in DB
    const designations = await pool.query(`SELECT * FROM designations ORDER BY id;`);
    console.log("=== DESIGNATIONS IN DB ===");
    console.log(designations.rows);

    // Check if there are institution_id columns in roles or permissions or if any custom roles exist
    const customRoles = await pool.query(`
      SELECT * FROM roles WHERE is_deleted = false ORDER BY scope_id, id;
    `);
    console.log("=== ALL CURRENT ROLES ===");
    console.log(customRoles.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
