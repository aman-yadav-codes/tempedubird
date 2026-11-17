import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await db.query(
      `SELECT 
         pp.*,
         c.name AS category_name,
         sc.name AS subcategory_name,
         (SELECT COUNT(*)::INT FROM professional_services WHERE professional_id = pp.id) AS services_count,
         (SELECT COUNT(*)::INT FROM customer_inquiries WHERE professional_id = pp.id) AS enquiries_count,
         (SELECT COUNT(*)::INT FROM platform_reviews WHERE professional_id = pp.id) AS reviews_count,
         (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM platform_reviews WHERE professional_id = pp.id) AS avg_rating
       FROM professional_profiles pp
       LEFT JOIN categories c ON c.id = pp.category_id
       LEFT JOIN categories sc ON sc.id = pp.subcategory_id
       WHERE pp.user_id = $1
       ORDER BY pp.id DESC LIMIT 1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      profile: res.rows[0] || null,
    });
  } catch (err: unknown) {
    console.error("[GET /api/professional/profile] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load professional profile" },
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
      return NextResponse.json({ error: "Professional name is required" }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      let profileId = id;
      if (profileId) {
        const check = await client.query(
          `SELECT id FROM professional_profiles WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [profileId, user.id]
        );
        if (!check.rows[0]) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Professional profile not found" }, { status: 404 });
        }

        await client.query(
          `UPDATE professional_profiles
           SET 
             name = $1,
             professional_title = $2,
             profession_type = $3,
             phone = $4,
             email = $5,
             website = $6,
             whatsapp = $7,
             about = $8,
             experience_years = $9,
             country_code = $10,
             state = $11,
             city = $12,
             locality = $13,
             address = $14,
             postal_code = $15,
             category_id = $16,
             subcategory_id = $17,
             avatar_url = $18,
             banner_url = $19,
             qualifications = $20,
             certifications = $21,
             portfolio_images = $22,
             working_hours = $23,
             service_areas = $24,
             remote_available = $25,
             onsite_available = $26,
             latitude = $27,
             longitude = $28,
             updated_at = NOW()
           WHERE id = $29`,
          [
            name,
            body.professional_title || null,
            body.profession_type || body.professional_title || "Professional",
            body.phone || null,
            body.email || null,
            body.website || null,
            body.whatsapp || null,
            body.about || null,
            body.experience_years ? Number(body.experience_years) : 0,
            body.country_code || "IN",
            body.state || null,
            body.city || null,
            body.locality || null,
            body.address || null,
            body.postal_code || null,
            body.category_id ? Number(body.category_id) : null,
            body.subcategory_id ? Number(body.subcategory_id) : null,
            body.avatar_url || null,
            body.banner_url || null,
            JSON.stringify(body.qualifications || []),
            JSON.stringify(body.certifications || []),
            body.portfolio_images || [],
            JSON.stringify(body.working_hours || {}),
            body.service_areas || [],
            body.remote_available !== false,
            body.onsite_available !== false,
            body.latitude ? Number(body.latitude) : null,
            body.longitude ? Number(body.longitude) : null,
            profileId,
          ]
        );
      } else {
        // Insert new
        const rawSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        let candidateSlug = rawSlug || "pro";
        let suffix = 1;
        while (true) {
          const chk = await client.query(`SELECT id FROM professional_profiles WHERE slug = $1 LIMIT 1`, [candidateSlug]);
          if (chk.rows.length === 0) break;
          candidateSlug = `${rawSlug}-${suffix++}`;
        }

        const insertRes = await client.query(
          `INSERT INTO professional_profiles (
             user_id, name, slug, professional_title, profession_type,
             phone, email, website, whatsapp, about, experience_years,
             country_code, state, city, locality, address, postal_code,
             category_id, subcategory_id, avatar_url, banner_url,
             qualifications, certifications, portfolio_images, working_hours,
             service_areas, remote_available, onsite_available,
             latitude, longitude, is_active, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10, $11,
             $12, $13, $14, $15, $16, $17,
             $18, $19, $20, $21,
             $22, $23, $24, $25,
             $26, $27, $28,
             $29, $30, true, NOW(), NOW()
           ) RETURNING id`,
          [
            user.id,
            name,
            candidateSlug,
            body.professional_title || null,
            body.profession_type || body.professional_title || "Professional",
            body.phone || null,
            body.email || null,
            body.website || null,
            body.whatsapp || null,
            body.about || null,
            body.experience_years ? Number(body.experience_years) : 0,
            body.country_code || "IN",
            body.state || null,
            body.city || null,
            body.locality || null,
            body.address || null,
            body.postal_code || null,
            body.category_id ? Number(body.category_id) : null,
            body.subcategory_id ? Number(body.subcategory_id) : null,
            body.avatar_url || null,
            body.banner_url || null,
            JSON.stringify(body.qualifications || []),
            JSON.stringify(body.certifications || []),
            body.portfolio_images || [],
            JSON.stringify(body.working_hours || {}),
            body.service_areas || [],
            body.remote_available !== false,
            body.onsite_available !== false,
            body.latitude ? Number(body.latitude) : null,
            body.longitude ? Number(body.longitude) : null,
          ]
        );
        profileId = insertRes.rows[0].id;
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message: "Professional profile saved successfully",
        id: profileId,
      });
    } catch (innerErr: unknown) {
      await client.query("ROLLBACK");
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error("[PUT /api/professional/profile] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save professional profile" },
      { status: 500 }
    );
  }
}

