import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    let query = `
      SELECT 
        bp.*,
        c.name AS category_name,
        sc.name AS subcategory_name,
        (SELECT COUNT(*)::INT FROM business_products WHERE business_id = bp.id) AS products_count,
        (SELECT COUNT(*)::INT FROM business_services WHERE business_id = bp.id) AS services_count,
        (SELECT COUNT(*)::INT FROM customer_inquiries WHERE business_id = bp.id) AS enquiries_count,
        (SELECT COUNT(*)::INT FROM platform_reviews WHERE business_id = bp.id) AS reviews_count,
        (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM platform_reviews WHERE business_id = bp.id) AS avg_rating
      FROM business_profiles bp
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN categories sc ON sc.id = bp.subcategory_id
      WHERE bp.user_id = $1
    `;
    const params: any[] = [user.id];

    if (businessId) {
      query += ` AND bp.id = $2`;
      params.push(Number(businessId));
    }
    query += ` ORDER BY bp.id DESC`;

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: res.rows,
      profile: res.rows[0] || null,
    });
  } catch (err: unknown) {
    console.error("[GET /api/business/profile] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load business profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const id = body.id ? Number(body.id) : null;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Check if profile exists and belongs to user
      let profileId = id;
      if (profileId) {
        const check = await client.query(
          `SELECT id FROM business_profiles WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [profileId, user.id]
        );
        if (!check.rows[0]) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Business profile not found" }, { status: 404 });
        }

        await client.query(
          `UPDATE business_profiles
           SET 
             name = $1,
             business_type = $2,
             phone = $3,
             email = $4,
             website = $5,
             whatsapp = $6,
             about = $7,
             custom_description = $8,
             established_year = $9,
             country_code = $10,
             state = $11,
             city = $12,
             locality = $13,
             address = $14,
             postal_code = $15,
             category_id = $16,
             subcategory_id = $17,
             logo_url = $18,
             banner_url = $19,
             gallery_images = $20,
             opening_hours = $21,
             holidays = $22,
             social_links = $23,
             branches = $24,
             latitude = $25,
             longitude = $26,
             updated_at = NOW()
           WHERE id = $27`,
          [
            name,
            body.business_type || "Business",
            body.phone || null,
            body.email || null,
            body.website || null,
            body.whatsapp || null,
            body.about || null,
            body.custom_description || body.about || null,
            body.established_year ? Number(body.established_year) : null,
            body.country_code || "IN",
            body.state || null,
            body.city || null,
            body.locality || null,
            body.address || null,
            body.postal_code || null,
            body.category_id ? Number(body.category_id) : null,
            body.subcategory_id ? Number(body.subcategory_id) : null,
            body.logo_url || null,
            body.banner_url || null,
            body.gallery_images || [],
            JSON.stringify(body.opening_hours || {}),
            JSON.stringify(body.holidays || []),
            JSON.stringify(body.social_links || {}),
            JSON.stringify(body.branches || []),
            body.latitude ? Number(body.latitude) : null,
            body.longitude ? Number(body.longitude) : null,
            profileId,
          ]
        );
      } else {
        // Create new
        const rawSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        let candidateSlug = rawSlug || "business";
        let suffix = 1;
        while (true) {
          const chk = await client.query(`SELECT id FROM business_profiles WHERE slug = $1 LIMIT 1`, [candidateSlug]);
          if (chk.rows.length === 0) break;
          candidateSlug = `${rawSlug}-${suffix++}`;
        }

        const insertRes = await client.query(
          `INSERT INTO business_profiles (
             user_id, name, slug, business_type, phone, email, website, whatsapp,
             about, custom_description, established_year, country_code, state, city,
             locality, address, postal_code, category_id, subcategory_id,
             logo_url, banner_url, gallery_images, opening_hours, holidays, social_links, branches,
             latitude, longitude, is_active, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14,
             $15, $16, $17, $18, $19,
             $20, $21, $22, $23, $24, $25, $26,
             $27, $28, true, NOW(), NOW()
           ) RETURNING id`,
          [
            user.id,
            name,
            candidateSlug,
            body.business_type || "Business",
            body.phone || null,
            body.email || null,
            body.website || null,
            body.whatsapp || null,
            body.about || null,
            body.custom_description || body.about || null,
            body.established_year ? Number(body.established_year) : null,
            body.country_code || "IN",
            body.state || null,
            body.city || null,
            body.locality || null,
            body.address || null,
            body.postal_code || null,
            body.category_id ? Number(body.category_id) : null,
            body.subcategory_id ? Number(body.subcategory_id) : null,
            body.logo_url || null,
            body.banner_url || null,
            body.gallery_images || [],
            JSON.stringify(body.opening_hours || {}),
            JSON.stringify(body.holidays || []),
            JSON.stringify(body.social_links || {}),
            JSON.stringify(body.branches || []),
            body.latitude ? Number(body.latitude) : null,
            body.longitude ? Number(body.longitude) : null,
          ]
        );
        profileId = insertRes.rows[0].id;
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "Business profile saved successfully",
        id: profileId,
      });
    } catch (innerErr: unknown) {
      await client.query("ROLLBACK");
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("[PUT /api/business/profile] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save business profile" },
      { status: 500 }
    );
  }
}

