process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrateDemoPlatformAdmin() {
  console.log('--- Cleaning and reassigning Demo Platform Admin accounts ---');

  // 1. Find all demo platform admin user IDs (81, 90, or any other with demo.platform_admin@edubird.com)
  const demoUsers = await pool.query(
    "SELECT id, email, full_name FROM users WHERE email ILIKE '%demo.platform_admin%' OR full_name ILIKE '%Demo Platform%'"
  );
  console.log('Demo platform admin users found:', demoUsers.rows);

  const demoIds = demoUsers.rows.map(u => u.id);
  // Also include 81 if not already there
  if (!demoIds.includes(81)) demoIds.push(81);
  if (!demoIds.includes(90)) demoIds.push(90);

  console.log('IDs to purge & reassign:', demoIds);

  // 2. In operations_tasks: update created_by, assigned_employee_id, project_leader_id
  for (const id of demoIds) {
    await pool.query("UPDATE operations_tasks SET created_by = 1 WHERE created_by = $1", [id]);
    await pool.query("UPDATE operations_tasks SET assigned_employee_id = 1, assigned_employee_name = 'Platform Admin' WHERE assigned_employee_id = $1", [id]);
    await pool.query("UPDATE operations_tasks SET project_leader_id = 1, project_leader_name = 'Platform Admin' WHERE project_leader_id = $1", [id]);
  }

  // 3. In operations_tasks.sub_tasks JSONB: update all references in subtasks, uploads, work_updates
  const allTasks = await pool.query("SELECT id, sub_tasks FROM operations_tasks WHERE sub_tasks IS NOT NULL");
  for (const task of allTasks.rows) {
    let subs = task.sub_tasks;
    if (!Array.isArray(subs)) continue;
    let modified = false;

    subs = subs.map(sub => {
      // Reassign assigned employee
      if (demoIds.includes(Number(sub.assigned_employee_id)) || (sub.assigned_employee_name && sub.assigned_employee_name.toLowerCase().includes('demo platform'))) {
        sub.assigned_employee_id = 1;
        sub.assigned_employee_name = 'Platform Admin';
        sub.assigned_employee_role = 'Platform Admin';
        modified = true;
      }

      // Reassign uploads
      if (Array.isArray(sub.uploads)) {
        sub.uploads = sub.uploads.map(u => {
          if (demoIds.includes(Number(u.uploaded_by_id)) || (u.uploaded_by_name && u.uploaded_by_name.toLowerCase().includes('demo platform'))) {
            u.uploaded_by_id = 1;
            u.uploaded_by_name = 'Platform Admin';
            u.uploaded_by_role = 'Platform Admin';
            modified = true;
          }
          return u;
        });
      }

      // Reassign work_updates
      if (Array.isArray(sub.work_updates)) {
        sub.work_updates = sub.work_updates.map(w => {
          if (demoIds.includes(Number(w.created_by_id)) || (w.created_by_name && w.created_by_name.toLowerCase().includes('demo platform'))) {
            w.created_by_id = 1;
            w.created_by_name = 'Platform Admin';
            w.created_by_role = 'Platform Admin';
            modified = true;
          }
          return w;
        });
      }

      return sub;
    });

    if (modified) {
      await pool.query("UPDATE operations_tasks SET sub_tasks = $1 WHERE id = $2", [JSON.stringify(subs), task.id]);
      console.log(`Updated sub_tasks for task ${task.id}`);
    }
  }

  // 4. In task_history or audit tables if present
  try {
    for (const id of demoIds) {
      await pool.query("UPDATE operations_task_history SET user_id = 1, user_name = 'Platform Admin' WHERE user_id = $1", [id]);
    }
  } catch (e) {
    // table might not exist
  }

  // 5. Delete demoIds from DB tables
  for (const id of demoIds) {
    await pool.query("DELETE FROM sessions WHERE user_id = $1", [id]).catch(() => {});
    await pool.query("DELETE FROM institution_memberships WHERE user_id = $1", [id]).catch(() => {});
    await pool.query("DELETE FROM user_roles WHERE user_id = $1", [id]).catch(() => {});
    await pool.query("DELETE FROM user_profiles WHERE user_id = $1", [id]).catch(() => {});
    await pool.query("DELETE FROM users WHERE id = $1", [id]).catch(() => {});
    console.log(`Purged user ${id}`);
  }

  // 6. Ensure User ID 1 is active, full_name = 'Platform Admin', email = 'admin@gmail.com'
  await pool.query(
    "UPDATE users SET full_name = 'Platform Admin', email = 'admin@gmail.com', is_active = TRUE, is_deleted = FALSE WHERE id = 1"
  );
  await pool.query(
    "UPDATE user_profiles SET under_institution_id = 1 WHERE user_id = 1"
  );
  await pool.query(`
    INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, is_deleted, created_at, updated_at)
    SELECT 1, 1, r.id, TRUE, FALSE, NOW(), NOW()
    FROM roles r WHERE r.code = 'platform_admin'
    ON CONFLICT (user_id, institution_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE
  `);

  console.log('Migration complete!');
  await pool.end();
}

migrateDemoPlatformAdmin().catch(console.error);
