const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  const envPaths = [path.resolve('..', '.env'), path.resolve('..', '.env.local'), path.resolve('.env')];
  for (const ep of envPaths) {
    if (fs.existsSync(ep)) {
      const lines = fs.readFileSync(ep, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=') || line.startsWith('POSTGRES_URL=')) {
          dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
    if (dbUrl) break;
  }
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS institution_transport_fee_slabs (
      id SERIAL PRIMARY KEY,
      institution_id INTEGER,
      slab_name VARCHAR(120) NOT NULL,
      min_km NUMERIC(6, 2) NOT NULL DEFAULT 0,
      max_km NUMERIC(6, 2) NOT NULL,
      monthly_fee NUMERIC(10, 2) NOT NULL,
      quarterly_fee NUMERIC(10, 2),
      annual_fee NUMERIC(10, 2),
      one_way_discount_percent NUMERIC(5, 2) DEFAULT 0,
      vehicle_type VARCHAR(60) DEFAULT 'all',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_inst_transport_slabs_inst_id ON institution_transport_fee_slabs(institution_id);
    CREATE INDEX IF NOT EXISTS idx_inst_transport_slabs_km ON institution_transport_fee_slabs(min_km, max_km);
  `);
  console.log('Successfully created/ensured institution_transport_fee_slabs table!');
  
  // Check if Maa Sharda (162) or existing institutions have any records
  const insts = await pool.query('SELECT id, name FROM institutions LIMIT 5');
  console.log('Sample institutions:', insts.rows);
  
  await pool.end();
}

run().catch(console.error);
