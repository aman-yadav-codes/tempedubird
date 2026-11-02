process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const tasks = await pool.query("SELECT id, title, sub_tasks FROM operations_tasks");
  for (const t of tasks.rows) {
    console.log('Task', t.id, t.title);
    if (t.sub_tasks) {
      console.log('sub_tasks:', JSON.stringify(t.sub_tasks, null, 2));
    }
  }
  await pool.end();
}
check().catch(console.error);
