const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    console.log("Testing vendors table insertion for vendor & client...");
    const testVendor = await pool.query(`
      INSERT INTO vendors (
        name,
        company_name,
        contact_person,
        category,
        vendor_type,
        phone,
        email,
        city,
        location,
        status,
        rating
      ) VALUES (
        'Test Campus Mess',
        'Sharda Food Services Pvt Ltd',
        'Ramesh Sharma',
        'Mess & Canteen',
        'vendor',
        '+91 9988776655',
        'ramesh@foodservices.com',
        'Varanasi',
        'Lanka',
        'active',
        4.8
      ) RETURNING *;
    `);
    console.log("Inserted vendor:", testVendor.rows[0]);

    const testClient = await pool.query(`
      INSERT INTO vendors (
        name,
        company_name,
        contact_person,
        category,
        vendor_type,
        phone,
        email,
        city,
        location,
        status,
        rating
      ) VALUES (
        'TechNova Corp',
        'TechNova Solutions Pvt Ltd',
        'Sandeep Gupta',
        'Corporate Training Client',
        'client',
        '+91 9911223344',
        'hr@technova.com',
        'Noida',
        'Sector 62',
        'active',
        4.9
      ) RETURNING *;
    `);
    console.log("Inserted client in vendors table:", testClient.rows[0]);

    // Clean up test records
    await pool.query(`DELETE FROM vendors WHERE id IN ($1, $2)`, [testVendor.rows[0].id, testClient.rows[0].id]);
    console.log("Test records cleaned up successfully.");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await pool.end();
  }
}

main();
