const { Pool } = require('pg');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf-8');
let dbUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
    break;
  }
}
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function setup() {
  const uRows = await pool.query("SELECT id, name, short_symbol FROM units");
  const uMap = {};
  for (const r of uRows.rows) {
    uMap[r.short_symbol] = r.id;
  }

  console.log('3. Updating master products units...');
  await pool.query("UPDATE master_products SET unit_of_measurement = 'kg', unit = 'kg', unit_quantity = 1, unit_id = $1 WHERE id = 3", [uMap['kg'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = 'kg', unit = 'kg', unit_quantity = 1, unit_id = $1 WHERE id = 4", [uMap['kg'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = 'kg', unit = 'kg', unit_quantity = 1, unit_id = $1 WHERE id = 5", [uMap['kg'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = '500g', unit = '500g', unit_quantity = 0.5, unit_id = $1 WHERE id = 6", [uMap['g'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = '200ml', unit = '200ml', unit_quantity = 1, unit_id = $1 WHERE id = 7", [uMap['ml'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = '150ml', unit = '150ml', unit_quantity = 1, unit_id = $1 WHERE id = 8", [uMap['ml'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = 'kit', unit = 'kit', unit_quantity = 1, unit_id = $1 WHERE id = 1", [uMap['set'] || null]);
  await pool.query("UPDATE master_products SET unit_of_measurement = 'book', unit = 'book', unit_quantity = 1, unit_id = $1 WHERE id = 2", [uMap['set'] || null]);

  const pRows = await pool.query("SELECT id, name, unit_of_measurement, unit, unit_quantity FROM master_products");
  console.table(pRows.rows);

  await pool.end();
}

setup().catch(console.error);
