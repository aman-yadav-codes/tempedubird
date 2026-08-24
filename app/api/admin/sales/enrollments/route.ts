import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const { limit, offset, page } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const institutionIdParam = url.searchParams.get("institutionId") || req.headers.get("x-institution-id");
    let institutionId: number | null = null;

    const isPlatformAdmin = Boolean(
      user?.role_codes?.includes("super_admin") ||
      user?.role_codes?.includes("platform_admin") ||
      user?.role_codes?.includes("admin")
    );

    const whereClauses: string[] = ["COALESCE(se.is_deleted, FALSE) = FALSE"];
    const params: unknown[] = [];

    if (institutionIdParam && !isNaN(Number(institutionIdParam)) && institutionIdParam !== "all") {
      institutionId = Number(institutionIdParam);
      params.push(institutionId);
      whereClauses.push(`se.institution_id = $${params.length}`);
    } else if (institutionIdParam === "all" || isPlatformAdmin) {
      // Fetch all student enrollments across institutions
    } else if (user?.memberships?.length > 0) {
      const instIds = user.memberships
        .map((m: any) => Number(m.institution_id))
        .filter((id: number) => !isNaN(id) && id > 0);

      if (instIds.length === 1) {
        params.push(instIds[0]);
        whereClauses.push(`se.institution_id = $${params.length}`);
      } else if (instIds.length > 1) {
        params.push(instIds);
        whereClauses.push(`se.institution_id = ANY($${params.length}::int[])`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        u.full_name ILIKE $${params.length} OR 
        u.email ILIKE $${params.length} OR 
        u.phone ILIKE $${params.length} OR 
        prog.title ILIKE $${params.length} OR 
        ip.name ILIKE $${params.length}
      )`);
    }

    if (status && status !== "all") {
      params.push(status);
      whereClauses.push(`se.status = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM student_enrollments se
      INNER JOIN student_profiles sp ON sp.id = se.student_id
      INNER JOIN users u ON u.id = sp.user_id
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
      ${whereSql}
    `;

    const dataQuery = `
      SELECT
        se.id AS enrollment_id,
        se.status AS enrollment_status,
        se.admission_date,
        se.created_at,
        u.id AS user_id,
        COALESCE(u.full_name, 'Student Lead') AS student_name,
        COALESCE(u.email, '') AS student_email,
        COALESCE(u.phone, '') AS student_phone,
        sp.id AS student_profile_id,
        sp.admission_number,
        prog.id AS program_id,
        COALESCE(prog.title, 'Enrolled Academic Program') AS program_title,
        prog.slug AS program_slug,
        ('PRG-' || COALESCE(prog.id, se.program_id)::text) AS program_code,
        prog.duration_value,
        prog.duration_unit,
        prog.seats_available,
        prog.teaching_method,
        CASE 
          WHEN prog.duration_value IS NOT NULL AND prog.duration_unit IS NOT NULL 
          THEN CONCAT(prog.duration_value, ' ', prog.duration_unit)
          ELSE '1 Year'
        END AS program_duration,
        COALESCE(prog.fee_amount, 25000) AS program_fee,
        (
          SELECT string_agg(l.name, ', ' ORDER BY l.name)
          FROM program_languages pl
          JOIN languages l ON l.id = pl.language_id
          WHERE pl.program_id = prog.id
        ) AS languages,
        (
          SELECT json_agg(
            json_build_object(
              'id', pfc.id,
              'title', pfc.title,
              'amount', pfc.amount,
              'unit', pfc.fee_unit,
              'payment_mode', pfc.payment_mode,
              'discount_type', pfc.discount_type,
              'discount_value', pfc.discount_value,
              'final_amount', pfc.final_amount,
              'installments_count', pfc.installments_count
            ) ORDER BY pfc.sort_order ASC
          )
          FROM program_fee_components pfc
          WHERE pfc.program_id = prog.id
        ) AS fee_components,
        se.institution_id,
        COALESCE(ip.name, ip.slug, 'Institution') AS institution_name,
        ip.slug AS institution_slug
      FROM student_enrollments se
      INNER JOIN student_profiles sp ON sp.id = se.student_id
      INNER JOIN users u ON u.id = sp.user_id
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
      ${whereSql}
      ORDER BY se.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Summary Statistics Query
    const statsWhere = institutionId ? `WHERE se.institution_id = ${Number(institutionId)} AND COALESCE(se.is_deleted, FALSE) = FALSE` : `WHERE COALESCE(se.is_deleted, FALSE) = FALSE`;
    const statsQuery = `
      SELECT 
        COUNT(*)::int AS total_enrollments,
        COUNT(CASE WHEN se.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::int AS enrollments_this_month,
        COUNT(CASE WHEN se.status = 'active' OR se.status = 'confirmed' THEN 1 END)::int AS active_count,
        COALESCE(SUM(COALESCE(prog.fee_amount::numeric, 25000)), 0) AS total_revenue_value
      FROM student_enrollments se
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      ${statsWhere}
    `;

    const [countRes, dataRes, statsRes] = await Promise.all([
      db.query<{ total: number }>(countQuery, params),
      db.query(dataQuery, [...params, limit, offset]),
      db.query(statsQuery),
    ]);

    const total = countRes.rows[0]?.total || 0;
    const stats = statsRes.rows[0] || {
      total_enrollments: 0,
      enrollments_this_month: 0,
      active_count: 0,
      total_revenue_value: 0,
    };

    return NextResponse.json({
      success: true,
      data: dataRes.rows,
      total,
      pageCount: getPageCount(total, limit),
      stats: {
        totalEnrollments: Number(stats.total_enrollments || 0),
        enrollmentsThisMonth: Number(stats.enrollments_this_month || 0),
        activeCount: Number(stats.active_count || 0),
        totalRevenueValue: Number(stats.total_revenue_value || 0),
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/sales/enrollments error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch enrollments" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { enrollmentId, status } = body;
    if (!enrollmentId || !status) {
      return NextResponse.json({ error: "enrollmentId and status are required" }, { status: 400 });
    }

    const updateRes = await db.query(
      `UPDATE student_enrollments 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, status`,
      [String(status).trim(), Number(enrollmentId)]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: "Enrollment record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updateRes.rows[0] });
  } catch (err: any) {
    console.error("PATCH /api/admin/sales/enrollments error:", err);
    return NextResponse.json({ error: err.message || "Failed to update enrollment status" }, { status: 500 });
  }
}
