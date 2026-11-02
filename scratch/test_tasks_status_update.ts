process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testTaskStatusUpdate() {
  const { db } = await import('../lib/db/db');
  const { PUT } = await import('../app/api/admin/operations/tasks/route');

  // Find any existing task
  const taskRes = await db.query('SELECT id, status FROM operations_tasks LIMIT 1');
  if (!taskRes.rows.length) {
    console.log('No tasks found in DB');
    process.exit(0);
  }

  const taskId = taskRes.rows[0].id;
  const currentStatus = taskRes.rows[0].status;
  console.log('Testing task update on task ID:', taskId, 'currentStatus:', currentStatus);

  const newStatus = currentStatus === 'in_progress' ? 'completed' : 'in_progress';

  // Create JWT for user 1
  const { createAccessToken } = await import('../lib/auth/jwt');
  const token = createAccessToken(1, 'test-session-123');

  const req = new Request('http://localhost:3000/api/admin/operations/tasks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: taskId,
      status: newStatus,
    }),
  });

  const res = await PUT(req);
  console.log('PUT status response:', res.status);
  const json = await res.json();
  if (res.status !== 200) {
    console.error('PUT failed:', json);
  } else {
    console.log('PUT success! updated task status:', json.task?.status, 'status_changed_at:', json.task?.status_changed_at);
  }

  // Restore status
  await db.query('UPDATE operations_tasks SET status = $1 WHERE id = $2', [currentStatus, taskId]);

  process.exit(0);
}

testTaskStatusUpdate().catch((e) => {
  console.error(e);
  process.exit(1);
});
