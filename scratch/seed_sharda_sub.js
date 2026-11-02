process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seed() {
  const pkgRes = await pool.query(`
    INSERT INTO sales_packages (name, package_for, package_for_types, price, price_unit, validity_count, validity_unit, description, is_active)
    VALUES ('Enterprise Demo Plan', 'all', '["all"]'::jsonb, 0, 'year', 5, 'year', 'Active demo enterprise plan', TRUE)
    RETURNING id
  `);

  const packageId = pkgRes.rows[0].id;

  // Insert active subscription for institution 5
  await pool.query(`
    INSERT INTO institution_subscriptions (
      institution_id, package_id, status, starts_at, expires_at, price, price_unit, validity_count, validity_unit, storage_limit_gb
    ) VALUES (
      5, $1, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '5 years', 0, 'year', 5, 'year', 500
    )
  `, [packageId]);

  console.log('Seeded active subscription for institution 5 with packageId', packageId);
  await pool.end();
}
seed().catch(console.error);
