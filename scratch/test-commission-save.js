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
    const userRes = await pool.query(`SELECT id, full_name FROM users ORDER BY id DESC LIMIT 1`);
    if (userRes.rows.length === 0) {
      console.log("No users found.");
      return;
    }
    const testUser = userRes.rows[0];
    console.log("Testing with user:", testUser);

    const testRules = [
      {
        id: "1",
        condition_trigger: "successful_enrollment",
        condition_label: "Successful Student Enrollment / Admission",
        reward_type: "PERCENTAGE",
        rate: "10",
        minimum_threshold: "5000",
        payout_frequency: "MONTHLY",
        notes: "Test note",
      }
    ];

    await pool.query(`
      INSERT INTO staff_commission_structures (
        user_id,
        commission_type,
        commission_rate,
        commission_trigger,
        minimum_threshold,
        payout_frequency,
        notes,
        rules,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        commission_type = EXCLUDED.commission_type,
        commission_rate = EXCLUDED.commission_rate,
        commission_trigger = EXCLUDED.commission_trigger,
        minimum_threshold = EXCLUDED.minimum_threshold,
        payout_frequency = EXCLUDED.payout_frequency,
        notes = EXCLUDED.notes,
        rules = EXCLUDED.rules,
        updated_at = NOW()
    `, [
      testUser.id,
      "RULES_BASED",
      10,
      "course_admission",
      5000,
      "MONTHLY",
      "Test note",
      JSON.stringify(testRules)
    ]);

    const checkRes = await pool.query(`SELECT * FROM staff_commission_structures WHERE user_id = $1`, [testUser.id]);
    console.log("Saved commission record:", checkRes.rows[0]);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await pool.end();
  }
}

main();
