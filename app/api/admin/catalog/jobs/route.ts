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
    const search = searchParams.get("search")?.trim() || "";
    const businessCategoryId = searchParams.get("businessCategoryId");
    const professionalCategoryId = searchParams.get("professionalCategoryId");
    const roleId = searchParams.get("roleId");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit")) || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["COALESCE(mj.is_deleted, false) = false"];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        mj.title ILIKE $${params.length}
        OR COALESCE(mj.department, '') ILIKE $${params.length}
        OR COALESCE(mj.role_title, '') ILIKE $${params.length}
        OR COALESCE(mj.location, '') ILIKE $${params.length}
        OR COALESCE(mj.description, '') ILIKE $${params.length}
        OR array_to_string(COALESCE(mj.skills, '{}'), ' ') ILIKE $${params.length}
      )`);
    }

    if (businessCategoryId && businessCategoryId !== "all") {
      params.push(Number(businessCategoryId));
      conditions.push(`mj.business_category_id = $${params.length}`);
    }

    if (professionalCategoryId && professionalCategoryId !== "all") {
      params.push(Number(professionalCategoryId));
      conditions.push(`mj.professional_category_id = $${params.length}`);
    }

    if (roleId && roleId !== "all") {
      params.push(Number(roleId));
      conditions.push(`mj.role_id = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const countRes = await db.query(
      `SELECT COUNT(*) FROM master_jobs mj WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const dataQuery = `
      SELECT 
        mj.id,
        mj.title,
        mj.slug,
        mj.business_category_id,
        bc.name AS business_category_name,
        mj.professional_category_id,
        pc.name AS professional_category_name,
        mj.role_id,
        COALESCE(d.name, mj.role_title) AS role_name,
        mj.role_title,
        mj.department,
        COALESCE(mj.employment_type, 'Full-time') AS employment_type,
        COALESCE(mj.experience_level, 'Mid Level (3-5 yrs)') AS experience_level,
        COALESCE(mj.work_mode, 'On-site') AS work_mode,
        COALESCE(mj.location, 'All India / Multiple Locations') AS location,
        mj.salary_range,
        COALESCE(mj.openings_count, 1) AS openings_count,
        mj.description,
        mj.requirements,
        mj.benefits,
        COALESCE(mj.skills, '{}') AS skills,
        COALESCE(mj.is_active, true) AS is_active,
        COALESCE(mj.is_featured, false) AS is_featured,
        mj.created_at,
        mj.updated_at
      FROM master_jobs mj
      LEFT JOIN categories bc ON bc.id = mj.business_category_id
      LEFT JOIN categories pc ON pc.id = mj.professional_category_id
      LEFT JOIN designations d ON d.id = mj.role_id
      WHERE ${whereClause}
      ORDER BY mj.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await db.query(dataQuery, [...params, limit, offset]);

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        pageCount: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[master_jobs GET] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      slug,
      business_category_id,
      professional_category_id,
      role_id,
      role_title,
      department,
      employment_type = "Full-time",
      experience_level = "Mid Level (3-5 yrs)",
      work_mode = "On-site",
      location = "All India / Multiple Locations",
      salary_range,
      openings_count = 1,
      description,
      requirements,
      benefits,
      skills = [],
      is_active = true,
      is_featured = false,
    } = body;

    // Enforce 4-step hierarchy validation
    if (!business_category_id) {
      return NextResponse.json({ error: "Step 1: Business Category is required" }, { status: 400 });
    }
    if (!professional_category_id) {
      return NextResponse.json({ error: "Step 2: Professional Category is required" }, { status: 400 });
    }
    if (!role_id && !role_title?.trim()) {
      return NextResponse.json({ error: "Step 3: Professional Role / Designation is required" }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: "Step 4: Job Title is required" }, { status: 400 });
    }
    if (!department?.trim()) {
      return NextResponse.json({ error: "Department is required" }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    // Resolve role title from designations if role_id provided
    let resolvedRoleTitle = role_title?.trim() || "";
    if (role_id && !resolvedRoleTitle) {
      const dRes = await db.query("SELECT name FROM designations WHERE id = $1", [Number(role_id)]);
      if (dRes.rows.length > 0) {
        resolvedRoleTitle = dRes.rows[0].name;
      }
    }

    const cleanSlug =
      (slug?.trim() || title.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") +
      `-${Date.now().toString().slice(-4)}`;

    const skillArray = Array.isArray(skills)
      ? skills
      : typeof skills === "string"
        ? skills.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
        : [];

    const res = await db.query(
      `
      INSERT INTO master_jobs (
        title,
        slug,
        business_category_id,
        professional_category_id,
        role_id,
        role_title,
        department,
        employment_type,
        experience_level,
        work_mode,
        location,
        salary_range,
        openings_count,
        description,
        requirements,
        benefits,
        skills,
        is_active,
        is_featured,
        is_deleted
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, FALSE)
      RETURNING *
      `,
      [
        title.trim(),
        cleanSlug,
        Number(business_category_id),
        Number(professional_category_id),
        role_id ? Number(role_id) : null,
        resolvedRoleTitle || null,
        department.trim(),
        employment_type || "Full-time",
        experience_level || "Mid Level (3-5 yrs)",
        work_mode || "On-site",
        location?.trim() || "All India / Multiple Locations",
        salary_range?.trim() || null,
        openings_count ? Number(openings_count) : 1,
        description.trim(),
        requirements?.trim() || null,
        benefits?.trim() || null,
        skillArray,
        Boolean(is_active),
        Boolean(is_featured),
      ]
    );

    return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("[master_jobs POST] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      title,
      slug,
      business_category_id,
      professional_category_id,
      role_id,
      role_title,
      department,
      employment_type,
      experience_level,
      work_mode,
      location,
      salary_range,
      openings_count,
      description,
      requirements,
      benefits,
      skills,
      is_active,
      is_featured,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const skillArray = skills !== undefined
      ? (Array.isArray(skills)
          ? skills
          : typeof skills === "string"
            ? skills.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
            : [])
      : null;

    const res = await db.query(
      `
      UPDATE master_jobs
      SET
        title = COALESCE($1, title),
        slug = COALESCE($2, slug),
        business_category_id = COALESCE($3, business_category_id),
        professional_category_id = COALESCE($4, professional_category_id),
        role_id = COALESCE($5, role_id),
        role_title = COALESCE($6, role_title),
        department = COALESCE($7, department),
        employment_type = COALESCE($8, employment_type),
        experience_level = COALESCE($9, experience_level),
        work_mode = COALESCE($10, work_mode),
        location = COALESCE($11, location),
        salary_range = $12,
        openings_count = COALESCE($13, openings_count),
        description = COALESCE($14, description),
        requirements = $15,
        benefits = $16,
        skills = COALESCE($17, skills),
        is_active = COALESCE($18, is_active),
        is_featured = COALESCE($19, is_featured),
        updated_at = NOW()
      WHERE id = $20
      RETURNING *
      `,
      [
        title?.trim() || null,
        slug?.trim() || null,
        business_category_id ? Number(business_category_id) : null,
        professional_category_id ? Number(professional_category_id) : null,
        role_id ? Number(role_id) : null,
        role_title?.trim() || null,
        department?.trim() || null,
        employment_type || null,
        experience_level || null,
        work_mode || null,
        location?.trim() || null,
        salary_range !== undefined ? salary_range?.trim() : null,
        openings_count !== undefined ? Number(openings_count) : null,
        description !== undefined ? description?.trim() : null,
        requirements !== undefined ? requirements?.trim() : null,
        benefits !== undefined ? benefits?.trim() : null,
        skillArray,
        is_active !== undefined ? Boolean(is_active) : null,
        is_featured !== undefined ? Boolean(is_featured) : null,
        Number(id),
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Master Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    console.error("[master_jobs PUT] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.query(
      `UPDATE master_jobs SET is_deleted = TRUE, is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [Number(id)]
    );

    return NextResponse.json({ success: true, message: "Master Job deleted successfully" });
  } catch (err: any) {
    console.error("[master_jobs DELETE] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
