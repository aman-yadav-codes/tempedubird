process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../lib/db/db');
  const { createAccessToken } = await import('../lib/auth/jwt');
  const { PUT } = await import('../app/api/admin/operations/tasks/route');

  const taskRes = await db.query('SELECT id, title, status, assigned_employee_id, assigned_employee_name, start_location FROM operations_tasks LIMIT 1');
  const task = taskRes.rows[0];
  console.log("Found task in DB:", task);

  const testUserId = task.assigned_employee_id || 1;
  const token = createAccessToken(testUserId, 'session-test-widget');

  console.log("Starting task ID:", task.id, "as user:", testUserId);
  const startReq = new Request('http://localhost:3000/api/admin/operations/tasks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      id: task.id,
      status: 'in_progress',
      action: 'start_task',
      start_location: { latitude: 25.3176, longitude: 82.9739, accuracy: 15 }
    })
  });

  const startRes = await PUT(startReq);
  const startData = await startRes.json();
  console.log("Start response status:", startRes.status);
  console.log("Updated task status:", startData.task?.status);
  console.log("Saved start_location:", startData.task?.start_location);

  console.log("\nStopping task ID:", task.id);
  const stopReq = new Request('http://localhost:3000/api/admin/operations/tasks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      id: task.id,
      status: 'pending',
      action: 'stop_task'
    })
  });

  const stopRes = await PUT(stopReq);
  const stopData = await stopRes.json();
  console.log("Stop response status:", stopRes.status);
  console.log("Updated task status after stop:", stopData.task?.status);
  console.log("Stopped at:", stopData.task?.stopped_at);
  console.log("Last history entry:", stopData.task?.history?.slice(-1)[0]);

  process.exit(0);
}

main().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
