import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

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
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const dietType = searchParams.get("diet_type");
    const status = searchParams.get("status");
    const institutionIdParam = searchParams.get("institution_id");

    const isPlatformAdmin = Boolean(
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

    if (institutionId) {
      params.push(institutionId);
      conditions.push(`(d.institution_id = $${params.length} OR d.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.title ILIKE $${params.length} OR d.category ILIKE $${params.length} OR d.ingredients ILIKE $${params.length})`);
    }

    if (category && category !== "all") {
      params.push(category);
      conditions.push(`d.category = $${params.length}`);
    }

    if (dietType && dietType !== "all") {
      params.push(dietType);
      conditions.push(`d.diet_type = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT d.*
      FROM marketing_dishes d
      ${whereClause}
      ORDER BY d.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS available,
        COUNT(CASE WHEN diet_type = 'veg' THEN 1 END)::int AS veg,
        COUNT(CASE WHEN diet_type = 'non_veg' THEN 1 END)::int AS non_veg
      FROM marketing_dishes d
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, available: 0, veg: 0, non_veg: 0 };

    return NextResponse.json({
      success: true,
      dishes: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/marketing/dishes error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch dishes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      category,
      diet_type,
      price,
      sale_price,
      preparation_time,
      portion_size,
      spice_level,
      calories,
      dietary_tags,
      ingredients,
      image_url,
      description,
      status,
      is_featured,
      institution_id,
      business_profile_id,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Dish title is required" }, { status: 400 });
    }

    const slug = `${slugify(title)}-${Date.now().toString().slice(-4)}`;
    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);

    const query = `
      INSERT INTO marketing_dishes (
        institution_id,
        business_profile_id,
        created_by,
        title,
        slug,
        category,
        diet_type,
        price,
        sale_price,
        preparation_time,
        portion_size,
        spice_level,
        calories,
        dietary_tags,
        ingredients,
        image_url,
        description,
        status,
        is_featured,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      title.trim(),
      slug,
      category || "Main Course",
      diet_type || "veg",
      price ? Number(price) : 0,
      sale_price ? Number(sale_price) : null,
      preparation_time || null,
      portion_size || null,
      spice_level || "Medium",
      calories || null,
      JSON.stringify(Array.isArray(dietary_tags) ? dietary_tags : []),
      ingredients || null,
      image_url || null,
      description || null,
      status || "available",
      Boolean(is_featured),
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      dish: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/marketing/dishes error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create dish" }, { status: 500 });
  }
}
