import { NextResponse } from "next/server";

import { withApiDebug } from "@/lib/api/debug";
import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";

function positiveInt(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getRollNumberAvailability(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const params = new URL(req.url).searchParams;
    const institutionId = positiveInt(params.get("institution_id"));
    const programId = positiveInt(params.get("program_id"));
    const academicYearId = positiveInt(params.get("academic_year_id"));
    const sectionId = positiveInt(params.get("section_id"));
    const excludeStudentUserId = positiveInt(params.get("exclude_student_user_id"));
    const rollNumber = params.get("roll_number")?.trim() ?? "";

    if (!institutionId || !programId || !academicYearId || !sectionId || !rollNumber) {
      return NextResponse.json({ error: "Class, section, academic year, and roll number are required" }, { status: 400 });
    }
    if (!/^\d+$/.test(rollNumber)) {
      return NextResponse.json({ error: "Roll number must contain digits only" }, { status: 422 });
    }

    assertCanAccessInstitution(currentUser, institutionId);

    const result = await db.query<{ student_name: string; admission_number: string | null }>(
      `
        SELECT student_user.full_name AS student_name,
               student_profile.admission_number
        FROM student_enrollments enrollment
        INNER JOIN student_profiles student_profile ON student_profile.id = enrollment.student_id
        INNER JOIN users student_user ON student_user.id = student_profile.user_id
        WHERE enrollment.institution_id = $1
          AND enrollment.program_id = $2
          AND enrollment.academic_year_id = $3
          AND enrollment.section_id = $4
          AND enrollment.roll_number = $5
          AND enrollment.status = 'active'
          AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
          AND ($6::int IS NULL OR student_profile.user_id <> $6)
        LIMIT 1
      `,
      [institutionId, programId, academicYearId, sectionId, rollNumber, excludeStudentUserId]
    );

    const conflict = result.rows[0] ?? null;
    return NextResponse.json({
      available: !conflict,
      conflict,
      message: conflict
        ? `Roll number ${rollNumber} is already assigned to ${conflict.student_name}.`
        : "Roll number is available.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to check roll number";
    const status = message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = withApiDebug(getRollNumberAvailability, "admin.students.roll_number_check.get");
