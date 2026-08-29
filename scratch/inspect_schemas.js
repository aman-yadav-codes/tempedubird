const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const tables = [
      'institution_programs',
      'institution_profiles',
      'entrance_exams',
      'practice_tests',
      'practice_exams',
      'study_notes',
      'notes',
      'users',
      'entity_reviews'
    ];

    for (const t of tables) {
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [t]);
      console.log(`\n--- TABLE: ${t} ---`);
      console.log(cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    }

    const currentReviews = await pool.query(`
      SELECT entity_type, COUNT(*) as count, AVG(rating)::numeric(3,1) as avg_rating 
      FROM entity_reviews 
      GROUP BY entity_type
    `);
    console.log("\nCurrent entity_reviews breakdown:", currentReviews.rows);

    const sampleReviews = await pool.query(`
      SELECT * FROM entity_reviews LIMIT 5
    `);
    console.log("\nSample reviews in DB:", sampleReviews.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
