process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../lib/db/db');
  const res = await db.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'staff_attendance'
    ORDER BY ordinal_position
  `);
  console.log("staff_attendance columns:", res.rows.map(r => `${r.column_name} (${r.data_type})`));

  const tasksCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'operations_tasks'
    ORDER BY ordinal_position
  `);
  console.log("operations_tasks columns:", tasksCols.rows.map(r => r.column_name).join(", "));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
