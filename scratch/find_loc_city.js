const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const views = await pool.query(
    "SELECT table_name, view_definition FROM information_schema.views WHERE view_definition ILIKE '%loc.city%'"
  );
  console.log("Views matching loc.city:", views.rows);

  const routines = await pool.query(
    "SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_definition ILIKE '%loc.city%'"
  );
  console.log("Routines matching loc.city:", routines.rows);

  // Check columns of locations table
  const locCols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'locations'"
  );
  console.log("Locations columns:", locCols.rows.map(r => r.column_name));
  
  await pool.end();
}

main().catch(e => {
  console.error(e);
  pool.end();
});

