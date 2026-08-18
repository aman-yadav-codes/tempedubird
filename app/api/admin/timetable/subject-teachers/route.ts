import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import {
  assertProgramSectionSubjectYear,
  assertTeacherInInstitution,
  getProgramScope,
  getProgramSubjects,
} from "@/lib/queries/timetable";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const programId = Number(url.searchParams.get("programId"));
    const sectionId = Number(url.searchParams.get("sectionId"));
    const academicYearId = Number(url.searchParams.get("academicYearId"));
    if (![programId, sectionId, academicYearId].every((id) => Number.isInteger(id) && id > 0)) {
      return NextResponse.json({ error: "Program, section, and academic year are required" }, { status: 400 });
    }

    const program = await getProgramScope(db, programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    assertCanAccessInstitution(currentUser, program.institution_id);
    await assertProgramSectionSubjectYear(db, { programId, sectionId, academicYearId });

    const subjects = await getProgramSubjects(db, programId);
    const mappings = await db.query<{
      subject_id: number;
      teacher_id: number;
      teacher_name: string;
      teacher_email: string | null;
    }>(
      `
        SELECT pst.subject_id, pst.teacher_id, u.full_name AS teacher_name, u.email AS teacher_email
        FROM program_subject_teachers pst
        INNER JOIN users u ON u.id = pst.teacher_id
        WHERE pst.program_id = $1
          AND pst.section_id = $2
          AND pst.academic_year_id = $3
      `,
      [programId, sectionId, academicYearId]
    );
    const bySubject = new Map(mappings.rows.map((row) => [Number(row.subject_id), row]));

    return NextResponse.json({
      data: subjects.map((subject) => ({
        ...subject,
        teacher_id: bySubject.get(subject.id)?.teacher_id ?? null,
        teacher_name: bySubject.get(subject.id)?.teacher_name ?? null,
        teacher_email: bySubject.get(subject.id)?.teacher_email ?? null,
      })),
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const programId = Number(body.programId);
    const sectionId = Number(body.sectionId);
    const academicYearId = Number(body.academicYearId);
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];
    if (![programId, sectionId, academicYearId].every((id) => Number.isInteger(id) && id > 0)) {
      return NextResponse.json({ error: "Program, section, and academic year are required" }, { status: 400 });
    }

    const program = await getProgramScope(db, programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    assertCanAccessInstitution(currentUser, program.institution_id);

    const normalized = assignments
      .map((item: Record<string, unknown>) => ({
        subjectId: Number(item.subjectId),
        teacherId: Number(item.teacherId),
      }))
      .filter((item) => Number.isInteger(item.subjectId) && item.subjectId > 0 && Number.isInteger(item.teacherId) && item.teacherId > 0);

    await assertProgramSectionSubjectYear(db, {
      programId,
      sectionId,
      academicYearId,
      subjectIds: normalized.map((item) => item.subjectId),
    });
    await assertTeacherInInstitution(db, normalized.map((item) => item.teacherId), program.institution_id);

    await client.query("BEGIN");
    await client.query(
      `
        DELETE FROM program_subject_teachers
        WHERE program_id = $1
          AND section_id = $2
          AND academic_year_id = $3
      `,
      [programId, sectionId, academicYearId]
    );

    for (const assignment of normalized) {
      await client.query(
        `
          INSERT INTO program_subject_teachers (program_id, section_id, subject_id, teacher_id, academic_year_id)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [programId, sectionId, assignment.subjectId, assignment.teacherId, academicYearId]
      );
    }
    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
