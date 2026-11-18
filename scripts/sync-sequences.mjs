import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { Client } = pg;

async function syncAllSequences() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  console.log("Connected to database. Checking and synchronizing all serial sequences...\n");

  const query = `
    SELECT 
      table_name, 
      column_name, 
      pg_get_serial_sequence(quote_ident(table_name), column_name) as seq_name
    FROM information_schema.columns 
    WHERE column_default LIKE 'nextval%' 
      AND table_schema = 'public'
    ORDER BY table_name;
  `;

  const { rows } = await client.query(query);

  let syncedCount = 0;
  for (const row of rows) {
    if (!row.seq_name) continue;
    try {
      const maxRes = await client.query(`SELECT MAX("${row.column_name}") as max_id FROM "${row.table_name}"`);
      const maxId = Number(maxRes.rows[0]?.max_id || 0);

      const seqRes = await client.query(`SELECT last_value, is_called FROM ${row.seq_name}`);
      const lastVal = Number(seqRes.rows[0]?.last_value || 0);
      const isCalled = Boolean(seqRes.rows[0]?.is_called);

      if (maxId >= lastVal || (!isCalled && maxId >= 1)) {
        const newVal = Math.max(maxId, 1);
        await client.query(`SELECT setval('${row.seq_name}', ${newVal}, true)`);
        console.log(`✅ [SYNCED] Table: ${row.table_name}.${row.column_name} | Max ID: ${maxId} | Sequence: ${row.seq_name} -> set to ${newVal}`);
        syncedCount++;
      } else {
        console.log(`ℹ️ [OK] Table: ${row.table_name}.${row.column_name} | Max ID: ${maxId} | Sequence: ${lastVal}`);
      }
    } catch (err) {
      console.warn(`⚠️ [WARN] Could not sync ${row.table_name}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Synchronized ${syncedCount} sequences successfully!`);
  await client.end();
}

syncAllSequences().catch(console.error);
