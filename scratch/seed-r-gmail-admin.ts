import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  const res = await pool.query(
    `SELECT u.id, u.email, u.full_name
     FROM users u
     WHERE u.email ILIKE $1 OR u.email ILIKE $2 OR u.email ILIKE $3`,
    ["r@gmail.com", "ra@gmail.com", "rakesh@gmail.com"]
  );

  console.log("Found users matching email:", res.rows);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
