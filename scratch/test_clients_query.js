const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const isPlatform = false;
  const targetInst = 1;
  const userInstIds = [1];
  const clientsRes = await pool.query(
    `SELECT id, name, company_name, email, phone, client_type, institution_id
     FROM clients
     WHERE (status = 'active' OR status IS NULL)
       AND (
         $1::boolean = TRUE
         OR institution_id = $2::int
         OR institution_id = 1
         OR institution_id IS NULL
         OR institution_id = ANY($3::int[])
       )
     ORDER BY COALESCE(company_name, name) ASC`,
    [Boolean(isPlatform), targetInst, userInstIds]
  );
  console.log('Query result count:', clientsRes.rowCount);
  console.log('Rows:', clientsRes.rows);

  // Now test what happens if targetInst is NULL or userInstIds is empty
  const clientsRes2 = await pool.query(
    `SELECT id, name, company_name, email, phone, client_type, institution_id
     FROM clients
     WHERE (status = 'active' OR status IS NULL)
       AND (
         $1::boolean = TRUE
         OR institution_id = $2::int
         OR institution_id = 1
         OR institution_id IS NULL
         OR institution_id = ANY($3::int[])
       )
     ORDER BY COALESCE(company_name, name) ASC`,
    [false, null, []]
  );
  console.log('Query 2 result count:', clientsRes2.rowCount);
}
check().catch(console.error).finally(() => pool.end());
