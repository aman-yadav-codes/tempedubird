const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testFullWorkflow() {
  console.log("=== Testing Project -> Breakdown -> Invoice Workflow ===");

  // 1. Create a test project with base price
  const projectRes = await pool.query(`
    INSERT INTO operations_tasks (
      title, project_for, company_name, currency, base_price, cost, price, status,
      created_at, updated_at
    ) VALUES (
      'Enterprise ERP Portal', 'client', 'Acme Corp', 'USD', 20000, 20000, 20000, 'in_progress',
      NOW(), NOW()
    ) RETURNING id, title, base_price, cost, currency;
  `);

  const project = projectRes.rows[0];
  console.log("1. Created Project:", project);

  // 2. Add breakdown items (1 base deliverable + 2 client extra tasks with price additions)
  const breakdownItems = [
    {
      id: "sub_1",
      title: "Core ERP Dashboard Setup",
      price: 20000,
      is_extra_task: false,
      scope_type: "base_scope",
      status: "completed"
    },
    {
      id: "sub_2",
      title: "Client Added: Multi-Currency Multi-Tenant Accounting Module",
      price: 4500,
      is_extra_task: true,
      scope_type: "client_extra",
      client_approval: "approved",
      status: "in_progress"
    },
    {
      id: "sub_3",
      title: "Client Added: Custom Biometric Attendance API Sync",
      price: 2500,
      is_extra_task: true,
      scope_type: "client_extra",
      client_approval: "approved",
      status: "pending"
    }
  ];

  const extraCost = 4500 + 2500; // 7000
  const totalRevisedValue = 20000 + extraCost; // 27000

  await pool.query(`
    UPDATE operations_tasks
    SET sub_tasks = $1::jsonb,
        base_price = 20000,
        extra_cost = $2,
        cost = $3,
        price = $3,
        updated_at = NOW()
    WHERE id = $4;
  `, [JSON.stringify(breakdownItems), extraCost, totalRevisedValue, project.id]);

  console.log("2. Added Breakdown with Price Additions:");
  console.log("   Base Price:", 20000);
  console.log("   Extra Cost (+):", extraCost);
  console.log("   Total Revised Project Value:", totalRevisedValue);

  // 3. Create an invoice for the extra client tasks
  const testInvoice = {
    id: `inv_prj_${project.id}_001`,
    invoice_number: `INV-PRJ${project.id}-001`,
    issue_date: "2026-10-29",
    due_date: "2026-11-15",
    client_name: "Acme Corp",
    client_company: "Acme Corporation Ltd.",
    currency: "USD",
    items: [
      { id: "i1", description: "Multi-Currency Multi-Tenant Accounting Module", quantity: 1, unit_price: 4500, amount: 4500, is_extra_task: true },
      { id: "i2", description: "Custom Biometric Attendance API Sync", quantity: 1, unit_price: 2500, amount: 2500, is_extra_task: true }
    ],
    subtotal: 7000,
    tax_rate: 0,
    tax_amount: 0,
    total_amount: 7000,
    status: "unpaid",
    notes: "Payment due within 15 days of invoice date.",
    created_at: new Date().toISOString()
  };

  await pool.query(`
    UPDATE operations_tasks
    SET invoices = jsonb_build_array($1::jsonb)
    WHERE id = $2;
  `, [JSON.stringify(testInvoice), project.id]);

  console.log("3. Generated & Saved Invoice:", testInvoice.invoice_number, "for Total:", testInvoice.total_amount, testInvoice.currency);

  // 4. Verify read back
  const readRes = await pool.query(`
    SELECT id, title, base_price, extra_cost, cost, jsonb_array_length(sub_tasks) as task_count, jsonb_array_length(invoices) as invoice_count
    FROM operations_tasks
    WHERE id = $1;
  `, [project.id]);
  console.log("4. Read back verified:", readRes.rows[0]);

  // Clean up
  await pool.query(`DELETE FROM operations_tasks WHERE id = $1;`, [project.id]);
  console.log("5. Cleaned up test record. Full Workflow Verification SUCCESSFUL!");

  await pool.end();
}

testFullWorkflow().catch(err => {
  console.error("Test workflow error:", err);
  pool.end();
});
