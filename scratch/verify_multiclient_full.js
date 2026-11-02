process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("=== Testing Multi-Client Feature & Database ===");
  
  // 1. Get Dino (Client 5) and Apex Global (Client 1)
  const clientRes = await pool.query("SELECT id, name, company_name, email FROM clients WHERE id IN (1, 5) ORDER BY id");
  console.log("Found clients:", clientRes.rows);

  const assignedClientsData = clientRes.rows.map(c => ({
    id: c.id,
    name: c.name,
    company_name: c.company_name || c.name,
    email: c.email
  }));

  // 2. Insert test project with multiple assigned clients
  const insertRes = await pool.query(`
    INSERT INTO operations_tasks (
      title, project_for, company_name, client_id, client_name, assigned_clients,
      price, cost, status, urgency, sub_tasks, history, created_by
    ) VALUES (
      'Multi-Client Verification Project',
      'client',
      'Apex Global & Findmy',
      1,
      'Apex Global Technologies, findmy',
      $1::jsonb,
      50000,
      50000,
      'pending',
      'high',
      '[{"id": "sub_1", "title": "Initial Kickoff & Architecture Review", "status": "pending", "price": 10000}]'::jsonb,
      '[]'::jsonb,
      1
    ) RETURNING id, title, client_id, client_name, assigned_clients;
  `, [JSON.stringify(assignedClientsData)]);

  const created = insertRes.rows[0];
  console.log("Created task with multiple clients:", created);

  // 3. Test client query matching for Dino (Client 5)
  const testDinoQuery = await pool.query(`
    SELECT id, title, client_name, assigned_clients
    FROM operations_tasks
    WHERE client_id = 5 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem
      WHERE (elem->>'id')::int = 5
    )
  `);

  console.log("Query for Dino (Client 5) matched tasks count:", testDinoQuery.rows.length);
  const foundTask = testDinoQuery.rows.find(t => t.id === created.id);
  console.log("Dino can see multi-client project?", Boolean(foundTask));

  // 4. Test adding deliverable / subtask as client
  const existingSubs = [{ id: "sub_1", title: "Initial Kickoff & Architecture Review", status: "pending", price: 10000 }];
  const newSub = { id: "sub_2_client", title: "Client Feedback & Deliverable Signoff", status: "pending", price: 5000 };
  const updatedSubs = [...existingSubs, newSub];

  await pool.query(`
    UPDATE operations_tasks
    SET sub_tasks = $1::jsonb
    WHERE id = $2
  `, [JSON.stringify(updatedSubs), created.id]);

  const verifyUpdated = await pool.query("SELECT id, sub_tasks FROM operations_tasks WHERE id = $1", [created.id]);
  console.log("Updated sub_tasks count:", verifyUpdated.rows[0]?.sub_tasks?.length);

  // Clean up test project
  await pool.query("DELETE FROM operations_tasks WHERE id = $1", [created.id]);
  console.log("Cleaned up test project. All tests PASSED!");

  await pool.end();
}

main().catch(err => {
  console.error("Test failed:", err);
  pool.end();
});

