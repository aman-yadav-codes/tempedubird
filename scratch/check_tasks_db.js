const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkTasks() {
  const tasks = await pool.query(`
    SELECT id, title, institution_id, created_by, assigned_employee_id, assigned_employee_name, project_leader_id, status
    FROM operations_tasks
    ORDER BY id DESC
    LIMIT 20
  `);
  console.log("Tasks in DB:", tasks.rows);
  await pool.end();
}

checkTasks().catch(console.error);

