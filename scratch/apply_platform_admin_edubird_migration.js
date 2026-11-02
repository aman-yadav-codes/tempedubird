process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function runMigration() {
  console.log('=== Step 1: Assign Edubird as Institution ID 1 ===');
  // First, free up slug 'edubird' if on id 9
  await pool.query(`
    UPDATE institution_profiles 
    SET slug = 'edubird-old-9', is_active = FALSE, is_deleted = TRUE 
    WHERE id = 9;
  `);

  // Update Institution 1 to Edubird
  await pool.query(`
    UPDATE institution_profiles 
    SET name = 'Edubird',
        slug = 'edubird',
        email = 'info@edubird.in',
        phone = '91 7666775754',
        website = 'https://www.edubird.in',
        about = 'EduBird Technologies & Learning Platform',
        is_active = TRUE,
        is_deleted = FALSE
    WHERE id = 1;
  `);

  // Migrate any references from institution 9 to institution 1
  await pool.query(`
    UPDATE institution_memberships 
    SET institution_id = 1 
    WHERE institution_id = 9;
  `);
  await pool.query(`
    UPDATE user_profiles 
    SET under_institution_id = 1 
    WHERE under_institution_id = 9;
  `);
  await pool.query(`
    UPDATE student_enrollments 
    SET institution_id = 1 
    WHERE institution_id = 9;
  `);

  console.log('=== Step 2: Ensure Platform Admin ID 1 is active on Institution 1 ===');
  const user1InstMem = await pool.query(`
    SELECT * FROM institution_memberships WHERE user_id = 1 AND institution_id = 1;
  `);
  if (user1InstMem.rows.length > 0) {
    await pool.query(`
      UPDATE institution_memberships 
      SET is_active = TRUE, is_deleted = FALSE, status = 'ACTIVE' 
      WHERE user_id = 1 AND institution_id = 1;
    `);
  } else {
    await pool.query(`
      INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, is_deleted, status)
      VALUES (1, 1, 1, TRUE, FALSE, 'ACTIVE');
    `);
  }

  // Ensure user 1 has under_institution_id = 1
  await pool.query(`
    UPDATE user_profiles SET under_institution_id = 1 WHERE user_id = 1;
  `);

  console.log('=== Step 3: Reassign tasks, leader, and history from user 81 to user 1 ===');
  await pool.query(`
    UPDATE operations_tasks 
    SET created_by = 1 
    WHERE created_by = 81;
  `);
  await pool.query(`
    UPDATE operations_tasks 
    SET assigned_employee_id = 1,
        assigned_employee_name = 'Platform Admin' 
    WHERE assigned_employee_id = 81;
  `);
  await pool.query(`
    UPDATE operations_tasks 
    SET project_leader_id = 1,
        project_leader_name = 'Platform Admin' 
    WHERE project_leader_id = 81;
  `);

  // Update JSON fields in operations_tasks (sub_tasks and history)
  const tasksRes = await pool.query(`SELECT id, sub_tasks, history, assigned_employees FROM operations_tasks;`);
  for (const t of tasksRes.rows) {
    let changed = false;
    let subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
    let hist = Array.isArray(t.history) ? t.history : [];
    let emps = Array.isArray(t.assigned_employees) ? t.assigned_employees : [];

    subs = subs.map(s => {
      if (Number(s.assigned_employee_id) === 81) {
        changed = true;
        return { ...s, assigned_employee_id: 1, assigned_employee_name: 'Platform Admin' };
      }
      return s;
    });

    hist = hist.map(h => {
      if (Number(h.user_id) === 81 || h.user_name === 'Demo Platform Admin') {
        changed = true;
        return { ...h, user_id: 1, user_name: 'Platform Admin' };
      }
      return h;
    });

    emps = emps.map(e => {
      if (Number(e.id || e.employee_id) === 81) {
        changed = true;
        return { ...e, id: 1, employee_id: 1, name: 'Platform Admin' };
      }
      return e;
    });

    if (changed) {
      await pool.query(
        `UPDATE operations_tasks SET sub_tasks = $1::jsonb, history = $2::jsonb, assigned_employees = $3::jsonb WHERE id = $4`,
        [JSON.stringify(subs), JSON.stringify(hist), JSON.stringify(emps), t.id]
      );
    }
  }

  console.log('=== Step 4: Remove Demo Platform Admin Account (user 81) ===');
  await pool.query(`DELETE FROM user_roles WHERE user_id = 81;`);
  await pool.query(`DELETE FROM user_profiles WHERE user_id = 81;`);
  await pool.query(`DELETE FROM institution_memberships WHERE user_id = 81;`);
  try {
    await pool.query(`DELETE FROM sessions WHERE user_id = 81;`);
  } catch {}
  await pool.query(`DELETE FROM users WHERE id = 81;`);

  console.log('=== Step 5: Assign all platform staff without an institution to Institution 1 ===');
  // Any staff member where under_institution_id is NULL or 0 -> set to 1 (Edubird)
  await pool.query(`
    UPDATE user_profiles 
    SET under_institution_id = 1 
    WHERE under_institution_id IS NULL OR under_institution_id = 0;
  `);

  // Ensure every active user that is not a student/parent has an active membership for institution 1 if they lack memberships
  const usersWithoutInst = await pool.query(`
    SELECT u.id 
    FROM users u
    LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.institution_id = 1
    WHERE im.id IS NULL
      AND COALESCE(u.is_deleted, FALSE) = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
        WHERE ur.user_id = u.id AND r.code IN ('student', 'parent', 'guardian')
      );
  `);

  console.log(`Adding ${usersWithoutInst.rows.length} staff to institution 1 memberships...`);
  for (const row of usersWithoutInst.rows) {
    await pool.query(`
      INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, is_deleted, status)
      VALUES ($1, 1, 1, TRUE, FALSE, 'ACTIVE')
      ON CONFLICT DO NOTHING;
    `, [row.id]);
  }

  console.log('=== Step 6: Verify Final Setup ===');
  const inst1 = await pool.query(`SELECT id, name, slug, email FROM institution_profiles WHERE id = 1;`);
  console.log('Institution 1:', inst1.rows[0]);

  const pAdmin = await pool.query(`SELECT id, full_name, email FROM users WHERE id = 1;`);
  console.log('Platform Admin:', pAdmin.rows[0]);

  const demoAdminCheck = await pool.query(`SELECT COUNT(*) as c FROM users WHERE id = 81 OR email = 'demo.platform_admin@edubird.com';`);
  console.log('Remaining demo platform admins (should be 0):', demoAdminCheck.rows[0].c);

  const staffCountInst1 = await pool.query(`
    SELECT COUNT(DISTINCT user_id) as c FROM institution_memberships WHERE institution_id = 1 AND is_active = TRUE;
  `);
  console.log('Staff members active in Institution 1 (Edubird):', staffCountInst1.rows[0].c);

  await pool.end();
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  pool.end();
});
