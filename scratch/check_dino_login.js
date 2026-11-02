const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const userCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log('User columns:', userCols.rows.map(r => r.column_name));

  const users = await pool.query("SELECT id, full_name, email, phone, is_active, is_deleted, password FROM users WHERE email ILIKE '%dino%'");
  console.log('Users matching dino:', users.rows);

  const clientCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'clients'");
  console.log('Client columns:', clientCols.rows.map(r => r.column_name));

  const clients = await pool.query("SELECT * FROM clients WHERE email ILIKE '%dino%' OR name ILIKE '%dino%'");
  console.log('Clients matching dino:', clients.rows);

  const clientRole = await pool.query("SELECT * FROM roles WHERE code ILIKE '%client%' OR name ILIKE '%client%'");
  console.log('Roles matching client:', clientRole.rows);

  await pool.end();
}

check().catch(e => {
  console.error(e);
  pool.end();
});
