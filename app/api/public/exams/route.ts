import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId") ? Number(searchParams.get("institutionId")) : null;
    const search = searchParams.get("search")?.trim() || "";
    const examType = searchParams.get("examType")?.trim() || ""; // 'government' | 'competitive' | 'institutional'

    const whereConditions: string[] = [];
    const params: unknown[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`(e.institution_id = $${params.length} OR e.institution_id IS NULL)`);
    }

    if (examType && examType !== "all") {
      params.push(examType);
      whereConditions.push(`(e.exam_type = $${params.length} OR (e.category ILIKE $${params.length}))`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(e.exam_name ILIKE $${params.length} OR e.category ILIKE $${params.length} OR e.eligibility ILIKE $${params.length} OR COALESCE(e.exam_type, '') ILIKE $${params.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const examsRes = await db.query(`
      SELECT
        e.id,
        e.institution_id,
        e.exam_name,
        COALESCE(e.exam_type, 'institutional') AS exam_type,
        e.category,
        e.exam_date,
        e.eligibility,
        e.application_fee,
        e.website_url,
        e.description,
        e.created_at,
        COALESCE(ip.name, ip.slug, 'Central Platform') AS institution_name
      FROM entrance_exams e
      LEFT JOIN institution_profiles ip ON ip.id = e.institution_id
      ${whereClause}
      ORDER BY e.id DESC
    `, params);

    return NextResponse.json({
      success: true,
      exams: examsRes.rows,
    });
  } catch (err: any) {
    console.error("GET /api/public/exams error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const {
      institution_id,
      exam_name,
      exam_type = "institutional",
      category,
      exam_date,
      eligibility,
      application_fee = 0,
      website_url,
      description,
      user_role,
    } = body;

    if (!exam_name) {
      return NextResponse.json({ error: "Exam name is required" }, { status: 400 });
    }

    // Role validation: Only platform admin can add 'government' and 'competitive' exams
    const isPlatformAdmin = user_role === "platform_admin" || !institution_id;
    if ((exam_type === "government" || exam_type === "competitive") && !isPlatformAdmin) {
      return NextResponse.json(
        { error: "Only Platform Admin can create Government and Competitive exams." },
        { status: 403 }
      );
    }

    const res = await db.query(
      `
      INSERT INTO entrance_exams (
        institution_id, exam_name, exam_type, category, exam_date, eligibility, application_fee, website_url, description, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
      `,
      [
        institution_id || null,
        exam_name.trim(),
        exam_type,
        category?.trim() || "Entrance & Competitive",
        exam_date || null,
        eligibility?.trim() || null,
        Number(application_fee) || 0,
        website_url?.trim() || null,
        description?.trim() || null,
      ]
    );

    return NextResponse.json({ exam: res.rows[0], message: "Exam created successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save exam" }, { status: 500 });
  }
}
