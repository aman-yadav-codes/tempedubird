import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getStudentEnrollmentContexts } from "@/lib/auth/student-enrollment-context";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user.role_codes.includes("student")) {
      return NextResponse.json({ error: "Forbidden: Student access required" }, { status: 403 });
    }
    const contexts = await getStudentEnrollmentContexts(db, user.id);
    const institutionIds = Array.from(
      new Set(contexts.map((context) => Number(context.institution_id)).filter((id) => Number.isInteger(id) && id > 0))
    );
    const defaultResult = institutionIds.length > 0
      ? await db.query<{ id: number; default_academic_year_id: number | null }>(
        `
          SELECT id, default_academic_year_id
          FROM institution_profiles
          WHERE id = ANY($1::int[])
        `,
        [institutionIds]
      )
      : { rows: [] };
    const defaultByInstitutionId = new Map<number, number | null>(
      defaultResult.rows.map((row): [number, number | null] => [
        Number(row.id),
        row.default_academic_year_id ? Number(row.default_academic_year_id) : null,
      ])
    );

    return NextResponse.json({
      data: contexts.map((context) => ({
        id: Number(context.id),
        institutionId: Number(context.institution_id),
        institutionName: context.institution_name,
        programId: Number(context.program_id),
        programName: context.program_name,
        sectionId: context.section_id ? Number(context.section_id) : null,
        sectionName: context.section_name,
        academicYearId: Number(context.academic_year_id),
        academicYearName: context.academic_year_name,
        academicYearStartDate: context.academic_year_start_date,
        academicYearEndDate: context.academic_year_end_date,
        institutionDefaultAcademicYearId: defaultByInstitutionId.get(Number(context.institution_id)) ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load enrollments";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}
