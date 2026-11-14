import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
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
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const categoryId = searchParams.get("category_id");
    const status = searchParams.get("status");
    const deliveryMode = searchParams.get("delivery_mode");
    const pricingModel = searchParams.get("pricing_model");
    const institutionIdParam = searchParams.get("institution_id");

    const isPlatformAdmin = Boolean(
      user?.id === 1 ||
      user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
      (user as any)?.role === "platform_admin" ||
      (user as any)?.is_super_admin
    );

    let institutionId: number | null = null;
    if (institutionIdParam && !isNaN(Number(institutionIdParam)) && institutionIdParam !== "all") {
      institutionId = Number(institutionIdParam);
    } else if (!isPlatformAdmin && user?.memberships?.length) {
      const instMem = user.memberships.find((m: any) => m.institution_id);
      if (instMem) institutionId = Number(instMem.institution_id);
    }

    const conditions: string[] = [];
    const params: any[] = [];

    // Tenant & Professional isolation
    if (user && !isPlatformAdmin) {
      const catalogScope = await getUserCatalogScope(db, user);
      if (catalogScope.isPureProfessional) {
        if (catalogScope.professionalProfileIds.length === 0) {
          return NextResponse.json({ services: [], stats: { total: 0, active: 0, avgPrice: 0, categoriesCount: 0 } });
        }
        params.push(catalogScope.professionalProfileIds);
        conditions.push(`s.professional_profile_id = ANY($${params.length})`);
      } else if (catalogScope.businessProfileIds.length > 0 || catalogScope.institutionIds.length > 0) {
        params.push(
          catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
          catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
          catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null
        );
        conditions.push(`(
          ($${params.length - 2}::int[] IS NOT NULL AND s.business_profile_id = ANY($${params.length - 2}))
          OR ($${params.length - 1}::int[] IS NOT NULL AND s.institution_id = ANY($${params.length - 1}))
          OR ($${params.length}::int[] IS NOT NULL AND s.professional_profile_id = ANY($${params.length}))
          OR (s.institution_id IS NULL AND s.business_profile_id IS NULL AND s.professional_profile_id IS NULL)
        )`);
      }
    } else if (institutionId) {
      params.push(institutionId);
      conditions.push(`(s.institution_id = $${params.length} OR s.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.title ILIKE $${params.length} OR s.description ILIKE $${params.length} OR s.badge_text ILIKE $${params.length})`);
    }

    if (categoryId && categoryId !== "all") {
      params.push(Number(categoryId));
      conditions.push(`s.category_id = $${params.length}`);
    } else if (category && category !== "all") {
      params.push(category);
      conditions.push(`s.category = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }

    if (deliveryMode && deliveryMode !== "all") {
      params.push(deliveryMode);
      conditions.push(`s.delivery_mode = $${params.length}`);
    }

    if (pricingModel && pricingModel !== "all") {
      params.push(pricingModel);
      conditions.push(`s.pricing_model = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT 
        s.*,
        sc.name AS category_name,
        sc.slug AS category_slug,
        sc.icon AS category_icon,
        (
          SELECT json_agg(json_build_object('id', prog.id, 'title', prog.title))
          FROM institution_programs prog
          WHERE prog.id IN (
            SELECT jsonb_array_elements_text(COALESCE(s.program_ids, '[]'::jsonb))::int
          )
        ) AS associated_programs
      FROM services s
      LEFT JOIN service_categories sc ON sc.id = s.category_id
      ${whereClause} 
      ORDER BY s.id DESC
    `;

    const res = await db.query(query, params);
    const services = res.rows;

    const totalServices = services.length;
    const activeServices = services.filter((s: any) => s.status === "active").length;
    const avgPrice = totalServices > 0
      ? Math.round(services.reduce((sum: number, s: any) => sum + parseFloat(s.price || 0), 0) / totalServices)
      : 0;

    const distinctCategories = new Set(services.map((s: any) => s.category || s.category_name).filter(Boolean));

    return NextResponse.json({
      services,
      stats: {
        total: totalServices,
        active: activeServices,
        avgPrice,
        categoriesCount: distinctCategories.size,
      },
    });
  } catch (error: any) {
    console.error("[Marketing Services GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch marketing services" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      price = 0,
      sale_price,
      category = "General",
      category_id,
      program_ids = [],
      image_url,
      gallery = [],
      badge_text,
      features = [],
      pricing_model = "fixed",
      duration_minutes = 60,
      duration_unit = "hours",
      delivery_mode = "online",
      service_location,
      status = "active",
      is_featured = false,
      institution_id: providedInstId,
      institution_name: providedInstName,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Service title is required" }, { status: 400 });
    }

    let slug = slugify(title);
    if (!slug) slug = `service-${Date.now()}`;

    const slugCheck = await db.query(`SELECT id FROM services WHERE slug = $1`, [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const catalogScope = await getUserCatalogScope(db, user);
    let institutionId = providedInstId ? Number(providedInstId) : catalogScope.primaryInstitutionId;
    let institutionName = providedInstName || (institutionId ? "Institute Services" : "EduBird Services");
    let businessProfileId = catalogScope.primaryBusinessId;
    let professionalProfileId = catalogScope.primaryProfessionalId;

    if (catalogScope.isPureProfessional) {
      businessProfileId = null;
      institutionId = null;
    }

    const res = await db.query(
      `INSERT INTO services (
        title,
        slug,
        description,
        price,
        sale_price,
        category,
        category_id,
        program_ids,
        image_url,
        gallery,
        institution_id,
        institution_name,
        business_profile_id,
        professional_profile_id,
        badge_text,
        features,
        pricing_model,
        duration_minutes,
        duration_unit,
        delivery_mode,
        service_location,
        status,
        is_featured,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, NOW(), NOW()
      ) RETURNING *`,
      [
        title.trim(),
        slug,
        description?.trim() || null,
        parseFloat(String(price)) || 0,
        sale_price !== undefined && sale_price !== null && sale_price !== "" ? parseFloat(String(sale_price)) : null,
        category || "General",
        category_id ? Number(category_id) : null,
        JSON.stringify(Array.isArray(program_ids) ? program_ids.map(Number).filter((pId: number) => !isNaN(pId) && pId > 0) : []),
        image_url?.trim() || null,
        JSON.stringify(gallery || []),
        institutionId,
        institutionName,
        businessProfileId,
        professionalProfileId,
        badge_text?.trim() || null,
        JSON.stringify(features || []),
        pricing_model || "fixed",
        parseInt(String(duration_minutes)) || 60,
        duration_unit || "hours",
        delivery_mode || "online",
        service_location?.trim() || null,
        status || "active",
        Boolean(is_featured),
        user?.id || null,
      ]
    );

    return NextResponse.json({ success: true, service: res.rows[0] });
  } catch (error: any) {
    console.error("[Marketing Services POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create service" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      title,
      description,
      price,
      sale_price,
      category,
      category_id,
      program_ids,
      image_url,
      gallery,
      badge_text,
      features,
      pricing_model,
      duration_minutes,
      duration_unit,
      delivery_mode,
      service_location,
      status,
      is_featured,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    // Verify ownership
    const isPlatformAdmin = Boolean(
      user.id === 1 ||
      user.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
      (user as any)?.role === "platform_admin" ||
      (user as any)?.is_super_admin
    );

    if (!isPlatformAdmin) {
      const catalogScope = await getUserCatalogScope(db, user);
      if (catalogScope.isPureProfessional) {
        const check = await db.query(
          `SELECT id FROM services WHERE id = $1 AND professional_profile_id = ANY($2) LIMIT 1`,
          [Number(id), catalogScope.professionalProfileIds]
        );
        if (check.rows.length === 0) {
          return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 403 });
        }
      } else {
        const check = await db.query(
          `SELECT id FROM services 
           WHERE id = $1 
             AND (
               ($2::int[] IS NOT NULL AND business_profile_id = ANY($2))
               OR ($3::int[] IS NOT NULL AND institution_id = ANY($3))
               OR ($4::int[] IS NOT NULL AND professional_profile_id = ANY($4))
               OR (created_by = $5)
             ) LIMIT 1`,
          [
            Number(id),
            catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
            catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
            catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
            user.id,
          ]
        );
        if (check.rows.length === 0) {
          return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 403 });
        }
      }
    }

    const res = await db.query(
      `UPDATE services SET
        title = $1,
        description = $2,
        price = $3,
        sale_price = $4,
        category = $5,
        category_id = $6,
        program_ids = $7,
        image_url = $8,
        gallery = $9,
        badge_text = $10,
        features = $11,
        pricing_model = $12,
        duration_minutes = $13,
        duration_unit = $14,
        delivery_mode = $15,
        service_location = $16,
        status = $17,
        is_featured = $18,
        updated_at = NOW()
      WHERE id = $19
      RETURNING *`,
      [
        title?.trim(),
        description?.trim() || null,
        parseFloat(String(price)) || 0,
        sale_price !== undefined && sale_price !== null && sale_price !== "" ? parseFloat(String(sale_price)) : null,
        category || "General",
        category_id ? Number(category_id) : null,
        program_ids ? JSON.stringify(Array.isArray(program_ids) ? program_ids.map(Number).filter((pId: number) => !isNaN(pId) && pId > 0) : []) : JSON.stringify([]),
        image_url?.trim() || null,
        JSON.stringify(gallery || []),
        badge_text?.trim() || null,
        JSON.stringify(features || []),
        pricing_model || "fixed",
        parseInt(String(duration_minutes)) || 60,
        duration_unit || "hours",
        delivery_mode || "online",
        service_location?.trim() || null,
        status || "active",
        Boolean(is_featured),
        id,
      ]
    );

    return NextResponse.json({ success: true, service: res.rows[0] });
  } catch (error: any) {
    console.error("[Marketing Services PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const isPlatformAdmin = Boolean(
      user.id === 1 ||
      user.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
      (user as any)?.role === "platform_admin" ||
      (user as any)?.is_super_admin
    );

    if (!isPlatformAdmin) {
      const catalogScope = await getUserCatalogScope(db, user);
      if (catalogScope.isPureProfessional) {
        const check = await db.query(
          `SELECT id FROM services WHERE id = $1 AND professional_profile_id = ANY($2) LIMIT 1`,
          [Number(id), catalogScope.professionalProfileIds]
        );
        if (check.rows.length === 0) {
          return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 403 });
        }
      } else {
        const check = await db.query(
          `SELECT id FROM services 
           WHERE id = $1 
             AND (
               ($2::int[] IS NOT NULL AND business_profile_id = ANY($2))
               OR ($3::int[] IS NOT NULL AND institution_id = ANY($3))
               OR ($4::int[] IS NOT NULL AND professional_profile_id = ANY($4))
               OR (created_by = $5)
             ) LIMIT 1`,
          [
            Number(id),
            catalogScope.businessProfileIds.length ? catalogScope.businessProfileIds : null,
            catalogScope.institutionIds.length ? catalogScope.institutionIds : null,
            catalogScope.professionalProfileIds.length ? catalogScope.professionalProfileIds : null,
            user.id,
          ]
        );
        if (check.rows.length === 0) {
          return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 403 });
        }
      }
    }

    await db.query(`DELETE FROM services WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Service deleted successfully" });
  } catch (error: any) {
    console.error("[Marketing Services DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete service" }, { status: 500 });
  }
}

