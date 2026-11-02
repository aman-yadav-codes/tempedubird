const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const constraints = await pool.query(
    `SELECT conname, pg_get_constraintdef(c.oid) 
     FROM pg_constraint c 
     JOIN pg_class t ON c.conrelid = t.oid 
     WHERE t.relname = 'institution_memberships'`
  );
  console.log("Constraints:", constraints.rows);

  const indexes = await pool.query(
    `SELECT indexname, indexdef 
     FROM pg_indexes 
     WHERE tablename = 'institution_memberships'`
  );
  console.log("Indexes:", indexes.rows);

  await pool.end();
}

main().catch(console.error);

