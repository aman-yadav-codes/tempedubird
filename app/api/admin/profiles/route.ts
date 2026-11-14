import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // business, professional, or null
    const search = searchParams.get("search")?.trim().toLowerCase();
    const country = searchParams.get("country");
    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const categoryId = searchParams.get("categoryId");
    const businessProfileId = searchParams.get("businessProfileId");
    const status = searchParams.get("status"); // active, inactive, pending, verified, featured
    const checkDuplicates = searchParams.get("checkDuplicates") === "true";

    // Duplicate Detection Mode
    if (checkDuplicates) {
      const dups = await db.query(`
        SELECT 
          LOWER(TRIM(name)) as norm_name,
          LOWER(TRIM(COALESCE(city, ''))) as norm_city,
          phone,
          COUNT(*) as count,
          array_agg(id ORDER BY id ASC) as listing_ids,
          array_agg(name ORDER BY id ASC) as listing_names
        FROM business_profiles
        WHERE is_active = TRUE
        GROUP BY norm_name, norm_city, phone
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 50
      `);

      return NextResponse.json({
        success: true,
        duplicates: dups.rows,
      });
    }

    // Business profiles query
    const bWhere: string[] = ["1=1"];
    const bParams: any[] = [];
    let bIdx = 1;

    if (search) {
      bWhere.push(`(
        LOWER(bp.name) LIKE $${bIdx} OR
        LOWER(COALESCE(bp.phone, '')) LIKE $${bIdx} OR
        LOWER(COALESCE(bp.email, '')) LIKE $${bIdx} OR
        LOWER(COALESCE(bp.city, '')) LIKE $${bIdx} OR
        LOWER(COALESCE(u.full_name, '')) LIKE $${bIdx}
      )`);
      bParams.push(`%${search}%`);
      bIdx++;
    }

    if (country && country !== "all") {
      bWhere.push(`bp.country_code = $${bIdx++}`);
      bParams.push(country.toUpperCase());
    }
    if (state) {
      bWhere.push(`LOWER(bp.state) = $${bIdx++}`);
      bParams.push(state.toLowerCase());
    }
    if (city) {
      bWhere.push(`LOWER(bp.city) = $${bIdx++}`);
      bParams.push(city.toLowerCase());
    }
    if (categoryId) {
      bWhere.push(`(bp.category_id = $${bIdx} OR bp.subcategory_id = $${bIdx})`);
      bParams.push(Number(categoryId));
      bIdx++;
    }
    if (status === "active") {
      bWhere.push(`bp.is_active = TRUE`);
    } else if (status === "inactive") {
      bWhere.push(`bp.is_active = FALSE`);
    } else if (status === "pending") {
      bWhere.push(`bp.verification_status = 'pending'`);
    } else if (status === "verified") {
      bWhere.push(`bp.is_verified = TRUE`);
    } else if (status === "featured") {
      bWhere.push(`bp.is_featured = TRUE`);
    }

    const businessQuery = `
      SELECT
        bp.id,
        bp.name,
        bp.slug,
        bp.business_type,
        bp.phone,
        bp.whatsapp,
        bp.email,
        bp.website,
        bp.city,
        bp.district,
        bp.state,
        bp.country_code,
        bp.locality,
        bp.address,
        bp.postal_code,
        bp.latitude,
        bp.longitude,
        bp.category_id,
        bp.subcategory_id,
        bp.subcategory_ids,
        bp.about,
        bp.custom_description,
        bp.established_year,
        bp.is_active,
        bp.is_verified,
        bp.verification_status,
        bp.is_featured,
        bp.logo_url,
        bp.banner_url,
        bp.gallery_images,
        bp.opening_hours,
        bp.holidays,
        bp.social_links,
        bp.branches,
        bp.created_at,
        bp.updated_at,
        c.name as category_name,
        subc.name as subcategory_name,
        u.id AS owner_id,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.phone AS owner_phone,
        COALESCE((SELECT COUNT(*)::int FROM business_products bprod WHERE bprod.business_profile_id = bp.id OR bprod.business_id = bp.id), 0) +
        COALESCE((SELECT COUNT(*)::int FROM products p WHERE p.institution_id = bp.institution_profile_id), 0) as products_count,
        COALESCE((SELECT COUNT(*)::int FROM business_services bserv WHERE bserv.business_id = bp.id), 0) as services_count,
        (SELECT COUNT(*)::int FROM professional_profiles pp WHERE pp.business_profile_id = bp.id) as professionals_count,
        COALESCE((SELECT COUNT(*)::int FROM entity_reviews er WHERE er.institution_id = bp.institution_profile_id OR (er.entity_type = 'business' AND er.entity_id = bp.id)), 0) as reviews_count,
        COALESCE((SELECT AVG(er.rating)::numeric(2,1) FROM entity_reviews er WHERE er.institution_id = bp.institution_profile_id OR (er.entity_type = 'business' AND er.entity_id = bp.id)), 0) as average_rating
      FROM business_profiles bp
      LEFT JOIN users u ON u.id = bp.user_id
      LEFT JOIN categories c ON c.id = bp.category_id
      LEFT JOIN categories subc ON subc.id = bp.subcategory_id
      WHERE ${bWhere.join(" AND ")}
      ORDER BY bp.created_at DESC
      LIMIT 100
    `;

    // Professional profiles query
    const pWhere: string[] = ["1=1"];
    const pParams: any[] = [];
    let pIdx = 1;

    if (search) {
      pWhere.push(`(
        LOWER(pp.name) LIKE $${pIdx} OR
        LOWER(COALESCE(pp.phone, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(pp.email, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(pp.city, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(pp.professional_title, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(u.full_name, '')) LIKE $${pIdx}
      )`);
      pParams.push(`%${search}%`);
      pIdx++;
    }

    if (country && country !== "all") {
      pWhere.push(`pp.country_code = $${pIdx++}`);
      pParams.push(country.toUpperCase());
    }
    if (state) {
      pWhere.push(`LOWER(pp.state) = $${pIdx++}`);
      pParams.push(state.toLowerCase());
    }
    if (city) {
      pWhere.push(`LOWER(pp.city) = $${pIdx++}`);
      pParams.push(city.toLowerCase());
    }
    if (categoryId) {
      pWhere.push(`(pp.category_id = $${pIdx} OR pp.subcategory_id = $${pIdx})`);
      pParams.push(Number(categoryId));
      pIdx++;
    }
    if (businessProfileId) {
      pWhere.push(`pp.business_profile_id = $${pIdx++}`);
      pParams.push(Number(businessProfileId));
    }
    if (status === "active") {
      pWhere.push(`pp.is_active = TRUE`);
    } else if (status === "inactive") {
      pWhere.push(`pp.is_active = FALSE`);
    } else if (status === "pending") {
      pWhere.push(`pp.verification_status = 'pending'`);
    } else if (status === "verified") {
      pWhere.push(`pp.is_verified = TRUE`);
    } else if (status === "featured") {
      pWhere.push(`pp.is_featured = TRUE`);
    }

    const profQuery = `
      SELECT
        pp.id,
        pp.name,
        pp.slug,
        pp.professional_title,
        pp.profession_type,
        pp.phone,
        pp.whatsapp,
        pp.email,
        pp.website,
        pp.city,
        pp.district,
        pp.state,
        pp.country_code,
        pp.locality,
        pp.address,
        pp.postal_code,
        pp.latitude,
        pp.longitude,
        pp.about,
        pp.introduction,
        pp.experience_years,
        pp.qualifications,
        pp.certifications,
        pp.working_hours,
        pp.category_id,
        pp.subcategory_id,
        pp.subcategory_ids,
        pp.is_active,
        pp.is_verified,
        pp.verification_status,
        pp.is_featured,
        pp.avatar_url,
        pp.banner_url,
        pp.portfolio_images,
        pp.remote_available,
        pp.onsite_available,
        pp.service_areas,
        pp.business_profile_id,
        bp.name as business_name,
        bp.slug as business_slug,
        pp.designation,
        pp.skills,
        pp.created_at,
        pp.updated_at,
        c.name as category_name,
        subc.name as subcategory_name,
        u.id AS owner_id,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.phone AS owner_phone,
        COALESCE((SELECT COUNT(*)::int FROM professional_services ps WHERE ps.professional_id = pp.id), 0) as services_count,
        COALESCE((SELECT COUNT(*)::int FROM entity_reviews er WHERE er.entity_type = 'professional' AND er.entity_id = pp.id), 0) as reviews_count,
        COALESCE((SELECT AVG(er.rating)::numeric(2,1) FROM entity_reviews er WHERE er.entity_type = 'professional' AND er.entity_id = pp.id), 0) as average_rating
      FROM professional_profiles pp
      LEFT JOIN users u ON u.id = pp.user_id
      LEFT JOIN business_profiles bp ON bp.id = pp.business_profile_id
      LEFT JOIN categories c ON c.id = pp.category_id
      LEFT JOIN categories subc ON subc.id = pp.subcategory_id
      WHERE ${pWhere.join(" AND ")}
      ORDER BY pp.created_at DESC
      LIMIT 100
    `;

    const [businessRes, profRes] = await Promise.all([
      type === "professional" ? Promise.resolve({ rows: [] }) : db.query(businessQuery, bParams),
      type === "business" ? Promise.resolve({ rows: [] }) : db.query(profQuery, pParams),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        businessProfiles: businessRes.rows,
        professionalProfiles: profRes.rows,
        totalBusinesses: businessRes.rows.length,
        totalProfessionals: profRes.rows.length,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/profiles] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load profiles" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, id, action, isVerified, isFeatured, isActive, verificationStatus, data } = body;

    if (!type || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }

    const table = type === "business" ? "business_profiles" : "professional_profiles";
    const targetId = Number(id);

    if (action === "verify") {
      await db.query(`UPDATE ${table} SET is_verified = $1, updated_at = NOW() WHERE id = $2`, [
        Boolean(isVerified),
        targetId,
      ]);
    } else if (action === "feature") {
      await db.query(`UPDATE ${table} SET is_featured = $1, updated_at = NOW() WHERE id = $2`, [
        Boolean(isFeatured),
        targetId,
      ]);
    } else if (action === "toggle_status") {
      await db.query(`UPDATE ${table} SET is_active = $1, updated_at = NOW() WHERE id = $2`, [
        Boolean(isActive),
        targetId,
      ]);
    } else if (action === "approve") {
      await db.query(
        `UPDATE ${table} SET verification_status = 'approved', is_verified = TRUE, updated_at = NOW() WHERE id = $1`,
        [targetId]
      );
    } else if (action === "reject") {
      await db.query(
        `UPDATE ${table} SET verification_status = 'rejected', is_verified = FALSE, updated_at = NOW() WHERE id = $1`,
        [targetId]
      );
    } else if (action === "edit" && data) {
      const updates: string[] = ["updated_at = NOW()"];
      const params: any[] = [];
      let idx = 1;

      for (const [k, v] of Object.entries(data)) {
        updates.push(`${k} = $${idx++}`);
        params.push(v);
      }
      params.push(targetId);
      await db.query(`UPDATE ${table} SET ${updates.join(", ")} WHERE id = $${idx}`, params);
    }

    return NextResponse.json({ success: true, message: "Listing updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, primaryListingId, duplicateListingId } = body;

    // Merge Duplicates Safely
    if (action === "merge_duplicates") {
      if (!primaryListingId || !duplicateListingId) {
        return NextResponse.json({ error: "primaryListingId and duplicateListingId are required" }, { status: 400 });
      }

      const pId = Number(primaryListingId);
      const dId = Number(duplicateListingId);

      // Re-link related tables from duplicate to primary
      await db.query(`UPDATE business_products SET business_profile_id = $1 WHERE business_profile_id = $2`, [pId, dId]).catch(() => {});
      await db.query(`UPDATE business_services SET business_id = $1 WHERE business_id = $2`, [pId, dId]).catch(() => {});
      await db.query(`UPDATE customer_favorites SET business_id = $1 WHERE business_id = $2`, [pId, dId]).catch(() => {});
      await db.query(`UPDATE customer_inquiries SET business_id = $1 WHERE business_id = $2`, [pId, dId]).catch(() => {});
      await db.query(`UPDATE platform_reviews SET business_id = $1 WHERE business_id = $2`, [pId, dId]).catch(() => {});
      await db.query(`UPDATE listing_reports SET business_id = $1 WHERE business_id = $2`, [pId, dId]).catch(() => {});

      // Deactivate duplicate listing and mark as merged
      await db.query(
        `UPDATE business_profiles 
         SET is_active = FALSE, name = name || ' [Merged into #' || $1 || ']', updated_at = NOW()
         WHERE id = $2`,
        [pId, dId]
      );

      return NextResponse.json({
        success: true,
        message: `Listing #${dId} successfully merged into primary Listing #${pId}`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process profile action" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // business or professional
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }

    const targetId = Number(id);
    const table = type === "business" ? "business_profiles" : "professional_profiles";

    // Check active listings / products
    if (type === "business") {
      await db.query(`DELETE FROM business_products WHERE business_profile_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM business_services WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM customer_favorites WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM customer_inquiries WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM platform_reviews WHERE business_id = $1`, [targetId]).catch(() => {});
    } else {
      await db.query(`DELETE FROM professional_services WHERE professional_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM platform_reviews WHERE professional_id = $1`, [targetId]).catch(() => {});
    }

    await db.query(`DELETE FROM ${table} WHERE id = $1`, [targetId]);

    return NextResponse.json({
      success: true,
      message: `${type === "business" ? "Business listing" : "Professional profile"} deleted successfully`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete profile" },
      { status: 500 }
    );
  }
}
