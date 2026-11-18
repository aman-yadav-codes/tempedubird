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
  console.log("Updating contact details in database...");

  // 1. Update platform_company_info for Maa Sharda Institute PVT LTD
  await pool.query(`
    UPDATE platform_company_info
    SET phone = '8887787846',
        support_email = 'deepakdv74@gmail.com',
        website_url = 'https://edubird.com',
        headquarters_address = 'Shau Bila Building, Pandeypur Road, Pandeypur, (Near Police Chowki and Allahabad Bank)',
        city = 'varanasi',
        state = 'uttar pradesh',
        pincode = '221002',
        working_hours = 'Monday - Saturday: 9:00 AM - 6:00 PM IST'
    WHERE id = 2 OR business_id = 160 OR institution_id = 160
  `);
  console.log("✅ Updated platform_company_info");

  // 2. Update institution_profiles for 160
  await pool.query(`
    UPDATE institution_profiles
    SET phone = '8887787846',
        email = 'deepakdv74@gmail.com',
        website = 'https://edubird.com'
    WHERE id = 160
  `);
  console.log("✅ Updated institution_profiles 160");

  // 3. Update business_profiles for 39 / 160
  await pool.query(`
    UPDATE business_profiles
    SET phone = '8887787846',
        email = 'deepakdv74@gmail.com',
        website = 'https://edubird.com',
        address = 'Shau Bila Building, Pandeypur Road, Pandeypur, (Near Police Chowki and Allahabad Bank)',
        city = 'varanasi',
        state = 'uttar pradesh',
        postal_code = '221002'
    WHERE id = 39 OR institution_profile_id = 160
  `);
  console.log("✅ Updated business_profiles 39");

  // 4. Update platform_branches for 160
  await pool.query(`
    UPDATE platform_branches
    SET phone = '8887787846',
        email = 'deepakdv74@gmail.com',
        manager_name = 'Mr. Deepak Yadav',
        status = 'active',
        is_headquarters = true
    WHERE business_id = 160 OR institution_id = 160
  `);
  console.log("✅ Updated platform_branches 160");

  await pool.end();
}

run().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
