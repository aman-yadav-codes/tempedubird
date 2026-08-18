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
    const pkgRes = await pool.query(`SELECT id FROM sales_packages LIMIT 1`);
    const pkgId = pkgRes.rows[0]?.id || 1;

    const res = await pool.query(`
      INSERT INTO institution_subscriptions (
        institution_id,
        package_id,
        status,
        starts_at,
        expires_at,
        created_at,
        updated_at
      )
      SELECT
        id,
        $1,
        'active',
        CURRENT_DATE - INTERVAL '1 month',
        CURRENT_DATE + INTERVAL '2 years',
        NOW(),
        NOW()
      FROM institution_profiles
      ON CONFLICT DO NOTHING
    `, [pkgId]);

    console.log("SEEDED ACTIVE SUBSCRIPTIONS FOR ALL INSTITUTIONS SUCCESSFULLY!");
  } catch (err) {
    console.error("Subscription seed error:", err);
  } finally {
    await pool.end();
  }
}

main();
