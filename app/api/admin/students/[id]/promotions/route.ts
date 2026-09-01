import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getStudentPromotions, insertStudentPromotion } from "@/lib/queries/student-promotions";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser(req);
    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const promotions = await getStudentPromotions(studentUserId, db);
    return NextResponse.json({ data: promotions });
  } catch (err) {
    console.error("Error in GET /api/admin/students/[id]/promotions:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAuthenticatedUser(req);
    const { id } = await context.params;
    const studentUserId = Number(id);
    if (!studentUserId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      institutionId,
      sourceEnrollmentId,
      outcome,
      toAcademicYearId,
      toProgramId,
      toSectionId,
      rollNumber,
      notes,
    } = body;

    if (!institutionId || !outcome) {
      return NextResponse.json({ error: "Institution ID and outcome are required" }, { status: 400 });
    }

    // Fetch student profile ID and active enrollment info
    const spRes = await db.query<{ id: number }>(
      `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
      [studentUserId]
    );
    let studentProfileId = spRes.rows[0]?.id;
    if (!studentProfileId) {
      const newSp = await db.query<{ id: number }>(
        `INSERT INTO student_profiles (user_id) VALUES ($1) RETURNING id`,
        [studentUserId]
      );
      studentProfileId = newSp.rows[0].id;
    }

    // Current enrollment details
    const currEnrollRes = await db.query<{
      id: number;
      academic_year_id: number;
      program_id: number;
      class_category_id: number | null;
      section_id: number | null;
      roll_number: string | null;
    }>(
      `
        SELECT id, academic_year_id, program_id, class_category_id, section_id, roll_number
        FROM student_enrollments
        WHERE student_id = $1 AND institution_id = $2
        ORDER BY is_current DESC, id DESC LIMIT 1
      `,
      [studentProfileId, institutionId]
    );
    const currentEnrollment = currEnrollRes.rows[0];

    // If destination enrollment is needed (promoted, retained, failed)
    let destEnrollmentId: number | null = null;
    const effectiveToProgramId = toProgramId || (outcome === "failed" ? currentEnrollment?.program_id : null);
    const effectiveToSectionId = toSectionId !== undefined ? toSectionId : (outcome === "failed" ? currentEnrollment?.section_id : null);

    if (["promoted", "retained", "failed"].includes(outcome)) {
      if (!toAcademicYearId || !effectiveToProgramId) {
        return NextResponse.json({ error: "Destination Academic Year and Program are required" }, { status: 400 });
      }

      // Fetch class_category_id for effectiveToProgramId
      const catRes = await db.query<{ category_id: number }>(
        `SELECT category_id FROM program_categories WHERE program_id = $1 LIMIT 1`,
        [effectiveToProgramId]
      );
      const classCategoryId = catRes.rows[0]?.category_id || currentEnrollment?.class_category_id || 1;

      // Deactivate old enrollments
      await db.query(
        `UPDATE student_enrollments SET is_current = FALSE, status = $3 WHERE student_id = $1 AND institution_id = $2`,
        [studentProfileId, institutionId, outcome === "failed" ? "failed" : "promoted"]
      );

      // Create new active enrollment
      const newEnrollRes = await db.query<{ id: number }>(
        `
          INSERT INTO student_enrollments (
            student_id,
            institution_id,
            academic_year_id,
            program_id,
            class_category_id,
            section_id,
            roll_number,
            status,
            is_current
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', TRUE)
          RETURNING id
        `,
        [
          studentProfileId,
          institutionId,
          toAcademicYearId,
          effectiveToProgramId,
          classCategoryId,
          effectiveToSectionId || null,
          rollNumber || currentEnrollment?.roll_number || null,
        ]
      );
      destEnrollmentId = newEnrollRes.rows[0].id;
    } else if (["graduated", "transferred"].includes(outcome)) {
      await db.query(
        `UPDATE student_enrollments SET is_current = FALSE, status = $1 WHERE student_id = $2 AND institution_id = $3`,
        [outcome, studentProfileId, institutionId]
      );
    }

    // Insert into student_promotions table
    const promotionRecord = await insertStudentPromotion(
      {
        studentProfileId,
        userId: studentUserId,
        institutionId: Number(institutionId),
        sourceEnrollmentId: sourceEnrollmentId || currentEnrollment?.id || null,
        destinationEnrollmentId: destEnrollmentId,
        outcome,
        fromAcademicYearId: currentEnrollment?.academic_year_id || null,
        fromProgramId: currentEnrollment?.program_id || null,
        fromSectionId: currentEnrollment?.section_id || null,
        toAcademicYearId: toAcademicYearId || null,
        toProgramId: toProgramId || null,
        toSectionId: toSectionId || null,
        rollNumber: rollNumber || null,
        notes: notes || null,
        promotedBy: adminUser.id,
      },
      db
    );

    return NextResponse.json({ data: promotionRecord, message: "Student promotion recorded successfully" }, { status: 201 });
  } catch (err) {
    console.error("Error in POST /api/admin/students/[id]/promotions:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
