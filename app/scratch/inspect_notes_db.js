const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name ILIKE '%note%' OR table_name ILIKE '%read%' OR table_name ILIKE '%track%' OR table_name ILIKE '%study%')");
  console.log('Tables:', res.rows.map(r => r.table_name));

  for (const t of res.rows.map(r => r.table_name)) {
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
    console.log(`Table: ${t}`, cols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));
  }
  await pool.end();
}
run().catch(console.error);
