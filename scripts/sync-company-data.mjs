import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { Client } = pg;

async function syncCompanyData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  console.log("Connected to database. Synchronizing company data for business 160...");

  // 1. Sync serial sequence for platform_company_info
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('platform_company_info', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM platform_company_info), 1), 1),
      true
    );
  `);
  console.log("✅ Sequence platform_company_info_id_seq synchronized.");

  // 2. Fetch all available data from institution_profiles and institution_branches for 160
  const ipRes = await client.query(`
    SELECT ip.*,
           ib.address as branch_address, ib.city as branch_city, ib.state as branch_state, ib.pincode as branch_pincode,
           ib.phones, ib.emails, ib.working_hours as branch_working_hours
    FROM institution_profiles ip
    LEFT JOIN institution_branches ib ON ib.institution_id = ip.id AND ib.is_primary = TRUE
    WHERE ip.id = 160
    LIMIT 1
  `);

  if (ipRes.rows.length === 0) {
    console.error("Institution profile 160 not found!");
    await client.end();
    return;
  }

  const ip = ipRes.rows[0];
  console.log("Found institution profile:", ip.name);

  // Also check business_profiles for images
  const bpRes = await client.query(`
    SELECT * FROM business_profiles WHERE institution_profile_id = 160 OR id = 39 LIMIT 1
  `);
  const bp = bpRes.rows[0] || {};

  // Also check phone from institution 5 if 160 is null
  let phone = ip.phone || bp.phone;
  if (!phone) {
    const ip5 = await client.query(`SELECT phone FROM institution_profiles WHERE id = 5 LIMIT 1`);
    phone = ip5.rows[0]?.phone || "8887787846";
  }

  const companyName = ip.name || "Maa Sharda Institute PVT LTD";
  const brandName = ip.name || "Maa Sharda Institute PVT LTD";
  const tagline = "Leading Coaching Institute in Varanasi for JEE, NEET, Foundation & Academic Excellence";
  const address = ip.branch_address || "Shau Bila Building, Pandeypur Road, Pandeypur, (Near Police Chowki and Allahabad Bank)";
  const city = ip.branch_city || "Varanasi";
  const state = ip.branch_state || "Uttar Pradesh";
  const pincode = ip.branch_pincode || "221002";
  const email = ip.email || bp.email || "deepakdv74@gmail.com";
  const website = ip.website || bp.website || "https://crm.143gb.com";
  const workingHours = ip.branch_working_hours || "Monday - Saturday: 9:00 AM - 6:00 PM IST";
  const logoUrl = bp.logo_url || "/uploads/media/1794989860085_WhatsApp_Image_2026-11-17_at_1_62356dbe.jpeg";
  const bannerUrl = bp.banner_url || "/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg";
  const galleryImages = bp.gallery_images || [];

  // 3. Upsert into platform_company_info
  const existingPci = await client.query(`
    SELECT id FROM platform_company_info WHERE business_id = 160 OR institution_id = 160 LIMIT 1
  `);

  if (existingPci.rows.length > 0) {
    const targetId = existingPci.rows[0].id;
    await client.query(`
      UPDATE platform_company_info SET
        company_name = $1,
        brand_name = $2,
        tagline = $3,
        about = $4,
        headquarters_address = $5,
        city = $6,
        state = $7,
        pincode = $8,
        phone = $9,
        support_email = $10,
        website_url = $11,
        working_hours = $12,
        logo_url = $13,
        banner_url = $14,
        gallery_images = $15,
        founder_name = $16,
        founder_title = $17,
        founder_image_url = $18,
        founder_about = $19,
        mission = $20,
        vision = $21,
        goal = $22,
        established_year = $23,
        business_id = 160,
        institution_id = 160,
        updated_at = NOW()
      WHERE id = $24
    `, [
      companyName,
      brandName,
      tagline,
      ip.about,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      website,
      workingHours,
      logoUrl,
      bannerUrl,
      galleryImages,
      ip.founder_name,
      ip.founder_title,
      ip.founder_image_url,
      ip.founder_about,
      ip.mission,
      ip.vision,
      ip.goal,
      ip.established_year,
      targetId,
    ]);
    console.log(`✅ Updated existing platform_company_info record #${targetId} with all database records!`);
  } else {
    const insertRes = await client.query(`
      INSERT INTO platform_company_info (
        business_id, institution_id, company_name, brand_name, tagline,
        about, headquarters_address, city, state, pincode, phone, support_email, website_url,
        working_hours, logo_url, banner_url, gallery_images,
        founder_name, founder_title, founder_image_url, founder_about, mission, vision, goal, established_year,
        updated_at
      ) VALUES (
        160, 160, $1, $2, $3,
        $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23,
        NOW()
      )
      RETURNING id
    `, [
      companyName,
      brandName,
      tagline,
      ip.about,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      website,
      workingHours,
      logoUrl,
      bannerUrl,
      galleryImages,
      ip.founder_name,
      ip.founder_title,
      ip.founder_image_url,
      ip.founder_about,
      ip.mission,
      ip.vision,
      ip.goal,
      ip.established_year,
    ]);
    console.log(`✅ Inserted new platform_company_info record #${insertRes.rows[0].id}!`);
  }

  // 4. Update business_profiles row 39 as well to have the clean name and address
  await client.query(`
    UPDATE business_profiles SET
      name = $1,
      about = $2,
      phone = $3,
      email = $4,
      address = $5,
      city = $6,
      state = $7,
      postal_code = $8,
      established_year = $9,
      updated_at = NOW()
    WHERE institution_profile_id = 160 OR id = 39
  `, [
    companyName,
    ip.about,
    phone,
    email,
    address,
    city,
    state,
    pincode,
    ip.established_year,
  ]);
  console.log("✅ Synced business_profiles row for institution 160.");

  await client.end();
}

syncCompanyData().catch(console.error);
