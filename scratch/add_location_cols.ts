process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../lib/db/db');
  console.log("Adding start_location and stop_location to operations_tasks...");
  await db.query(`
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS start_location JSONB;
    ALTER TABLE operations_tasks ADD COLUMN IF NOT EXISTS stop_location JSONB;
  `);
  console.log("Migration executed successfully!");

  const cols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'operations_tasks' AND column_name IN ('start_location', 'stop_location')
  `);
  console.log("Verified columns:", cols.rows);
  process.exit(0);
}

main().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});

