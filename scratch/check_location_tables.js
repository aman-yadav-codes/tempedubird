const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const tables = ['user_locations', 'institution_locations', 'locations', 'institution_profiles', 'user_profiles'];
  for (const t of tables) {
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
      [t]
    );
    console.log(t, 'cols:', cols.rows.map(r => r.column_name));
  }
  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });

