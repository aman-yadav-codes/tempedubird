import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const courseProgram = searchParams.get("course_program");
    const feeStatus = searchParams.get("fee_status");
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
      conditions.push(`(s.institution_id = $${params.length} OR s.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.name ILIKE $${params.length} OR s.roll_number ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.course_program ILIKE $${params.length})`);
    }

    if (courseProgram && courseProgram !== "all") {
      params.push(courseProgram);
      conditions.push(`s.course_program = $${params.length}`);
    }

    if (feeStatus && feeStatus !== "all") {
      params.push(feeStatus);
      conditions.push(`s.fee_status = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT s.*
      FROM sales_students s
      ${whereClause}
      ORDER BY s.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN academic_status = 'enrolled' THEN 1 END)::int AS enrolled,
        COUNT(CASE WHEN fee_status = 'paid' THEN 1 END)::int AS fee_paid,
        COUNT(CASE WHEN fee_status = 'pending' THEN 1 END)::int AS fee_pending
      FROM sales_students s
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, enrolled: 0, fee_paid: 0, fee_pending: 0 };

    return NextResponse.json({
      success: true,
      students: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/sales/students error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch student admissions" }, { status: 500 });
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
      name,
      roll_number,
      email,
      phone,
      guardian_name,
      guardian_phone,
      course_program,
      batch_section,
      admission_date,
      fee_amount,
      fee_status,
      academic_status,
      address,
      notes,
      status,
      institution_id,
      business_profile_id,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Student name is required" }, { status: 400 });
    }

    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);
    const generatedRollNumber = roll_number?.trim() || `STU-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`;

    const query = `
      INSERT INTO sales_students (
        institution_id,
        business_profile_id,
        created_by,
        name,
        roll_number,
        email,
        phone,
        guardian_name,
        guardian_phone,
        course_program,
        batch_section,
        admission_date,
        fee_amount,
        fee_status,
        academic_status,
        address,
        notes,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      name.trim(),
      generatedRollNumber,
      email || null,
      phone || null,
      guardian_name || null,
      guardian_phone || null,
      course_program || "General Academic Program",
      batch_section || "Batch A",
      admission_date ? new Date(admission_date) : new Date(),
      fee_amount !== undefined ? Number(fee_amount) : 0,
      fee_status || "pending",
      academic_status || "enrolled",
      address || null,
      notes || null,
      status || "active",
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      student: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/sales/students error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create student admission" }, { status: 500 });
  }
}
