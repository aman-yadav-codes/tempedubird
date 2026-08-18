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
    // 1. Create table institution_offers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS institution_offers (
        id SERIAL PRIMARY KEY,
        institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        discount_text VARCHAR(100) NOT NULL,
        description TEXT,
        target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'students', 'guardians'
        valid_till DATE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("TABLE institution_offers CREATED/VERIFIED!");

    // 2. Seed active offers for institutions (including IDs 155, 156 and all demo institutions)
    const instRes = await pool.query(`SELECT id, name FROM institution_profiles WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 10`);
    
    for (const inst of instRes.rows) {
      await pool.query(`
        INSERT INTO institution_offers (institution_id, title, code, discount_text, description, target_audience, valid_till, is_active)
        VALUES 
          ($1, 'Early Bird Admission Scholarship 2026', 'EARLYBIRD25', '25% OFF Tuition', 'Special 25% tuition fee waiver for early enrollments in B.Tech & M.Tech programs.', 'all', CURRENT_DATE + INTERVAL '60 days', TRUE),
          ($1, 'Merit Student Excellence Waiver', 'MERIT100', '100% Admission Fee Waiver', 'Full waiver on admission fee for top 5% rank holders in state entrance exam.', 'students', CURRENT_DATE + INTERVAL '90 days', TRUE),
          ($1, 'Sibling & Guardian Family Grant', 'FAMILY15', '15% Family Discount', '15% discount on total annual fee when two or more siblings enroll.', 'guardians', CURRENT_DATE + INTERVAL '120 days', TRUE)
        ON CONFLICT DO NOTHING;
      `, [inst.id]);
    }

    console.log("SEEDED DEMO INSTITUTION OFFERS SUCCESSFULLY!");
  } catch (err) {
    console.error("Offer seed error:", err);
  } finally {
    await pool.end();
  }
}

main();
