process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  await client.connect();
  const res = await client.query("SELECT id, title, project_type_name, pipeline_name FROM operations_tasks WHERE title ILIKE '%Entrance Exam Mock Test%' LIMIT 1");
  console.log('Task found:', res.rows[0]);
  await client.end();
}
test().catch(console.error);
