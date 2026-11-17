import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getUserCatalogScope } from "@/lib/auth/institution-scope";

let productColumnsEnsured = false;
async function ensureProductColumns() {
  if (productColumnsEnsured) return;
  try {
    await db.query(`
      ALTER TABLE master_products
      ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT '{"IN", "US"}',
      ADD COLUMN IF NOT EXISTS suggested_min_price NUMERIC,
      ADD COLUMN IF NOT EXISTS suggested_max_price NUMERIC,
      ADD COLUMN IF NOT EXISTS country_pricing JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS main_category_id INTEGER,
      ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS sku VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sku_prefix VARCHAR(255),
      ADD COLUMN IF NOT EXISTS suggested_price_usd NUMERIC,
      ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
    `);
    productColumnsEnsured = true;
  } catch (err) {
    console.warn("Could not ensure master_products columns:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureProductColumns();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const country = searchParams.get("country");

    let query = `
      SELECT 
        mp.id,
        mp.name,
        mp.slug,
        mp.category_id,
        COALESCE(mp.main_category_id, mp.category_id) AS main_category_id,
        mp.subcategory_id,
        c_main.name AS main_category_name,
        c_sub.name AS subcategory_name,
        COALESCE(c_main.name, c.name) AS category_name,
        mp.description,
        mp.default_image_url,
        COALESCE(mp.additional_images, '{}') AS additional_images,
        mp.brand,
        mp.model,
        COALESCE(mp.sku, mp.sku_prefix, '') AS sku,
        COALESCE(mp.sku_prefix, mp.sku, '') AS sku_prefix,
        COALESCE(mp.unit_of_measurement, 'Piece') AS unit_of_measurement,
        COALESCE(mp.unit, mp.unit_of_measurement, 'Piece') AS unit,
        COALESCE(mp.unit_quantity, 1) AS unit_quantity,
        COALESCE(mp.attributes, '{}'::jsonb) AS attributes,
        COALESCE(mp.synonyms, '{}') AS synonyms,
        COALESCE(mp.countries, '{"IN", "US"}') AS countries,
        COALESCE(mp.suggested_price, mp.suggested_price_inr, 0) AS suggested_price,
        COALESCE(mp.suggested_price_inr, 0) AS suggested_price_inr,
        COALESCE(mp.suggested_price_usd, 0) AS suggested_price_usd,
        COALESCE(mp.suggested_min_price, 0) AS suggested_min_price,
        COALESCE(mp.suggested_max_price, 0) AS suggested_max_price,
        COALESCE(mp.country_pricing, '{}'::jsonb) AS country_pricing,
        COALESCE(mp.variants, '[]'::jsonb) AS variants,
        mp.business_profile_id,
        bp.name AS business_name,
        mp.professional_profile_id,
        pp.name AS professional_name,
        mp.profile_type,
        mp.is_active,
        mp.created_at,
        mp.updated_at
      FROM master_products mp
      LEFT JOIN categories c_main ON c_main.id = COALESCE(mp.main_category_id, mp.category_id)
      LEFT JOIN categories c_sub ON c_sub.id = mp.subcategory_id
      LEFT JOIN categories c ON c.id = mp.category_id
      LEFT JOIN business_profiles bp ON bp.id = mp.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = mp.professional_profile_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      query += ` AND (
        mp.name ILIKE $${pIdx} 
        OR mp.description ILIKE $${pIdx} 
        OR mp.brand ILIKE $${pIdx}
        OR mp.model ILIKE $${pIdx}
        OR mp.sku ILIKE $${pIdx}
        OR array_to_string(mp.synonyms, ' ') ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (categoryId && !isNaN(Number(categoryId))) {
      query += ` AND (mp.category_id = $${pIdx} OR mp.main_category_id = $${pIdx} OR mp.subcategory_id = $${pIdx})`;
      params.push(Number(categoryId));
      pIdx++;
    }

    if (country && country !== "all") {
      query += ` AND $${pIdx} = ANY(COALESCE(mp.countries, '{"IN", "US"}'))`;
      params.push(country.toUpperCase());
      pIdx++;
    }

    // Tenant & Business ownership scope filtering:
    // Only restrict items if caller explicitly requests "mine" (e.g. from store-specific inventory tab).
    // The Master Product Catalog lists all master template products for browsing, cloning, and assignment.
    const scope = searchParams.get("scope");
    const catalogScope = await getUserCatalogScope(db, user);
    if (scope === "mine" && !catalogScope.isSuperAdmin) {
      if (catalogScope.isPureProfessional) {
        // Professional account owners can see products listed by them only
        if (catalogScope.professionalProfileIds.length === 0) {
          return NextResponse.json({ success: true, products: [] });
        }
        query += ` AND mp.professional_profile_id = ANY($${pIdx})`;
        params.push(catalogScope.professionalProfileIds);
        pIdx++;
      } else {
        const hasAnyScope =
          catalogScope.businessProfileIds.length > 0 ||
          catalogScope.institutionIds.length > 0 ||
          catalogScope.professionalProfileIds.length > 0;

        if (!hasAnyScope) {
          return NextResponse.json({ success: true, products: [] });
        }

        query += ` AND (
          ($${pIdx}::int[] IS NOT NULL AND mp.business_profile_id = ANY($${pIdx}))
          OR ($${pIdx + 1}::int[] IS NOT NULL AND mp.institution_id = ANY($${pIdx + 1}))
          OR ($${pIdx + 2}::int[] IS NOT NULL AND mp.professional_profile_id = ANY($${pIdx + 2}))
        )`;
        params.push(
          catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
          catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
          catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null
        );
        pIdx += 3;
      }
    }

    query += ` ORDER BY mp.created_at DESC LIMIT 150`;

    const { rows } = await db.query(query, params);
    return NextResponse.json({ success: true, products: rows });
  } catch (error: any) {
    console.error("Failed to fetch master products:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch master products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureProductColumns();

    const body = await req.json();
    const {
      name,
      slug: customSlug,
      description,
      main_category_id,
      subcategory_id,
      category_id,
      default_image_url,
      additional_images,
      brand,
      model,
      sku,
      unit_of_measurement,
      attributes,
      synonyms,
      countries,
      suggested_price,
      suggested_price_inr,
      suggested_price_usd,
      suggested_min_price,
      suggested_max_price,
      country_pricing,
      is_active,
      business_profile_id,
      professional_profile_id,
      profile_type,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const effectiveMainCat = main_category_id ? Number(main_category_id) : (category_id ? Number(category_id) : null);
    const effectiveSubCat = subcategory_id ? Number(subcategory_id) : null;
    const effectiveCategory = effectiveSubCat || effectiveMainCat;

    const baseSlug = customSlug?.trim()
      ? customSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const synonymsArr = Array.isArray(synonyms)
      ? synonyms.map((s: string) => String(s).trim()).filter(Boolean)
      : typeof synonyms === "string"
      ? synonyms.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const additionalImagesArr = Array.isArray(additional_images)
      ? additional_images.map((img: string) => String(img).trim()).filter(Boolean)
      : typeof additional_images === "string"
      ? additional_images.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];

    const parsedAttributes = attributes && typeof attributes === "object" ? attributes : {};

    const countriesArr = Array.isArray(countries) && countries.length > 0
      ? countries.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean)
      : ["IN", "US"];

    const cleanSku = (sku || "").trim() || null;
    const finalSuggestedPrice = suggested_price !== undefined && suggested_price !== null && suggested_price !== ""
      ? Number(suggested_price)
      : (suggested_price_inr ? Number(suggested_price_inr) : 0);
    const priceInr = suggested_price_inr !== undefined && suggested_price_inr !== null && suggested_price_inr !== ""
      ? Number(suggested_price_inr)
      : finalSuggestedPrice;
    const priceUsd = suggested_price_usd !== undefined && suggested_price_usd !== null && suggested_price_usd !== ""
      ? Number(suggested_price_usd)
      : (priceInr > 0 ? Number((priceInr / 85).toFixed(2)) : 0);

    const minPrice = suggested_min_price !== undefined && suggested_min_price !== null && suggested_min_price !== "" ? Number(suggested_min_price) : null;
    const maxPrice = suggested_max_price !== undefined && suggested_max_price !== null && suggested_max_price !== "" ? Number(suggested_max_price) : null;
    const pricingJson = country_pricing && typeof country_pricing === "object" ? country_pricing : {};

    const catalogScope = await getUserCatalogScope(db, user);
    const assignedBusinessId = body.business_profile_id ? Number(body.business_profile_id) : catalogScope.primaryBusinessId;
    const assignedInstitutionId = body.institution_id ? Number(body.institution_id) : catalogScope.primaryInstitutionId;
    const assignedProfessionalId = body.professional_profile_id ? Number(body.professional_profile_id) : catalogScope.primaryProfessionalId;
    const assignedProfileType = body.profile_type || (assignedProfessionalId ? "professional" : "business");

    const result = await db.query(
      `
      INSERT INTO master_products (
        name,
        slug,
        category_id,
        main_category_id,
        subcategory_id,
        description,
        default_image_url,
        additional_images,
        brand,
        model,
        sku,
        sku_prefix,
        unit_of_measurement,
        attributes,
        synonyms,
        countries,
        suggested_price,
        suggested_price_inr,
        suggested_price_usd,
        suggested_min_price,
        suggested_max_price,
        country_pricing,
        is_active,
        business_profile_id,
        institution_id,
        professional_profile_id,
        profile_type,
        variants,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22::jsonb, $23, $24, $25, $26, $27, $28::jsonb,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *;
    `,
      [
        cleanName,
        slug,
        effectiveCategory,
        effectiveMainCat,
        effectiveSubCat,
        description?.trim() || null,
        default_image_url?.trim() || null,
        additionalImagesArr,
        brand?.trim() || null,
        model?.trim() || null,
        cleanSku,
        cleanSku,
        (unit_of_measurement || "Piece").trim(),
        parsedAttributes,
        synonymsArr,
        countriesArr,
        finalSuggestedPrice,
        priceInr,
        priceUsd,
        minPrice,
        maxPrice,
        JSON.stringify(pricingJson),
        is_active !== undefined ? Boolean(is_active) : true,
        assignedBusinessId,
        assignedInstitutionId,
        assignedProfessionalId,
        assignedProfileType,
        JSON.stringify(Array.isArray(body.variants) ? body.variants : []),
      ]
    );

    return NextResponse.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to create master product:", error);
    return NextResponse.json({ error: error.message || "Failed to create master product" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureProductColumns();

    const body = await req.json();
    const {
      id,
      name,
      slug,
      description,
      main_category_id,
      subcategory_id,
      category_id,
      default_image_url,
      additional_images,
      brand,
      model,
      sku,
      unit_of_measurement,
      attributes,
      synonyms,
      countries,
      suggested_price,
      suggested_price_inr,
      suggested_price_usd,
      suggested_min_price,
      suggested_max_price,
      country_pricing,
      is_active,
      business_profile_id,
      professional_profile_id,
      profile_type,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const synonymsArr = synonyms !== undefined
      ? (Array.isArray(synonyms) ? synonyms.map((s: string) => String(s).trim()).filter(Boolean) : String(synonyms).split(",").map((s) => s.trim()).filter(Boolean))
      : undefined;

    const additionalImagesArr = additional_images !== undefined
      ? (Array.isArray(additional_images) ? additional_images.map((s: string) => String(s).trim()).filter(Boolean) : String(additional_images).split("\n").map((s) => s.trim()).filter(Boolean))
      : undefined;

    const countriesArr = countries !== undefined
      ? (Array.isArray(countries) ? countries.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean) : ["IN", "US"])
      : undefined;

    const effectiveMainCat = main_category_id !== undefined ? (main_category_id ? Number(main_category_id) : null) : undefined;
    const effectiveSubCat = subcategory_id !== undefined ? (subcategory_id ? Number(subcategory_id) : null) : undefined;
    const effectiveCategory = effectiveSubCat !== undefined || effectiveMainCat !== undefined
      ? (effectiveSubCat || effectiveMainCat || (category_id ? Number(category_id) : null))
      : undefined;

    const pricingJsonStr = country_pricing !== undefined ? JSON.stringify(country_pricing) : null;

    const catalogScope = await getUserCatalogScope(db, user);
    if (!catalogScope.isSuperAdmin) {
      const prodCheck = await db.query(
        `SELECT id FROM master_products 
         WHERE id = $1 
           AND (
             ($2::int[] IS NOT NULL AND business_profile_id = ANY($2))
             OR ($3::int[] IS NOT NULL AND institution_id = ANY($3))
             OR ($4::int[] IS NOT NULL AND professional_profile_id = ANY($4))
           ) LIMIT 1`,
        [
          Number(id),
          catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
          catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
          catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
        ]
      );
      if (prodCheck.rows.length === 0) {
        return NextResponse.json({ error: "Product not found or access denied" }, { status: 403 });
      }
    }

    const result = await db.query(
      `
      UPDATE master_products
      SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        default_image_url = COALESCE($4, default_image_url),
        additional_images = COALESCE($5, additional_images),
        brand = COALESCE($6, brand),
        model = COALESCE($7, model),
        sku = COALESCE($8, sku),
        sku_prefix = COALESCE($8, sku_prefix),
        unit_of_measurement = COALESCE($9, unit_of_measurement),
        attributes = COALESCE($10, attributes),
        synonyms = COALESCE($11, synonyms),
        suggested_price = COALESCE($12, suggested_price),
        suggested_price_inr = COALESCE($13, suggested_price_inr),
        suggested_price_usd = COALESCE($14, suggested_price_usd),
        suggested_min_price = COALESCE($15, suggested_min_price),
        suggested_max_price = COALESCE($16, suggested_max_price),
        country_pricing = CASE WHEN $17::jsonb IS NOT NULL THEN $17::jsonb ELSE country_pricing END,
        countries = COALESCE($18, countries),
        is_active = COALESCE($19, is_active),
        main_category_id = COALESCE($20, main_category_id),
        subcategory_id = COALESCE($21, subcategory_id),
        category_id = COALESCE($22, category_id),
        business_profile_id = CASE WHEN $24::boolean THEN $25::int ELSE business_profile_id END,
        professional_profile_id = CASE WHEN $26::boolean THEN $27::int ELSE professional_profile_id END,
        profile_type = COALESCE($28, profile_type),
        variants = CASE WHEN $29::jsonb IS NOT NULL THEN $29::jsonb ELSE variants END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $23
      RETURNING *;
    `,
      [
        name !== undefined ? name.trim() : null,
        slug !== undefined ? slug.trim() : null,
        description !== undefined ? description : null,
        default_image_url !== undefined ? default_image_url : null,
        additionalImagesArr !== undefined ? additionalImagesArr : null,
        brand !== undefined ? brand : null,
        model !== undefined ? model : null,
        sku !== undefined ? sku : null,
        unit_of_measurement !== undefined ? unit_of_measurement : null,
        attributes !== undefined ? attributes : null,
        synonymsArr !== undefined ? synonymsArr : null,
        suggested_price !== undefined ? Number(suggested_price) : null,
        suggested_price_inr !== undefined ? Number(suggested_price_inr) : null,
        suggested_price_usd !== undefined ? Number(suggested_price_usd) : null,
        suggested_min_price !== undefined ? Number(suggested_min_price) : null,
        suggested_max_price !== undefined ? Number(suggested_max_price) : null,
        pricingJsonStr,
        countriesArr !== undefined ? countriesArr : null,
        is_active !== undefined ? Boolean(is_active) : null,
        effectiveMainCat !== undefined ? effectiveMainCat : null,
        effectiveSubCat !== undefined ? effectiveSubCat : null,
        effectiveCategory !== undefined ? effectiveCategory : null,
        Number(id),
        business_profile_id !== undefined,
        business_profile_id ? Number(business_profile_id) : null,
        professional_profile_id !== undefined,
        professional_profile_id ? Number(professional_profile_id) : null,
        profile_type || null,
        body.variants !== undefined ? JSON.stringify(body.variants) : null,
      ]
    );

    return NextResponse.json({ success: true, product: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to update master product:", error);
    return NextResponse.json({ error: error.message || "Failed to update master product" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    const catalogScope = await getUserCatalogScope(db, user);
    if (!catalogScope.isSuperAdmin) {
      const prodCheck = await db.query(
        `SELECT id FROM master_products 
         WHERE id = $1 
           AND (
             ($2::int[] IS NOT NULL AND business_profile_id = ANY($2))
             OR ($3::int[] IS NOT NULL AND institution_id = ANY($3))
             OR ($4::int[] IS NOT NULL AND professional_profile_id = ANY($4))
           ) LIMIT 1`,
        [
          Number(id),
          catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
          catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
          catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
        ]
      );
      if (prodCheck.rows.length === 0) {
        return NextResponse.json({ error: "Product not found or access denied" }, { status: 403 });
      }
    }

    await db.query(`DELETE FROM master_products WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete master product:", error);
    return NextResponse.json({ error: error.message || "Failed to delete master product" }, { status: 500 });
  }
}
