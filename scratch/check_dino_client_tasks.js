process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  const userRes = await pool.query("SELECT * FROM users WHERE email = 'dino@gmail.com'");
  const dinoUser = userRes.rows[0];
  console.log('Dino user:', dinoUser ? { id: dinoUser.id, email: dinoUser.email, role_id: dinoUser.role_id } : 'None');

  const clientRes = await pool.query('SELECT id, name, user_id, email, phone FROM clients WHERE user_id = $1 OR lower(email) = lower($2)', [dinoUser?.id, dinoUser?.email]);
  console.log('Dino client records:', clientRes.rows);
  const clientIds = clientRes.rows.map(r => r.id);

  const tasksRes = await pool.query(`
    SELECT id, title, client_id, assigned_clients, project_for
    FROM operations_tasks
    WHERE client_id = ANY($1::int[])
      OR created_by = $2
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem
        WHERE ((elem->>'id') ~ '^[0-9]+$' AND (elem->>'id')::int = ANY($1::int[]))
          OR ((elem->>'user_id') ~ '^[0-9]+$' AND (elem->>'user_id')::int = $2)
          OR lower(COALESCE(elem->>'email', '')) = lower($3)
      )
  `, [clientIds.length > 0 ? clientIds : [-1], dinoUser?.id || -1, dinoUser?.email || '']);
  console.log('Dino can see tasks count:', tasksRes.rows.length);
  console.log('Tasks titles:', tasksRes.rows.map(t => ({ id: t.id, title: t.title, assigned_clients: t.assigned_clients })));
  await pool.end();
}
test().catch(e => { console.error(e); pool.end(); });
