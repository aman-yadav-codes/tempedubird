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
    console.log("Testing inventory_items CRUD...");
    const invInsert = await pool.query(`
      INSERT INTO inventory_items (
        name, sku, category, quantity, min_quantity, unit, unit_price, location, condition, status, description
      ) VALUES (
        'Dell 24-inch IPS Monitor', 'SKU-MON-24', 'Electronics & IT Hardware', 25, 5, 'units', 12500.00, 'Computer Lab 1', 'new', 'in_stock', 'Test monitor batch'
      ) RETURNING *;
    `);
    console.log("Inserted inventory item:", invInsert.rows[0]);

    const invUpdate = await pool.query(`
      UPDATE inventory_items SET quantity = 18 WHERE id = $1 RETURNING *;
    `, [invInsert.rows[0].id]);
    console.log("Updated inventory item:", invUpdate.rows[0]);

    await pool.query(`DELETE FROM inventory_items WHERE id = $1`, [invInsert.rows[0].id]);
    console.log("Deleted inventory item successfully.");

    console.log("\nTesting internal_team_members CRUD...");
    const teamInsert = await pool.query(`
      INSERT INTO internal_team_members (
        name, email, phone, role_title, department, access_level, status, notes
      ) VALUES (
        'Alok Verma', 'alok.admin@institution.edu', '+91 9876543210', 'Campus Operations Lead', 'Administration', 'admin', 'active', 'Oversees daily campus logistics'
      ) RETURNING *;
    `);
    console.log("Inserted team member:", teamInsert.rows[0]);

    const teamUpdate = await pool.query(`
      UPDATE internal_team_members SET role_title = 'Senior Operations Lead' WHERE id = $1 RETURNING *;
    `, [teamInsert.rows[0].id]);
    console.log("Updated team member:", teamUpdate.rows[0]);

    await pool.query(`DELETE FROM internal_team_members WHERE id = $1`, [teamInsert.rows[0].id]);
    console.log("Deleted team member successfully.");

  } catch (err) {
    console.error("Test error:", err);
  } finally {
    await pool.end();
  }
}

main();
