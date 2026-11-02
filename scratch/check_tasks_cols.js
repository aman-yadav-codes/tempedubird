const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'operations_tasks' ORDER BY ordinal_position"
  );
  console.log("operations_tasks columns:", res.rows.map(r => `${r.column_name} (${r.data_type})`));
  await pool.end();
}

main().catch(console.error);
