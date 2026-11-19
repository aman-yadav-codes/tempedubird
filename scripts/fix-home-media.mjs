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
  console.log("Updating media URLs in database...");

  // 1. Update institution_profiles for 160
  await pool.query(`
    UPDATE institution_profiles
    SET logo_url = '/uploads/media/1794989860085_WhatsApp_Image_2026-11-17_at_1_62356dbe.jpeg',
        founder_image_url = '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg'
    WHERE id = 160
  `);
  console.log("✅ Updated institution_profiles 160");

  // 2. Update platform_company_info
  await pool.query(`
    UPDATE platform_company_info
    SET logo_url = '/uploads/media/1794989860085_WhatsApp_Image_2026-11-17_at_1_62356dbe.jpeg',
        banner_url = '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg',
        founder_image_url = '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg',
        gallery_images = ARRAY[
          '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg',
          '/uploads/media/1794995530624_WhatsApp_Image_2023-02-14_at_4_dae08d2f.jpeg',
          '/uploads/media/1794995534700_WhatsApp_Image_2023-02-14_at_4_25db5c09.jpeg',
          '/uploads/media/1794995538760_WhatsApp_Image_2023-02-14_at_4_be01f0f8.jpeg',
          '/uploads/media/1794995542834_WhatsApp_Image_2023-02-14_at_4_325552bf.jpeg'
        ]
    WHERE id = 2 OR business_id = 160 OR institution_id = 160
  `);
  console.log("✅ Updated platform_company_info");

  // 3. Update business_profiles row 39
  await pool.query(`
    UPDATE business_profiles
    SET logo_url = '/uploads/media/1794989860085_WhatsApp_Image_2026-11-17_at_1_62356dbe.jpeg',
        banner_url = '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg',
        gallery_images = ARRAY[
          '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg',
          '/uploads/media/1794995530624_WhatsApp_Image_2023-02-14_at_4_dae08d2f.jpeg',
          '/uploads/media/1794995534700_WhatsApp_Image_2023-02-14_at_4_25db5c09.jpeg',
          '/uploads/media/1794995538760_WhatsApp_Image_2023-02-14_at_4_be01f0f8.jpeg',
          '/uploads/media/1794995542834_WhatsApp_Image_2023-02-14_at_4_325552bf.jpeg'
        ]
    WHERE id = 39 OR institution_profile_id = 160
  `);
  console.log("✅ Updated business_profiles 39");

  // 4. Update institution_media for 160
  const mediaUpdates = [
    { id: 26, url: '/uploads/media/1794989860085_WhatsApp_Image_2026-11-17_at_1_62356dbe.jpeg', title: 'Logo', type: 'logo' },
    { id: 27, url: '/uploads/media/1794989894186_maashardadeepak1_f470fd16.jpeg', title: 'Leadership & Academic Excellence', type: 'image' },
    { id: 28, url: '/uploads/media/1794995530624_WhatsApp_Image_2023-02-14_at_4_dae08d2f.jpeg', title: 'Modern Classroom Learning', type: 'image' },
    { id: 29, url: '/uploads/media/1794995534700_WhatsApp_Image_2023-02-14_at_4_25db5c09.jpeg', title: 'Interactive Lecture Hall', type: 'image' },
    { id: 30, url: '/uploads/media/1794995538760_WhatsApp_Image_2023-02-14_at_4_be01f0f8.jpeg', title: 'Mentorship & Guidance Session', type: 'image' },
    { id: 31, url: '/uploads/media/1794995542834_WhatsApp_Image_2023-02-14_at_4_325552bf.jpeg', title: 'Student Success Community', type: 'image' },
  ];

  for (const m of mediaUpdates) {
    await pool.query(
      `UPDATE institution_media SET url = $1, title = $2 WHERE id = $3`,
      [m.url, m.title, m.id]
    );
  }
  console.log("✅ Updated institution_media items for 160");

  await pool.end();
}

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
