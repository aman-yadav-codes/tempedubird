const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const bizCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'business_profiles' ORDER BY ordinal_position");
  console.log('business_profiles columns:\n', bizCols.rows.map(r => r.column_name + ' (' + r.data_type + ')').join(', '));
  const profCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'professional_profiles' ORDER BY ordinal_position");
  console.log('\nprofessional_profiles columns:\n', profCols.rows.map(r => r.column_name + ' (' + r.data_type + ')').join(', '));
  await pool.end();
}
run().catch(console.error);
