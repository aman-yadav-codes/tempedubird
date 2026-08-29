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
      email,
      phone,
      parent_name,
      parent_phone,
      parent_email,
      child_name,
      child_id,
      user_id,
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

    const sName = String(student_name || child_name || applicant_name || authUser?.full_name || "Enrolled Applicant").trim();
    const sPhone = String(student_phone || phone || authUser?.phone || parent_phone || "").trim();
    const sEmail = String(student_email || email || authUser?.email || parent_email || "").trim();

    // 1. Resolve or create user/profile
    let studentUserId = body.user_id ? Number(body.user_id) : (authUser?.id || null);

    if (!studentUserId && (sEmail || sPhone)) {
      try {
        const userMatch = await db.query<{ id: number }>(
          `
          SELECT id FROM users
          WHERE ($1 <> '' AND LOWER(email) = LOWER($1))
             OR ($2 <> '' AND phone IS NOT NULL AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = REGEXP_REPLACE($2, '[^0-9]', '', 'g'))
          LIMIT 1
          `,
          [sEmail, sPhone]
        );
        if (userMatch.rows.length > 0) {
          studentUserId = userMatch.rows[0].id;
        }
      } catch {}
    }

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
    const originSource = source === "institution_website" ? "institution_website" : "edubird";
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
        lead_status,
        pipeline_stage,
        follow_up,
        notes,
        source_type,
        estimated_value,
        metadata,
        created_at,
        last_seen_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'enrolled', 'enrolled', $8, $8, $9, $10, $11, NOW(), NOW())
      `,
      [
        trackingToken,
        resolvedInstId,
        resolvedProgId,
        studentUserId,
        sName,
        sEmail || null,
        sPhone || "Not provided",
        notes || `Direct Student Enrollment Application | Origin: ${originSource === "institution_website" ? "Institution Website" : "EduBird"}`,
        originSource,
        Number(progRes.rows[0].fee_amount) || 25000,
        JSON.stringify({
          source_type: originSource,
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
