const { pool } = require('./lib/db');
(async () => {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'operations_tasks' ORDER BY ordinal_position");
  console.log('Columns:', res.rows.map(r => r.column_name));
  const sample = await pool.query("SELECT id, title, start_date, due_date, live_url, demo_url, project_leader_name, agreement_document_url, agreement_document_name, assigned_employees FROM operations_tasks LIMIT 3");
  console.log('Sample rows:', sample.rows);
  process.exit(0);
})();

