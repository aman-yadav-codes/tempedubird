process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name ASC
  `);
  console.log("Database tables:", tables.rows.map(r => r.table_name));
  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});

