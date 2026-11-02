const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const users = await pool.query("SELECT id, full_name, email FROM users WHERE email IN ('admin@edubird.com', 'admin@example.com', 'dino@gmail.com')");
  console.log('Users:', users.rows);

  const memberships = await pool.query(
    "SELECT im.user_id, im.institution_id, ip.name FROM institution_memberships im JOIN institution_profiles ip ON ip.id = im.institution_id"
  );
  console.log('Memberships:', memberships.rows);

  const clients = await pool.query("SELECT id, name, company_name, status, institution_id FROM clients");
  console.log('Clients:', clients.rows);

  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); });

