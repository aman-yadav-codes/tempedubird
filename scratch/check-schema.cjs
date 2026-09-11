// CJS version using require
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_6iPSkEgwoRF5@ep-lingering-frost-azkj6th8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // Get column names for key tables
    const tables = ['assignment_templates', 'note_templates', 'practice_exam_templates'];
    for (const t of tables) {
      const r = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [t]
      );
      console.log(`\n${t}: ${r.rows.map(x => x.column_name).join(', ')}`);
    }

    // Get platform admin user id
    const adminRes = await client.query(`
      SELECT u.id, u.full_name FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'platform_admin'
      ORDER BY u.id ASC LIMIT 1
    `);
    console.log('\nAdmin user:', adminRes.rows[0]);

    // Get first institution
    const instRes = await client.query(`
      SELECT id, name FROM institution_profiles WHERE COALESCE(is_deleted, FALSE) = FALSE LIMIT 1
    `);
    console.log('Institution:', instRes.rows[0]);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e.message, e.detail || ''); process.exit(1); });
