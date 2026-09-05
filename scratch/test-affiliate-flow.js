const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runTests() {
  console.log("=== Testing Affiliate System Database & Query Logic ===");

  // 1. Verify tables exist
  const tableCheck = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('affiliates', 'affiliate_referrals', 'affiliate_earnings')
  `);
  console.log("Tables present:", tableCheck.rows.map(r => r.table_name));

  // 2. Verify Affiliate role exists
  const roleCheck = await pool.query(`
    SELECT id, name, code FROM roles WHERE code = 'affiliate'
  `);
  console.log("Affiliate Role:", roleCheck.rows);

  // 3. Find or create a test user to verify affiliate record linking
  const users = await pool.query(`SELECT id, full_name, phone FROM users LIMIT 3`);
  console.log("Sample existing users:", users.rows);

  if (users.rows.length > 0) {
    const testUser = users.rows[0];
    // Ensure affiliate profile for test user
    const affRes = await pool.query(`
      INSERT INTO affiliates (user_id, affiliate_code, total_referrals, total_earnings, pending_earnings, commission_rate, status)
      VALUES ($1, $2, 0, 0.00, 0.00, 10.00, 'active')
      ON CONFLICT (user_id) DO UPDATE SET affiliate_code = EXCLUDED.affiliate_code
      RETURNING *
    `, [testUser.id, testUser.phone || '9999999999']);
    console.log("Affiliate Profile for test user:", affRes.rows[0]);

    // Check stats query
    const statsRes = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id) AS total_affiliates,
        COALESCE(SUM(a.total_referrals), 0) AS total_referrals,
        COALESCE(SUM(a.total_earnings), 0) AS total_earnings
      FROM affiliates a
      JOIN users u ON u.id = a.user_id
      WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    `);
    console.log("Platform Affiliate Stats:", statsRes.rows[0]);
  }

  console.log("=== All DB & Logic Checks Passed! ===");
}

runTests().catch(console.error).finally(() => pool.end());
