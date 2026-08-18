import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

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

    const res = await db.query(
      `
        SELECT
          se.id,
          se.student_id,
          se.institution_id,
          se.academic_year_id,
          ay.name AS academic_year_name,
          se.program_id,
          p.title AS program_name,
          se.class_category_id,
          cc.name AS class_category_name,
          se.section_id,
          sec.name AS section_name,
          se.roll_number,
          se.status,
          se.admission_date,
          se.remarks,
          se.is_current
        FROM student_profiles sp
        INNER JOIN student_enrollments se ON se.student_id = sp.id
        LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
        LEFT JOIN institution_programs p ON p.id = se.program_id
        LEFT JOIN class_categories cc ON cc.id = se.class_category_id
        LEFT JOIN program_sections sec ON sec.id = se.section_id
        WHERE sp.user_id = $1
          AND COALESCE(se.is_deleted, FALSE) = FALSE
        ORDER BY se.is_current DESC, se.id DESC
      `,
      [studentUserId]
    );

    return NextResponse.json({ data: res.rows });
  } catch (err) {
    console.error("Error in GET /api/admin/students/[id]/enrollments:", err);
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
      programId,
      academicYearId,
      sectionId,
      rollNumber,
      status = "active",
      admissionDate,
      remarks,
    } = body;

    if (!institutionId || !programId || !academicYearId) {
      return NextResponse.json(
        { error: "Institution, Program/Class, and Academic Year are required" },
        { status: 400 }
      );
    }

    // 1. Get or create student_profile
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

    // 2. Lookup class_category_id for programId
    const catRes = await db.query<{ category_id: number }>(
      `SELECT category_id FROM program_categories WHERE program_id = $1 LIMIT 1`,
      [programId]
    );
    const classCategoryId = catRes.rows[0]?.category_id || 1;

    // 3. Check for roll_number uniqueness if provided
    if (rollNumber && sectionId) {
      const rollCheck = await db.query<{ id: number }>(
        `
          SELECT id FROM student_enrollments
          WHERE institution_id = $1
            AND academic_year_id = $2
            AND program_id = $3
            AND section_id = $4
            AND LOWER(roll_number) = LOWER($5)
            AND student_id != $6
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [institutionId, academicYearId, programId, sectionId, rollNumber.trim(), studentProfileId]
      );
      if (rollCheck.rows[0]) {
        return NextResponse.json(
          { error: `Roll number "${rollNumber}" is already assigned in this class & section.` },
          { status: 400 }
        );
      }
    }

    // 4. Check if an enrollment record already exists for this student, institution, program, and academic year
    const existingEnroll = await db.query<{ id: number }>(
      `
        SELECT id FROM student_enrollments
        WHERE student_id = $1
          AND institution_id = $2
          AND program_id = $3
          AND academic_year_id = $4
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [studentProfileId, institutionId, programId, academicYearId]
    );

    // Set other enrollments' is_current to FALSE for this student and institution
    await db.query(
      `UPDATE student_enrollments SET is_current = FALSE WHERE student_id = $1 AND institution_id = $2`,
      [studentProfileId, institutionId]
    );

    let savedEnrollment;
    if (existingEnroll.rows[0]) {
      // 5a. UPDATE existing enrollment record
      const updateRes = await db.query(
        `
          UPDATE student_enrollments
          SET
            class_category_id = $1,
            section_id = $2,
            roll_number = $3,
            status = $4,
            admission_date = $5,
            remarks = $6,
            is_current = TRUE,
            updated_at = NOW()
          WHERE id = $7
          RETURNING *
        `,
        [
          classCategoryId,
          sectionId || null,
          rollNumber?.trim() || null,
          status || "active",
          admissionDate || new Date().toISOString().split("T")[0],
          remarks?.trim() || null,
          existingEnroll.rows[0].id,
        ]
      );
      savedEnrollment = updateRes.rows[0];
    } else {
      // 5b. INSERT new enrollment record
      const insertRes = await db.query(
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
            admission_date,
            remarks,
            is_current
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
          RETURNING *
        `,
        [
          studentProfileId,
          institutionId,
          academicYearId,
          programId,
          classCategoryId,
          sectionId || null,
          rollNumber?.trim() || null,
          status || "active",
          admissionDate || new Date().toISOString().split("T")[0],
          remarks?.trim() || null,
        ]
      );
      savedEnrollment = insertRes.rows[0];
    }

    return NextResponse.json(
      { data: savedEnrollment, message: "Class assigned successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in POST /api/admin/students/[id]/enrollments:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
