import fs from 'fs';

const filePath = 'app/lib/task-attendance-sync.ts';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    // Fetch user's tasks
    const tasksRes = await dbInstance.query(
      \`SELECT * FROM operations_tasks
       WHERE institution_id = $1
         AND (assigned_employee_id = $2 OR created_by = $2)\`,
      [institutionId, staffUserId]
    );`;

const replacement = `    // Ensure valid effective institution ID
    let effectiveInstId = institutionId;
    if (!effectiveInstId) {
      const uRes = await dbInstance.query(\`SELECT institution_id FROM users WHERE id = $1\`, [staffUserId]).catch(() => ({ rows: [] }));
      effectiveInstId = uRes.rows[0]?.institution_id || 1;
    }

    // Fetch user's tasks (including individual assigned, team assigned, and subtask assigned)
    const tasksRes = await dbInstance.query(
      \`SELECT * FROM operations_tasks
       WHERE (institution_id = $1 OR institution_id IS NULL)
         AND (
           assigned_employee_id = $2
           OR created_by = $2
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_employees, '[]'::jsonb)) elem
             WHERE (elem->>'id')::text = $2::text 
                OR (elem->>'employee_id')::text = $2::text 
                OR elem::text = $2::text
           )
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) st
             WHERE (st->>'assigned_employee_id')::text = $2::text
           )
         )\`,
      [effectiveInstId, staffUserId]
    );`;

// Normalize CRLF
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');
const normReplacement = replacement.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  let newContent = normContent.replace(normTarget, normReplacement);
  // Also update working_hours and task_hours to EXCLUDED in the upsert
  newContent = newContent.replace(
    "working_hours = GREATEST(staff_attendance.working_hours, EXCLUDED.working_hours),\n        task_hours = GREATEST(staff_attendance.task_hours, EXCLUDED.task_hours),",
    "working_hours = EXCLUDED.working_hours,\n        task_hours = EXCLUDED.task_hours,"
  );
  const finalContent = content.includes('\r\n') ? newContent.replace(/\n/g, '\r\n') : newContent;
  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log('SUCCESSFULLY REPLACED IN task-attendance-sync.ts');
} else {
  console.log('TARGET NOT FOUND');
}
