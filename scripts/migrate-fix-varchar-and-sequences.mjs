import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const statements = [
    // 1. platform_company_info
    `ALTER TABLE platform_company_info ALTER COLUMN gstin TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN listing_type TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN business_type TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN brand_name TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN company_name TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN tagline TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN registration_no TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN cin_number TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN phone TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN toll_free TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN city TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN state TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN pincode TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN working_hours TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN certified_or_affiliated_with TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN founder_name TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN founder_title TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN founder_image_url TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN founder_about TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN mission TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN vision TYPE TEXT`,
    `ALTER TABLE platform_company_info ALTER COLUMN goal TYPE TEXT`,

    // 2. business_profiles
    `ALTER TABLE business_profiles ALTER COLUMN name TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN slug TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN business_type TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN country_code TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN state TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN district TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN city TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN postal_code TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN phone TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN whatsapp TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN website TYPE TEXT`,
    `ALTER TABLE business_profiles ALTER COLUMN verification_status TYPE TEXT`,

    // 3. institution_profiles
    `ALTER TABLE institution_profiles ALTER COLUMN name TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN slug TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN status TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN phone TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN email TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN website TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN founder_name TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN founder_title TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN founder_image_url TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN founder_about TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN mission TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN vision TYPE TEXT`,
    `ALTER TABLE institution_profiles ALTER COLUMN goal TYPE TEXT`,

    // 4. professional_profiles
    `ALTER TABLE professional_profiles ALTER COLUMN name TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN slug TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN profession_type TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN country_code TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN state TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN district TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN city TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN postal_code TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN phone TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN whatsapp TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN website TYPE TEXT`,
    `ALTER TABLE professional_profiles ALTER COLUMN verification_status TYPE TEXT`,

    // 5. platform_branches
    `ALTER TABLE platform_branches ALTER COLUMN branch_name TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN branch_type TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN city TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN state TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN pincode TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN phone TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN email TYPE TEXT`,
    `ALTER TABLE platform_branches ALTER COLUMN address TYPE TEXT`,

    // 6. company_pages
    `ALTER TABLE company_pages ALTER COLUMN slug TYPE TEXT`
  ];

  for (const sql of statements) {
    try {
      await pool.query(sql);
      console.log(`Executed: ${sql}`);
    } catch (err) {
      console.warn(`Warning on ${sql}:`, err.message);
    }
  }

  // 7. Ensure sequence on platform_company_info is high enough
  try {
    const seqRes = await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('platform_company_info', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM platform_company_info), 0) + 100, 1000),
        true
      )
    `);
    console.log("Set platform_company_info_id_seq to:", seqRes.rows[0].setval);
  } catch (err) {
    console.warn("Warning updating sequence:", err.message);
  }

  // 8. Sync company info row for Maa Sharda Institute PVT LTD (institution 160 / business 39)
  // Ensure business_id = 39 or 160 has both business_id and institution_id linked
  await pool.query(`
    UPDATE platform_company_info
    SET business_id = 39, institution_id = 160
    WHERE id = 2 OR business_id = 160 OR institution_id = 160
  `);
  console.log("Synced platform_company_info for Maa Sharda Institute.");

  await pool.end();
}

migrate();
