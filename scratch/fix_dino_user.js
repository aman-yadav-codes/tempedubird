const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const password = "123456";
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Get client role
  const roleRes = await pool.query("SELECT id FROM roles WHERE code = 'client' LIMIT 1");
  const clientRoleId = roleRes.rows[0]?.id || 560;

  // 2. Update user 29
  const userRes = await pool.query(
    `UPDATE users
     SET password = $1,
         full_name = 'dino',
         email = 'dino@gmail.com',
         phone = '9898989898',
         is_active = TRUE,
         is_deleted = FALSE,
         deleted_at = NULL,
         deleted_by = NULL,
         updated_at = NOW()
     WHERE id = 29
     RETURNING id, full_name, email, is_active, is_deleted`,
    [hashedPassword]
  );
  console.log("Updated user 29:", userRes.rows[0]);

  // 3. Clean user_roles for 29: keep client
  await pool.query("DELETE FROM user_roles WHERE user_id = 29 AND role_id <> $1", [clientRoleId]);
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES (29, $1)
     ON CONFLICT DO NOTHING`,
    [clientRoleId]
  );
  console.log("Updated user_roles for 29");

  // 4. Update institution_memberships with (institution_id, user_id)
  await pool.query(
    `INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active, is_deleted, status, is_current)
     VALUES (1, 29, $1, TRUE, FALSE, 'ACTIVE', TRUE)
     ON CONFLICT (institution_id, user_id)
     DO UPDATE SET
       role_id = EXCLUDED.role_id,
       is_active = TRUE,
       is_deleted = FALSE,
       status = 'ACTIVE',
       is_current = TRUE,
       deleted_at = NULL,
       updated_at = NOW()`,
    [clientRoleId]
  );
  console.log("Updated institution_memberships for 29");

  // 5. Update client 5
  const clientRes = await pool.query(
    `UPDATE clients
     SET user_id = 29,
         email = 'dino@gmail.com',
         password = $1,
         plain_password = $2,
         updated_at = NOW()
     WHERE id = 5
     RETURNING id, name, company_name, email, user_id, plain_password`,
    [hashedPassword, password]
  );
  console.log("Updated client 5:", clientRes.rows[0]);

  await pool.end();
}

main().catch(e => {
  console.error(e);
  pool.end();
});
