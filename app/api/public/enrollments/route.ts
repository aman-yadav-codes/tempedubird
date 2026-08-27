import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();
    const authUser = await getAuthUser(req);

    const {
      programId,
      program_id,
      institutionId,
      institution_id,
      student_name,
      applicant_name,
      student_email,
      student_phone,
      parent_name,
      parent_phone,
      parent_email,
      child_name,
      child_id,
      notes,
      source = "edubird", // 'edubird' or 'institution_website'
    } = body;

    const resolvedProgId = Number(programId || program_id);
    let resolvedInstId = Number(institutionId || institution_id);

    if (!resolvedProgId) {
      return NextResponse.json({ error: "Program ID is required for enrollment" }, { status: 400 });
    }

    // Resolve program info
    const progRes = await db.query(
      `SELECT id, institution_id, title, fee_amount FROM institution_programs WHERE id = $1 LIMIT 1`,
      [resolvedProgId]
    );

    if (progRes.rows.length === 0) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (!resolvedInstId) {
      resolvedInstId = progRes.rows[0].institution_id;
    }

    const sName = student_name || child_name || applicant_name || authUser?.full_name || "Enrolled Applicant";
    const sPhone = student_phone || authUser?.phone || parent_phone || "";
    const sEmail = student_email || authUser?.email || parent_email || "";

    // 1. Resolve or create user/profile
    let studentUserId = authUser?.id || null;
    let studentProfileId = child_id ? Number(child_id) : null;

    if (!studentProfileId && studentUserId) {
      const spRes = await db.query(
        `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
        [studentUserId]
      );
      if (spRes.rows.length > 0) {
        studentProfileId = spRes.rows[0].id;
      } else {
        const createSp = await db.query(
          `INSERT INTO student_profiles (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`,
          [studentUserId]
        );
        studentProfileId = createSp.rows[0].id;
      }
    }

    // 2. Insert into visitor_sessions / sales pipeline
    const originSource = source === "institution_website" ? "Institution Website" : "EduBird Platform";
    const trackingToken = `ENR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    await db.query(
      `
      INSERT INTO visitor_sessions (
        tracking_token,
        institution_id,
        program_id,
        user_id,
        full_name,
        email,
        phone,
        notes,
        pipeline_stage,
        estimated_value,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enrolled', $9, $10)
      `,
      [
        trackingToken,
        resolvedInstId,
        resolvedProgId,
        studentUserId,
        sName,
        sEmail,
        sPhone,
        notes || `Enrolled from ${originSource}`,
        Number(progRes.rows[0].fee_amount) || 25000,
        JSON.stringify({
          source_type: source,
          parent_name: parent_name || null,
          parent_phone: parent_phone || null,
          parent_email: parent_email || null,
          child_name: child_name || null,
        }),
      ]
    );

    // 3. Insert into student_enrollments if studentProfileId exists
    let enrollmentId = null;
    if (studentProfileId) {
      const enrollRes = await db.query(
        `
        INSERT INTO student_enrollments (
          student_id,
          institution_id,
          program_id,
          status,
          admission_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, 'active', CURRENT_DATE, NOW(), NOW())
        RETURNING id
        `,
        [studentProfileId, resolvedInstId, resolvedProgId]
      );
      enrollmentId = enrollRes.rows[0]?.id;
    }

    return NextResponse.json({
      success: true,
      message: "Enrollment submitted successfully!",
      enrollment_id: enrollmentId,
      tracking_token: trackingToken,
      source: originSource,
    });
  } catch (error: any) {
    console.error("[Public Enrollments POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit enrollment" }, { status: 500 });
  }
}
