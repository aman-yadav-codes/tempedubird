import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import {
  assertProgramSectionSubjectYear,
  assertTeacherInInstitution,
  getProgramScope,
} from "@/lib/queries/timetable";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function getSelection(url: URL) {
  return {
    programId: Number(url.searchParams.get("programId")),
    sectionId: Number(url.searchParams.get("sectionId")),
    academicYearId: Number(url.searchParams.get("academicYearId")),
  };
}

function isValidSelection(selection: ReturnType<typeof getSelection>) {
  return Object.values(selection).every((id) => Number.isInteger(id) && id > 0);
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const institutionId = Number(url.searchParams.get("institutionId"));

    if (Number.isInteger(institutionId) && institutionId > 0) {
      assertCanAccessInstitution(currentUser, institutionId);
      const { page, limit, offset } = getPagination(
        url.searchParams.get("page"),
        url.searchParams.get("limit")
      );
      const search = url.searchParams.get("search")?.trim() || "";
      const params: Array<number | string> = [institutionId];
      let searchClause = "";

      if (search) {
        params.push(`%${search}%`);
        searchClause = `
          AND (
            ip.title ILIKE $2
            OR s.name ILIKE $2
            OR ay.name ILIKE $2
            OR u.full_name ILIKE $2
            OR u.email ILIKE $2
          )
        `;
      }

      const limitIndex = params.length + 1;
      const offsetIndex = params.length + 2;
      const [rows, count] = await Promise.all([
        db.query<{
          id: number;
          program_id: number;
          program_name: string;
          section_id: number;
          section_name: string;
          academic_year_id: number;
          academic_year_name: string;
          teacher_id: number;
          teacher_name: string;
          teacher_email: string | null;
        }>(
          `
            SELECT
              psct.id,
              psct.program_id,
              ip.title AS program_name,
              psct.section_id,
              s.name AS section_name,
              psct.academic_year_id,
              ay.name AS academic_year_name,
              psct.teacher_id,
              u.full_name AS teacher_name,
              u.email AS teacher_email
            FROM program_section_class_teachers psct
            INNER JOIN institution_programs ip ON ip.id = psct.program_id
            INNER JOIN sections s ON s.id = psct.section_id
            INNER JOIN academic_years ay ON ay.id = psct.academic_year_id
            INNER JOIN users u ON u.id = psct.teacher_id
            WHERE ip.institution_id = $1
              ${searchClause}
            ORDER BY ip.title ASC, s.name ASC, ay.start_date DESC, ay.name DESC
            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}
          `,
          [...params, limit, offset]
        ),
        db.query<{ count: number }>(
          `
            SELECT COUNT(*)::int AS count
            FROM program_section_class_teachers psct
            INNER JOIN institution_programs ip ON ip.id = psct.program_id
            INNER JOIN sections s ON s.id = psct.section_id
            INNER JOIN academic_years ay ON ay.id = psct.academic_year_id
            INNER JOIN users u ON u.id = psct.teacher_id
            WHERE ip.institution_id = $1
              ${searchClause}
          `,
          params
        ),
      ]);
      const total = Number(count.rows[0]?.count ?? 0);

      return NextResponse.json({
        data: rows.rows,
        total,
        pageCount: getPageCount(total, limit),
        page,
      });
    }

    const selection = getSelection(url);
    if (!isValidSelection(selection)) {
      return NextResponse.json(
        { error: "Program, section, and academic year are required" },
        { status: 400 }
      );
    }

    const program = await getProgramScope(db, selection.programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    assertCanAccessInstitution(currentUser, program.institution_id);
    await assertProgramSectionSubjectYear(db, selection);

    const result = await db.query<{
      teacher_id: number;
      teacher_name: string;
      teacher_email: string | null;
    }>(
      `
        SELECT
          psct.teacher_id,
          u.full_name AS teacher_name,
          u.email AS teacher_email
        FROM program_section_class_teachers psct
        INNER JOIN users u ON u.id = psct.teacher_id
        WHERE psct.program_id = $1
          AND psct.section_id = $2
          AND psct.academic_year_id = $3
        LIMIT 1
      `,
      [selection.programId, selection.sectionId, selection.academicYearId]
    );

    return NextResponse.json({ data: result.rows[0] ?? null });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const ids = Array.from(
      new Set(
        (Array.isArray(body.ids) ? body.ids : [])
          .map(Number)
          .filter((id: number) => Number.isInteger(id) && id > 0)
      )
    );

    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one class teacher assignment" }, { status: 400 });
    }

    const assignments = await db.query<{ id: number; institution_id: number }>(
      `
        SELECT psct.id, ip.institution_id
        FROM program_section_class_teachers psct
        INNER JOIN institution_programs ip ON ip.id = psct.program_id
        WHERE psct.id = ANY($1::int[])
      `,
      [ids]
    );

    if (assignments.rows.length !== ids.length) {
      return NextResponse.json({ error: "One or more assignments no longer exist" }, { status: 404 });
    }

    for (const institutionId of new Set(assignments.rows.map((row) => Number(row.institution_id)))) {
      assertCanAccessInstitution(currentUser, institutionId);
    }

    await db.query(
      `DELETE FROM program_section_class_teachers WHERE id = ANY($1::int[])`,
      [ids]
    );

    return NextResponse.json({ success: true, cleared: ids.length });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const selection = {
      programId: Number(body.programId),
      sectionId: Number(body.sectionId),
      academicYearId: Number(body.academicYearId),
    };
    const teacherId = body.teacherId == null || body.teacherId === "" ? null : Number(body.teacherId);

    if (!isValidSelection(selection)) {
      return NextResponse.json(
        { error: "Program, section, and academic year are required" },
        { status: 400 }
      );
    }
    if (teacherId !== null && (!Number.isInteger(teacherId) || teacherId <= 0)) {
      return NextResponse.json({ error: "Select a valid class teacher" }, { status: 400 });
    }

    const program = await getProgramScope(db, selection.programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    assertCanAccessInstitution(currentUser, program.institution_id);
    await assertProgramSectionSubjectYear(db, selection);

    if (teacherId === null) {
      await db.query(
        `
          DELETE FROM program_section_class_teachers
          WHERE program_id = $1
            AND section_id = $2
            AND academic_year_id = $3
        `,
        [selection.programId, selection.sectionId, selection.academicYearId]
      );
    } else {
      await assertTeacherInInstitution(db, [teacherId], program.institution_id);
      await db.query(
        `
          INSERT INTO program_section_class_teachers (
            program_id,
            section_id,
            teacher_id,
            academic_year_id
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (program_id, section_id, academic_year_id)
          DO UPDATE SET
            teacher_id = EXCLUDED.teacher_id,
            updated_at = CURRENT_TIMESTAMP
        `,
        [selection.programId, selection.sectionId, teacherId, selection.academicYearId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
