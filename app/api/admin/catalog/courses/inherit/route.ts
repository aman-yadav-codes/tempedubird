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
    const businessProfileId = catalogScope.primaryBusinessId;
    const institutionId = catalogScope.primaryInstitutionId;

    // Find which master courses this seller/institution has already inherited
    const inheritedRes = await db.query<{ master_course_id: number }>(
      `SELECT DISTINCT master_course_id 
       FROM institution_courses 
       WHERE master_course_id IS NOT NULL 
       AND (
         ($1::int IS NOT NULL AND business_profile_id = $1)
         OR ($2::int IS NOT NULL AND institution_id = $2)
       )`,
      [businessProfileId || null, institutionId || null]
    );

    const inheritedIds = new Set(inheritedRes.rows.map((r) => r.master_course_id));

    let query = `
      SELECT 
        mc.id,
        mc.name,
        mc.slug,
        mc.code,
        mc.category_id,
        c.name AS category_name,
        mc.authority_type,
        mc.university_name,
        mc.duration_value,
        mc.duration_unit,
        mc.seats_available,
        mc.description,
        mc.thumbnail_url,
        mc.icon_url,
        mc.is_active,
        mc.created_at
      FROM master_courses mc
      LEFT JOIN categories c ON c.id = mc.category_id
      WHERE COALESCE(mc.is_deleted, false) = false
        AND COALESCE(mc.is_active, true) = true
    `;

    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      query += ` AND (
        mc.name ILIKE $${pIdx} 
        OR COALESCE(mc.code, '') ILIKE $${pIdx} 
        OR COALESCE(mc.university_name, '') ILIKE $${pIdx}
        OR COALESCE(mc.description, '') ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (categoryId && !isNaN(Number(categoryId)) && Number(categoryId) > 0) {
      query += ` AND mc.category_id = $${pIdx}`;
      params.push(Number(categoryId));
      pIdx++;
    }

    query += ` ORDER BY mc.name ASC LIMIT 200`;

    const res = await db.query(query, params);

    const courses = res.rows.map((row: any) => ({
      ...row,
      duration: `${row.duration_value || 1} ${row.duration_unit || "Year"}`,
      already_inherited: inheritedIds.has(row.id),
    }));

    return NextResponse.json({
      success: true,
      courses,
      count: courses.length,
    });
  } catch (error: any) {
    console.error("[Master Courses Inherit GET Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch master courses for inheritance" },
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
    const { master_course_ids = [], custom_fees = {} } = body;

    if (!Array.isArray(master_course_ids) || master_course_ids.length === 0) {
      return NextResponse.json({ error: "No master courses selected for inheritance" }, { status: 400 });
    }

    const catalogScope = await getUserCatalogScope(db, user);
    const businessProfileId = catalogScope.primaryBusinessId;
    const institutionId = catalogScope.primaryInstitutionId;

    if (!institutionId && !businessProfileId) {
      return NextResponse.json({ error: "No active institution or business profile found to inherit courses into" }, { status: 400 });
    }

    // Fetch master courses
    const mcRes = await db.query(
      `SELECT 
        mc.*,
        c.name AS category_name
       FROM master_courses mc
       LEFT JOIN categories c ON c.id = mc.category_id
       WHERE mc.id = ANY($1)`,
      [master_course_ids]
    );

    const masterCourses = mcRes.rows;
    if (masterCourses.length === 0) {
      return NextResponse.json({ error: "No matching master courses found" }, { status: 404 });
    }

    let insertedCount = 0;

    for (const mc of masterCourses) {
      // Check if already inherited
      const existingCheck = await db.query(
        `SELECT id FROM institution_courses 
         WHERE master_course_id = $1 
         AND (
           ($2::int IS NOT NULL AND business_profile_id = $2)
           OR ($3::int IS NOT NULL AND institution_id = $3)
         ) LIMIT 1`,
        [mc.id, businessProfileId || null, institutionId || null]
      );

      if (existingCheck.rows.length === 0) {
        const fee = custom_fees[mc.id] !== undefined && custom_fees[mc.id] !== null && Number(custom_fees[mc.id]) >= 0
          ? Number(custom_fees[mc.id])
          : 0;

        const durationStr = `${mc.duration_value || 1} ${mc.duration_unit || "Year"}`;
        const baseSlug = slugify(mc.name || `course-${mc.id}`);
        const courseSlug = `${baseSlug}-${businessProfileId || institutionId || Date.now().toString().slice(-4)}`;

        await db.query(
          `INSERT INTO institution_courses (
            institution_id,
            business_profile_id,
            master_course_id,
            course_name,
            slug,
            code,
            stream,
            category_id,
            board_or_university,
            duration,
            fee_amount,
            price,
            seats_available,
            description,
            thumbnail_url,
            icon_url,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true, NOW(), NOW()
          )`,
          [
            institutionId || null,
            businessProfileId || null,
            mc.id,
            mc.name,
            courseSlug,
            mc.code || null,
            mc.category_name || "General",
            mc.category_id || null,
            mc.university_name || (mc.authority_type ? mc.authority_type.toUpperCase() : "Autonomous"),
            durationStr,
            fee,
            fee > 0 ? `₹${fee.toLocaleString("en-IN")}` : "Free",
            mc.seats_available || 60,
            mc.description || null,
            mc.thumbnail_url || null,
            mc.icon_url || null,
          ]
        );
        insertedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully inherited ${insertedCount} course(s) into your catalog!`,
      inheritedCount: insertedCount,
    });
  } catch (error: any) {
    console.error("[Master Courses Inherit POST Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to inherit courses" },
      { status: 500 }
    );
  }
}
