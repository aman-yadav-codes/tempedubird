const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%institution%' ORDER BY table_name");
  console.log(res.rows);
}

run().finally(() => pool.end());
