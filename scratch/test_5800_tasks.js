const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testFetchFor5800() {
  const userRes = await pool.query("SELECT * FROM users WHERE id = 5800");
  const user = userRes.rows[0];
  console.log("Testing for user 5800:", user.full_name);

  // Check what institution_id 5800 has:
  const mems = await pool.query("SELECT * FROM institution_memberships WHERE user_id = 5800");
  console.log("Memberships for 5800:", mems.rows);

  const biz = await pool.query("SELECT * FROM business_profiles WHERE user_id = 5800");
  console.log("Business profile for 5800:", biz.rows);

  await pool.end();
}

testFetchFor5800().catch(console.error);

