process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from "pg";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Independent Pricing & Inventory Isolation Tests ===\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Setup / find a category
    let catRes = await pool.query(`SELECT id FROM categories WHERE slug = 'test-category-pricing' LIMIT 1`);
    let catId: number;
    if (catRes.rows.length === 0) {
      const insCat = await pool.query(
        `INSERT INTO categories (name, slug, is_active, created_at, updated_at)
         VALUES ('Test Pricing Category', 'test-category-pricing', true, NOW(), NOW())
         RETURNING id`
      );
      catId = insCat.rows[0].id;
    } else {
      catId = catRes.rows[0].id;
    }

    // 2. Setup / find two distinct business profiles
    let bpRes = await pool.query(`SELECT id FROM business_profiles WHERE is_active = true ORDER BY id ASC LIMIT 2`);
    let bAId: number;
    let bBId: number;

    if (bpRes.rows.length >= 2) {
      bAId = bpRes.rows[0].id;
      bBId = bpRes.rows[1].id;
    } else {
      // Create test profiles if needed
      const testU = await pool.query(`SELECT id FROM users LIMIT 1`);
      const userId = testU.rows[0]?.id || 1;

      const insA = await pool.query(
        `INSERT INTO business_profiles (name, slug, user_id, is_active, created_at, updated_at)
         VALUES ('Test Business Alpha', 'test-business-alpha-${Date.now()}', $1, true, NOW(), NOW())
         RETURNING id`,
        [userId]
      );
      bAId = insA.rows[0].id;

      const insB = await pool.query(
        `INSERT INTO business_profiles (name, slug, user_id, is_active, created_at, updated_at)
         VALUES ('Test Business Beta', 'test-business-beta-${Date.now()}', $1, true, NOW(), NOW())
         RETURNING id`,
        [userId]
      );
      bBId = insB.rows[0].id;
    }

    // 3. Clean up any previous test master product
    await pool.query(`DELETE FROM master_products WHERE slug = 'test-smartphone-isolation'`);

    // 4. Create Master Product: Smartphone with India suggested price: ₹20,000, USA suggested price: $250
    const mpRes = await pool.query(
      `INSERT INTO master_products (
         name, slug, description, category_id, brand, model,
         suggested_price, suggested_price_inr, suggested_price_usd,
         is_active, created_at, updated_at
       ) VALUES (
         'Smartphone Isolation Test', 'test-smartphone-isolation', 'High-end smartphone', $1, 'BrandX', 'ModelY',
         20000, 20000, 250,
         true, NOW(), NOW()
       ) RETURNING id`,
      [catId]
    );
    const masterProductId = mpRes.rows[0].id;
    console.log(`[OK] Created Master Product id=${masterProductId} with Suggested Price: INR 20,000 / USD 250`);

    // 5. Business A adopts Smartphone: Selling price ₹19,500, Quantity 10
    const bpARes = await pool.query(
      `INSERT INTO business_products (
         business_id, business_profile_id, master_product_id, custom_name,
         price, currency, inventory_count, in_stock, is_available,
         created_at, updated_at
       ) VALUES (
         $1, $1, $2, 'Smartphone (Store A)',
         19500, 'INR', 10, true, true,
         NOW(), NOW()
       ) RETURNING id`,
      [bAId, masterProductId]
    );
    const bAProdId = bpARes.rows[0].id;
    console.log(`[OK] Business A added product: Price ₹19,500, Inventory 10 (id=${bAProdId})`);

    // 6. Business B adopts Smartphone: Selling price ₹22,000, Quantity 5
    const bpBRes = await pool.query(
      `INSERT INTO business_products (
         business_id, business_profile_id, master_product_id, custom_name,
         price, currency, inventory_count, in_stock, is_available,
         created_at, updated_at
       ) VALUES (
         $1, $1, $2, 'Smartphone (Store B)',
         22000, 'INR', 5, true, true,
         NOW(), NOW()
       ) RETURNING id`,
      [bBId, masterProductId]
    );
    const bBProdId = bpBRes.rows[0].id;
    console.log(`[OK] Business B added product: Price ₹22,000, Inventory 5 (id=${bBProdId})`);

    // 7. Verify initial independent prices and stock
    const checkA1 = await pool.query(`SELECT price, inventory_count FROM business_products WHERE id = $1`, [bAProdId]);
    const checkB1 = await pool.query(`SELECT price, inventory_count FROM business_products WHERE id = $1`, [bBProdId]);
    assert(Number(checkA1.rows[0].price) === 19500, "Business A price must be 19500");
    assert(Number(checkA1.rows[0].inventory_count) === 10, "Business A inventory must be 10");
    assert(Number(checkB1.rows[0].price) === 22000, "Business B price must be 22000");
    assert(Number(checkB1.rows[0].inventory_count) === 5, "Business B inventory must be 5");
    console.log("[OK] Initial independent pricing and inventory verified.");

    // 8. Admin updates Master Product benchmark price: ₹20,000 -> ₹25,000, $250 -> $300
    console.log("\n--- Admin updates master product suggested price to ₹25,000 / $300 ---");
    await pool.query(
      `UPDATE master_products
       SET suggested_price = 25000, suggested_price_inr = 25000, suggested_price_usd = 300, updated_at = NOW()
       WHERE id = $1`,
      [masterProductId]
    );

    // 9. Verify changing master catalog suggested price NEVER automatically overwrites existing business selling prices or inventory
    const checkA2 = await pool.query(`SELECT price, inventory_count FROM business_products WHERE id = $1`, [bAProdId]);
    const checkB2 = await pool.query(`SELECT price, inventory_count FROM business_products WHERE id = $1`, [bBProdId]);
    assert(Number(checkA2.rows[0].price) === 19500, "Business A price must remain ₹19,500 after master price update");
    assert(Number(checkA2.rows[0].inventory_count) === 10, "Business A inventory must remain 10 after master price update");
    assert(Number(checkB2.rows[0].price) === 22000, "Business B price must remain ₹22,000 after master price update");
    assert(Number(checkB2.rows[0].inventory_count) === 5, "Business B inventory must remain 5 after master price update");
    console.log("[OK] Verified: Master catalog benchmark changes did NOT overwrite Business A or Business B selling prices or inventory.");

    // 10. Business A updates their own selling price to ₹19,800 and sells 2 units (stock 8)
    console.log("\n--- Business A updates selling price to ₹19,800 and stock to 8 ---");
    await pool.query(
      `UPDATE business_products
       SET price = 19800, inventory_count = 8, updated_at = NOW()
       WHERE id = $1`,
      [bAProdId]
    );

    const checkA3 = await pool.query(`SELECT price, inventory_count FROM business_products WHERE id = $1`, [bAProdId]);
    const checkB3 = await pool.query(`SELECT price, inventory_count FROM business_products WHERE id = $1`, [bBProdId]);
    assert(Number(checkA3.rows[0].price) === 19800, "Business A updated price must be 19800");
    assert(Number(checkA3.rows[0].inventory_count) === 8, "Business A updated inventory must be 8");
    assert(Number(checkB3.rows[0].price) === 22000, "Business B price must remain unchanged at 22000");
    assert(Number(checkB3.rows[0].inventory_count) === 5, "Business B inventory must remain unchanged at 5");
    console.log("[OK] Verified: Business A and Business B are completely isolated from each other.");

    // Clean up test products and master product
    await pool.query(`DELETE FROM business_products WHERE id IN ($1, $2)`, [bAProdId, bBProdId]);
    await pool.query(`DELETE FROM master_products WHERE id = $1`, [masterProductId]);
    console.log("\n[OK] Cleaned up test artifacts.");
    console.log("\n🎉 ALL 8 INDEPENDENT PRICING & INVENTORY ISOLATION ASSERTIONS PASSED!\n");

  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

