import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthenticatedUser } from "@/lib/auth/auth";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.trim();
    const department = searchParams.get("department");
    const visitType = searchParams.get("visit_type");
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
      conditions.push(`(p.institution_id = $${params.length} OR p.institution_id IS NULL)`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.patient_id_number ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.doctor_assigned ILIKE $${params.length})`);
    }

    if (department && department !== "all") {
      params.push(department);
      conditions.push(`p.department = $${params.length}`);
    }

    if (visitType && visitType !== "all") {
      params.push(visitType);
      conditions.push(`p.visit_type = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT p.*
      FROM sales_patients p
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT 100
    `;

    const res = await db.query(query, params);

    const statsQuery = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active,
        COUNT(CASE WHEN visit_type = 'OPD' THEN 1 END)::int AS opd,
        COUNT(CASE WHEN visit_type = 'IPD' THEN 1 END)::int AS ipd
      FROM sales_patients p
      ${whereClause}
    `;
    const statsRes = await db.query(statsQuery, params);
    const stats = statsRes.rows[0] || { total: 0, active: 0, opd: 0, ipd: 0 };

    return NextResponse.json({
      success: true,
      patients: res.rows,
      stats,
    });
  } catch (error: any) {
    console.error("GET /api/admin/sales/patients error:", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch patients" }, { status: 500 });
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
      patient_id_number,
      age,
      gender,
      phone,
      email,
      blood_group,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      doctor_assigned,
      visit_type,
      consultation_fee,
      medical_history,
      allergies,
      status,
      institution_id,
      business_profile_id,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Patient name is required" }, { status: 400 });
    }

    const effectiveInstId = institution_id || (user.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null);
    const generatedIdNumber = patient_id_number?.trim() || `PT-${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`;

    const query = `
      INSERT INTO sales_patients (
        institution_id,
        business_profile_id,
        created_by,
        name,
        patient_id_number,
        age,
        gender,
        phone,
        email,
        blood_group,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        department,
        doctor_assigned,
        visit_type,
        consultation_fee,
        medical_history,
        allergies,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      effectiveInstId,
      business_profile_id || null,
      user.id,
      name.trim(),
      generatedIdNumber,
      age ? Number(age) : null,
      gender || "Male",
      phone || null,
      email || null,
      blood_group || null,
      address || null,
      emergency_contact_name || null,
      emergency_contact_phone || null,
      department || "General Medicine",
      doctor_assigned || null,
      visit_type || "OPD",
      consultation_fee !== undefined ? Number(consultation_fee) : 500,
      medical_history || null,
      allergies || null,
      status || "active",
    ];

    const res = await db.query(query, values);

    return NextResponse.json({
      success: true,
      patient: res.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/admin/sales/patients error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create patient record" }, { status: 500 });
  }
}
