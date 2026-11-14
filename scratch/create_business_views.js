process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log("Creating database views for business tables...");
  await pool.query(`
    CREATE OR REPLACE VIEW businesses AS 
    SELECT * FROM institution_profiles;

    CREATE OR REPLACE VIEW businesses_and_professionals AS 
    SELECT * FROM institution_profiles;

    CREATE OR REPLACE VIEW business_branches AS
    SELECT * FROM institution_branches;

    CREATE OR REPLACE VIEW business_courses AS
    SELECT * FROM institution_courses;
  `);
  console.log("Views created successfully!");
  await pool.end();
}

main().catch(err => {
  console.error("Error creating views:", err);
  pool.end();
});

