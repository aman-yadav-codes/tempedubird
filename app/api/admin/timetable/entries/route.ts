import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { assertProgramSectionSubjectYear, getProgramScope, getProgramSubjects } from "@/lib/queries/timetable";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function assertTeachersInInstitution(teacherIds: number[], institutionId: number) {
  const ids = Array.from(new Set(teacherIds));
  if (!ids.length) return;

  const result = await db.query<{ count: number }>(
    `
      SELECT COUNT(DISTINCT u.id)::int AS count
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN institution_memberships im
        ON im.user_id = u.id
       AND im.institution_id = $2
       AND im.is_active = TRUE
      INNER JOIN institution_profiles ip
        ON ip.id = $2
       AND ip.is_active = TRUE
       AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN roles membership_role ON membership_role.id = im.role_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles platform_role ON platform_role.id = ur.role_id
      WHERE u.id = ANY($1::int[])
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND (up.under_institution_id = $2 OR im.institution_id = $2)
        AND (
          COALESCE(up.is_teacher, FALSE) = TRUE
          OR platform_role.code = 'teacher'
          OR membership_role.code = 'teacher'
        )
    `,
    [ids, institutionId]
  );

  if (Number(result.rows[0]?.count ?? 0) !== ids.length) {
    throw new Error("Teachers must belong to the selected institution");
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const programId = Number(url.searchParams.get("programId"));
    const sectionId = Number(url.searchParams.get("sectionId"));
    const academicYearId = Number(url.searchParams.get("academicYearId"));
    if (![programId, sectionId, academicYearId].every((id) => Number.isInteger(id) && id > 0)) {
      return NextResponse.json({ error: "Program, section, and academic year are required" }, { status: 400 });
    }

    const program = await getProgramScope(db, programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    const currentUser = await requirePermission(req, "content.timetable_setup.view", program.institution_id);
    assertCanAccessInstitution(currentUser, program.institution_id);
    await assertProgramSectionSubjectYear(db, { programId, sectionId, academicYearId });

    const [slots, programSubjects, subjectMappings, entries] = await Promise.all([
      db.query(
        `
        SELECT id, institution_id, slot_name, slot_order, start_time, end_time, slot_type, is_active
        FROM timetable_slots
        WHERE institution_id = $1
          AND is_active = TRUE
          ORDER BY slot_order ASC, start_time ASC
        `,
        [program.institution_id]
      ),
      getProgramSubjects(db, programId),
      db.query<{
        subject_id: number;
        teacher_id: number;
        teacher_name: string;
      }>(
        `
          SELECT pst.subject_id, pst.teacher_id, u.full_name AS teacher_name
          FROM program_subject_teachers pst
          INNER JOIN users u ON u.id = pst.teacher_id
          WHERE pst.program_id = $1
            AND pst.section_id = $2
            AND pst.academic_year_id = $3
        `,
        [programId, sectionId, academicYearId]
      ),
      db.query(
        `
          SELECT
            te.id,
            te.day_of_week,
            te.slot_id,
            te.subject_id,
            s.name AS subject_name,
            COALESCE(te.teacher_id, pst.teacher_id) AS teacher_id,
            u.full_name AS teacher_name
          FROM timetable_entries te
          INNER JOIN subjects s ON s.id = te.subject_id
          LEFT JOIN program_subject_teachers pst
            ON pst.program_id = te.program_id
           AND pst.section_id = te.section_id
           AND pst.academic_year_id = te.academic_year_id
           AND pst.subject_id = te.subject_id
          LEFT JOIN users u ON u.id = COALESCE(te.teacher_id, pst.teacher_id)
          WHERE te.program_id = $1
            AND te.section_id = $2
            AND te.academic_year_id = $3
          ORDER BY te.day_of_week ASC, te.slot_id ASC
        `,
        [programId, sectionId, academicYearId]
      ),
    ]);
    const mappingsBySubject = new Map(
      subjectMappings.rows.map((mapping) => [Number(mapping.subject_id), mapping])
    );
    const subjects = programSubjects.map((subject) => ({
      ...subject,
      mapped_teacher_id: mappingsBySubject.get(subject.id)?.teacher_id ?? null,
      mapped_teacher_name: mappingsBySubject.get(subject.id)?.teacher_name ?? null,
    }));

    return NextResponse.json({
      slots: slots.rows,
      subjects,
      entries: entries.rows,
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
    const body = await req.json();
    const programId = Number(body.programId);
    const sectionId = Number(body.sectionId);
    const academicYearId = Number(body.academicYearId);
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (![programId, sectionId, academicYearId].every((id) => Number.isInteger(id) && id > 0)) {
      return NextResponse.json({ error: "Program, section, and academic year are required" }, { status: 400 });
    }

    const program = await getProgramScope(db, programId);
    if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });
    const currentUser = await requirePermission(req, "content.timetable_setup.edit", program.institution_id);
    assertCanAccessInstitution(currentUser, program.institution_id);

    const normalized = entries
      .map((item: Record<string, unknown>) => ({
        dayOfWeek: Number(item.dayOfWeek),
        slotId: Number(item.slotId),
        subjectId: Number(item.subjectId),
        teacherId: Number(item.teacherId),
      }))
      .filter((item) =>
        Number.isInteger(item.dayOfWeek) &&
        item.dayOfWeek >= 1 &&
        item.dayOfWeek <= 7 &&
        Number.isInteger(item.slotId) &&
        item.slotId > 0 &&
        Number.isInteger(item.subjectId) &&
        item.subjectId > 0 &&
        Number.isInteger(item.teacherId) &&
        item.teacherId > 0
      );

    await assertProgramSectionSubjectYear(db, {
      programId,
      sectionId,
      academicYearId,
      subjectIds: normalized.map((item) => item.subjectId),
    });
    await assertTeachersInInstitution(
      normalized.map((item) => item.teacherId),
      program.institution_id
    );

    if (normalized.length) {
      const slotResult = await db.query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM timetable_slots
          WHERE institution_id = $1
            AND slot_type = 'CLASS'
            AND id = ANY($2::int[])
        `,
        [program.institution_id, Array.from(new Set(normalized.map((item) => item.slotId)))]
      );
      if (Number(slotResult.rows[0]?.count ?? 0) !== new Set(normalized.map((item) => item.slotId)).size) {
        throw new Error("Timetable entries can only use class slots from the selected institution");
      }
    }

    await client.query("BEGIN");
    await client.query(
      `
        DELETE FROM timetable_entries
        WHERE program_id = $1
          AND section_id = $2
          AND academic_year_id = $3
      `,
      [programId, sectionId, academicYearId]
    );

    for (const entry of normalized) {
      await client.query(
        `
          INSERT INTO timetable_entries (
            academic_year_id,
            program_id,
            section_id,
            day_of_week,
            slot_id,
            subject_id,
            teacher_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          academicYearId,
          programId,
          sectionId,
          entry.dayOfWeek,
          entry.slotId,
          entry.subjectId,
          entry.teacherId,
        ]
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
