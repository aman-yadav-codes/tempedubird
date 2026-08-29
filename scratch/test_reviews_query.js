const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const res = await pool.query(`
      WITH reviews_rollup AS (
        SELECT
          entity_id,
          ROUND(AVG(rating), 1)::numeric(3,1) AS course_avg_rating,
          COUNT(*)::int AS course_reviews_count
        FROM entity_reviews
        WHERE entity_type IN ('course', 'program')
        GROUP BY entity_id
      )
      SELECT
        ip.id,
        ip.title,
        inst.name AS institution_name,
        COALESCE(reviews_rollup.course_avg_rating, 4.8) AS rating,
        COALESCE(reviews_rollup.course_reviews_count, 0) AS reviews_count
      FROM institution_programs ip
      INNER JOIN institution_profiles inst ON inst.id = ip.institution_id
      LEFT JOIN reviews_rollup ON reviews_rollup.entity_id = ip.id
      ORDER BY ip.id ASC
      LIMIT 5;
    `);
    console.log("Course listings rating/reviews test:", res.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
