process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../lib/db/db');
  const res = await db.query("SELECT COUNT(*)::int AS count FROM permissions WHERE COALESCE(is_deleted, FALSE) = FALSE");
  console.log('Active permissions in DB:', res.rows[0].count);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
