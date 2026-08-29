const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Tables:", JSON.stringify(res.rows.map(r => r.table_name), null, 2));

    const reviews = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name LIKE '%review%' OR table_name LIKE '%rating%' OR column_name LIKE '%rating%' OR column_name LIKE '%review%'
      ORDER BY table_name, ordinal_position;
    `);
    console.log("Review/Rating columns:", JSON.stringify(reviews.rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

main();
