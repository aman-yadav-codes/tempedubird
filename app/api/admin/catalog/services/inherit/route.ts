import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getUserCatalogScope } from "@/lib/auth/institution-scope";

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");

    const catalogScope = await getUserCatalogScope(db, user);

    // Find which master services this seller has already inherited
    const inheritedRes = await db.query<{ master_service_id: number }>(
      `SELECT DISTINCT master_service_id 
       FROM services 
       WHERE master_service_id IS NOT NULL 
       AND (
         ($1::int[] IS NOT NULL AND business_profile_id = ANY($1))
         OR ($2::int[] IS NOT NULL AND professional_profile_id = ANY($2))
         OR ($3::int[] IS NOT NULL AND institution_id = ANY($3))
         OR (created_by = $4)
       )`,
      [
        catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
        catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
        catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
        user.id,
      ]
    );

    const inheritedIds = new Set(inheritedRes.rows.map((r) => r.master_service_id));

    let query = `
      SELECT 
        ms.id,
        ms.name,
        ms.slug,
        ms.category_id,
        COALESCE(ms.main_category_id, ms.category_id) AS main_category_id,
        ms.subcategory_id,
        COALESCE(c_main.name, c.name, 'General') AS category_name,
        ms.description,
        ms.default_image_url,
        COALESCE(ms.pricing_model, 'fixed_price') AS pricing_model,
        COALESCE(ms.duration_minutes, 60) AS duration_minutes,
        COALESCE(ms.duration_unit, 'minutes') AS duration_unit,
        COALESCE(NULLIF(ms.suggested_price, 0), NULLIF(ms.suggested_price_inr, 0), NULLIF(ms.regular_price, 0), 0) AS suggested_price,
        ms.is_active,
        ms.created_at
      FROM master_services ms
      LEFT JOIN categories c_main ON c_main.id = COALESCE(ms.main_category_id, ms.category_id)
      LEFT JOIN categories c ON c.id = ms.category_id
      WHERE COALESCE(ms.is_active, TRUE) = TRUE
    `;

    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      query += ` AND (
        ms.name ILIKE $${pIdx} 
        OR ms.description ILIKE $${pIdx} 
        OR ms.pricing_model ILIKE $${pIdx}
        OR array_to_string(ms.synonyms, ' ') ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (categoryId && !isNaN(Number(categoryId)) && Number(categoryId) > 0) {
      query += ` AND (ms.category_id = $${pIdx} OR ms.main_category_id = $${pIdx} OR ms.subcategory_id = $${pIdx})`;
      params.push(Number(categoryId));
      pIdx++;
    }

    query += ` ORDER BY ms.name ASC LIMIT 200`;

    const { rows } = await db.query(query, params);

    const services = rows.map((row: any) => ({
      ...row,
      already_inherited: inheritedIds.has(row.id),
    }));

    return NextResponse.json({
      success: true,
      services,
      total: services.length,
    });
  } catch (error: any) {
    console.error("[Services Inherit GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch master services for inheritance" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { master_service_ids = [], custom_prices = {} } = body;

    if (!Array.isArray(master_service_ids) || master_service_ids.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one master service to inherit" },
        { status: 400 }
      );
    }

    const catalogScope = await getUserCatalogScope(db, user);

    const businessProfileId = catalogScope.primaryBusinessId;
    const professionalProfileId = catalogScope.primaryProfessionalId;
    const institutionId = catalogScope.primaryInstitutionId;

    let institutionName = "Service Provider";
    if (institutionId) {
      const instRes = await db.query<{ name: string }>(
        `SELECT name FROM institution_profiles WHERE id = $1`,
        [institutionId]
      );
      if (instRes.rows[0]?.name) {
        institutionName = instRes.rows[0].name;
      }
    } else if (businessProfileId) {
      const bizRes = await db.query<{ name: string }>(
        `SELECT name FROM business_profiles WHERE id = $1`,
        [businessProfileId]
      );
      if (bizRes.rows[0]?.name) {
        institutionName = bizRes.rows[0].name;
      }
    }

    // Fetch the target master services
    const masterServsRes = await db.query(
      `SELECT 
        ms.*,
        COALESCE(c_main.name, c.name, 'General') AS category_name
       FROM master_services ms
       LEFT JOIN categories c_main ON c_main.id = COALESCE(ms.main_category_id, ms.category_id)
       LEFT JOIN categories c ON c.id = ms.category_id
       WHERE ms.id = ANY($1)`,
      [master_service_ids]
    );

    const masterServices = masterServsRes.rows;
    if (masterServices.length === 0) {
      return NextResponse.json({ error: "No matching master services found" }, { status: 404 });
    }

    let insertedCount = 0;

    for (const ms of masterServices) {
      // Check if already inherited by this seller
      const existingCheck = await db.query(
        `SELECT id FROM services 
         WHERE master_service_id = $1 
         AND (
           ($2::int IS NOT NULL AND business_profile_id = $2)
           OR ($3::int IS NOT NULL AND professional_profile_id = $3)
           OR ($4::int IS NOT NULL AND institution_id = $4)
           OR (created_by = $5)
         ) LIMIT 1`,
        [ms.id, businessProfileId, professionalProfileId, institutionId, user.id]
      );

      const price =
        custom_prices[ms.id] !== undefined && custom_prices[ms.id] !== null && Number(custom_prices[ms.id]) > 0
          ? Number(custom_prices[ms.id])
          : Number(ms.suggested_price || ms.suggested_price_inr || ms.regular_price || 0);

      const pricingModel = ms.pricing_model || "fixed_price";
      const durationMinutes = Number(ms.duration_minutes) || 60;
      const durationUnit = ms.duration_unit || "minutes";

      let baseSlug = slugify(ms.name || `service-${ms.id}`);
      let serviceSlug = `${baseSlug}-${businessProfileId || user.id || Date.now()}`;

      // Check slug uniqueness
      const slugCheck = await db.query(`SELECT id FROM services WHERE slug = $1`, [serviceSlug]);
      if (slugCheck.rows.length > 0) {
        serviceSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`;
      }

      if (existingCheck.rows.length === 0) {
        // Insert into services
        await db.query(
          `INSERT INTO services (
            title, slug, description, price, category, category_id,
            main_category_id, subcategory_id,
            image_url, pricing_model, duration_minutes, duration_unit,
            status, is_featured, synonyms, attributes, variants,
            business_profile_id, professional_profile_id, institution_id, institution_name,
            master_service_id, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8,
            $9, $10, $11, $12,
            'active', FALSE, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, NOW(), NOW()
          )`,
          [
            ms.name,
            serviceSlug,
            ms.description || null,
            price,
            ms.category_name || "General",
            ms.category_id || null,
            ms.main_category_id || ms.category_id || null,
            ms.subcategory_id || null,
            ms.default_image_url || null,
            pricingModel,
            durationMinutes,
            durationUnit,
            ms.synonyms || [],
            JSON.stringify(ms.attributes || {}),
            JSON.stringify(ms.variants || []),
            businessProfileId,
            professionalProfileId,
            institutionId,
            institutionName,
            ms.id,
            user.id,
          ]
        );
        insertedCount++;
      }

      // Also ensure business_services record exists if businessProfileId is available
      if (businessProfileId) {
        const bsCheck = await db.query(
          `SELECT id FROM business_services WHERE business_id = $1 AND master_service_id = $2`,
          [businessProfileId, ms.id]
        );

        if (bsCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO business_services (
              business_id, master_service_id,
              custom_title, custom_description, custom_image_url,
              price, pricing_model, duration_minutes, is_active,
              created_at, updated_at
            ) VALUES (
              $1, $2,
              $3, $4, $5,
              $6, $7, $8, TRUE,
              NOW(), NOW()
            )`,
            [
              businessProfileId,
              ms.id,
              ms.name,
              ms.description || null,
              ms.default_image_url || null,
              price,
              pricingModel,
              durationMinutes,
            ]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      message: `Successfully inherited ${insertedCount} service${insertedCount === 1 ? "" : "s"} into your store catalog.`,
    });
  } catch (error: any) {
    console.error("[Services Inherit POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inherit master services" },
      { status: 500 }
    );
  }
}
