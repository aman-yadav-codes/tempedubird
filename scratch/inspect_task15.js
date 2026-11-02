const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'operations_tasks'");
  console.log('Columns:', cols.rows.map(r => r.column_name));
  const row = await pool.query('SELECT * FROM operations_tasks WHERE id = 15');
  console.log('Task 15 data:');
  const t = row.rows[0];
  console.log({
    id: t.id,
    title: t.title,
    start_date: t.start_date,
    deadline: t.deadline,
    estimated_hours: t.estimated_hours,
    sub_tasks_count: Array.isArray(t.sub_tasks) ? t.sub_tasks.length : 0,
  });
  if (Array.isArray(t.sub_tasks) && t.sub_tasks.length > 0) {
    console.log('Sample sub_task 0:', t.sub_tasks[0]);
    console.log('Sample sub_task 1:', t.sub_tasks[1]);
  }
  await pool.end();
}
run();

