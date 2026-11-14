const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "app", "api", "admin", "institutions", "create-business", "route.ts");
let content = fs.readFileSync(filePath, "utf8");

const oldGet = `export async function GET(req: Request) {
  try {
    const [types, cats, businesses] = await Promise.all([
      db.query(
        \`SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC\`
      ),
      db.query(
        \`SELECT id, name, slug, parent_id, depth, category_type, business_category_id, business_subcategory_id 
         FROM categories 
         WHERE COALESCE(is_deleted, false) = false AND is_active = true 
         ORDER BY name ASC\`
      ),
      db.query(
        \`SELECT id, name, slug, category_id, subcategory_id, city, state, country_code
         FROM business_profiles 
         WHERE COALESCE(is_active, true) = true AND COALESCE(is_deleted, false) = false 
         ORDER BY name ASC\`
      ).catch(() => ({ rows: [] })),
    ]);

    const allCats = cats.rows;
    const businessRootCategories = allCats.filter(
      (c: any) =>
        (c.category_type === "business" || !c.category_type) &&
        (!c.parent_id || c.depth === 1 || c.depth === 0)
    );
    const professionalRootCategories = allCats.filter(
      (c: any) =>
        c.category_type === "professional" &&
        (!c.parent_id || c.depth === 1 || c.depth === 0)
    );

    return NextResponse.json({
      success: true,
      data: types.rows,
      institutionTypes: types.rows,
      categories: businessRootCategories,
      professionalCategories:
        professionalRootCategories.length > 0
          ? professionalRootCategories
          : allCats.filter((c: any) => c.category_type === "professional"),
      subcategories: allCats,
      businesses: businesses.rows,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}`;

const newGet = `export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parentIdParam = url.searchParams.get("parent_id");
    const requestedType = url.searchParams.get("type")?.toLowerCase();

    // If subcategories for a specific parent are requested
    if (parentIdParam) {
      const parentId = Number(parentIdParam);
      const subRes = await db.query(
        \`SELECT id, name, slug, parent_id, depth, category_type, business_category_id 
         FROM categories 
         WHERE (parent_id = $1 OR business_category_id = $1)
           AND COALESCE(is_deleted, false) = false 
           AND is_active = true 
         ORDER BY name ASC\`,
        [parentId]
      );
      return NextResponse.json({
        success: true,
        subcategories: subRes.rows,
        data: subRes.rows,
      });
    }

    const [types, cats, businesses] = await Promise.all([
      db.query(
        \`SELECT id, name, slug FROM institution_types WHERE COALESCE(is_deleted, false) = false ORDER BY id ASC\`
      ),
      db.query(
        \`SELECT id, name, slug, parent_id, depth, category_type, business_category_id, business_subcategory_id 
         FROM categories 
         WHERE COALESCE(is_deleted, false) = false AND is_active = true 
         ORDER BY name ASC\`
      ),
      db.query(
        \`SELECT id, name, slug, category_id, subcategory_id, city, state, country_code
         FROM business_profiles 
         WHERE COALESCE(is_active, true) = true AND COALESCE(is_deleted, false) = false 
         ORDER BY name ASC\`
      ).catch(() => ({ rows: [] })),
    ]);

    const allCats = cats.rows;

    // Filter root categories (parent_id IS NULL or depth <= 1)
    const businessRootCategories = allCats
      .filter(
        (c: any) =>
          (c.category_type === "business" || !c.category_type) &&
          (!c.parent_id || c.depth === 1 || c.depth === 0)
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    const professionalRootCategories = allCats
      .filter(
        (c: any) =>
          c.category_type === "professional" &&
          (!c.parent_id || c.depth === 1 || c.depth === 0)
      )
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      data: types.rows,
      institutionTypes: types.rows,
      categories: businessRootCategories,
      professionalCategories:
        professionalRootCategories.length > 0
          ? professionalRootCategories
          : allCats.filter((c: any) => c.category_type === "professional"),
      subcategories: allCats,
      businesses: businesses.rows,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}`;

if (content.includes(oldGet)) {
  content = content.replace(oldGet, newGet);
  fs.writeFileSync(filePath, content, "utf8");
  console.log("Updated GET in create-business/route.ts");
} else {
  const oldGetCRLF = oldGet.replace(/\n/g, "\r\n");
  const newGetCRLF = newGet.replace(/\n/g, "\r\n");
  if (content.includes(oldGetCRLF)) {
    content = content.replace(oldGetCRLF, newGetCRLF);
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Updated GET (CRLF) in create-business/route.ts");
  } else {
    console.log("Could not find oldGet in route.ts");
  }
}

