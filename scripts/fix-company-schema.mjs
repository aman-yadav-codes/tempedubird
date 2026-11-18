import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false });

async function run() {
  console.log("Starting database migration for institution_profiles and platform_company_info...");

  // 1. Get view definitions before dropping
  const v1 = await pool.query(`SELECT pg_get_viewdef('businesses'::regclass, true) as def`);
  const v2 = await pool.query(`SELECT pg_get_viewdef('businesses_and_professionals'::regclass, true) as def`);
  
  const def1 = v1.rows[0]?.def;
  const def2 = v2.rows[0]?.def;

  console.log("Got view definitions.");

  // 2. Drop views temporarily
  await pool.query(`DROP VIEW IF EXISTS businesses CASCADE`);
  await pool.query(`DROP VIEW IF EXISTS businesses_and_professionals CASCADE`);
  console.log("Dropped dependent views.");

  // 3. Alter institution_profiles columns
  await pool.query(`ALTER TABLE institution_profiles ALTER COLUMN email TYPE TEXT`);
  await pool.query(`ALTER TABLE institution_profiles ALTER COLUMN phone TYPE TEXT`);
  await pool.query(`ALTER TABLE institution_profiles ALTER COLUMN founder_name TYPE TEXT`);
  await pool.query(`ALTER TABLE institution_profiles ALTER COLUMN founder_title TYPE TEXT`);
  console.log("Altered institution_profiles email, phone, founder_name, founder_title to TEXT.");

  // 4. Alter platform_company_info columns
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN support_email TYPE TEXT`);
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN phone TYPE TEXT`);
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN toll_free TYPE TEXT`);
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN website_url TYPE TEXT`);
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN city TYPE TEXT`);
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN state TYPE TEXT`);
  await pool.query(`ALTER TABLE platform_company_info ALTER COLUMN pincode TYPE TEXT`);
  console.log("Altered platform_company_info columns to TEXT.");

  // 5. Recreate views
  if (def1) {
    await pool.query(`CREATE VIEW businesses AS ${def1}`);
    console.log("Recreated businesses view.");
  }
  if (def2) {
    await pool.query(`CREATE VIEW businesses_and_professionals AS ${def2}`);
    console.log("Recreated businesses_and_professionals view.");
  }

  // 6. Fix sequence on platform_company_info so it never conflicts
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('platform_company_info', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM platform_company_info), 1) + 10, 10),
      true
    )
  `);
  console.log("Advanced platform_company_info_id_seq to MAX(id) + 10.");

  // 7. Verify column types
  const check = await pool.query(`
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'institution_profiles' AND column_name IN ('email', 'phone', 'founder_name', 'founder_title')
  `);
  console.table(check.rows);

  const seqCheck = await pool.query(`SELECT last_value, is_called FROM platform_company_info_id_seq`);
  console.log("Sequence status:", seqCheck.rows);

  console.log("All migrations completed successfully!");
  await pool.end();
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
