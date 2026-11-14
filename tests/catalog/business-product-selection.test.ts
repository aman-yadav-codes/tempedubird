process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from "pg";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Business Owner Product Selection & Customization Tests ===\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Setup / find Main Category & Subcategory
    let mainCat = await pool.query(`SELECT id FROM categories WHERE slug = 'test-computers-main' LIMIT 1`);
    let mainCatId: number;
    if (mainCat.rows.length === 0) {
      const insMain = await pool.query(
        `INSERT INTO categories (name, slug, depth, is_active, created_at, updated_at)
         VALUES ('Computers & Electronics', 'test-computers-main', 0, true, NOW(), NOW())
         RETURNING id`
      );
      mainCatId = insMain.rows[0].id;
    } else {
      mainCatId = mainCat.rows[0].id;
    }

    let subCat = await pool.query(`SELECT id FROM categories WHERE slug = 'test-laptops-sub' LIMIT 1`);
    let subCatId: number;
    if (subCat.rows.length === 0) {
      const insSub = await pool.query(
        `INSERT INTO categories (name, slug, parent_id, depth, is_active, created_at, updated_at)
         VALUES ('Laptops & Ultrabooks', 'test-laptops-sub', $1, 1, true, NOW(), NOW())
         RETURNING id`,
        [mainCatId]
      );
      subCatId = insSub.rows[0].id;
    } else {
      subCatId = subCat.rows[0].id;
    }

    // 2. Setup / find a Business Profile (India and/or US)
    let bpRes = await pool.query(`SELECT id, country_code FROM business_profiles WHERE is_active = true LIMIT 1`);
    let bId: number;
    let bCountry: string = "IN";
    if (bpRes.rows.length > 0) {
      bId = bpRes.rows[0].id;
      bCountry = bpRes.rows[0].country_code || "IN";
    } else {
      const testU = await pool.query(`SELECT id FROM users LIMIT 1`);
      const userId = testU.rows[0]?.id || 1;
      const insB = await pool.query(
        `INSERT INTO business_profiles (name, slug, user_id, country_code, is_active, created_at, updated_at)
         VALUES ('Selection Test Store', 'test-store-selection-${Date.now()}', $1, 'IN', true, NOW(), NOW())
         RETURNING id, country_code`,
        [userId]
      );
      bId = insB.rows[0].id;
      bCountry = insB.rows[0].country_code || "IN";
    }

    // 3. Clean up previous test master product
    await pool.query(`DELETE FROM master_products WHERE slug = 'test-laptop-selection'`);

    // 4. Create Master Product with all required fields:
    // - Name, Description, Default image, Main category, Subcategory, Country-specific suggested prices, Attributes
    const mpRes = await pool.query(
      `INSERT INTO master_products (
         name, slug, description, category_id, main_category_id, subcategory_id,
         default_image_url, brand, model, sku, unit_of_measurement,
         suggested_price, suggested_price_inr, suggested_price_usd,
         attributes, synonyms, is_active, created_at, updated_at
       ) VALUES (
         'ProBook Ultrabook 14', 'test-laptop-selection', 'Ultra-thin lightweight premium laptop',
         $1, $1, $2,
         'https://images.unsplash.com/photo-probook-default.jpg', 'ProBrand', 'PB-14', 'SKU-PB-14', 'Piece',
         65000, 65000, 800,
         '{"RAM": "16GB", "Storage": "512GB SSD", "Color": "Silver", "Processor": "Core i7"}'::jsonb,
         ARRAY['notebook', 'ultrabook', 'laptop'],
         true, NOW(), NOW()
       ) RETURNING id`,
      [mainCatId, subCatId]
    );
    const masterProductId = mpRes.rows[0].id;
    console.log(`[OK] Created Master Product id=${masterProductId} with Main Category, Subcategory, Country suggested prices (INR 65,000 / USD 800), and Attributes.`);

    // 5. Query Master Product via selection query simulation
    const selectCheck = await pool.query(
      `SELECT 
         mp.id, mp.name, mp.description, mp.default_image_url,
         mp.suggested_price_inr, mp.suggested_price_usd, mp.suggested_price,
         mp.attributes,
         c_main.name AS main_category_name,
         c_sub.name AS subcategory_name
       FROM master_products mp
       LEFT JOIN categories c_main ON c_main.id = mp.main_category_id
       LEFT JOIN categories c_sub ON c_sub.id = mp.subcategory_id
       WHERE mp.id = $1`,
      [masterProductId]
    );

    const mpData = selectCheck.rows[0];
    assert(mpData.name === "ProBook Ultrabook 14", "Product name must match");
    assert(mpData.description === "Ultra-thin lightweight premium laptop", "Description must match");
    assert(mpData.default_image_url === "https://images.unsplash.com/photo-probook-default.jpg", "Default image must match");
    assert(mpData.main_category_name === "Computers & Electronics", "Main category name must match");
    assert(mpData.subcategory_name === "Laptops & Ultrabooks", "Subcategory name must match");
    assert(Number(mpData.suggested_price_inr) === 65000, "India suggested price must be 65000");
    assert(Number(mpData.suggested_price_usd) === 800, "US suggested price must be 800");
    assert(mpData.attributes.RAM === "16GB", "Attributes must contain RAM: 16GB");
    console.log("[OK] Verified auto-population source: Name, Description, Default Image, Main Category, Subcategory, Country Prices, and Attributes.");

    // 6. Business Owner adopts product and customizes:
    // - Custom Product Name: "ProBook Ultrabook 14 - Special Edition"
    // - Custom Description: "Special edition with 2-year warranty and sleeve included"
    // - Custom Image: "https://example.com/custom-probook-photo.jpg"
    // - Custom Selling Price: 62,500 (differentiated from suggested 65,000)
    // - Quantity / Inventory: 12
    // - Custom Attributes: modified RAM to 32GB, added Warranty: 2 Years
    const customizedAttributes = {
      ...mpData.attributes,
      RAM: "32GB (Upgraded)",
      Warranty: "2 Years Premium Onsite",
    };

    const insBp = await pool.query(
      `INSERT INTO business_products (
         business_id, business_profile_id, master_product_id,
         custom_name, custom_description, custom_image_url,
         price, currency, inventory_count, in_stock, is_available,
         attributes, created_at, updated_at
       ) VALUES (
         $1, $1, $2,
         'ProBook Ultrabook 14 - Special Edition',
         'Special edition with 2-year warranty and sleeve included',
         'https://example.com/custom-probook-photo.jpg',
         62500, 'INR', 12, true, true,
         $3, NOW(), NOW()
       ) RETURNING id`,
      [bId, masterProductId, JSON.stringify(customizedAttributes)]
    );
    const businessProductId = insBp.rows[0].id;
    console.log(`[OK] Inserted customized business product id=${businessProductId}`);

    // 7. Verify all customized fields and fallback logic
    const bpCheck = await pool.query(
      `SELECT 
         bp.*,
         COALESCE(bp.custom_name, mp.name) AS display_name,
         COALESCE(bp.custom_image_url, mp.default_image_url) AS effective_image_url,
         COALESCE(bp.custom_description, mp.description) AS effective_description,
         COALESCE(bp.attributes, mp.attributes) AS effective_attributes,
         mp.default_image_url AS master_image_url,
         mp.suggested_price_inr,
         mp.suggested_price_usd,
         c_main.name AS main_category_name,
         c_sub.name AS subcategory_name
       FROM business_products bp
       LEFT JOIN master_products mp ON mp.id = bp.master_product_id
       LEFT JOIN categories c_main ON c_main.id = mp.main_category_id
       LEFT JOIN categories c_sub ON c_sub.id = mp.subcategory_id
       WHERE bp.id = $1`,
      [businessProductId]
    );

    const bp = bpCheck.rows[0];
    assert(bp.custom_name === "ProBook Ultrabook 14 - Special Edition", "Customized name must match");
    assert(bp.custom_description === "Special edition with 2-year warranty and sleeve included", "Customized description must match");
    assert(bp.custom_image_url === "https://example.com/custom-probook-photo.jpg", "Custom image URL must match");
    assert(bp.effective_image_url === "https://example.com/custom-probook-photo.jpg", "Effective image URL must be custom image");
    assert(Number(bp.price) === 62500, "Selling price must be 62,500");
    assert(Number(bp.inventory_count) === 12, "Inventory quantity must be 12");
    assert(bp.in_stock === true, "in_stock must be true");
    assert(bp.main_category_name === "Computers & Electronics", "Main category must be Computers & Electronics");
    assert(bp.subcategory_name === "Laptops & Ultrabooks", "Subcategory must be Laptops & Ultrabooks");
    assert(bp.effective_attributes.RAM === "32GB (Upgraded)", "Customized attribute RAM must be 32GB (Upgraded)");
    assert(bp.effective_attributes.Warranty === "2 Years Premium Onsite", "Customized attribute Warranty must be 2 Years Premium Onsite");
    console.log("[OK] Verified: Customized Name, Description, Image, Selling Price, Inventory/Quantity, and Attributes.");

    // 8. Verify Image Revert: When custom image is removed, effective image reverts to Admin Default Image
    console.log("\n--- Testing Reverting to Admin Default Image ---");
    await pool.query(
      `UPDATE business_products SET custom_image_url = NULL, updated_at = NOW() WHERE id = $1`,
      [businessProductId]
    );

    const revertCheck = await pool.query(
      `SELECT 
         bp.custom_image_url,
         COALESCE(bp.custom_image_url, mp.default_image_url) AS effective_image_url,
         mp.default_image_url AS master_image_url
       FROM business_products bp
       LEFT JOIN master_products mp ON mp.id = bp.master_product_id
       WHERE bp.id = $1`,
      [businessProductId]
    );
    assert(revertCheck.rows[0].custom_image_url === null, "Custom image URL should be null");
    assert(revertCheck.rows[0].effective_image_url === "https://images.unsplash.com/photo-probook-default.jpg", "Effective image should cleanly fall back to Admin Default Image");
    console.log("[OK] Verified: Clean fallback to Admin Default Image when custom photo is removed.");

    // 9. Clean up
    await pool.query(`DELETE FROM business_products WHERE id = $1`, [businessProductId]);
    await pool.query(`DELETE FROM master_products WHERE id = $1`, [masterProductId]);
    console.log("\n[OK] Cleaned up test artifacts.");
    console.log("\n🎉 ALL 12 BUSINESS OWNER PRODUCT SELECTION & CUSTOMIZATION ASSERTIONS PASSED!\n");
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
