const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Find program-related tables
    const res = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%program%' OR table_name ILIKE '%course%' OR table_name ILIKE '%class%' OR table_name ILIKE '%section%') AND table_type='BASE TABLE' ORDER BY table_name`
    );
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

    // Check study_notes - what program_id constraint looks like
    const fk = await client.query(`
      SELECT ccu.table_name AS foreign_table, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'study_notes'
    `);
    console.log('\nstudy_notes FKs:', fk.rows);

  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
