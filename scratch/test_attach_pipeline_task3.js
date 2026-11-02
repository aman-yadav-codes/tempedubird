process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  await client.connect();

  // Load pipeline template 2 (Application Development)
  const plRes = await client.query("SELECT * FROM operations_project_pipelines WHERE name ILIKE '%Cross-Platform%' LIMIT 1");
  const pl = plRes.rows[0];
  console.log('Pipeline to attach:', pl.name, 'phases count:', pl.phases.length);

  const snapshottedPhases = pl.phases.map((ph, i) => ({
    ...ph,
    order: ph.order || i + 1,
    status: i === 0 ? "in_progress" : "not_started",
    started_at: i === 0 ? new Date().toISOString() : null,
    completed_at: null,
  }));

  // Perform update
  const updateRes = await client.query(
    `UPDATE operations_tasks SET
      project_type_id = $1,
      project_type_name = $2,
      pipeline_id = $3,
      pipeline_name = $4,
      pipeline_phases = $5::jsonb,
      current_phase_index = 0,
      updated_at = NOW()
    WHERE id = 3
    RETURNING id, title, project_type_name, pipeline_name, jsonb_array_length(pipeline_phases) as count`,
    [
      pl.project_type_id,
      "Application Development",
      pl.id,
      pl.name,
      JSON.stringify(snapshottedPhases),
    ]
  );

  console.log('Update success:', updateRes.rows[0]);
  await client.end();
}
test().catch(console.error);

