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
    const category = searchParams.get("category")?.trim() || "";

    const whereConditions: string[] = [];
    const params: unknown[] = [];

    if (institutionId && Number.isInteger(institutionId) && institutionId > 0) {
      params.push(institutionId);
      whereConditions.push(`(t.source_institution_id = $${params.length} OR t.source_institution_id IS NULL OR t.source_institution_id = 1)`);
    }

    if (examType && examType !== "all") {
      params.push(examType);
      whereConditions.push(`(
        CASE
          WHEN COALESCE(t.is_government_exam, FALSE) THEN 'government'
          WHEN COALESCE(t.is_public, FALSE) THEN 'competitive'
          ELSE 'institutional'
        END = $${params.length} OR COALESCE(t.exam_category, '') ILIKE $${params.length}
      )`);
    }

    if (category && category !== "all") {
      params.push(`%${category}%`);
      whereConditions.push(`COALESCE(t.exam_category, '') ILIKE $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`(
        t.title ILIKE $${params.length} 
        OR COALESCE(t.exam_category, '') ILIKE $${params.length} 
        OR COALESCE(t.conducting_body, '') ILIKE $${params.length}
        OR COALESCE(t.eligibility_criteria, '') ILIKE $${params.length}
        OR COALESCE(t.description, '') ILIKE $${params.length}
      )`);
    }

    const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

    const templatesRes = await db.query(`
      SELECT
        t.id,
        t.source_institution_id AS institution_id,
        t.title AS exam_name,
        CASE
          WHEN COALESCE(t.is_government_exam, FALSE) THEN 'government'
          WHEN COALESCE(t.is_public, FALSE) THEN 'competitive'
          ELSE 'institutional'
        END AS exam_type,
        COALESCE(t.exam_category, 'General Competitive') AS category,
        TO_CHAR(t.exam_date, 'YYYY-MM-DD') AS exam_date,
        t.exam_time::text AS exam_time,
        COALESCE(t.exam_mode, 'online') AS exam_mode,
        COALESCE(t.total_marks, 200) AS total_marks,
        COALESCE(t.duration_minutes, 120) AS duration_minutes,
        COALESCE(t.eligibility_criteria, 'Open to all eligible candidates.') AS eligibility,
        COALESCE(t.application_fee, 0)::numeric AS application_fee,
        COALESCE(t.official_website_url, t.apply_url, '') AS website_url,
        COALESCE(t.apply_url, '') AS apply_url,
        COALESCE(t.notification_pdf_url, '') AS notification_pdf_url,
        TO_CHAR(t.application_start_date, 'YYYY-MM-DD') AS application_start_date,
        TO_CHAR(t.application_end_date, 'YYYY-MM-DD') AS application_end_date,
        TO_CHAR(t.admit_card_date, 'YYYY-MM-DD') AS admit_card_date,
        TO_CHAR(t.result_date, 'YYYY-MM-DD') AS result_date,
        COALESCE(t.description, 'Official examination with syllabus-mapped assessment and merit list.') AS description,
        t.created_at,
        COALESCE(t.conducting_body, ip.name, ip.slug, 'Central Examination Authority') AS institution_name,
        COALESCE(t.is_government_exam, FALSE) AS is_government_exam
      FROM practice_exam_templates t
      LEFT JOIN institution_profiles ip ON ip.id = t.source_institution_id
      WHERE COALESCE(t.is_active, TRUE) = TRUE
        AND COALESCE(t.is_deleted, FALSE) = FALSE
        AND (COALESCE(t.is_government_exam, FALSE) = TRUE OR COALESCE(t.is_public, FALSE) = TRUE OR COALESCE(t.marketplace_approved, FALSE) = TRUE)
        ${whereClause}
      ORDER BY t.id DESC
    `, params);

    // Also fallback / union entrance_exams table if exists
    let entranceRows: any[] = [];
    try {
      const eRes = await db.query(`
        SELECT
          e.id,
          e.institution_id,
          e.exam_name,
          COALESCE(e.exam_type, 'competitive') AS exam_type,
          e.category,
          e.exam_date,
          e.eligibility,
          COALESCE(e.application_fee, 0)::numeric AS application_fee,
          e.website_url,
          e.description,
          e.created_at,
          COALESCE(ip.name, ip.slug, 'Central Platform') AS institution_name,
          (e.exam_type = 'government') AS is_government_exam
        FROM entrance_exams e
        LEFT JOIN institution_profiles ip ON ip.id = e.institution_id
        ORDER BY e.id DESC
      `);
      entranceRows = eRes.rows;
    } catch {
      entranceRows = [];
    }

    // Merge and deduplicate by exam_name
    const seenNames = new Set<string>();
    const allExams: any[] = [];

    for (const row of templatesRes.rows) {
      const key = (row.exam_name || "").toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allExams.push(row);
      }
    }

    for (const row of entranceRows) {
      const key = (row.exam_name || "").toLowerCase().trim();
      if (!seenNames.has(key)) {
        seenNames.add(key);
        allExams.push(row);
      }
    }

    return NextResponse.json({
      success: true,
      exams: allExams,
      total: allExams.length,
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
