import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function run() {
  console.log("Starting column type migration...");

  const queries = [
    // platform_company_info
    `ALTER TABLE platform_company_info ALTER COLUMN working_hours TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN brand_name TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN company_name TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN tagline TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN registration_no TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN cin_number TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN gstin TYPE VARCHAR(100)`,
    `ALTER TABLE platform_company_info ALTER COLUMN phone TYPE VARCHAR(100)`,
    `ALTER TABLE platform_company_info ALTER COLUMN toll_free TYPE VARCHAR(100)`,
    `ALTER TABLE platform_company_info ALTER COLUMN city TYPE VARCHAR(255)`,
    `ALTER TABLE platform_company_info ALTER COLUMN state TYPE VARCHAR(255)`,
    `ALTER TABLE platform_company_info ALTER COLUMN founder_name TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN founder_title TYPE TEXT`,

    // platform_branches
    `ALTER TABLE platform_branches ALTER COLUMN manager_name TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN email TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN phone TYPE VARCHAR(100)`,
    `ALTER TABLE platform_branches ALTER COLUMN city TYPE VARCHAR(255)`,
    `ALTER TABLE platform_branches ALTER COLUMN state TYPE VARCHAR(255)`,

    // business_profiles
    `ALTER TABLE business_profiles ALTER COLUMN locality TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN email TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN phone TYPE VARCHAR(100)`,

    // institution_profiles
    `ALTER TABLE institution_profiles ALTER COLUMN email TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN phone TYPE VARCHAR(100)`,

    // professional_profiles
    `ALTER TABLE professional_profiles ALTER COLUMN designation TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN professional_title TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN locality TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN email TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN phone TYPE VARCHAR(100)`
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log(`✅ Executed: ${q}`);
    } catch (err) {
      console.warn(`⚠️ Warning executing [${q}]:`, err.message);
    }
  }

  // Ensure sequence on platform_company_info is ahead of max(id)
  await pool.query(`
    SELECT setval(
      pg_get_serial_sequence('platform_company_info', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM platform_company_info), 1), 1),
      true
    )
  `);
  console.log("✅ Synced platform_company_info_id_seq");

  console.log("Migration complete!");
  await pool.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
