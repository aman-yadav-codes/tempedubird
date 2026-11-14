import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's professional profile
    const ppCheck = await db.query(
      `SELECT id, country_code FROM professional_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (!ppCheck.rows[0]) {
      return NextResponse.json({ error: "Professional profile not found" }, { status: 404 });
    }
    const professionalId = ppCheck.rows[0].id;
    const countryCode = ppCheck.rows[0].country_code || "IN";

    // Services of this professional
    const psRes = await db.query(
      `SELECT 
         ps.*,
         COALESCE(ps.custom_image_url, ms.default_image_url) AS effective_image_url,
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
       FROM professional_services ps
       LEFT JOIN master_services ms ON ms.id = ps.master_service_id
       LEFT JOIN categories c ON c.id = ms.category_id
       WHERE ps.professional_id = $1
       ORDER BY ps.id DESC`,
      [professionalId]
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
         AND (
           (ms.professional_profile_id IS NULL AND ms.business_profile_id IS NULL)
           OR ms.professional_profile_id = $2
         )
       ORDER BY ms.name ASC LIMIT 200`,
      [countryCode.toUpperCase(), professionalId]
    );

    return NextResponse.json({
      success: true,
      services: psRes.rows,
      masterCatalog: msRes.rows,
      professionalId,
      countryCode,
    });
  } catch (err: unknown) {
    console.error("[GET /api/professional/services] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load professional services" },
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

    // Find user's professional profile
    const ppCheck = await db.query(
      `SELECT id FROM professional_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (!ppCheck.rows[0]) {
      return NextResponse.json({ error: "Professional profile not found" }, { status: 404 });
    }
    const professionalId = ppCheck.rows[0].id;

    const body = await req.json();
    const id = body.id ? Number(body.id) : null;
    const masterServiceId = body.masterServiceId ? Number(body.masterServiceId) : null;
    const customTitle = body.customTitle?.trim();
    const customDescription = body.customDescription?.trim() || null;
    const customImageUrl = body.customImageUrl?.trim() || null;
    const price = body.price !== undefined ? Number(body.price) : 0;
    const minPrice = body.minPrice !== undefined && body.minPrice !== null ? Number(body.minPrice) : null;
    const maxPrice = body.maxPrice !== undefined && body.maxPrice !== null ? Number(body.maxPrice) : null;
    const hourlyRate = body.hourlyRate !== undefined ? Number(body.hourlyRate) : (price || 0);
    const fixedPrice = body.fixedPrice !== undefined ? Number(body.fixedPrice) : (price || 0);
    const currency = body.currency || "INR";
    const pricingModel = body.pricingModel || "hourly";
    const durationMinutes = parseInt(body.durationMinutes || "60", 10);
    const remoteDelivery = body.remoteDelivery !== undefined ? Boolean(body.remoteDelivery) : true;
    const onsiteDelivery = body.onsiteDelivery !== undefined ? Boolean(body.onsiteDelivery) : true;
    const serviceAreas = Array.isArray(body.serviceAreas) ? body.serviceAreas : [];
    const experienceLevel = body.experienceLevel?.trim() || null;
    const isAvailable = body.isAvailable !== false;

    if (id) {
      // Update
      await db.query(
        `UPDATE professional_services
         SET 
           custom_title = COALESCE($1, custom_title),
           custom_description = $2,
           custom_image_url = $3,
           hourly_rate = $4,
           fixed_price = $5,
           price = $6,
           min_price = $7,
           max_price = $8,
           currency = $9,
           pricing_model = $10,
           duration_minutes = $11,
           remote_delivery = $12,
           onsite_delivery = $13,
           service_areas = $14,
           experience_level = $15,
           is_available = $16,
           updated_at = NOW()
         WHERE id = $17 AND professional_id = $18`,
        [
          customTitle, customDescription, customImageUrl,
          hourlyRate, fixedPrice, price, minPrice, maxPrice,
          currency, pricingModel, durationMinutes,
          remoteDelivery, onsiteDelivery, serviceAreas,
          experienceLevel, isAvailable, id, professionalId
        ]
      );

      return NextResponse.json({ success: true, message: "Professional service updated successfully" });
    } else {
      // Insert
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
        `INSERT INTO professional_services (
           professional_id, master_service_id, custom_title, custom_description,
           custom_image_url, hourly_rate, fixed_price, price, min_price, max_price,
           currency, pricing_model, duration_minutes, remote_delivery, onsite_delivery, service_areas,
           experience_level, is_available, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16,
           $17, $18, NOW(), NOW()
         ) RETURNING id`,
        [
          professionalId, masterServiceId, finalTitle || "Professional Service", finalDesc,
          customImageUrl, hourlyRate, fixedPrice, price, minPrice, maxPrice,
          currency, finalModel, finalDuration, remoteDelivery, onsiteDelivery, serviceAreas,
          experienceLevel, isAvailable
        ]
      );

      return NextResponse.json({ success: true, message: "Service added to profile successfully", id: res.rows[0].id });
    }
  } catch (err: unknown) {
    console.error("[POST /api/professional/services] error:", err);
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

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    // Verify ownership
    const ppCheck = await db.query(
      `SELECT id FROM professional_profiles WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );
    if (!ppCheck.rows[0]) {
      return NextResponse.json({ error: "Professional profile not found" }, { status: 404 });
    }
    const professionalId = ppCheck.rows[0].id;

    await db.query(`DELETE FROM professional_services WHERE id = $1 AND professional_id = $2`, [id, professionalId]);

    return NextResponse.json({ success: true, message: "Service removed from profile successfully" });
  } catch (err: unknown) {
    console.error("[DELETE /api/professional/services] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete service" },
      { status: 500 }
    );
  }
}
