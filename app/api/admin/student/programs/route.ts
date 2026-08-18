import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getStudentEnrollmentContexts } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";

type ProgramRow = {
  enrollment_id: number;
  institution_id: number;
  institution_name: string;
  program_id: number;
  program_name: string;
  class_category_name: string | null;
  section_id: number | null;
  section_name: string | null;
  academic_year_id: number;
  academic_year_name: string;
  roll_number: string | null;
  admission_number: string | null;
  admission_date: string | Date | null;
  enrollment_status: string | null;
  duration_value: string | number | null;
  duration_unit: string | null;
};

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Failed to load programs";
  const status =
    message === "Unauthorized" || message === "User not found"
      ? 401
      : message.startsWith("Forbidden")
        ? 403
        : 500;
  return NextResponse.json({ error: message }, { status });
}

function formatDuration(value: string | number | null, unit: string | null) {
  const durationValue = Number(value);
  if (!Number.isFinite(durationValue) || durationValue <= 0 || !unit) return null;
  const label = durationValue === 1 ? unit.replace(/s$/, "") : unit;
  return `${durationValue} ${label}`;
}

function toDateOnly(value: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    const result = await db.query<ProgramRow>(
      `
        SELECT
          se.id AS enrollment_id,
          se.institution_id,
          COALESCE(institution.name, 'Institution') AS institution_name,
          se.program_id,
          COALESCE(program.title, 'Course Program') AS program_name,
          category.name AS class_category_name,
          se.section_id,
          section.name AS section_name,
          se.academic_year_id,
          COALESCE(academic_year.name, '2026-2027 Academic Session') AS academic_year_name,
          se.roll_number,
          student.admission_number,
          se.admission_date,
          se.status AS enrollment_status,
          program.duration_value,
          program.duration_unit
        FROM student_enrollments se
        INNER JOIN student_profiles student
          ON student.id = se.student_id
        LEFT JOIN users u ON u.id = student.user_id
        LEFT JOIN institution_profiles institution
          ON institution.id = se.institution_id
        LEFT JOIN institution_programs program
          ON program.id = se.program_id
        LEFT JOIN categories category ON category.id = se.class_category_id
        LEFT JOIN sections section ON section.id = se.section_id
        LEFT JOIN academic_years academic_year
          ON academic_year.id = se.academic_year_id
        WHERE (
          student.user_id = $1
          OR u.id = $1
          OR (COALESCE($2, '') != '' AND LOWER(u.email) = LOWER($2))
          OR (COALESCE($3, '') != '' AND u.phone = $3)
          OR se.student_id IN (SELECT id FROM student_profiles WHERE user_id = $1)
        )
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        ORDER BY se.created_at DESC, se.id DESC
      `,
      [user.id, user.email || "", user.phone || ""],
    );

    return NextResponse.json({
      data: result.rows.map((row) => ({
        id: Number(row.enrollment_id),
        enrollmentId: Number(row.enrollment_id),
        institutionId: Number(row.institution_id),
        institutionName: row.institution_name,
        programId: Number(row.program_id),
        programName: row.program_name,
        classCategoryName: row.class_category_name,
        sectionId: row.section_id ? Number(row.section_id) : null,
        sectionName: row.section_name,
        academicYearId: Number(row.academic_year_id),
        academicYearName: row.academic_year_name,
        rollNumber: row.roll_number,
        admissionNumber: row.admission_number,
        admissionDate: toDateOnly(row.admission_date),
        status: row.enrollment_status ?? "active",
        duration: formatDuration(row.duration_value, row.duration_unit),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
