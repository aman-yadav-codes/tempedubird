process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from "pg";
import {
  insertCategory,
  listCategories,
  getCategoryById,
  updateCategory,
} from "../../lib/queries/category";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Category Business Mapping Integration Tests ===\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const createdIds: number[] = [];

  try {
    // 1. Create a top-level Business Category (root)
    console.log("1. Creating a top-level Business Category (root)...");
    const timestamp = Date.now();
    const rootBiz = await insertCategory(pool, {
      name: `Test Industry ${timestamp}`,
      slug: `test-industry-${timestamp}`,
      parentId: null,
      category_type: "business",
      description: "Root industry test",
    });
    assert(rootBiz.id > 0, "Root business category must have valid ID");
    assert(rootBiz.depth === 1, "Root business category must have depth 1");
    assert(rootBiz.category_type === "business", "category_type must be business");
    assert(rootBiz.parent_id === null, "parent_id must be null for root");
    createdIds.push(rootBiz.id);
    console.log(`   ✓ Root Business Category created with ID: ${rootBiz.id}`);

    // 2. Create a Business Subcategory under the root
    console.log("2. Creating a Business Subcategory under the root Business Category...");
    const subBiz = await insertCategory(pool, {
      name: `Test Sub-Industry ${timestamp}`,
      slug: `test-sub-industry-${timestamp}`,
      parentId: rootBiz.id,
      category_type: "business",
      description: "Subcategory under root industry",
    });
    assert(subBiz.id > 0, "Business subcategory must have valid ID");
    assert(subBiz.parent_id === rootBiz.id, "parent_id must match rootBiz.id");
    assert(subBiz.category_type === "business", "category_type must be business");
    createdIds.push(subBiz.id);
    console.log(`   ✓ Business Subcategory created with ID: ${subBiz.id}`);

    // 3. Create a Product Category mapped to Business Category & Business Subcategory
    console.log("3. Creating a Product Category with Business Category & Subcategory mapping...");
    const prodCat = await insertCategory(pool, {
      name: `Test Auto Parts ${timestamp}`,
      slug: `test-auto-parts-${timestamp}`,
      parentId: null,
      category_type: "product",
      business_category_id: rootBiz.id,
      business_subcategory_id: subBiz.id,
      description: "Auto parts under automotive workshop",
    });
    assert(prodCat.id > 0, "Product category must have valid ID");
    assert(prodCat.category_type === "product", "category_type must be product");
    assert(prodCat.business_category_id === rootBiz.id, "business_category_id must match rootBiz.id");
    assert(prodCat.business_subcategory_id === subBiz.id, "business_subcategory_id must match subBiz.id");
    createdIds.push(prodCat.id);
    console.log(`   ✓ Product Category created with ID: ${prodCat.id}`);

    // 4. Verify getCategoryById returns joined business category names
    console.log("4. Verifying getCategoryById returns business category names...");
    const fetchedProd = await getCategoryById(pool, prodCat.id);
    assert(fetchedProd !== null, "getCategoryById must return category");
    assert(fetchedProd?.business_category_id === rootBiz.id, "business_category_id must match");
    assert(fetchedProd?.business_subcategory_id === subBiz.id, "business_subcategory_id must match");
    assert(
      Boolean(fetchedProd?.business_category_name?.includes("Test Industry")),
      `business_category_name must contain 'Test Industry', got: ${fetchedProd?.business_category_name}`
    );
    assert(
      Boolean(fetchedProd?.business_subcategory_name?.includes("Test Sub-Industry")),
      `business_subcategory_name must contain 'Test Sub-Industry', got: ${fetchedProd?.business_subcategory_name}`
    );
    console.log(`   ✓ Joined names verified: ${fetchedProd?.business_category_name} > ${fetchedProd?.business_subcategory_name}`);

    // 5. Create a Service Category mapped to Business Classification
    console.log("5. Creating a Service Category mapped to Business Classification...");
    const srvCat = await insertCategory(pool, {
      name: `Test Maintenance Service ${timestamp}`,
      slug: `test-maint-service-${timestamp}`,
      parentId: null,
      category_type: "service",
      business_category_id: rootBiz.id,
      business_subcategory_id: subBiz.id,
    });
    assert(srvCat.category_type === "service", "category_type must be service");
    assert(srvCat.business_category_id === rootBiz.id, "business_category_id must match");
    createdIds.push(srvCat.id);
    console.log(`   ✓ Service Category created with ID: ${srvCat.id}`);

    // 6. Create a Professional Category mapped to Business Classification
    console.log("6. Creating a Professional Category mapped to Business Classification...");
    const proCat = await insertCategory(pool, {
      name: `Test Master Mechanic ${timestamp}`,
      slug: `test-master-mechanic-${timestamp}`,
      parentId: null,
      category_type: "professional",
      business_category_id: rootBiz.id,
      business_subcategory_id: subBiz.id,
    });
    assert(proCat.category_type === "professional", "category_type must be professional");
    assert(proCat.business_category_id === rootBiz.id, "business_category_id must match");
    createdIds.push(proCat.id);
    console.log(`   ✓ Professional Category created with ID: ${proCat.id}`);

    // 7. Test listCategories filtering by type and business_category_id
    console.log("7. Testing listCategories with type and business_category_id filtering...");
    const listRes = await listCategories(pool, {
      category_type: "product",
      business_category_id: rootBiz.id,
      business_subcategory_id: subBiz.id,
    });
    assert(listRes.data.length >= 1, "listCategories must return at least 1 category");
    const found = listRes.data.find((c) => c.id === prodCat.id);
    assert(found !== undefined, "Created product category must be in list result");
    assert(found?.business_category_name?.includes("Test Industry") === true, "Must have business_category_name");
    assert(found?.business_subcategory_name?.includes("Test Sub-Industry") === true, "Must have business_subcategory_name");
    console.log(`   ✓ Filtered list query returned product category with joined names correctly.`);

    // 8. Test updateCategory updating business mapping
    console.log("8. Testing updateCategory updating business mapping...");
    const updated = await updateCategory(pool, {
      id: prodCat.id,
      name: `Updated Auto Parts ${timestamp}`,
      slug: `updated-auto-parts-${timestamp}`,
      parentId: null,
      category_type: "product",
      business_category_id: null,
      business_subcategory_id: null,
    });
    assert(updated.name === `Updated Auto Parts ${timestamp}`, "Name must be updated");
    assert(updated.business_category_id === null, "business_category_id must be null after update");
    console.log(`   ✓ updateCategory cleared business classification successfully.`);

    console.log("\n✅ ALL 8 INTEGRATION TESTS PASSED SUCCESSFULLY!");
  } finally {
    // Cleanup
    if (createdIds.length > 0) {
      console.log(`Cleaning up ${createdIds.length} test categories...`);
      await pool.query("DELETE FROM categories WHERE id = ANY($1::int[])", [createdIds]);
      console.log("Cleanup complete.");
    }
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
