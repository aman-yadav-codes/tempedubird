const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const procs = await pool.query(
    "SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%loc.city%'"
  );
  console.log('Procs with loc.city:', procs.rows);

  const triggers = await pool.query(
    "SELECT tgname, relname FROM pg_trigger t " +
    "JOIN pg_class c ON c.oid = t.tgrelid " +
    "JOIN pg_proc p ON p.oid = t.tgfoid " +
    "WHERE p.prosrc ILIKE '%loc.city%'"
  );
  console.log('Triggers:', triggers.rows);

  // Let's also search across ALL string columns in pg_views or system catalogs
  const anyView = await pool.query(
    "SELECT viewname, definition FROM pg_views WHERE definition ILIKE '%loc.city%'"
  );
  console.log('pg_views with loc.city:', anyView.rows);

  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });

