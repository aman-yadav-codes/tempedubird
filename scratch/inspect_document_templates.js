const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const rows = await pool.query(`
    SELECT dt.id, dt.name, dt.card_category_id, dt.is_active, cc.name as category_name, cc.target_audience
    FROM document_templates dt
    LEFT JOIN card_categories cc ON cc.id = dt.card_category_id
  `);
  console.log('Templates count:', rows.rows.length);
  console.log(rows.rows);
  await pool.end();
}
run();
