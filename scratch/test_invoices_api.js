const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testInvoices() {
  console.log("Testing invoice persistence in database...");

  // Find a task to test with
  const taskRes = await pool.query(`SELECT id, title FROM operations_tasks LIMIT 1;`);
  if (taskRes.rows.length === 0) {
    console.log("No tasks found to test");
    await pool.end();
    return;
  }
  const task = taskRes.rows[0];
  console.log("Testing with task:", task);

  const sampleInvoice = {
    id: `inv_test_${Date.now()}`,
    invoice_number: `INV-TEST-001`,
    issue_date: "2026-10-29",
    due_date: "2026-11-15",
    client_name: "Acme Corp",
    currency: "USD",
    items: [
      { id: "1", description: "Base Scope Deliverables", quantity: 1, unit_price: 5000, amount: 5000, is_extra_task: false },
      { id: "2", description: "Extra Task: Payment Gateway Addition", quantity: 1, unit_price: 1200, amount: 1200, is_extra_task: true }
    ],
    subtotal: 6200,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 6200,
    status: "unpaid",
    created_at: new Date().toISOString()
  };

  // Add invoice to task
  await pool.query(`
    UPDATE operations_tasks 
    SET invoices = jsonb_build_array($1::jsonb)
    WHERE id = $2;
  `, [JSON.stringify(sampleInvoice), task.id]);
  console.log("Saved test invoice to task", task.id);

  // Read back
  const readRes = await pool.query(`SELECT invoices FROM operations_tasks WHERE id = $1;`, [task.id]);
  console.log("Read back invoices:", readRes.rows[0].invoices);

  // Clean up
  await pool.query(`UPDATE operations_tasks SET invoices = '[]'::jsonb WHERE id = $1;`, [task.id]);
  console.log("Cleaned up invoices.");

  await pool.end();
}

testInvoices().catch(err => {
  console.error("Test error:", err);
  pool.end();
});

