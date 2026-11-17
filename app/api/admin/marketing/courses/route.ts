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
    const categoryId = searchParams.get("category_id");
    const status = searchParams.get("status");

    const catalogScope = await getUserCatalogScope(db, user);
    const businessProfileId = catalogScope.primaryBusinessId;
    const institutionId = catalogScope.primaryInstitutionId;

    let query = `
      SELECT 
        ic.id,
        ic.institution_id,
        ic.business_profile_id,
        ic.master_course_id,
        ic.course_name,
        ic.slug,
        ic.code,
        ic.stream,
        ic.category_id,
        c.name AS category_name,
        ic.board_or_university,
        ic.duration,
        ic.price,
        COALESCE(ic.fee_amount, 0) AS fee_amount,
        ic.eligibility,
        ic.description,
        ic.thumbnail_url,
        ic.icon_url,
        ic.seats_available,
        ic.is_active,
        ic.created_at,
        ic.updated_at
      FROM institution_courses ic
      LEFT JOIN categories c ON c.id = ic.category_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let pIdx = 1;

    // Filter by seller / institution scope
    if (businessProfileId && institutionId) {
      query += ` AND (ic.business_profile_id = $${pIdx} OR ic.institution_id = $${pIdx + 1})`;
      params.push(businessProfileId, institutionId);
      pIdx += 2;
    } else if (businessProfileId) {
      query += ` AND ic.business_profile_id = $${pIdx}`;
      params.push(businessProfileId);
      pIdx++;
    } else if (institutionId) {
      query += ` AND ic.institution_id = $${pIdx}`;
      params.push(institutionId);
      pIdx++;
    }

    if (search) {
      query += ` AND (
        ic.course_name ILIKE $${pIdx}
        OR COALESCE(ic.code, '') ILIKE $${pIdx}
        OR COALESCE(ic.board_or_university, '') ILIKE $${pIdx}
        OR COALESCE(ic.stream, '') ILIKE $${pIdx}
      )`;
      params.push(`%${search}%`);
      pIdx++;
    }

    if (categoryId && categoryId !== "all" && !isNaN(Number(categoryId))) {
      query += ` AND ic.category_id = $${pIdx}`;
      params.push(Number(categoryId));
      pIdx++;
    }

    if (status && status !== "all") {
      query += ` AND ic.is_active = $${pIdx}`;
      params.push(status === "active");
      pIdx++;
    }

    query += ` ORDER BY ic.is_active DESC, ic.id DESC`;

    const res = await db.query(query, params);
    const courses = res.rows;

    // Calculate stats
    const total = courses.length;
    const active = courses.filter((c: any) => c.is_active).length;
    const uniqueCats = new Set(courses.map((c: any) => c.category_name || c.stream).filter(Boolean));
    const totalFees = courses.reduce((acc: number, c: any) => acc + Number(c.fee_amount || 0), 0);
    const avgFee = total > 0 ? Math.round(totalFees / total) : 0;

    // Extract categories
    const categoriesMap = new Map<string, any>();
    courses.forEach((c: any) => {
      const name = c.category_name || c.stream || "General";
      categoriesMap.set(name, { id: c.category_id || 0, name });
    });

    return NextResponse.json({
      success: true,
      courses,
      stats: {
        total,
        active,
        categoriesCount: uniqueCats.size,
        avgFee,
      },
      categories: Array.from(categoriesMap.values()),
    });
  } catch (error: any) {
    console.error("[Marketing Courses GET Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch marketing courses" },
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

    const catalogScope = await getUserCatalogScope(db, user);
    const businessProfileId = catalogScope.primaryBusinessId;
    const institutionId = catalogScope.primaryInstitutionId;

    if (!institutionId && !businessProfileId) {
      return NextResponse.json({ error: "No active business profile or institution found" }, { status: 400 });
    }

    const body = await req.json();
    const {
      course_name,
      code,
      stream,
      category_id,
      board_or_university,
      duration,
      fee_amount,
      seats_available,
      eligibility,
      description,
      thumbnail_url,
      is_active = true,
    } = body;

    if (!course_name || !course_name.trim()) {
      return NextResponse.json({ error: "Course name is required" }, { status: 400 });
    }

    const fee = Number(fee_amount) || 0;
    const baseSlug = slugify(course_name);
    const slug = `${baseSlug}-${businessProfileId || institutionId || Date.now().toString().slice(-4)}`;

    const insertRes = await db.query(
      `INSERT INTO institution_courses (
        institution_id,
        business_profile_id,
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
        eligibility,
        description,
        thumbnail_url,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      ) RETURNING *`,
      [
        institutionId || null,
        businessProfileId || null,
        course_name.trim(),
        slug,
        code?.trim() || null,
        stream?.trim() || "General",
        category_id ? Number(category_id) : null,
        board_or_university?.trim() || null,
        duration?.trim() || "1 Year",
        fee,
        fee > 0 ? `₹${fee.toLocaleString("en-IN")}` : "Free",
        Number(seats_available) || 60,
        eligibility?.trim() || null,
        description?.trim() || null,
        thumbnail_url?.trim() || null,
        Boolean(is_active),
      ]
    );

    return NextResponse.json({
      success: true,
      course: insertRes.rows[0],
      message: "Course created successfully!",
    });
  } catch (error: any) {
    console.error("[Marketing Courses POST Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create course" },
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
    const { id, is_active, course_name, fee_amount, duration, seats_available, description, thumbnail_url } = body;

    if (!id) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    // Quick status toggle
    if (is_active !== undefined && course_name === undefined) {
      const toggleRes = await db.query(
        `UPDATE institution_courses 
         SET is_active = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [Boolean(is_active), id]
      );
      return NextResponse.json({ success: true, course: toggleRes.rows[0] });
    }

    const fee = Number(fee_amount) || 0;

    const updateRes = await db.query(
      `UPDATE institution_courses
       SET course_name = COALESCE($1, course_name),
           fee_amount = $2,
           price = $3,
           duration = COALESCE($4, duration),
           seats_available = COALESCE($5, seats_available),
           description = COALESCE($6, description),
           thumbnail_url = COALESCE($7, thumbnail_url),
           is_active = COALESCE($8, is_active),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        course_name?.trim() || null,
        fee,
        fee > 0 ? `₹${fee.toLocaleString("en-IN")}` : "Free",
        duration?.trim() || null,
        Number(seats_available) || null,
        description?.trim() || null,
        thumbnail_url?.trim() || null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      course: updateRes.rows[0],
      message: "Course updated successfully!",
    });
  } catch (error: any) {
    console.error("[Marketing Courses PUT Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update course" },
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM institution_courses WHERE id = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: "Course removed from marketing catalog",
    });
  } catch (error: any) {
    console.error("[Marketing Courses DELETE Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete course" },
      { status: 500 }
    );
  }
}
