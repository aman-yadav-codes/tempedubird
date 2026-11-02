process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const uploads = await pool.query("SELECT * FROM operations_task_uploads");
  console.log('Uploads count:', uploads.rows.length);
  console.log('Uploads:', uploads.rows);

  const updates = await pool.query("SELECT * FROM operations_task_work_updates");
  console.log('Work updates count:', updates.rows.length);
  console.log('Work updates:', updates.rows);

  // Check tasks with created_by = 90 or assigned to 90
  const tasks = await pool.query("SELECT id, title, created_by, assigned_employee_id, assigned_employee_name, project_leader_id, project_leader_name FROM operations_tasks WHERE created_by = 90 OR assigned_employee_id = 90 OR project_leader_id = 90 OR details ILIKE '%demo platform%'");
  console.log('Tasks with user 90:', tasks.rows);

  await pool.end();
}
check().catch(console.error);
