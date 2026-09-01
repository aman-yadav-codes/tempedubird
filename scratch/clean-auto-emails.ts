import { db } from "../lib/db/db";

async function main() {
  const res = await db.query(`
    UPDATE users
    SET email = NULL
    WHERE email LIKE '%@student.edubird.internal'
    RETURNING id, full_name, email;
  `);

  console.log(`Cleaned up ${res.rowCount} auto-generated student emails.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
