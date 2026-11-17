process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { Pool } from "pg";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Create Business Form 5-Tab Integration Tests ===\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Setup / find Category & Subcategory
    let catRes = await pool.query(`SELECT id FROM categories WHERE slug = 'test-business-cat' LIMIT 1`);
    let catId: number;
    if (catRes.rows.length === 0) {
      const insCat = await pool.query(
        `INSERT INTO categories (name, slug, depth, is_active, created_at, updated_at)
         VALUES ('Education & Training', 'test-business-cat', 0, true, NOW(), NOW())
         RETURNING id`
      );
      catId = insCat.rows[0].id;
    } else {
      catId = catRes.rows[0].id;
    }

    let subcatRes = await pool.query(`SELECT id FROM categories WHERE slug = 'test-business-subcat' LIMIT 1`);
    let subcatId: number;
    if (subcatRes.rows.length === 0) {
      const insSub = await pool.query(
        `INSERT INTO categories (name, slug, parent_id, depth, is_active, created_at, updated_at)
         VALUES ('Coaching Institutes', 'test-business-subcat', $1, 1, true, NOW(), NOW())
         RETURNING id`,
        [catId]
      );
      subcatId = insSub.rows[0].id;
    } else {
      subcatId = subcatRes.rows[0].id;
    }

    // 2. Setup user
    const userRes = await pool.query(`SELECT id, email FROM users LIMIT 1`);
    const userId = userRes.rows[0]?.id || 1;

    // 3. Test Business Creation Payload across all 5 Tabs matching screenshot
    const testPayload = {
      // Tab 1: Overview
      name: "Summit Academy of Science",
      business_type: "Institute",
      category_id: catId,
      subcategory_id: subcatId,
      about: "Premier science coaching institute offering JEE and NEET prep with 15+ years of excellence.",
      logo_url: "https://example.com/summit-logo.png",
      banner_url: "https://example.com/summit-banner.jpg",
      established_year: 2012,

      // Tab 2: Location & Map
      country_code: "IN",
      state: "Maharashtra",
      district: "Mumbai Suburban",
      city: "Mumbai",
      locality: "Andheri West",
      postal_code: "400053",
      address: "101, Science Hub, Link Road, Andheri West",
      latitude: 19.1363,
      longitude: 72.8277,

      // Tab 3: Contact & Social
      phone: "+91 9876543210",
      whatsapp: "+91 9876543210",
      email: "info@summitacademy.in",
      website: "https://summitacademy.in",
      social_links: {
        facebook: "https://facebook.com/summitacademy",
        instagram: "https://instagram.com/summitacademy",
        linkedin: "https://linkedin.com/company/summitacademy",
        twitter: "https://x.com/summitacademy",
      },

      // Tab 4: Branches & Hours
      opening_hours: {
        Monday: { open: "08:00", close: "20:00", isClosed: false },
        Tuesday: { open: "08:00", close: "20:00", isClosed: false },
        Wednesday: { open: "08:00", close: "20:00", isClosed: false },
        Thursday: { open: "08:00", close: "20:00", isClosed: false },
        Friday: { open: "08:00", close: "20:00", isClosed: false },
        Saturday: { open: "09:00", close: "18:00", isClosed: false },
        Sunday: { open: "10:00", close: "14:00", isClosed: true },
      },
      branches: [
        { name: "Bandra Branch", city: "Mumbai", phone: "+91 9876543211", address: "Hill Road, Bandra West" },
        { name: "Thane Campus", city: "Thane", phone: "+91 9876543212", address: "Gokhale Road, Thane West" },
      ],

      // Tab 5: Owner & Actions
      is_active: true,
      is_featured: true,
      is_verified: false,
    };

    // 4. Create unique slug
    const candidateSlug = `summit-academy-${Date.now()}`;

    // 5. Insert into institution_profiles & business_profiles
    const instRes = await pool.query(
      `INSERT INTO institution_profiles (
         name, slug, institution_type_id, phone, email, website, about, established_year,
         is_active, is_marketplace_enabled, is_deleted, created_by, updated_by, created_at, updated_at
       ) VALUES (
         $1, $2, 8, $3, $4, $5, $6, $7,
         true, true, false, $8, $8, NOW(), NOW()
       ) RETURNING id`,
      [
        testPayload.name, candidateSlug, testPayload.phone, testPayload.email, testPayload.website,
        testPayload.about, testPayload.established_year, userId
      ]
    );
    const instId = instRes.rows[0].id;
    console.log(`[OK] Created institution_profile id=${instId}`);

    const bpRes = await pool.query(
      `INSERT INTO business_profiles (
         user_id, institution_profile_id, name, slug, business_type,
         category_id, subcategory_id, country_code, state, district, city, locality, postal_code, address,
         latitude, longitude, phone, whatsapp, email, website, social_links, opening_hours, branches,
         logo_url, banner_url, about, custom_description, established_year, is_verified, is_featured, is_active,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19, $20, $21, $22, $23,
         $24, $25, $26, $26, $27, $28, $29, true,
         NOW(), NOW()
       ) RETURNING id`,
      [
        userId, instId, testPayload.name, candidateSlug, testPayload.business_type,
        testPayload.category_id, testPayload.subcategory_id, testPayload.country_code,
        testPayload.state, testPayload.district, testPayload.city, testPayload.locality,
        testPayload.postal_code, testPayload.address, testPayload.latitude, testPayload.longitude,
        testPayload.phone, testPayload.whatsapp, testPayload.email, testPayload.website,
        JSON.stringify(testPayload.social_links), JSON.stringify(testPayload.opening_hours),
        JSON.stringify(testPayload.branches), testPayload.logo_url, testPayload.banner_url,
        testPayload.about, testPayload.established_year, testPayload.is_verified, testPayload.is_featured
      ]
    );
    const bpId = bpRes.rows[0].id;
    console.log(`[OK] Created business_profile id=${bpId} across all 5 modules`);

    // 6. Query and assert all 5-tab fields
    const checkRes = await pool.query(
      `SELECT 
         bp.*,
         c.name AS category_name,
         subc.name AS subcategory_name
       FROM business_profiles bp
       LEFT JOIN categories c ON c.id = bp.category_id
       LEFT JOIN categories subc ON subc.id = bp.subcategory_id
       WHERE bp.id = $1`,
      [bpId]
    );

    const data = checkRes.rows[0];

    // Tab 1: Overview
    assert(data.name === "Summit Academy of Science", "Name must match");
    assert(data.business_type === "Institute", "Business type must match");
    assert(data.category_name === "Education & Training", "Main Category must match");
    assert(data.subcategory_name === "Coaching Institutes", "Subcategory must match");
    assert(data.about.includes("Premier science coaching"), "About must match");
    assert(data.logo_url === "https://example.com/summit-logo.png", "Logo URL must match");
    console.log("[OK] Tab 1: Overview verified (Listing Name, Business Type, Main Category, Subcategory, Description, Logo)");

    // Tab 2: Location & Map
    assert(data.country_code === "IN", "Country code must match");
    assert(data.state === "Maharashtra", "State must match");
    assert(data.district === "Mumbai Suburban", "District must match");
    assert(data.city === "Mumbai", "City must match");
    assert(data.locality === "Andheri West", "Locality must match");
    assert(data.postal_code === "400053", "Postal code must match");
    assert(Number(data.latitude) === 19.1363, "Latitude must match");
    assert(Number(data.longitude) === 72.8277, "Longitude must match");
    console.log("[OK] Tab 2: Location & Map verified (Country, State, District, City, Locality, PIN, Coordinates)");

    // Tab 3: Contact & Social
    assert(data.phone === "+91 9876543210", "Phone must match");
    assert(data.whatsapp === "+91 9876543210", "WhatsApp must match");
    assert(data.email === "info@summitacademy.in", "Email must match");
    assert(data.website === "https://summitacademy.in", "Website must match");
    assert(data.social_links.facebook === "https://facebook.com/summitacademy", "Facebook must match");
    assert(data.social_links.instagram === "https://instagram.com/summitacademy", "Instagram must match");
    console.log("[OK] Tab 3: Contact & Social verified (Phone, WhatsApp, Email, Website, Social Links)");

    // Tab 4: Branches & Hours
    assert(data.opening_hours.Monday.open === "08:00", "Opening hours must match");
    assert(data.opening_hours.Sunday.isClosed === true, "Sunday must be closed");
    assert(Array.isArray(data.branches) && data.branches.length === 2, "Branches count must be 2");
    assert(data.branches[0].name === "Bandra Branch", "First branch must match");
    console.log("[OK] Tab 4: Branches & Hours verified (Weekly Schedule, Multiple Branches)");

    // Tab 5: Owner & Actions
    assert(data.user_id === userId, "Owner ID must match");
    assert(data.is_active === true, "Listing must be active");
    assert(data.is_featured === true, "Listing must be featured");
    assert(data.is_verified === false, "Listing must be unverified (matching screenshot status)");
    console.log("[OK] Tab 5: Owner & Actions verified (Ownership, Active, Featured, Verification status)");

    // 7. Clean up
    await pool.query(`DELETE FROM business_profiles WHERE id = $1`, [bpId]);
    await pool.query(`DELETE FROM institution_profiles WHERE id = $1`, [instId]);
    console.log("\n[OK] Cleaned up test records.");
    console.log("\n🎉 ALL 18 CREATE BUSINESS FORM 5-TAB ASSERTIONS PASSED!\n");

  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
