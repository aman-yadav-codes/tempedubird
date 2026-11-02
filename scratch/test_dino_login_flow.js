const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const email = "dino@gmail.com";
  const password = "123456";

  // Simulate getUserByEmailQuery
  const cleanInput = String(email).trim();
  const res = await pool.query(
    `SELECT id, full_name, email, phone, password, is_active
     FROM users
     WHERE (lower(email) = lower($1) OR phone = $1)
       AND COALESCE(is_deleted, FALSE) = FALSE
     ORDER BY is_active DESC, id DESC
     LIMIT 1`,
    [cleanInput]
  );

  console.log("Found user row:", res.rows[0]);
  if (!res.rows[0]) {
    console.error("FAIL: User not found!");
    return;
  }

  const user = res.rows[0];
  const valid = await bcrypt.compare(password, user.password);
  console.log("Password valid:", valid);

  // Check roles
  const roles = await pool.query(
    `SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1`,
    [user.id]
  );
  console.log("Roles from user_roles:", roles.rows.map(r => r.code));

  const mems = await pool.query(
    `SELECT r.code, im.is_active, im.is_deleted FROM roles r JOIN institution_memberships im ON im.role_id = r.id WHERE im.user_id = $1`,
    [user.id]
  );
  console.log("Memberships:", mems.rows);

  // Check client matching
  const clientRes = await pool.query(
    `SELECT id, name, company_name FROM clients WHERE user_id = $1`,
    [user.id]
  );
  console.log("Matching client:", clientRes.rows);

  // Check tasks for this client
  if (clientRes.rows[0]) {
    const tasks = await pool.query(
      `SELECT id, title, client_id, status FROM operations_tasks WHERE client_id = $1`,
      [clientRes.rows[0].id]
    );
    console.log("Tasks for client", clientRes.rows[0].id, ":", tasks.rows);
  }

  await pool.end();
}

main().catch(e => {
  console.error(e);
  pool.end();
});

