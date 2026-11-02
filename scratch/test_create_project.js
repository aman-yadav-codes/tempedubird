const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testProject() {
  console.log("Checking operations_tasks schema & inserting test project...");
  
  const insertRes = await pool.query(`
    INSERT INTO operations_tasks (
      title, project_for, company_name, client_id, client_name,
      start_date, deadline, currency, cost, price,
      live_url, demo_url, project_leader_id, project_leader_name,
      agreement_document_url, agreement_document_name, status, urgency,
      created_at, updated_at
    ) VALUES (
      'Test LMS Development Project', 'own_company', 'EduBird', NULL, 'EduBird',
      '2026-11-01', '2026-12-31', 'USD', 7500, 7500,
      'https://lms.edubird.com', 'https://demo-lms.edubird.com', 88, 'Ram',
      '/uploads/documents/agreement-sample.pdf', 'agreement-sample.pdf', 'pending', 'high',
      NOW(), NOW()
    )
    RETURNING id, title, project_for, company_name, currency, cost, live_url, demo_url, project_leader_name, agreement_document_name;
  `);

  console.log("Inserted Project:", insertRes.rows[0]);

  // Clean up test row
  await pool.query(`DELETE FROM operations_tasks WHERE id = $1`, [insertRes.rows[0].id]);
  console.log("Cleaned up test project successfully.");

  await pool.end();
}

testProject().catch((err) => {
  console.error("Test failed:", err);
  pool.end();
});

