import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getUserCatalogScope } from "@/lib/auth/institution-scope";

let serviceColumnsEnsured = false;
async function ensureServiceColumns() {
  if (serviceColumnsEnsured) return;
  try {
    await db.query(`
      ALTER TABLE master_services
      ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
    `);
    serviceColumnsEnsured = true;
  } catch (err) {
    console.warn("Could not ensure master_services columns:", err);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureServiceColumns();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId");
    const country = searchParams.get("country");
    const format = searchParams.get("format"); // 'json' | 'csv'

    let query = `
      SELECT 
        ms.id,
        ms.name,
        ms.slug,
        ms.category_id,
        COALESCE(ms.main_category_id, ms.category_id) AS main_category_id,
        ms.subcategory_id,
        c_main.name AS main_category_name,
        c_sub.name AS subcategory_name,
        COALESCE(c_main.name, c.name) AS category_name,
        ms.description,
        ms.default_image_url,
        COALESCE(ms.additional_images, '{}') AS additional_images,
        COALESCE(ms.synonyms, '{}') AS synonyms,
        COALESCE(ms.countries, '{"IN", "US"}') AS countries,
        COALESCE(ms.pricing_model, 'fixed') AS pricing_model,
        COALESCE(ms.duration_minutes, 60) AS duration_minutes,
        COALESCE(ms.duration_unit, 'hours') AS duration_unit,
        COALESCE(ms.suggested_price, ms.suggested_price_inr, 0) AS suggested_price,
        COALESCE(ms.suggested_price_inr, 0) AS suggested_price_inr,
        COALESCE(ms.suggested_price_usd, 0) AS suggested_price_usd,
        COALESCE(ms.suggested_min_price, 0) AS suggested_min_price,
        COALESCE(ms.suggested_max_price, 0) AS suggested_max_price,
        COALESCE(ms.country_pricing, '{}'::jsonb) AS country_pricing,
        COALESCE(ms.attributes, '{}'::jsonb) AS attributes,
        COALESCE(ms.variants, '[]'::jsonb) AS variants,
        COALESCE(ms.supported_pricing_models, '{"fixed_price","hourly","per_visit","per_session","per_project","per_day","per_unit","starting_from","price_range","free_consultation","quote_required"}') AS supported_pricing_models,
        ms.business_profile_id,
        bp.name AS business_name,
        ms.professional_profile_id,
        pp.name AS professional_name,
        ms.profile_type,
        ms.is_active,
        ms.created_at,
        ms.updated_at
      FROM master_services ms
      LEFT JOIN categories c_main ON c_main.id = COALESCE(ms.main_category_id, ms.category_id)
      LEFT JOIN categories c_sub ON c_sub.id = ms.subcategory_id
      LEFT JOIN categories c ON c.id = ms.category_id
      LEFT JOIN business_profiles bp ON bp.id = ms.business_profile_id
      LEFT JOIN professional_profiles pp ON pp.id = ms.professional_profile_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      query += ` AND (
        ms.name ILIKE $${pIdx} 
        OR ms.description ILIKE $${pIdx} 
        OR array_to_string(ms.synonyms, ' ') ILIKE $${pIdx}
        OR ms.pricing_model ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (categoryId && !isNaN(Number(categoryId))) {
      query += ` AND (ms.category_id = $${pIdx} OR ms.main_category_id = $${pIdx} OR ms.subcategory_id = $${pIdx})`;
      params.push(Number(categoryId));
      pIdx++;
    }

    if (country) {
      query += ` AND $${pIdx} = ANY(ms.countries)`;
      params.push(country.toUpperCase());
      pIdx++;
    }

    // Tenant & Business ownership scope filtering:
    // Only restrict items if caller explicitly requests "mine" (e.g. from store-specific inventory tab).
    // The Master Services Catalog lists all master template services for browsing, cloning, and assignment.
    const scope = searchParams.get("scope");
    const catalogScope = await getUserCatalogScope(db, user);
    if (scope === "mine" && !catalogScope.isSuperAdmin) {
      if (catalogScope.isPureProfessional) {
        // Professional account owners can see services listed by them only
        if (catalogScope.professionalProfileIds.length === 0) {
          return NextResponse.json({ success: true, services: [] });
        }
        query += ` AND ms.professional_profile_id = ANY($${pIdx})`;
        params.push(catalogScope.professionalProfileIds);
        pIdx++;
      } else {
        const hasAnyScope =
          catalogScope.businessProfileIds.length > 0 ||
          catalogScope.institutionIds.length > 0 ||
          catalogScope.professionalProfileIds.length > 0;

        if (!hasAnyScope) {
          return NextResponse.json({ success: true, services: [] });
        }

        query += ` AND (
          ($${pIdx}::int[] IS NOT NULL AND ms.business_profile_id = ANY($${pIdx}))
          OR ($${pIdx + 1}::int[] IS NOT NULL AND ms.institution_id = ANY($${pIdx + 1}))
          OR ($${pIdx + 2}::int[] IS NOT NULL AND ms.professional_profile_id = ANY($${pIdx + 2}))
        )`;
        params.push(
          catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
          catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
          catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null
        );
        pIdx += 3;
      }
    }

    query += ` ORDER BY ms.created_at DESC LIMIT 200`;

    const { rows } = await db.query(query, params);

    // CSV Export option
    if (format === "csv") {
      const headers = [
        "id",
        "name",
        "slug",
        "main_category",
        "subcategory",
        "pricing_model",
        "duration_minutes",
        "duration_unit",
        "suggested_price_inr",
        "suggested_price_usd",
        "countries",
        "is_active",
      ];
      const csvRows = [headers.join(",")];
      for (const r of rows) {
        csvRows.push([
          r.id,
          `"${(r.name || "").replace(/"/g, '""')}"`,
          `"${r.slug || ""}"`,
          `"${r.main_category_name || ""}"`,
          `"${r.subcategory_name || ""}"`,
          `"${r.pricing_model || ""}"`,
          r.duration_minutes || 60,
          r.duration_unit || "hours",
          r.suggested_price_inr || 0,
          r.suggested_price_usd || 0,
          `"${(r.countries || []).join(";")}"`,
          r.is_active ? "TRUE" : "FALSE",
        ].join(","));
      }

      return new Response(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="master_services_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, services: rows });
  } catch (error: any) {
    console.error("Failed to fetch master services:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch master services" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Check if bulk import
    if (Array.isArray(body.services)) {
      const inserted: any[] = [];
      for (const item of body.services) {
        if (!item.name?.trim()) continue;
        const cleanName = item.name.trim();
        const slug = (item.slug?.trim() || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "-" + Date.now().toString().slice(-4);
        const countries = Array.isArray(item.countries) && item.countries.length > 0 ? item.countries : ["IN", "US"];
        const synonyms = Array.isArray(item.synonyms) ? item.synonyms : [];

        const ins = await db.query(
          `INSERT INTO master_services (
             name, slug, main_category_id, subcategory_id, category_id,
             description, default_image_url, additional_images, synonyms, countries,
             pricing_model, duration_minutes, duration_unit, suggested_price,
             suggested_price_inr, suggested_price_usd, is_active, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10,
             $11, $12, $13, $14,
             $15, $16, $17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           ) RETURNING id`,
          [
            cleanName,
            slug,
            item.main_category_id ? Number(item.main_category_id) : null,
            item.subcategory_id ? Number(item.subcategory_id) : null,
            item.subcategory_id ? Number(item.subcategory_id) : (item.main_category_id ? Number(item.main_category_id) : null),
            item.description?.trim() || null,
            item.default_image_url?.trim() || null,
            Array.isArray(item.additional_images) ? item.additional_images : [],
            synonyms,
            countries,
            item.pricing_model || "fixed",
            item.duration_minutes ? Number(item.duration_minutes) : 60,
            item.duration_unit || "hours",
            item.suggested_price ? Number(item.suggested_price) : 0,
            item.suggested_price_inr ? Number(item.suggested_price_inr) : 0,
            item.suggested_price_usd ? Number(item.suggested_price_usd) : 0,
            item.is_active !== undefined ? Boolean(item.is_active) : true,
          ]
        );
        inserted.push(ins.rows[0].id);
      }
      return NextResponse.json({ success: true, count: inserted.length, ids: inserted });
    }

    const {
      name,
      slug: customSlug,
      description,
      main_category_id,
      subcategory_id,
      category_id,
      default_image_url,
      additional_images,
      attributes,
      synonyms,
      countries,
      pricing_model,
      duration_minutes,
      duration_unit,
      suggested_price,
      suggested_price_inr,
      suggested_price_usd,
      suggested_min_price,
      suggested_max_price,
      country_pricing,
      supported_pricing_models,
      is_active,
      business_profile_id,
      professional_profile_id,
      profile_type,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Service name is required" }, { status: 400 });
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
      ? additional_images.map((s: string) => String(s).trim()).filter(Boolean)
      : typeof additional_images === "string"
      ? additional_images.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];

    const countriesArr = Array.isArray(countries) && countries.length > 0
      ? countries.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean)
      : ["IN", "US"];

    const finalSuggestedPrice = suggested_price !== undefined && suggested_price !== null && suggested_price !== ""
      ? Number(suggested_price)
      : (suggested_price_inr ? Number(suggested_price_inr) : 0);
    const priceInr = suggested_price_inr !== undefined && suggested_price_inr !== null && suggested_price_inr !== ""
      ? Number(suggested_price_inr)
      : finalSuggestedPrice;
    const priceUsd = suggested_price_usd !== undefined && suggested_price_usd !== null && suggested_price_usd !== ""
      ? Number(suggested_price_usd)
      : Number((finalSuggestedPrice / 85).toFixed(2));

    const minPrice = suggested_min_price !== undefined && suggested_min_price !== null && suggested_min_price !== "" ? Number(suggested_min_price) : null;
    const maxPrice = suggested_max_price !== undefined && suggested_max_price !== null && suggested_max_price !== "" ? Number(suggested_max_price) : null;
    const pricingJson = country_pricing || {};
    const supportedModels = Array.isArray(supported_pricing_models) && supported_pricing_models.length > 0
      ? supported_pricing_models
      : ["fixed_price", "hourly", "per_visit", "per_session", "per_project", "per_day", "per_unit", "starting_from", "price_range", "free_consultation", "quote_required"];

    const catalogScope = await getUserCatalogScope(db, user);
    const assignedBusinessId = body.business_profile_id ? Number(body.business_profile_id) : catalogScope.primaryBusinessId;
    const assignedInstitutionId = body.institution_id ? Number(body.institution_id) : catalogScope.primaryInstitutionId;
    const assignedProfessionalId = body.professional_profile_id ? Number(body.professional_profile_id) : catalogScope.primaryProfessionalId;
    const assignedProfileType = body.profile_type || (assignedProfessionalId ? "professional" : "business");

    const parsedAttributes = attributes && typeof attributes === "object" ? attributes : {};

    const result = await db.query(
      `
      INSERT INTO master_services (
        name,
        slug,
        category_id,
        main_category_id,
        subcategory_id,
        description,
        default_image_url,
        additional_images,
        attributes,
        synonyms,
        countries,
        pricing_model,
        duration_minutes,
        duration_unit,
        suggested_price,
        suggested_price_inr,
        suggested_price_usd,
        suggested_min_price,
        suggested_max_price,
        country_pricing,
        supported_pricing_models,
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
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9::jsonb, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20::jsonb,
        $21::text[], $22, $23, $24, $25,
        $26,
        $27::jsonb,
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
        JSON.stringify(parsedAttributes),
        synonymsArr,
        countriesArr,
        (pricing_model || "fixed_price").trim(),
        duration_minutes ? Number(duration_minutes) : 60,
        (duration_unit || "hours").trim(),
        finalSuggestedPrice,
        priceInr,
        priceUsd,
        minPrice,
        maxPrice,
        JSON.stringify(pricingJson),
        supportedModels,
        is_active !== undefined ? Boolean(is_active) : true,
        assignedBusinessId,
        assignedInstitutionId,
        assignedProfessionalId,
        assignedProfileType,
        JSON.stringify(Array.isArray(body.variants) ? body.variants : []),
      ]
    );

    const createdService = result.rows[0];

    // Auto-sync into master_service_synonyms
    for (const syn of synonymsArr) {
      await db.query(
        `INSERT INTO master_service_synonyms (service_id, synonym, language, is_active)
         VALUES ($1, $2, 'en', true)
         ON CONFLICT (service_id, LOWER(synonym)) DO NOTHING`,
        [createdService.id, syn]
      );
    }

    return NextResponse.json({ success: true, service: createdService });
  } catch (error: any) {
    console.error("Failed to create master service:", error);
    return NextResponse.json({ error: error.message || "Failed to create master service" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      attributes,
      synonyms,
      countries,
      pricing_model,
      duration_minutes,
      duration_unit,
      suggested_price,
      suggested_price_inr,
      suggested_price_usd,
      suggested_min_price,
      suggested_max_price,
      country_pricing,
      supported_pricing_models,
      is_active,
      business_profile_id,
      professional_profile_id,
      profile_type,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const synonymsArr = synonyms !== undefined
      ? (Array.isArray(synonyms) ? synonyms.map((s: string) => String(s).trim()).filter(Boolean) : String(synonyms).split(",").map((s) => s.trim()).filter(Boolean))
      : undefined;

    const additionalImagesArr = additional_images !== undefined
      ? (Array.isArray(additional_images) ? additional_images.map((s: string) => String(s).trim()).filter(Boolean) : String(additional_images).split("\n").map((s) => s.trim()).filter(Boolean))
      : undefined;

    const countriesArr = countries !== undefined
      ? (Array.isArray(countries) ? countries.map((c: string) => String(c).trim().toUpperCase()).filter(Boolean) : String(countries).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean))
      : undefined;

    const effectiveMainCat = main_category_id !== undefined ? (main_category_id ? Number(main_category_id) : null) : undefined;
    const effectiveSubCat = subcategory_id !== undefined ? (subcategory_id ? Number(subcategory_id) : null) : undefined;
    const effectiveCategory = effectiveSubCat !== undefined || effectiveMainCat !== undefined
      ? (effectiveSubCat || effectiveMainCat || (category_id ? Number(category_id) : null))
      : undefined;

    const minPrice = suggested_min_price !== undefined ? (suggested_min_price !== null && suggested_min_price !== "" ? Number(suggested_min_price) : null) : undefined;
    const maxPrice = suggested_max_price !== undefined ? (suggested_max_price !== null && suggested_max_price !== "" ? Number(suggested_max_price) : null) : undefined;
    const countryPricingJson = country_pricing !== undefined ? JSON.stringify(country_pricing) : undefined;
    const attributesJson = attributes !== undefined ? (typeof attributes === "object" ? JSON.stringify(attributes) : String(attributes)) : undefined;
    const supportedModels = Array.isArray(supported_pricing_models) ? supported_pricing_models : undefined;

    const result = await db.query(
      `
      UPDATE master_services
      SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        default_image_url = COALESCE($4, default_image_url),
        additional_images = COALESCE($5, additional_images),
        synonyms = COALESCE($6, synonyms),
        countries = COALESCE($7, countries),
        pricing_model = COALESCE($8, pricing_model),
        duration_minutes = COALESCE($9, duration_minutes),
        duration_unit = COALESCE($10, duration_unit),
        suggested_price = COALESCE($11, suggested_price),
        suggested_price_inr = COALESCE($12, suggested_price_inr),
        suggested_price_usd = COALESCE($13, suggested_price_usd),
        suggested_min_price = COALESCE($14, suggested_min_price),
        suggested_max_price = COALESCE($15, suggested_max_price),
        country_pricing = COALESCE($16::jsonb, country_pricing),
        attributes = COALESCE($17::jsonb, attributes),
        supported_pricing_models = COALESCE($18::text[], supported_pricing_models),
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
        synonymsArr !== undefined ? synonymsArr : null,
        countriesArr !== undefined ? countriesArr : null,
        pricing_model !== undefined ? pricing_model : null,
        duration_minutes !== undefined ? Number(duration_minutes) : null,
        duration_unit !== undefined ? duration_unit : null,
        suggested_price !== undefined ? Number(suggested_price) : null,
        suggested_price_inr !== undefined ? Number(suggested_price_inr) : null,
        suggested_price_usd !== undefined ? Number(suggested_price_usd) : null,
        minPrice !== undefined ? minPrice : null,
        maxPrice !== undefined ? maxPrice : null,
        countryPricingJson !== undefined ? countryPricingJson : null,
        attributesJson !== undefined ? attributesJson : null,
        supportedModels !== undefined ? supportedModels : null,
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

    if (synonymsArr !== undefined) {
      for (const syn of synonymsArr) {
        await db.query(
          `INSERT INTO master_service_synonyms (service_id, synonym, language, is_active)
           VALUES ($1, $2, 'en', true)
           ON CONFLICT (service_id, LOWER(synonym)) DO NOTHING`,
          [Number(id), syn]
        );
      }
    }

    return NextResponse.json({ success: true, service: result.rows[0] });
  } catch (error: any) {
    console.error("Failed to update master service:", error);
    return NextResponse.json({ error: error.message || "Failed to update master service" }, { status: 500 });
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
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM master_services WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ success: true, message: "Service deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete master service:", error);
    return NextResponse.json({ error: error.message || "Failed to delete master service" }, { status: 500 });
  }
}
