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
    const type = searchParams.get("type") || "business";
    const search = searchParams.get("search")?.trim().toLowerCase();
    const country = searchParams.get("country");
    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const categoryId = searchParams.get("categoryId");
    const businessProfileId = searchParams.get("businessProfileId");
    const status = searchParams.get("status");
    const checkDuplicates = searchParams.get("checkDuplicates") === "true";

    // Duplicate Detection Mode (for business profiles)
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

    // 1. Fetch live counts across all 11 verticals
    const countsRes = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM business_profiles) as business,
        (SELECT COUNT(*)::int FROM professional_profiles) as professional,
        (SELECT COUNT(*)::int FROM business_courses) as course,
        (SELECT COUNT(*)::int FROM staff_job_postings) as job,
        (SELECT COUNT(*)::int FROM business_products) as products,
        (SELECT COUNT(*)::int FROM business_services) as services,
        (SELECT COUNT(*)::int FROM business_records WHERE vertical_code = 'hotels' AND (is_deleted IS NULL OR is_deleted = FALSE)) as room,
        (SELECT COUNT(*)::int FROM business_records WHERE vertical_code = 'vehicles' AND (is_deleted IS NULL OR is_deleted = FALSE)) as vehicle,
        (SELECT COUNT(*)::int FROM business_records WHERE vertical_code = 'restaurants' AND (is_deleted IS NULL OR is_deleted = FALSE)) as dish,
        (SELECT COUNT(*)::int FROM business_records WHERE vertical_code = 'events' AND (is_deleted IS NULL OR is_deleted = FALSE)) as event,
        (SELECT COUNT(*)::int FROM business_records WHERE vertical_code = 'properties' AND (is_deleted IS NULL OR is_deleted = FALSE)) as property
    `);

    const counts = countsRes.rows[0] || {
      business: 0,
      professional: 0,
      course: 0,
      job: 0,
      products: 0,
      services: 0,
      room: 0,
      vehicle: 0,
      dish: 0,
      event: 0,
      property: 0,
    };

    let items: any[] = [];
    let businessProfiles: any[] = [];
    let professionalProfiles: any[] = [];

    // Helper for adding search conditions
    const where: string[] = ["1=1"];
    const params: any[] = [];
    let idx = 1;

    if (type === "business") {
      if (search) {
        where.push(`(
          LOWER(bp.name) LIKE $${idx} OR
          LOWER(COALESCE(bp.phone, '')) LIKE $${idx} OR
          LOWER(COALESCE(bp.email, '')) LIKE $${idx} OR
          LOWER(COALESCE(bp.city, '')) LIKE $${idx} OR
          LOWER(COALESCE(u.full_name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (country && country !== "all") {
        where.push(`bp.country_code = $${idx++}`);
        params.push(country.toUpperCase());
      }
      if (city) {
        where.push(`LOWER(bp.city) = $${idx++}`);
        params.push(city.toLowerCase());
      }
      if (categoryId) {
        where.push(`(bp.category_id = $${idx} OR bp.subcategory_id = $${idx})`);
        params.push(Number(categoryId));
        idx++;
      }
      if (status === "active") where.push(`bp.is_active = TRUE`);
      else if (status === "inactive") where.push(`bp.is_active = FALSE`);
      else if (status === "pending") where.push(`bp.verification_status = 'pending'`);
      else if (status === "verified") where.push(`bp.is_verified = TRUE`);
      else if (status === "featured") where.push(`bp.is_featured = TRUE`);

      const res = await db.query(`
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
        WHERE ${where.join(" AND ")}
        ORDER BY bp.created_at DESC
        LIMIT 100
      `, params);

      items = res.rows.map(r => ({ ...r, type: "business" }));
      businessProfiles = items;
    } else if (type === "professional") {
      if (search) {
        where.push(`(
          LOWER(pp.name) LIKE $${idx} OR
          LOWER(COALESCE(pp.phone, '')) LIKE $${idx} OR
          LOWER(COALESCE(pp.email, '')) LIKE $${idx} OR
          LOWER(COALESCE(pp.city, '')) LIKE $${idx} OR
          LOWER(COALESCE(pp.professional_title, '')) LIKE $${idx} OR
          LOWER(COALESCE(u.full_name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (country && country !== "all") {
        where.push(`pp.country_code = $${idx++}`);
        params.push(country.toUpperCase());
      }
      if (city) {
        where.push(`LOWER(pp.city) = $${idx++}`);
        params.push(city.toLowerCase());
      }
      if (status === "active") where.push(`pp.is_active = TRUE`);
      else if (status === "inactive") where.push(`pp.is_active = FALSE`);
      else if (status === "pending") where.push(`pp.verification_status = 'pending'`);
      else if (status === "verified") where.push(`pp.is_verified = TRUE`);
      else if (status === "featured") where.push(`pp.is_featured = TRUE`);

      const res = await db.query(`
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
          pp.about,
          pp.introduction,
          pp.experience_years,
          pp.qualifications,
          pp.certifications,
          pp.working_hours,
          pp.is_active,
          pp.is_verified,
          pp.verification_status,
          pp.is_featured,
          pp.avatar_url,
          pp.banner_url,
          pp.portfolio_images,
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
          COALESCE((SELECT COUNT(*)::int FROM professional_services ps WHERE ps.professional_id = pp.id), 0) as services_count,
          COALESCE((SELECT COUNT(*)::int FROM entity_reviews er WHERE er.entity_type = 'professional' AND er.entity_id = pp.id), 0) as reviews_count,
          COALESCE((SELECT AVG(er.rating)::numeric(2,1) FROM entity_reviews er WHERE er.entity_type = 'professional' AND er.entity_id = pp.id), 0) as average_rating
        FROM professional_profiles pp
        LEFT JOIN users u ON u.id = pp.user_id
        LEFT JOIN business_profiles bp ON bp.id = pp.business_profile_id
        LEFT JOIN categories c ON c.id = pp.category_id
        LEFT JOIN categories subc ON subc.id = pp.subcategory_id
        WHERE ${where.join(" AND ")}
        ORDER BY pp.created_at DESC
        LIMIT 100
      `, params);

      items = res.rows.map(r => ({ ...r, type: "professional" }));
      professionalProfiles = items;
    } else if (type === "course") {
      if (search) {
        where.push(`(
          LOWER(bc.course_name) LIKE $${idx} OR
          LOWER(COALESCE(bc.stream, '')) LIKE $${idx} OR
          LOWER(COALESCE(bc.board_or_university, '')) LIKE $${idx} OR
          LOWER(COALESCE(bp.name, ip.name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (status === "active") where.push(`bc.is_active = TRUE`);
      else if (status === "inactive") where.push(`bc.is_active = FALSE`);

      const res = await db.query(`
        SELECT
          bc.id,
          bc.course_name as name,
          bc.stream as category_name,
          bc.board_or_university as subcategory_name,
          bc.duration,
          COALESCE(bc.price, bc.fee_amount::text) as price,
          bc.fee_amount,
          bc.eligibility,
          bc.description,
          bc.seats_available,
          bc.is_active,
          bc.created_at,
          COALESCE(bp.name, ip.name) as business_name,
          COALESCE(bp.city, 'India') as city,
          COALESCE(bp.phone, ip.phone) as phone
        FROM business_courses bc
        LEFT JOIN institution_profiles ip ON ip.id = bc.institution_id
        LEFT JOIN business_profiles bp ON bp.institution_profile_id = bc.institution_id
        WHERE ${where.join(" AND ")}
        ORDER BY bc.created_at DESC
        LIMIT 100
      `, params);

      items = res.rows.map(r => ({ ...r, type: "course" }));
    } else if (type === "job") {
      if (search) {
        where.push(`(
          LOWER(sjp.title) LIKE $${idx} OR
          LOWER(COALESCE(sjp.department, '')) LIKE $${idx} OR
          LOWER(COALESCE(sjp.location, '')) LIKE $${idx} OR
          LOWER(COALESCE(bp.name, ip.name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (status === "active") where.push(`sjp.status IN ('published', 'active', 'open')`);
      else if (status === "inactive") where.push(`sjp.status NOT IN ('published', 'active', 'open')`);

      const res = await db.query(`
        SELECT
          sjp.id,
          sjp.title as name,
          sjp.slug,
          sjp.department as category_name,
          sjp.employment_type as subcategory_name,
          sjp.experience_level,
          sjp.work_mode,
          sjp.location as city,
          sjp.salary_range as price,
          sjp.openings_count,
          sjp.status,
          (CASE WHEN sjp.status IN ('published', 'active', 'open') THEN TRUE ELSE FALSE END) as is_active,
          sjp.description,
          sjp.created_at,
          COALESCE(bp.name, ip.name) as business_name,
          COALESCE(bp.phone, ip.phone) as phone
        FROM staff_job_postings sjp
        LEFT JOIN institution_profiles ip ON ip.id = sjp.institution_id
        LEFT JOIN business_profiles bp ON bp.institution_profile_id = sjp.institution_id
        WHERE ${where.join(" AND ")}
        ORDER BY sjp.created_at DESC
        LIMIT 100
      `, params);

      items = res.rows.map(r => ({ ...r, type: "job" }));
    } else if (type === "products") {
      if (search) {
        where.push(`(
          LOWER(bprod.custom_name) LIKE $${idx} OR
          LOWER(COALESCE(bprod.sku, '')) LIKE $${idx} OR
          LOWER(COALESCE(bp.name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (status === "active") where.push(`bprod.is_available = TRUE`);
      else if (status === "inactive") where.push(`bprod.is_available = FALSE`);

      const res = await db.query(`
        SELECT
          bprod.id,
          bprod.custom_name as name,
          bprod.sku as subtitle,
          bprod.custom_description as description,
          bprod.custom_image_url as image_url,
          bprod.price,
          bprod.currency,
          bprod.inventory_count as stock,
          bprod.in_stock,
          bprod.is_available as is_active,
          bprod.created_at,
          bp.name as business_name,
          bp.city,
          bp.phone,
          c.name as category_name
        FROM business_products bprod
        LEFT JOIN business_profiles bp ON (bp.id = bprod.business_profile_id OR bp.id = bprod.business_id)
        LEFT JOIN master_products mp ON mp.id = bprod.master_product_id
        LEFT JOIN categories c ON c.id = mp.category_id
        WHERE ${where.join(" AND ")}
        ORDER BY bprod.created_at DESC
        LIMIT 100
      `, params);

      items = res.rows.map(r => ({ ...r, type: "products" }));
    } else if (type === "services") {
      if (search) {
        where.push(`(
          LOWER(bserv.custom_title) LIKE $${idx} OR
          LOWER(COALESCE(bp.name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (status === "active") where.push(`bserv.is_active = TRUE`);
      else if (status === "inactive") where.push(`bserv.is_active = FALSE`);

      const res = await db.query(`
        SELECT
          bserv.id,
          bserv.custom_title as name,
          bserv.custom_description as description,
          bserv.custom_image_url as image_url,
          COALESCE(bserv.price, bserv.min_price) as price,
          bserv.currency,
          bserv.duration_minutes as duration,
          bserv.is_active,
          bserv.created_at,
          bp.name as business_name,
          bp.city,
          bp.phone,
          c.name as category_name
        FROM business_services bserv
        LEFT JOIN business_profiles bp ON bp.id = bserv.business_id
        LEFT JOIN master_services ms ON ms.id = bserv.master_service_id
        LEFT JOIN categories c ON c.id = ms.category_id
        WHERE ${where.join(" AND ")}
        ORDER BY bserv.created_at DESC
        LIMIT 100
      `, params);

      items = res.rows.map(r => ({ ...r, type: "services" }));
    } else if (["room", "vehicle", "dish", "event", "property"].includes(type)) {
      // Map tab type to vertical_code
      const verticalCodeMap: Record<string, string> = {
        room: "hotels",
        vehicle: "vehicles",
        dish: "restaurants",
        event: "events",
        property: "properties",
      };
      const vCode = verticalCodeMap[type];

      where.push(`br.vertical_code = $${idx++}`);
      params.push(vCode);
      where.push(`(br.is_deleted IS NULL OR br.is_deleted = FALSE)`);

      if (search) {
        where.push(`(
          LOWER(br.title) LIKE $${idx} OR
          LOWER(COALESCE(br.description, '')) LIKE $${idx} OR
          LOWER(COALESCE(bp.name, '')) LIKE $${idx}
        )`);
        params.push(`%${search}%`);
        idx++;
      }
      if (status === "active") where.push(`br.is_active = TRUE`);
      else if (status === "inactive") where.push(`br.is_active = FALSE`);
      else if (status === "featured") where.push(`br.is_featured = TRUE`);

      let query = "";
      if (type === "room") {
        query = `
          SELECT
            br.id,
            br.title as name,
            hr.room_number as subtitle,
            br.slug,
            br.description,
            COALESCE(hr.price_per_night, br.price) as price,
            br.currency,
            br.featured_image as image_url,
            br.status,
            br.is_active,
            br.is_featured,
            br.metadata,
            br.created_at,
            c.name as category_name,
            subc.name as subcategory_name,
            bp.name as business_name,
            bp.city,
            bp.phone,
            hr.max_adults,
            hr.max_children,
            hr.number_of_beds,
            hr.amenities
          FROM business_records br
          LEFT JOIN hotel_rooms hr ON hr.record_id = br.id
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${where.join(" AND ")}
          ORDER BY br.created_at DESC
          LIMIT 100
        `;
      } else if (type === "dish") {
        query = `
          SELECT
            br.id,
            br.title as name,
            d.portion_size as subtitle,
            br.slug,
            br.description,
            br.price,
            d.discounted_price,
            br.currency,
            br.featured_image as image_url,
            br.status,
            br.is_active,
            br.is_featured,
            br.metadata,
            br.created_at,
            c.name as category_name,
            subc.name as subcategory_name,
            bp.name as business_name,
            bp.city,
            bp.phone,
            d.spice_level,
            d.prep_time_minutes,
            d.is_available
          FROM business_records br
          LEFT JOIN dishes d ON d.record_id = br.id
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${where.join(" AND ")}
          ORDER BY br.created_at DESC
          LIMIT 100
        `;
      } else if (type === "event") {
        query = `
          SELECT
            br.id,
            br.title as name,
            e.venue_name as subtitle,
            br.slug,
            br.description,
            br.price,
            br.currency,
            br.featured_image as image_url,
            br.status,
            br.is_active,
            br.is_featured,
            br.metadata,
            br.created_at,
            c.name as category_name,
            subc.name as subcategory_name,
            bp.name as business_name,
            COALESCE(e.city, bp.city) as city,
            bp.phone,
            e.start_date,
            e.end_date,
            e.start_time,
            e.end_time,
            e.is_free,
            e.organizer_name
          FROM business_records br
          LEFT JOIN events e ON e.record_id = br.id
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${where.join(" AND ")}
          ORDER BY br.created_at DESC
          LIMIT 100
        `;
      } else {
        // vehicle or property
        query = `
          SELECT
            br.id,
            br.title as name,
            br.slug,
            br.description,
            br.price,
            br.currency,
            br.featured_image as image_url,
            br.status,
            br.is_active,
            br.is_featured,
            br.metadata,
            br.created_at,
            c.name as category_name,
            subc.name as subcategory_name,
            bp.name as business_name,
            bp.city,
            bp.phone
          FROM business_records br
          LEFT JOIN business_profiles bp ON bp.id = br.business_id
          LEFT JOIN categories c ON c.id = br.category_id
          LEFT JOIN categories subc ON subc.id = br.subcategory_id
          WHERE ${where.join(" AND ")}
          ORDER BY br.created_at DESC
          LIMIT 100
        `;
      }

      const res = await db.query(query, params);
      items = res.rows.map(r => ({ ...r, type }));
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        items,
        counts,
        businessProfiles,
        professionalProfiles,
        totalBusinesses: counts.business,
        totalProfessionals: counts.professional,
      },
    });
  } catch (err: unknown) {
    console.error("[GET /api/admin/profiles] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load listings" },
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
    const { type, id, action, isVerified, isFeatured, isActive, data } = body;

    if (!type || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }

    const targetId = Number(id);

    if (type === "business" || type === "professional") {
      const table = type === "business" ? "business_profiles" : "professional_profiles";

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
    } else if (type === "course") {
      if (action === "toggle_status") {
        await db.query(`UPDATE business_courses SET is_active = $1, updated_at = NOW() WHERE id = $2`, [
          Boolean(isActive),
          targetId,
        ]);
      }
    } else if (type === "job") {
      if (action === "toggle_status") {
        const newStatus = isActive ? "published" : "closed";
        await db.query(`UPDATE staff_job_postings SET status = $1, updated_at = NOW() WHERE id = $2`, [
          newStatus,
          targetId,
        ]);
      }
    } else if (type === "products") {
      if (action === "toggle_status") {
        await db.query(`UPDATE business_products SET is_available = $1, in_stock = $1, updated_at = NOW() WHERE id = $2`, [
          Boolean(isActive),
          targetId,
        ]);
      }
    } else if (type === "services") {
      if (action === "toggle_status") {
        await db.query(`UPDATE business_services SET is_active = $1, updated_at = NOW() WHERE id = $2`, [
          Boolean(isActive),
          targetId,
        ]);
      }
    } else if (["room", "vehicle", "dish", "event", "property"].includes(type)) {
      if (action === "toggle_status") {
        await db.query(`UPDATE business_records SET is_active = $1, updated_at = NOW() WHERE id = $2`, [
          Boolean(isActive),
          targetId,
        ]);
      } else if (action === "feature") {
        await db.query(`UPDATE business_records SET is_featured = $1, updated_at = NOW() WHERE id = $2`, [
          Boolean(isFeatured),
          targetId,
        ]);
      }
    }

    return NextResponse.json({ success: true, message: "Listing updated successfully" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update listing" },
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
      { error: err instanceof Error ? err.message : "Failed to process listing action" },
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
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ error: "type and id are required" }, { status: 400 });
    }

    const targetId = Number(id);

    if (type === "business") {
      await db.query(`DELETE FROM business_products WHERE business_profile_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM business_services WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM customer_favorites WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM customer_inquiries WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM platform_reviews WHERE business_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM business_profiles WHERE id = $1`, [targetId]);
    } else if (type === "professional") {
      await db.query(`DELETE FROM professional_services WHERE professional_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM platform_reviews WHERE professional_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM professional_profiles WHERE id = $1`, [targetId]);
    } else if (type === "course") {
      await db.query(`DELETE FROM business_courses WHERE id = $1`, [targetId]);
    } else if (type === "job") {
      await db.query(`DELETE FROM staff_job_postings WHERE id = $1`, [targetId]);
    } else if (type === "products") {
      await db.query(`DELETE FROM business_products WHERE id = $1`, [targetId]);
    } else if (type === "services") {
      await db.query(`DELETE FROM business_services WHERE id = $1`, [targetId]);
    } else if (["room", "vehicle", "dish", "event", "property"].includes(type)) {
      if (type === "room") await db.query(`DELETE FROM hotel_rooms WHERE record_id = $1`, [targetId]).catch(() => {});
      if (type === "dish") await db.query(`DELETE FROM dishes WHERE record_id = $1`, [targetId]).catch(() => {});
      if (type === "event") await db.query(`DELETE FROM events WHERE record_id = $1`, [targetId]).catch(() => {});
      await db.query(`DELETE FROM business_records WHERE id = $1`, [targetId]);
    }

    return NextResponse.json({
      success: true,
      message: `Listing #${targetId} deleted successfully`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete listing" },
      { status: 500 }
    );
  }
}
