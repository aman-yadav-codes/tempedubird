const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const res = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'locations'
    ORDER BY ordinal_position;
  `);
  console.log('locations columns:', res.rows.map(r => r.column_name).join(', '));
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
