import type { Pool, PoolClient } from "pg";

import { assertCanAccessInstitution, getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { hasPermission, isPlatformAdminUser, isStudentUser, type PermissionUser } from "@/lib/auth/permissions";
import { resolveInstitutionDefaultAcademicYearId } from "@/lib/queries/academic-sessions";

type Queryable = Pool | PoolClient;

export type StudyNoteRow = {
  id: number;
  title: string;
  institution_id: number;
  institution_name: string | null;
  subject_id: number | null;
  subject_name: string | null;
  syllabus_id: number | null;
  syllabus_title: string | null;
  syllabus_node_id?: number | null;
  syllabus_node_title?: string | null;
  program_id: number | null;
  program_title: string | null;
  section_id: number | null;
  section_name: string | null;
  is_active: boolean;
  is_paid?: boolean;
  price?: number;
  item_count: number;
  first_item_title: string | null;
  is_public: boolean;
  marketplace_requested: boolean;
  marketplace_requested_at: string | null;
  marketplace_requested_by: number | null;
  marketplace_requested_by_name: string | null;
  marketplace_approved: boolean;
  marketplace_approved_at: string | null;
  marketplace_approved_by: number | null;
  marketplace_approved_by_name: string | null;
  source_note_id: number | null;
  source_institution_id: number | null;
  source_institution_name: string | null;
  has_inherited_note: boolean;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteAttachment = {
  url: string;
  name?: string;
  type?: string;
  size?: number;
};

export type StudyNoteItemRow = {
  id: number;
  note_id: number;
  syllabus_node_id: number | null;
  node_title: string | null;
  node_type: string | null;
  title: string;
  body: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachments: NoteAttachment[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ListNotesOptions = {
  search?: string;
  limit?: number;
  offset?: number;
  institutionId?: number | null;
  subjectId?: number | null;
  syllabusId?: number | null;
  academicYearId?: number | null;
  view?: "my" | "requests" | "marketplace" | "classroom";
  studentEnrollmentScope?: StudentNoteEnrollmentScope | null;
};

type StudentNoteEnrollmentScope = {
  institution_id: number;
  program_id: number | null;
  section_id: number | null;
  academic_year_id: number;
};

type NoteInput = {
  institution_id: number;
  title?: string | null;
  subject_id?: number | null;
  syllabus_id?: number | null;
  syllabus_node_id?: number | null;
  program_id?: number | null;
  section_id?: number | null;
  is_active?: boolean;
  is_paid?: boolean;
  price?: number;
  marketplace_requested?: boolean;
};

type NoteItemInput = {
  note_id: number;
  syllabus_node_id?: number | null;
  title: string;
  body: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachments?: NoteAttachment[];
  is_active?: boolean;
};

let notesSchemaReady: Promise<void> | null = null;

function asPositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isPlatformUser(user: PermissionUser) {
  return isPlatformAdminUser(user);
}

export async function ensureNotesSchema(db: Queryable) {
  if (!notesSchemaReady) {
    notesSchemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS study_notes (
          id SERIAL PRIMARY KEY,
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
          syllabus_id INTEGER REFERENCES syllabi(id) ON DELETE SET NULL,
          syllabus_node_id INTEGER REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
          program_id INTEGER REFERENCES institution_programs(id) ON DELETE SET NULL,
          section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
          academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
          title TEXT NOT NULL DEFAULT '',
          body TEXT NOT NULL DEFAULT '',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          deleted_at TIMESTAMP NULL,
          deleted_by INTEGER REFERENCES users(id),
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`ALTER TABLE study_notes ALTER COLUMN title DROP NOT NULL`);
      await db.query(`ALTER TABLE study_notes ALTER COLUMN body DROP NOT NULL`);
      await db.query(`ALTER TABLE study_notes ALTER COLUMN title SET DEFAULT ''`);
      await db.query(`ALTER TABLE study_notes ALTER COLUMN body SET DEFAULT ''`);
      await db.query(`
        ALTER TABLE study_notes
          ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER REFERENCES users(id),
          ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER REFERENCES users(id),
          ADD COLUMN IF NOT EXISTS source_note_id INTEGER REFERENCES study_notes(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS source_institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
      `);
      await db.query(`
        UPDATE study_notes note
        SET academic_year_id = institution.default_academic_year_id
        FROM institution_profiles institution
        WHERE note.academic_year_id IS NULL
          AND institution.id = note.institution_id
          AND institution.default_academic_year_id IS NOT NULL
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS study_note_items (
          id SERIAL PRIMARY KEY,
          note_id INTEGER NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
          syllabus_node_id INTEGER REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          attachment_url TEXT,
          attachment_name TEXT,
          attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          deleted_at TIMESTAMP NULL,
          deleted_by INTEGER REFERENCES users(id),
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        ALTER TABLE study_note_items
          ADD COLUMN IF NOT EXISTS attachment_url TEXT,
          ADD COLUMN IF NOT EXISTS attachment_name TEXT,
          ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb
      `);
      await db.query(`
        ALTER TABLE study_notes
          ADD COLUMN IF NOT EXISTS syllabus_node_id INTEGER REFERENCES syllabus_nodes(id) ON DELETE SET NULL
      `);
      await db.query(`
        INSERT INTO study_note_items (note_id, syllabus_node_id, title, body, is_active, created_by, updated_by, sort_order, created_at, updated_at)
        SELECT note.id, note.syllabus_node_id, COALESCE(NULLIF(note.title, ''), 'Note'), COALESCE(note.body, ''), note.is_active, note.created_by, note.updated_by, 1, note.created_at, note.updated_at
        FROM study_notes note
        WHERE COALESCE(note.body, '') <> ''
          AND NOT EXISTS (
            SELECT 1 FROM study_note_items item WHERE item.note_id = note.id
          )
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_institution ON study_notes(institution_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_syllabus ON study_notes(syllabus_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_program_section ON study_notes(program_id, section_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_session ON study_notes(institution_id, academic_year_id, is_deleted, is_active)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_deleted ON study_notes(is_deleted)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_notes_marketplace ON study_notes(marketplace_requested, marketplace_approved, is_public)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_note_items_note ON study_note_items(note_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_study_note_items_node ON study_note_items(syllabus_node_id)`);
    })().catch((error) => {
      notesSchemaReady = null;
      throw error;
    });
  }
  return notesSchemaReady;
}

async function getStudentEnrollmentScope(db: Queryable, userId: number) {
  const result = await db.query<StudentNoteEnrollmentScope>(
    `
      SELECT se.institution_id, se.program_id, se.section_id, se.academic_year_id
      FROM student_profiles sp
      INNER JOIN student_enrollments se
        ON se.student_id = sp.id
       AND se.status = 'active'
       AND COALESCE(se.is_deleted, FALSE) = FALSE
      INNER JOIN academic_years academic_year
        ON academic_year.id = se.academic_year_id
       AND academic_year.institution_id = se.institution_id
       AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      WHERE sp.user_id = $1
    `,
    [userId]
  );
  return result.rows;
}

function noteSelectSql(inheritedInstitutionParam?: number, inheritedAcademicYearParam?: number) {
  return `
    SELECT
      note.id,
      COALESCE(note.title, '') AS title,
      note.institution_id,
      institution.name AS institution_name,
      note.subject_id,
      subject.name AS subject_name,
      note.syllabus_id,
      syllabus.title AS syllabus_title,
      note.syllabus_node_id,
      node.title AS syllabus_node_title,
      note.program_id,
      COALESCE(program.title, master_course.name) AS program_title,
      note.section_id,
      section.name AS section_name,
      note.academic_year_id,
      note.is_active,
      COALESCE(note.is_paid, FALSE) AS is_paid,
      COALESCE(note.price, 0)::float8 AS price,
      COALESCE(items.item_count, 0)::int AS item_count,
      items.first_item_title,
      note.is_public,
      note.marketplace_requested,
      note.marketplace_requested_at,
      note.marketplace_requested_by,
      requester.full_name AS marketplace_requested_by_name,
      note.marketplace_approved,
      note.marketplace_approved_at,
      note.marketplace_approved_by,
      approver.full_name AS marketplace_approved_by_name,
      note.source_note_id,
      note.source_institution_id,
      source_institution.name AS source_institution_name,
      ${
        inheritedInstitutionParam
          ? `EXISTS (
              SELECT 1
              FROM study_notes inherited_note
              WHERE inherited_note.source_note_id = note.id
                AND inherited_note.institution_id = $${inheritedInstitutionParam}
                ${inheritedAcademicYearParam ? `AND inherited_note.academic_year_id = $${inheritedAcademicYearParam}` : ""}
                AND COALESCE(inherited_note.is_deleted, FALSE) = FALSE
            )`
          : "FALSE"
      } AS has_inherited_note,
      note.created_by,
      creator.full_name AS created_by_name,
      note.created_at,
      note.updated_at
    FROM study_notes note
    INNER JOIN institution_profiles institution ON institution.id = note.institution_id
    LEFT JOIN subjects subject ON subject.id = note.subject_id
    LEFT JOIN syllabi syllabus ON syllabus.id = note.syllabus_id
    LEFT JOIN syllabus_nodes node ON node.id = note.syllabus_node_id
    LEFT JOIN institution_programs program ON program.id = note.program_id
    LEFT JOIN master_courses master_course ON master_course.id = note.program_id
    LEFT JOIN sections section ON section.id = note.section_id
    LEFT JOIN users requester ON requester.id = note.marketplace_requested_by
    LEFT JOIN users approver ON approver.id = note.marketplace_approved_by
    LEFT JOIN users creator ON creator.id = note.created_by
    LEFT JOIN institution_profiles source_institution ON source_institution.id = note.source_institution_id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS item_count,
        (ARRAY_AGG(item.title ORDER BY item.sort_order ASC, item.id ASC))[1] AS first_item_title
      FROM study_note_items item
      WHERE item.note_id = note.id
        AND COALESCE(item.is_deleted, FALSE) = FALSE
    ) items ON TRUE
  `;
}

function joinWhere(where: string[]) {
  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

export async function listNotes(db: Queryable, user: PermissionUser, opts: ListNotesOptions = {}) {
  await ensureNotesSchema(db);
  const params: unknown[] = [];
  const where = ["COALESCE(note.is_deleted, FALSE) = FALSE"];
  const search = opts.search?.trim() ?? "";
  const view = opts.view ?? "my";

  if (search) {
    params.push(`%${search}%`);
    where.push(`(subject.name ILIKE $${params.length} OR syllabus.title ILIKE $${params.length} OR program.title ILIKE $${params.length} OR institution.name ILIKE $${params.length} OR EXISTS (
      SELECT 1 FROM study_note_items search_item
      WHERE search_item.note_id = note.id
        AND COALESCE(search_item.is_deleted, FALSE) = FALSE
        AND (search_item.title ILIKE $${params.length} OR search_item.body ILIKE $${params.length})
    ))`);
  }

  const institutionId = asPositiveInteger(opts.institutionId);
  if (institutionId && view !== "marketplace") {
    assertCanAccessInstitution(user, institutionId);
    params.push(institutionId);
    where.push(`note.institution_id = $${params.length}`);
  } else if (!isPlatformUser(user) && !isStudentUser(user) && view !== "marketplace") {
    const allowedInstitutionIds = getAllowedInstitutionIds(user) ?? [];
    if (!allowedInstitutionIds.length) {
      where.push("FALSE");
    } else {
      params.push(allowedInstitutionIds);
      where.push(`note.institution_id = ANY($${params.length}::int[])`);
    }
  }

  const subjectId = asPositiveInteger(opts.subjectId);
  if (subjectId) {
    params.push(subjectId);
    where.push(`note.subject_id = $${params.length}`);
  }

  const syllabusId = asPositiveInteger(opts.syllabusId);
  if (syllabusId) {
    params.push(syllabusId);
    where.push(`note.syllabus_id = $${params.length}`);
  }

  const academicYearId = asPositiveInteger(opts.academicYearId);
  if (academicYearId && view !== "marketplace") {
    params.push(academicYearId);
    where.push(`note.academic_year_id = $${params.length}`);
  }

  if (view === "my") {
    params.push(user.id);
    where.push(`note.created_by = $${params.length}`);
  }

  if (view === "requests") {
    if (!isPlatformUser(user)) {
      where.push("FALSE");
    }
    where.push("note.marketplace_requested = TRUE");
    where.push("note.marketplace_approved = FALSE");
  }

  if (view === "marketplace") {
    where.push("(note.marketplace_approved = TRUE OR note.is_public = TRUE)");
    where.push("note.is_active = TRUE");
  }

  if (isStudentUser(user)) {
    const enrollments = opts.studentEnrollmentScope
      ? [opts.studentEnrollmentScope]
      : await getStudentEnrollmentScope(db, user.id);
    if (!enrollments.length) {
      where.push("FALSE");
    } else {
      params.push(enrollments.map((item) => item.institution_id));
      const institutionParam = params.length;
      params.push(enrollments.map((item) => item.program_id).filter(Boolean));
      const programParam = params.length;
      params.push(enrollments.map((item) => item.section_id).filter(Boolean));
      const sectionParam = params.length;
      params.push(enrollments.map((item) => item.academic_year_id).filter(Boolean));
      const academicYearParam = params.length;
      where.push(`note.is_active = TRUE`);
      where.push(`note.institution_id = ANY($${institutionParam}::int[])`);
      where.push(`note.academic_year_id = ANY($${academicYearParam}::int[])`);
      where.push(`(note.program_id IS NULL OR note.program_id = ANY($${programParam}::int[]))`);
      where.push(`(note.section_id IS NULL OR note.section_id = ANY($${sectionParam}::int[]))`);
    }
  }

  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  let inheritedInstitutionParam: number | undefined;
  let inheritedAcademicYearParam: number | undefined;
  if (view === "marketplace" && institutionId && !isPlatformUser(user) && !isStudentUser(user)) {
    assertCanAccessInstitution(user, institutionId);
    params.push(institutionId);
    inheritedInstitutionParam = params.length;
    if (academicYearId) {
      params.push(academicYearId);
      inheritedAcademicYearParam = params.length;
      where.push(`$${inheritedAcademicYearParam}::int IS NOT NULL`);
    }
    where.push(`note.institution_id <> $${inheritedInstitutionParam}`);
  }
  const whereSql = joinWhere(where);
  const [dataResult, countResult] = await Promise.all([
    db.query<StudyNoteRow>(
      `
        ${noteSelectSql(inheritedInstitutionParam, inheritedAcademicYearParam)}
        ${whereSql}
        ORDER BY
          (note.marketplace_requested = TRUE AND note.marketplace_approved = FALSE) DESC,
          note.updated_at DESC,
          note.id DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM study_notes note
        INNER JOIN institution_profiles institution ON institution.id = note.institution_id
        LEFT JOIN subjects subject ON subject.id = note.subject_id
        LEFT JOIN syllabi syllabus ON syllabus.id = note.syllabus_id
        LEFT JOIN institution_programs program ON program.id = note.program_id
        ${whereSql}
      `,
      params
    ),
  ]);

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

async function validateNoteInput(db: Queryable, user: PermissionUser, input: NoteInput) {
  assertCanAccessInstitution(user, input.institution_id);

  if (input.program_id) {
    const result = await db.query(
      `
        SELECT 1
        FROM institution_programs
        WHERE id = $1
          AND institution_id = $2
          AND is_active = TRUE
          AND COALESCE(is_deleted, FALSE) = FALSE
        UNION ALL
        SELECT 1
        FROM master_courses
        WHERE id = $1
          AND is_active = TRUE
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [input.program_id, input.institution_id]
    );
    if (!result.rowCount) throw new Error("Selected class or course is not available");
  }

  if (input.section_id) {
    if (!input.program_id) throw new Error("Class / Program is required for section notes");
    const result = await db.query(
      `SELECT 1 FROM program_sections WHERE program_id = $1 AND section_id = $2 LIMIT 1`,
      [input.program_id, input.section_id]
    );
    if (!result.rowCount) throw new Error("Selected section is not in this class");
  }

  if (input.syllabus_id) {
    const result = await db.query<{ subject_id: number }>(
      `
        SELECT subject_id
        FROM syllabi
        WHERE id = $1
          AND COALESCE(is_active, TRUE) = TRUE
          AND (is_template = TRUE OR institution_id = $2)
        LIMIT 1
      `,
      [input.syllabus_id, input.institution_id]
    );
    const syllabus = result.rows[0];
    if (!syllabus) throw new Error("Selected syllabus is not available for this institution");
    if (input.subject_id && input.subject_id !== syllabus.subject_id) {
      throw new Error("Subject must match the selected syllabus");
    }
  }

  if (input.syllabus_node_id && input.syllabus_id) {
    const nodeRes = await db.query(
      `SELECT 1 FROM syllabus_nodes WHERE id = $1 AND syllabus_id = $2 AND COALESCE(is_active, TRUE) = TRUE LIMIT 1`,
      [input.syllabus_node_id, input.syllabus_id]
    );
    if (!nodeRes.rowCount) throw new Error("Selected syllabus unit or chapter is invalid");
  }
}

export async function createNote(db: Queryable, user: PermissionUser, input: NoteInput) {
  await ensureNotesSchema(db);
  await validateNoteInput(db, user, input);
  const requested = Boolean(input.marketplace_requested);
  const isPaid = Boolean(input.is_paid || (Number(input.price) > 0));
  const price = isPaid ? Math.max(0, Number(input.price) || 0) : 0;
  const title = (input.title ?? "").trim();
  const result = await db.query<{ id: number }>(
    `
      INSERT INTO study_notes (
        institution_id, academic_year_id, subject_id, syllabus_id, syllabus_node_id, program_id, section_id,
        title, is_active, is_paid, price, marketplace_requested, marketplace_requested_at, marketplace_requested_by,
        marketplace_approved, is_public, created_by, updated_by
      )
      VALUES (
        $1,
        (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1),
        $2,
        $3,
        $4,
        $5,
        $6,
        $11,
        $7,
        $9,
        $10,
        $8,
        CASE WHEN $8 THEN CURRENT_TIMESTAMP ELSE NULL::timestamp END,
        CASE WHEN $8 THEN $12::integer ELSE NULL::integer END,
        FALSE,
        FALSE,
        $12,
        $12
      )
      RETURNING id
    `,
    [
      input.institution_id,
      input.subject_id ?? null,
      input.syllabus_id ?? null,
      input.syllabus_node_id ?? null,
      input.program_id ?? null,
      input.section_id ?? null,
      input.is_active ?? false,
      requested,
      isPaid,
      price,
      title,
      user.id,
    ]
  );
  return result.rows[0].id;
}

export async function updateNote(db: Queryable, user: PermissionUser, noteId: number, input: NoteInput) {
  await ensureNotesSchema(db);
  await assertCanManageNote(db, user, noteId);
  await validateNoteInput(db, user, input);
  const requested = Boolean(input.marketplace_requested);
  const isPaid = Boolean(input.is_paid || (Number(input.price) > 0));
  const price = isPaid ? Math.max(0, Number(input.price) || 0) : 0;
  const title = (input.title ?? "").trim();
  await db.query(
    `
      UPDATE study_notes
      SET institution_id = $2,
          academic_year_id = (SELECT default_academic_year_id FROM institution_profiles WHERE id = $2),
          subject_id = $3,
          syllabus_id = $4,
          syllabus_node_id = $12,
          program_id = $5,
          section_id = $6,
          title = $13,
          is_active = $7,
          is_paid = $10,
          price = $11,
          marketplace_requested = $8,
          marketplace_requested_at = CASE WHEN $8 THEN COALESCE(marketplace_requested_at, CURRENT_TIMESTAMP) ELSE NULL END,
          marketplace_requested_by = CASE WHEN $8 THEN COALESCE(marketplace_requested_by, $9::integer) ELSE NULL::integer END,
          marketplace_approved = CASE WHEN $8 THEN marketplace_approved ELSE FALSE END,
          marketplace_approved_at = CASE WHEN $8 THEN marketplace_approved_at ELSE NULL END,
          marketplace_approved_by = CASE WHEN $8 THEN marketplace_approved_by ELSE NULL END,
          is_public = CASE WHEN $8 THEN is_public ELSE FALSE END,
          updated_by = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
    `,
    [
      noteId,
      input.institution_id,
      input.subject_id ?? null,
      input.syllabus_id ?? null,
      input.program_id ?? null,
      input.section_id ?? null,
      input.is_active ?? true,
      requested,
      user.id,
      isPaid,
      price,
      input.syllabus_node_id ?? null,
      title,
    ]
  );
}

async function assertCanManageNote(db: Queryable, user: PermissionUser, noteId: number) {
  const result = await db.query<{ institution_id: number; created_by: number | null }>(
    `SELECT institution_id, created_by FROM study_notes WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
    [noteId]
  );
  const note = result.rows[0];
  if (!note) throw new Error("Note not found");
  assertCanAccessInstitution(user, note.institution_id);
  if (note.created_by !== user.id) throw new Error("You can only edit notes you created");
  return note;
}

export async function listNoteItems(
  db: Queryable,
  user: PermissionUser,
  noteId: number,
  studentEnrollmentScope?: StudentNoteEnrollmentScope | null
) {
  await ensureNotesSchema(db);
  if (!isPlatformUser(user) && !isStudentUser(user)) {
    const allowedInstitutionIds = getAllowedInstitutionIds(user) ?? [];
    const access = await db.query(
      `
        SELECT 1
        FROM study_notes note
        WHERE note.id = $1
          AND COALESCE(note.is_deleted, FALSE) = FALSE
          AND (
            note.institution_id = ANY($2::int[])
            OR (note.marketplace_approved = TRUE AND note.is_public = TRUE AND note.is_active = TRUE)
          )
        LIMIT 1
      `,
      [noteId, allowedInstitutionIds]
    );
    if (!access.rowCount) throw new Error("Note not found");
  }
  if (isStudentUser(user)) {
    const enrollments = studentEnrollmentScope
      ? [studentEnrollmentScope]
      : await getStudentEnrollmentScope(db, user.id);
    if (!enrollments.length) throw new Error("Note not found");
    const institutionIds = enrollments.map((item) => item.institution_id);
    const programIds = enrollments.map((item) => item.program_id).filter(Boolean);
    const sectionIds = enrollments.map((item) => item.section_id).filter(Boolean);
    const access = await db.query(
      `
        SELECT 1
        FROM study_notes note
        WHERE note.id = $1
          AND note.is_active = TRUE
          AND COALESCE(note.is_deleted, FALSE) = FALSE
          AND note.institution_id = ANY($2::int[])
          AND (note.program_id IS NULL OR note.program_id = ANY($3::int[]))
          AND (note.section_id IS NULL OR note.section_id = ANY($4::int[]))
        LIMIT 1
      `,
      [noteId, institutionIds, programIds, sectionIds]
    );
    if (!access.rowCount) throw new Error("Note not found");
  }
  const result = await db.query<StudyNoteItemRow>(
    `
      SELECT
        item.id,
        item.note_id,
        item.syllabus_node_id,
        node.title AS node_title,
        node.node_type,
        item.title,
        item.body,
        item.attachment_url,
        item.attachment_name,
        COALESCE(item.attachments, '[]'::jsonb) AS attachments,
        item.is_active,
        item.sort_order,
        item.created_at,
        item.updated_at
      FROM study_note_items item
      INNER JOIN study_notes note ON note.id = item.note_id
      LEFT JOIN syllabus_nodes node ON node.id = item.syllabus_node_id
      WHERE item.note_id = $1
        AND COALESCE(item.is_deleted, FALSE) = FALSE
        AND COALESCE(note.is_deleted, FALSE) = FALSE
      ORDER BY item.sort_order ASC, item.id ASC
    `,
    [noteId]
  );
  return result.rows;
}

async function validateNoteItemInput(db: Queryable, user: PermissionUser, input: NoteItemInput) {
  const note = await assertCanManageNote(db, user, input.note_id);
  if (input.syllabus_node_id) {
    const result = await db.query(
      `
        SELECT 1
        FROM study_notes note
        INNER JOIN syllabus_nodes node ON node.syllabus_id = note.syllabus_id
        WHERE note.id = $1
          AND node.id = $2
          AND (note.institution_id = $3 OR note.institution_id IS NULL)
          AND COALESCE(node.is_active, TRUE) = TRUE
        LIMIT 1
      `,
      [input.note_id, input.syllabus_node_id, note.institution_id]
    );
    if (!result.rowCount) throw new Error("Selected syllabus node is invalid");
  }
}

export async function createNoteItem(db: Queryable, user: PermissionUser, input: NoteItemInput) {
  await ensureNotesSchema(db);
  await validateNoteItemInput(db, user, input);
  const attachmentsJson = JSON.stringify(input.attachments || []);
  const result = await db.query<{ id: number }>(
    `
      INSERT INTO study_note_items (
        note_id, syllabus_node_id, title, body, attachment_url, attachment_name, attachments, is_active, created_by, updated_by, sort_order
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $9,
        COALESCE((SELECT MAX(sort_order) + 1 FROM study_note_items WHERE note_id = $1), 1)
      )
      RETURNING id
    `,
    [
      input.note_id,
      input.syllabus_node_id ?? null,
      input.title,
      input.body,
      input.attachment_url ?? null,
      input.attachment_name ?? null,
      attachmentsJson,
      input.is_active ?? true,
      user.id,
    ]
  );
  await db.query(`UPDATE study_notes SET updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`, [input.note_id, user.id]);
  return result.rows[0].id;
}

export async function updateNoteItem(db: Queryable, user: PermissionUser, itemId: number, input: NoteItemInput) {
  await ensureNotesSchema(db);
  await validateNoteItemInput(db, user, input);
  const attachmentsJson = JSON.stringify(input.attachments || []);
  await db.query(
    `
      UPDATE study_note_items
      SET syllabus_node_id = $3,
          title = $4,
          body = $5,
          attachment_url = $6,
          attachment_name = $7,
          attachments = $8::jsonb,
          is_active = $9,
          updated_by = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND note_id = $2
        AND COALESCE(is_deleted, FALSE) = FALSE
    `,
    [
      itemId,
      input.note_id,
      input.syllabus_node_id ?? null,
      input.title,
      input.body,
      input.attachment_url ?? null,
      input.attachment_name ?? null,
      attachmentsJson,
      input.is_active ?? true,
      user.id,
    ]
  );
  await db.query(`UPDATE study_notes SET updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`, [input.note_id, user.id]);
}

export async function deleteNoteItems(db: Queryable, user: PermissionUser, noteId: number, ids: number[]) {
  await ensureNotesSchema(db);
  if (!ids.length) throw new Error("Select at least one note item");
  await assertCanManageNote(db, user, noteId);
  await db.query(
    `
      UPDATE study_note_items
      SET is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP,
          deleted_by = $3,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE note_id = $1
        AND id = ANY($2::int[])
    `,
    [noteId, ids, user.id]
  );
  await db.query(`UPDATE study_notes SET updated_at = CURRENT_TIMESTAMP, updated_by = $2 WHERE id = $1`, [noteId, user.id]);
}

export async function approveNoteMarketplace(db: Queryable, user: PermissionUser, noteId: number) {
  await ensureNotesSchema(db);
  if (!hasPermission(user, "content.notes.edit")) throw new Error("You don't have permission to approve notes");
  await db.query(
    `
      UPDATE study_notes
      SET marketplace_approved = TRUE,
          marketplace_approved_at = CURRENT_TIMESTAMP,
          marketplace_approved_by = $2,
          is_public = TRUE,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND marketplace_requested = TRUE
        AND COALESCE(is_deleted, FALSE) = FALSE
    `,
    [noteId, user.id]
  );
}

export async function removeNoteFromMarketplace(db: Queryable, user: PermissionUser, noteId: number) {
  await ensureNotesSchema(db);
  if (!hasPermission(user, "content.notes.edit")) throw new Error("You don't have permission to review notes");
  await db.query(
    `
      UPDATE study_notes
      SET marketplace_approved = FALSE,
          marketplace_approved_at = NULL,
          marketplace_approved_by = NULL,
          is_public = FALSE,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
    `,
    [noteId, user.id]
  );
}

export async function inheritMarketplaceNote(db: Queryable, user: PermissionUser, noteId: number, institutionId: number) {
  await ensureNotesSchema(db);
  assertCanAccessInstitution(user, institutionId);
  const academicYearId = await resolveInstitutionDefaultAcademicYearId(db, institutionId);
  const source = await db.query<StudyNoteRow>(
    `
      ${noteSelectSql()}
      WHERE note.id = $1
        AND note.marketplace_approved = TRUE
        AND note.is_public = TRUE
        AND COALESCE(note.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [noteId]
  );
  const row = source.rows[0];
  if (!row) throw new Error("This note is not available in marketplace");

  const existing = await db.query<{ id: number }>(
    `
      SELECT id
      FROM study_notes
      WHERE source_note_id = $1
        AND institution_id = $2
        AND academic_year_id = $3
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    [row.id, institutionId, academicYearId]
  );
  if (existing.rows[0]) {
    const targetId = existing.rows[0].id;
    await db.query(
      `
        UPDATE study_notes
        SET subject_id = $2,
            syllabus_id = $3,
            program_id = NULL,
            section_id = NULL,
            is_active = FALSE,
            source_institution_id = $4,
            updated_by = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [targetId, row.subject_id, row.syllabus_id, row.institution_id, user.id]
    );
    await db.query(`DELETE FROM study_note_items WHERE note_id = $1`, [targetId]);
    await db.query(
      `
        INSERT INTO study_note_items (note_id, syllabus_node_id, title, body, is_active, created_by, updated_by, sort_order)
        SELECT $2, syllabus_node_id, title, body, is_active, $3, $3, sort_order
        FROM study_note_items
        WHERE note_id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
        ORDER BY sort_order ASC, id ASC
      `,
      [noteId, targetId, user.id]
    );
    return targetId;
  }

  const result = await db.query<{ id: number }>(
    `
      INSERT INTO study_notes (
        institution_id, academic_year_id, subject_id, syllabus_id, program_id, section_id,
        is_active, source_note_id, source_institution_id, created_by, updated_by
      )
      VALUES ($1,$2,$3,$4,NULL,NULL,FALSE,$5,$6,$7,$7)
      RETURNING id
    `,
    [
      institutionId,
      academicYearId,
      row.subject_id,
      row.syllabus_id,
      row.id,
      row.institution_id,
      user.id,
    ]
  );
  const targetId = result.rows[0].id;
  await db.query(
    `
      INSERT INTO study_note_items (note_id, syllabus_node_id, title, body, is_active, created_by, updated_by, sort_order)
      SELECT $2, syllabus_node_id, title, body, is_active, $3, $3, sort_order
      FROM study_note_items
      WHERE note_id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY sort_order ASC, id ASC
    `,
    [noteId, targetId, user.id]
  );
  return targetId;
}

export async function deleteNotes(db: Queryable, user: PermissionUser, ids: number[]) {
  await ensureNotesSchema(db);
  if (!ids.length) throw new Error("Select at least one note");
  const allowedInstitutionIds = getAllowedInstitutionIds(user);
  const params: unknown[] = [ids, user.id];
  const scoped = allowedInstitutionIds ? "AND institution_id = ANY($3::int[])" : "";
  if (allowedInstitutionIds) params.push(allowedInstitutionIds);
  await db.query(
    `
      UPDATE study_notes
      SET is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP,
          deleted_by = $2,
          is_public = FALSE,
          marketplace_approved = FALSE
      WHERE id = ANY($1::int[])
        AND created_by = $2
        ${scoped}
    `,
    params
  );
}

export async function listNoteInstitutions(db: Queryable, user: PermissionUser, search = "", limit = 15, offset = 0) {
  const allowedInstitutionIds = getAllowedInstitutionIds(user);
  const params: unknown[] = [];
  const where = ["ip.is_active = TRUE", "COALESCE(ip.is_deleted, FALSE) = FALSE"];
  if (allowedInstitutionIds) {
    params.push(allowedInstitutionIds);
    where.push(`ip.id = ANY($${params.length}::int[])`);
  }
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(ip.name ILIKE $${params.length} OR ip.slug ILIKE $${params.length})`);
  }
  const whereSql = joinWhere(where);
  const [data, count] = await Promise.all([
    db.query<{ id: number; name: string }>(
      `SELECT ip.id, COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS name FROM institution_profiles ip ${whereSql} ORDER BY name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM institution_profiles ip ${whereSql}`, params),
  ]);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function listNotePrograms(db: Queryable, user: PermissionUser, institutionId: number, search = "", limit = 15, offset = 0) {
  assertCanAccessInstitution(user, institutionId);
  const params: unknown[] = [institutionId];
  const where = ["program.institution_id = $1", "program.is_active = TRUE", "COALESCE(program.is_deleted, FALSE) = FALSE"];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`program.title ILIKE $${params.length}`);
  }
  const whereSql = joinWhere(where);
  const [data, count] = await Promise.all([
    db.query<{ id: number; title: string }>(
      `SELECT program.id, program.title FROM institution_programs program ${whereSql} ORDER BY program.title LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM institution_programs program ${whereSql}`, params),
  ]);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function listNoteSections(db: Queryable, user: PermissionUser, programId: number, search = "", limit = 15, offset = 0) {
  const program = await db.query<{ institution_id: number }>(`SELECT institution_id FROM institution_programs WHERE id = $1 LIMIT 1`, [programId]);
  const institutionId = program.rows[0]?.institution_id;
  if (!institutionId) throw new Error("Class / Program not found");
  assertCanAccessInstitution(user, institutionId);
  const params: unknown[] = [programId];
  const where = ["ps.program_id = $1", "section.is_active = TRUE", "COALESCE(section.is_deleted, FALSE) = FALSE"];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`section.name ILIKE $${params.length}`);
  }
  const whereSql = joinWhere(where);
  const [data, count] = await Promise.all([
    db.query<{ id: number; name: string }>(
      `SELECT section.id, section.name FROM program_sections ps INNER JOIN sections section ON section.id = ps.section_id ${whereSql} ORDER BY section.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM program_sections ps INNER JOIN sections section ON section.id = ps.section_id ${whereSql}`,
      params
    ),
  ]);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function listNoteSyllabi(
  db: Queryable,
  user: PermissionUser,
  institutionId: number,
  search = "",
  limit = 15,
  offset = 0,
  programId?: number | null
) {
  assertCanAccessInstitution(user, institutionId);
  const params: unknown[] = [institutionId];
  const where = [
    "COALESCE(s.is_active, TRUE) = TRUE",
    "(s.institution_id = $1 OR s.is_template = TRUE)",
  ];
  if (programId) {
    params.push(programId);
    where.push(`(
      s.subject_id IN (
        SELECT subject_id FROM master_course_subjects WHERE course_id = $${params.length}
        UNION
        SELECT subject_id FROM program_subjects WHERE program_id = $${params.length}
      )
      OR s.is_template = TRUE
    )`);
  }
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(s.title ILIKE $${params.length} OR subject.name ILIKE $${params.length})`);
  }
  const whereSql = joinWhere(where);
  const [data, count] = await Promise.all([
    db.query<{ id: number; title: string; subject_id: number; subject_name: string }>(
      `
        SELECT s.id, s.title, s.subject_id, subject.name AS subject_name
        FROM syllabi s
        INNER JOIN subjects subject ON subject.id = s.subject_id
        ${whereSql}
        ORDER BY s.is_template ASC, s.title ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM syllabi s
        INNER JOIN subjects subject ON subject.id = s.subject_id
        ${whereSql}
      `,
      params
    ),
  ]);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}

export async function listNoteSyllabusNodes(
  db: Queryable,
  user: PermissionUser,
  syllabusId: number,
  search = "",
  limit = 50,
  offset = 0
) {
  const syllabus = await db.query<{ institution_id: number | null; is_template: boolean }>(
    `SELECT institution_id, is_template FROM syllabi WHERE id = $1 LIMIT 1`,
    [syllabusId]
  );
  const owner = syllabus.rows[0];
  if (!owner) throw new Error("Syllabus not found");
  if (owner.institution_id) assertCanAccessInstitution(user, owner.institution_id);

  const params: unknown[] = [syllabusId];
  const where = ["node.syllabus_id = $1", "COALESCE(node.is_active, TRUE) = TRUE"];
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where.push(`(node.title ILIKE $${params.length} OR node.node_type ILIKE $${params.length})`);
  }
  const whereSql = joinWhere(where);
  const [data, count] = await Promise.all([
    db.query<{ id: number; title: string; node_type: string; parent_id: number | null; sort_order: number }>(
      `
        SELECT node.id, node.title, node.node_type, node.parent_id, node.sort_order
        FROM syllabus_nodes node
        ${whereSql}
        ORDER BY node.parent_id NULLS FIRST, node.sort_order ASC, node.id ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM syllabus_nodes node ${whereSql}`,
      params
    ),
  ]);
  return { data: data.rows, total: Number(count.rows[0]?.count ?? 0) };
}
