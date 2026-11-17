import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getUserCatalogScope } from "@/lib/auth/institution-scope";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json({ error: "businessId parameter is required" }, { status: 400 });
    }

    // Verify ownership
    const catalogScope = await getUserCatalogScope(db, user);
    const hasAccess =
      catalogScope.isSuperAdmin ||
      catalogScope.businessProfileIds.includes(Number(businessId));

    if (!hasAccess) {
      return NextResponse.json({ error: "Business not found or unauthorized" }, { status: 403 });
    }

    const bpCheck = await db.query(
      `SELECT id, country_code FROM business_profiles WHERE id = $1 LIMIT 1`,
      [Number(businessId)]
    );
    if (!bpCheck.rows[0]) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    const countryCode = bpCheck.rows[0].country_code || "IN";

    // Services of this business
    const bsRes = await db.query(
      `SELECT 
         bs.*,
         COALESCE(bs.custom_image_url, ms.default_image_url) AS effective_image_url,
         ms.name AS master_name,
         ms.name AS master_title,
         ms.default_image_url,
         ms.suggested_price_inr,
         ms.suggested_price_usd,
         ms.suggested_min_price,
         ms.suggested_max_price,
         ms.supported_pricing_models,
         ms.duration_minutes AS default_duration_minutes,
         c.name AS category_name
       FROM business_services bs
       LEFT JOIN master_services ms ON ms.id = bs.master_service_id
       LEFT JOIN categories c ON c.id = ms.category_id
       WHERE bs.business_id = $1
       ORDER BY bs.id DESC`,
      [Number(businessId)]
    );

    // Available Master Services for selection
    const msRes = await db.query(
      `SELECT 
         ms.id,
         ms.name,
         ms.name AS title,
         ms.slug,
         ms.description,
         ms.default_image_url,
         ms.additional_images,
         ms.synonyms,
         ms.countries,
         ms.suggested_price_inr,
         ms.suggested_price_usd,
         ms.suggested_min_price,
         ms.suggested_max_price,
         ms.country_pricing,
         ms.supported_pricing_models,
         ms.pricing_model AS default_pricing_model,
         ms.duration_minutes,
         ms.duration_unit,
         c.name AS category_name
       FROM master_services ms
       LEFT JOIN categories c ON c.id = ms.category_id
       WHERE ms.is_active = true
         AND ($1 = ANY(COALESCE(ms.countries, '{"IN","US"}')) OR ms.countries IS NULL)
         AND (ms.business_profile_id IS NULL OR ms.business_profile_id = $2)
       ORDER BY ms.name ASC LIMIT 200`,
      [countryCode.toUpperCase(), Number(businessId)]
    );

    return NextResponse.json({
      success: true,
      services: bsRes.rows,
      masterCatalog: msRes.rows,
      countryCode,
    });
  } catch (err: unknown) {
    console.error("[GET /api/business/services] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load business services" },
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
    const businessId = Number(body.businessId);
    const id = body.id ? Number(body.id) : null;
    const masterServiceId = body.masterServiceId ? Number(body.masterServiceId) : null;
    const customTitle = body.customTitle?.trim();
    const customDescription = body.customDescription?.trim() || null;
    const customImageUrl = body.customImageUrl?.trim() || null;
    const price = body.price !== undefined ? Number(body.price) : 0;
    const minPrice = body.minPrice !== undefined && body.minPrice !== null ? Number(body.minPrice) : null;
    const maxPrice = body.maxPrice !== undefined && body.maxPrice !== null ? Number(body.maxPrice) : null;
    const currency = body.currency || "INR";
    const pricingModel = body.pricingModel || "fixed_price";
    const durationMinutes = parseInt(body.durationMinutes || "60", 10);
    const remoteDelivery = body.remoteDelivery !== undefined ? Boolean(body.remoteDelivery) : true;
    const onsiteDelivery = body.onsiteDelivery !== undefined ? Boolean(body.onsiteDelivery) : true;
    const serviceAreas = Array.isArray(body.serviceAreas) ? body.serviceAreas : [];
    const isActive = body.isActive !== false;

    if (!businessId) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    }

    // Verify ownership
    const catalogScope = await getUserCatalogScope(db, user);
    const hasAccess =
      catalogScope.isSuperAdmin ||
      catalogScope.businessProfileIds.includes(businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Business not found or unauthorized" }, { status: 403 });
    }

    if (id) {
      // Update existing provider service
      await db.query(
        `UPDATE business_services
         SET 
           custom_title = COALESCE($1, custom_title),
           custom_description = $2,
           custom_image_url = $3,
           price = $4,
           min_price = $5,
           max_price = $6,
           currency = $7,
           pricing_model = $8,
           duration_minutes = $9,
           remote_delivery = $10,
           onsite_delivery = $11,
           service_areas = $12,
           is_active = $13,
           updated_at = NOW()
         WHERE id = $14 AND business_id = $15`,
        [
          customTitle, customDescription, customImageUrl,
          price, minPrice, maxPrice, currency, pricingModel,
          durationMinutes, remoteDelivery, onsiteDelivery, serviceAreas,
          isActive, id, businessId
        ]
      );

      return NextResponse.json({ success: true, message: "Service updated successfully" });
    } else {
      // Insert new provider service
      // Populate defaults from master service if custom title/description not supplied
      let finalTitle = customTitle;
      let finalDesc = customDescription;
      let finalModel = pricingModel;
      let finalDuration = durationMinutes;

      if (masterServiceId) {
        const ms = await db.query(`SELECT name, description, duration_minutes, pricing_model FROM master_services WHERE id = $1`, [masterServiceId]);
        if (ms.rows[0]) {
          if (!finalTitle) finalTitle = ms.rows[0].name;
          if (!finalDesc) finalDesc = ms.rows[0].description;
          if (!body.pricingModel && ms.rows[0].pricing_model) finalModel = ms.rows[0].pricing_model;
          if (!body.durationMinutes && ms.rows[0].duration_minutes) finalDuration = ms.rows[0].duration_minutes;
        }
      }

      const res = await db.query(
        `INSERT INTO business_services (
           business_id, master_service_id, custom_title, custom_description,
           custom_image_url, price, min_price, max_price, currency,
           pricing_model, duration_minutes, remote_delivery, onsite_delivery, service_areas,
           is_active, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9,
           $10, $11, $12, $13, $14,
           $15, NOW(), NOW()
         ) RETURNING id`,
        [
          businessId, masterServiceId, finalTitle || "Service", finalDesc,
          customImageUrl, price, minPrice, maxPrice, currency,
          finalModel, finalDuration, remoteDelivery, onsiteDelivery, serviceAreas,
          isActive
        ]
      );

      return NextResponse.json({ success: true, message: "Service added successfully", id: res.rows[0].id });
    }
  } catch (err: unknown) {
    console.error("[POST /api/business/services] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save service" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    const businessId = Number(searchParams.get("businessId"));

    if (!id || !businessId) {
      return NextResponse.json({ error: "Service id and businessId are required" }, { status: 400 });
    }

    // Verify ownership
    const catalogScope = await getUserCatalogScope(db, user);
    const hasAccess =
      catalogScope.isSuperAdmin ||
      catalogScope.businessProfileIds.includes(businessId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Business not found or unauthorized" }, { status: 403 });
    }

    await db.query(`DELETE FROM business_services WHERE id = $1 AND business_id = $2`, [id, businessId]);

    return NextResponse.json({ success: true, message: "Service removed successfully" });
  } catch (err: unknown) {
    console.error("[DELETE /api/business/services] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete service" },
      { status: 500 }
    );
  }
}
