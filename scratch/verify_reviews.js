const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const types = ['course', 'program', 'institution', 'exam', 'practice', 'notes', 'teacher', 'faculty'];

    console.log("=== Verification of Dummy Reviews & Ratings across Entities ===");

    for (const t of types) {
      const sample = await pool.query(`
        SELECT entity_type, entity_id, reviewer_name, reviewer_role, rating, title, comment, created_at
        FROM entity_reviews
        WHERE entity_type = $1
        ORDER BY id DESC
        LIMIT 1
      `, [t]);

      const count = await pool.query(`
        SELECT COUNT(*) as total, AVG(rating)::numeric(3,2) as avg_rating, COUNT(DISTINCT entity_id) as distinct_entities
        FROM entity_reviews
        WHERE entity_type = $1
      `, [t]);

      console.log(`\n▶ Type: ${t.toUpperCase()}`);
      console.log(`  Total Reviews: ${count.rows[0].total} | Avg Rating: ${count.rows[0].avg_rating} | Distinct Entities Covered: ${count.rows[0].distinct_entities}`);
      if (sample.rows[0]) {
        console.log(`  Sample Review: [${sample.rows[0].rating}★] "${sample.rows[0].title}" by ${sample.rows[0].reviewer_name} (${sample.rows[0].reviewer_role})`);
        console.log(`  "${sample.rows[0].comment}"`);
      }
    }
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await pool.end();
  }
}

main();
