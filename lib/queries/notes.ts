import type { PoolClient } from "pg";

import { db } from "@/lib/db/db";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import type { PermissionUser } from "@/lib/auth/permissions";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import type {
  NoteTemplateQuestion,
  NoteTemplateRow,
} from "@/lib/types/notes";

type Queryable = Pick<PoolClient, "query">;

let notesSchemaReady: Promise<void> | null = null;

export function ensureNotesSchema(queryable: Queryable = db) {
  if (!notesSchemaReady) {
    notesSchemaReady = (async () => {
      await queryable.query(`
        CREATE TABLE IF NOT EXISTS study_notes (
          id SERIAL PRIMARY KEY,
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL DEFAULT '',
          description TEXT,
          subject_id VARCHAR(100),
          subject_name VARCHAR(255),
          syllabus_data JSONB DEFAULT '[]'::jsonb,
          target_type VARCHAR(50) DEFAULT 'INSTITUTION',
          target_id INTEGER,
          target_program_id INTEGER,
          ai_question_format JSONB DEFAULT '{"enabled":false,"true_false":0,"objective":0,"subjective":0}'::jsonb NOT NULL,
          is_public BOOLEAN DEFAULT FALSE NOT NULL,
          is_paid BOOLEAN DEFAULT FALSE NOT NULL,
          price NUMERIC(10,2) DEFAULT 0 NOT NULL,
          marketplace_requested BOOLEAN DEFAULT FALSE NOT NULL,
          marketplace_requested_at TIMESTAMP,
          marketplace_requested_by INTEGER REFERENCES users(id),
          marketplace_approved BOOLEAN DEFAULT FALSE NOT NULL,
          marketplace_approved_at TIMESTAMP,
          marketplace_approved_by INTEGER REFERENCES users(id),
          source_note_id INTEGER REFERENCES study_notes(id) ON DELETE SET NULL,
          source_institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
          parent_template_id INTEGER REFERENCES study_notes(id) ON DELETE SET NULL,
          academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
          blocked_by_platform BOOLEAN DEFAULT FALSE NOT NULL,
          blocked_by INTEGER REFERENCES users(id),
          blocked_at TIMESTAMP,
          block_reason TEXT,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
          deleted_at TIMESTAMP,
          deleted_by INTEGER REFERENCES users(id),
          created_by INTEGER NOT NULL REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        ALTER TABLE study_notes
          ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS description TEXT,
          ADD COLUMN IF NOT EXISTS subject_id VARCHAR(100),
          ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS syllabus_data JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS target_type VARCHAR(50) DEFAULT 'INSTITUTION',
          ADD COLUMN IF NOT EXISTS target_id INTEGER,
          ADD COLUMN IF NOT EXISTS target_program_id INTEGER,
          ADD COLUMN IF NOT EXISTS ai_question_format JSONB DEFAULT '{"enabled":false,"true_false":0,"objective":0,"subjective":0}'::jsonb,
          ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER,
          ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER,
          ADD COLUMN IF NOT EXISTS source_note_id INTEGER,
          ADD COLUMN IF NOT EXISTS source_institution_id INTEGER,
          ADD COLUMN IF NOT EXISTS parent_template_id INTEGER,
          ADD COLUMN IF NOT EXISTS academic_year_id INTEGER,
          ADD COLUMN IF NOT EXISTS blocked_by_platform BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS blocked_by INTEGER,
          ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS block_reason TEXT,
          ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

        CREATE TABLE IF NOT EXISTS study_note_items (
          id SERIAL PRIMARY KEY,
          note_id INTEGER NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
          question_text TEXT NOT NULL DEFAULT '',
          question_type VARCHAR(50) NOT NULL DEFAULT 'true_false',
          answer_text TEXT DEFAULT '',
          correct_answer TEXT,
          options JSONB DEFAULT '[]'::jsonb,
          files JSONB DEFAULT '[]'::jsonb,
          answer_files JSONB DEFAULT '[]'::jsonb,
          display_order INTEGER NOT NULL DEFAULT 1,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE study_note_items
          ADD COLUMN IF NOT EXISTS question_text TEXT DEFAULT '',
          ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'true_false',
          ADD COLUMN IF NOT EXISTS answer_text TEXT DEFAULT '',
          ADD COLUMN IF NOT EXISTS correct_answer TEXT,
          ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS answer_files JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1,
          ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

        CREATE INDEX IF NOT EXISTS idx_study_notes_inst ON study_notes(institution_id);
        CREATE INDEX IF NOT EXISTS idx_study_notes_del ON study_notes(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_study_notes_mkt ON study_notes(marketplace_requested, marketplace_approved, is_public);
        CREATE INDEX IF NOT EXISTS idx_study_note_items_note ON study_note_items(note_id);
      `);
    })().catch((err) => {
      notesSchemaReady = null;
      throw err;
    });
  }
  return notesSchemaReady;
}

export async function replaceNoteQuestions(
  client: Queryable,
  noteId: number,
  questions: NoteTemplateQuestion[]
) {
  await client.query(`DELETE FROM study_note_items WHERE note_id = $1`, [noteId]);

  if (questions.length === 0) return;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await client.query(
      `
        INSERT INTO study_note_items (
          note_id, question_text, question_type, answer_text, correct_answer,
          options, files, answer_files, display_order, is_active, is_deleted
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, TRUE, FALSE)
      `,
      [
        noteId,
        q.question_text.trim(),
        q.question_type,
        q.answer_text ? q.answer_text.trim() : "",
        q.correct_answer ?? null,
        JSON.stringify(q.options || []),
        JSON.stringify(q.files || []),
        JSON.stringify(q.answer_files || []),
        i + 1,
      ]
    );
  }

  await client.query(
    `UPDATE study_notes SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [noteId]
  );
}

export async function listNotes(
  dbQuery: Queryable,
  user: PermissionUser,
  opts: {
    search?: string;
    limit?: number;
    offset?: number;
    institutionId?: number | null;
    view?: "my" | "marketplace" | "requests";
  } = {}
) {
  await ensureNotesSchema(dbQuery);
  const search = opts.search?.trim() ?? "";
  const view = opts.view ?? "my";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const isPlatformAdmin = isPlatformAdminUser(user);
  const allowedInstitutionIds = getAllowedInstitutionIds(user);

  const whereParams: unknown[] = [];
  const where: string[] = ["COALESCE(note.is_deleted, FALSE) = FALSE"];

  if (search) {
    whereParams.push(`%${search}%`);
    where.push(`(
      note.title ILIKE $${whereParams.length}
      OR COALESCE(note.description, '') ILIKE $${whereParams.length}
      OR COALESCE(note.subject_name, '') ILIKE $${whereParams.length}
      OR COALESCE(program.title, '') ILIKE $${whereParams.length}
      OR institution.name ILIKE $${whereParams.length}
    )`);
  }

  if (view === "marketplace") {
    where.push(`(
      note.marketplace_approved = TRUE
      OR note.is_public = TRUE
      OR EXISTS (
        SELECT 1 FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = note.created_by AND (r.code = 'platform_admin' OR COALESCE(u.is_super_admin, FALSE) = TRUE)
      )
    )`);
    where.push("COALESCE(note.blocked_by_platform, FALSE) = FALSE");
  } else if (view === "requests") {
    if (!isPlatformAdmin) {
      where.push("FALSE");
    } else {
      where.push("note.marketplace_requested = TRUE");
      where.push("note.marketplace_approved = FALSE");
      where.push("note.blocked_by_platform = FALSE");
    }
  } else {
    // "my" view
    if (opts.institutionId) {
      whereParams.push(opts.institutionId);
      where.push(`note.institution_id = $${whereParams.length}`);
    } else if (allowedInstitutionIds !== null) {
      whereParams.push(allowedInstitutionIds);
      where.push(`note.institution_id = ANY($${whereParams.length}::int[])`);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const currentInstId = opts.institutionId ?? (allowedInstitutionIds && allowedInstitutionIds.length === 1 ? allowedInstitutionIds[0] : null);
  const currentInstParamIndex = whereParams.length + 1;
  const limitParamIndex = whereParams.length + 2;
  const offsetParamIndex = whereParams.length + 3;
  const dataParams = [...whereParams, currentInstId, limit, offset];

  const [dataRes, countRes, statsRes] = await Promise.all([
    dbQuery.query<NoteTemplateRow>(
      `
        SELECT
          note.id,
          note.title,
          note.description,
          note.subject_id,
          note.subject_name,
          note.syllabus_data,
          note.ai_question_format,
          note.is_public,
          note.is_paid,
          note.price::float8 AS price,
          note.marketplace_requested,
          note.marketplace_requested_at,
          note.marketplace_requested_by,
          req_user.full_name AS marketplace_requested_by_name,
          note.marketplace_approved,
          note.marketplace_approved_at,
          note.marketplace_approved_by,
          app_user.full_name AS marketplace_approved_by_name,
          note.source_note_id,
          note.source_institution_id,
          src_inst.name AS source_institution_name,
          note.parent_template_id,
          (
            SELECT COALESCE(child_ip.name, child_ip.slug, 'Institution ' || child_ip.id::text)
            FROM study_notes child
            INNER JOIN institution_profiles child_ip ON child_ip.id = child.institution_id
            WHERE (child.parent_template_id = note.id OR child.source_note_id = note.id)
              AND ($${currentInstParamIndex}::int IS NOT NULL AND child.institution_id = $${currentInstParamIndex}::int)
              AND COALESCE(child.is_deleted, FALSE) = FALSE
              AND COALESCE(child_ip.is_deleted, FALSE) = FALSE
              AND child_ip.is_active = TRUE
            ORDER BY child.updated_at DESC, child.id DESC
            LIMIT 1
          ) AS inherited_by_institution_name,
          note.is_active,
          note.institution_id,
          institution.name AS institution_name,
          note.target_type,
          note.target_id,
          note.target_program_id,
          CASE
            WHEN note.target_type = 'INSTITUTION' THEN institution.name || ' > Whole institution'
            WHEN note.target_type = 'PROGRAM' THEN institution.name || ' > ' || COALESCE(program.title, 'Class')
            WHEN note.target_type = 'SECTION' THEN institution.name || ' > ' || COALESCE(program.title, 'Class') || ' > ' || COALESCE(section.name, 'Section')
            WHEN note.target_type = 'STUDENT' THEN institution.name || ' > ' || COALESCE(program.title, 'Class') || ' > ' || COALESCE(stu_user.full_name, 'Student')
            ELSE NULL
          END AS target_label,
          COALESCE(program.title, 'Whole Course') AS target_program_label,
          note.blocked_by_platform,
          note.blocked_at,
          note.block_reason,
          block_user.full_name AS blocked_by_name,
          note.created_by,
          creator.full_name AS created_by_name,
          updater.full_name AS updated_by_name,
          note.created_at,
          note.updated_at,
          COALESCE(items.question_count, 0)::int AS item_count,
          COALESCE(items.question_count, 0)::int AS question_count,
          COALESCE(items.attachment_count, 0)::int AS attachment_count
        FROM study_notes note
        INNER JOIN institution_profiles institution ON institution.id = note.institution_id
        LEFT JOIN institution_programs program ON program.id = note.target_program_id OR (note.target_type = 'PROGRAM' AND program.id = note.target_id)
        LEFT JOIN sections section ON section.id = note.target_id AND note.target_type = 'SECTION'
        LEFT JOIN student_profiles stu_profile ON stu_profile.id = note.target_id AND note.target_type = 'STUDENT'
        LEFT JOIN users stu_user ON stu_user.id = stu_profile.user_id
        LEFT JOIN users creator ON creator.id = note.created_by
        LEFT JOIN users updater ON updater.id = note.updated_by
        LEFT JOIN users req_user ON req_user.id = note.marketplace_requested_by
        LEFT JOIN users app_user ON app_user.id = note.marketplace_approved_by
        LEFT JOIN users block_user ON block_user.id = note.blocked_by
        LEFT JOIN institution_profiles src_inst ON src_inst.id = note.source_institution_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::int AS question_count,
            COALESCE(SUM(jsonb_array_length(COALESCE(item.files, '[]'::jsonb))), 0)::int AS attachment_count
          FROM study_note_items item
          WHERE item.note_id = note.id
            AND COALESCE(item.is_deleted, FALSE) = FALSE
        ) items ON TRUE
        ${whereSql}
        ORDER BY
          (note.marketplace_requested = TRUE AND note.marketplace_approved = FALSE) DESC,
          note.updated_at DESC,
          note.id DESC
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `,
      dataParams
    ),
    dbQuery.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM study_notes note
        INNER JOIN institution_profiles institution ON institution.id = note.institution_id
        LEFT JOIN institution_programs program ON program.id = note.target_program_id OR (note.target_type = 'PROGRAM' AND program.id = note.target_id)
        ${whereSql}
      `,
      whereParams
    ),
    dbQuery.query<{
      total: number;
      active: number;
      blocked: number;
      questions: number;
    }>(
      `
        SELECT
          COUNT(DISTINCT note.id)::int AS total,
          COUNT(DISTINCT note.id) FILTER (WHERE note.is_active = TRUE AND note.blocked_by_platform = FALSE)::int AS active,
          COUNT(DISTINCT note.id) FILTER (WHERE note.blocked_by_platform = TRUE)::int AS blocked,
          COUNT(item.id)::int AS questions
        FROM study_notes note
        LEFT JOIN study_note_items item ON item.note_id = note.id AND COALESCE(item.is_deleted, FALSE) = FALSE
        ${whereSql}
      `,
      whereParams
    ),
  ]);

  return {
    data: dataRes.rows,
    total: Number(countRes.rows[0]?.count ?? 0),
    stats: statsRes.rows[0] ?? { total: 0, active: 0, blocked: 0, questions: 0 },
  };
}

export async function getNoteById(
  dbQuery: Queryable,
  noteId: number
): Promise<NoteTemplateRow | null> {
  await ensureNotesSchema(dbQuery);
  const result = await dbQuery.query<NoteTemplateRow>(
    `
      SELECT
        note.id,
        note.title,
        note.description,
        note.subject_id,
        note.subject_name,
        note.syllabus_data,
        note.ai_question_format,
        note.is_public,
        note.is_paid,
        note.price::float8 AS price,
        note.marketplace_requested,
        note.marketplace_requested_at,
        note.marketplace_requested_by,
        req_user.full_name AS marketplace_requested_by_name,
        note.marketplace_approved,
        note.marketplace_approved_at,
        note.marketplace_approved_by,
        app_user.full_name AS marketplace_approved_by_name,
        note.source_note_id,
        note.source_institution_id,
        src_inst.name AS source_institution_name,
        note.parent_template_id,
        note.is_active,
        note.institution_id,
        institution.name AS institution_name,
        note.target_type,
        note.target_id,
        note.target_program_id,
        note.blocked_by_platform,
        note.blocked_at,
        note.block_reason,
        note.created_by,
        creator.full_name AS created_by_name,
        note.created_at,
        note.updated_at
      FROM study_notes note
      INNER JOIN institution_profiles institution ON institution.id = note.institution_id
      LEFT JOIN users creator ON creator.id = note.created_by
      LEFT JOIN users req_user ON req_user.id = note.marketplace_requested_by
      LEFT JOIN users app_user ON app_user.id = note.marketplace_approved_by
      LEFT JOIN institution_profiles src_inst ON src_inst.id = note.source_institution_id
      WHERE note.id = $1
        AND COALESCE(note.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [noteId]
  );
  const row = result.rows[0];
  if (!row) return null;

  const questionsRes = await dbQuery.query<{
    id: number;
    question_text: string;
    question_type: NoteTemplateQuestion["question_type"];
    answer_text: string | null;
    correct_answer: string | null;
    display_order: number;
    options: unknown;
    files: unknown;
    answer_files: unknown;
  }>(
    `
      SELECT
        id,
        question_text,
        question_type,
        answer_text,
        correct_answer,
        display_order,
        options,
        files,
        answer_files
      FROM study_note_items
      WHERE note_id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY display_order ASC, id ASC
    `,
    [noteId]
  );

  const questions: NoteTemplateQuestion[] = questionsRes.rows.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    question_type: q.question_type,
    answer_text: q.answer_text ?? "",
    correct_answer: q.correct_answer ?? undefined,
    display_order: q.display_order,
    options: Array.isArray(q.options) ? (q.options as NoteTemplateQuestion["options"]) : [],
    files: Array.isArray(q.files) ? (q.files as NoteTemplateQuestion["files"]) : [],
    answer_files: Array.isArray(q.answer_files) ? (q.answer_files as NoteTemplateQuestion["files"]) : [],
  }));

  return {
    ...row,
    questions,
    question_count: questions.length,
    item_count: questions.length,
  };
}

export async function createNote(
  dbQuery: Queryable,
  user: PermissionUser,
  payload: ReturnType<typeof import("@/lib/notes/note-template-payload").parseNoteMetadataPayload>
) {
  await ensureNotesSchema(dbQuery);
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPublic = isPlatformAdmin ? (payload.isPublic !== false) : payload.isPublic;
  const marketplaceApproved = isPlatformAdmin;
  const result = await dbQuery.query<{ id: number }>(
    `
      INSERT INTO study_notes (
        title, description, subject_id, subject_name, syllabus_data,
        institution_id, target_type, target_id, target_program_id,
        ai_question_format, is_public, is_active, is_paid, price,
        marketplace_requested, marketplace_approved, marketplace_approved_at, marketplace_approved_by,
        created_by, updated_by
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb,
        $6, $7, $8, $9,
        $10::jsonb, $11, $12, $13, $14,
        $15, $16, CASE WHEN $16 THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN $16 THEN $17 ELSE NULL END,
        $17, $17
      )
      RETURNING id
    `,
    [
      payload.title,
      payload.description,
      payload.subjectId,
      payload.subjectName,
      JSON.stringify(payload.syllabusData || []),
      payload.institutionId,
      payload.targetType,
      payload.targetId,
      payload.targetProgramId,
      JSON.stringify(payload.aiQuestionFormat),
      isPublic,
      payload.isActive,
      payload.isPaid,
      payload.price,
      isPublic,
      marketplaceApproved,
      user.id,
    ]
  );
  return result.rows[0].id;
}

export async function updateNote(
  dbQuery: Queryable,
  user: PermissionUser,
  noteId: number,
  payload: ReturnType<typeof import("@/lib/notes/note-template-payload").parseNoteMetadataPayload>
) {
  await ensureNotesSchema(dbQuery);
  await dbQuery.query(
    `
      UPDATE study_notes
      SET
        title = $2,
        description = $3,
        subject_id = $4,
        subject_name = $5,
        syllabus_data = $6::jsonb,
        institution_id = $7,
        target_type = $8,
        target_id = $9,
        target_program_id = $10,
        ai_question_format = $11::jsonb,
        is_public = $12,
        is_active = $13,
        is_paid = $14,
        price = $15,
        updated_by = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
    `,
    [
      noteId,
      payload.title,
      payload.description,
      payload.subjectId,
      payload.subjectName,
      JSON.stringify(payload.syllabusData || []),
      payload.institutionId,
      payload.targetType,
      payload.targetId,
      payload.targetProgramId,
      JSON.stringify(payload.aiQuestionFormat),
      payload.isPublic,
      payload.isActive,
      payload.isPaid,
      payload.price,
      user.id,
    ]
  );
}

export async function deleteNotes(
  dbQuery: Queryable,
  user: PermissionUser,
  ids: number[]
) {
  await ensureNotesSchema(dbQuery);
  if (!ids.length) throw new Error("Select at least one note to delete");
  await dbQuery.query(
    `
      UPDATE study_notes
      SET
        is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2
      WHERE id = ANY($1::int[])
    `,
    [ids, user.id]
  );
}

export async function approveNoteMarketplace(
  dbQuery: Queryable,
  user: PermissionUser,
  noteId: number
) {
  await ensureNotesSchema(dbQuery);
  if (!isPlatformAdminUser(user)) throw new Error("Forbidden: Admin access required");
  await dbQuery.query(
    `
      UPDATE study_notes
      SET
        marketplace_approved = TRUE,
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

export async function removeNoteFromMarketplace(
  dbQuery: Queryable,
  user: PermissionUser,
  noteId: number
) {
  await ensureNotesSchema(dbQuery);
  await dbQuery.query(
    `
      UPDATE study_notes
      SET
        marketplace_approved = FALSE,
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

export async function inheritMarketplaceNote(
  dbQuery: Queryable,
  user: PermissionUser,
  sourceNoteId: number,
  targetInstitutionId: number
) {
  await ensureNotesSchema(dbQuery);
  const sourceRes = await dbQuery.query<NoteTemplateRow>(
    `
      SELECT *
      FROM study_notes
      WHERE id = $1
        AND (marketplace_approved = TRUE OR is_public = TRUE)
        AND COALESCE(blocked_by_platform, FALSE) = FALSE
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [sourceNoteId]
  );
  const source = sourceRes.rows[0];
  if (!source) throw new Error("Marketplace note not found or not approved");

  const inserted = await dbQuery.query<{ id: number }>(
    `
      INSERT INTO study_notes (
        title, description, subject_id, subject_name, syllabus_data,
        institution_id, target_type, target_id, target_program_id,
        ai_question_format, is_public, is_active, is_paid, price,
        source_note_id, source_institution_id, parent_template_id,
        created_by, updated_by
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb,
        $6, 'INSTITUTION', $6, NULL,
        $7::jsonb, FALSE, TRUE, FALSE, 0,
        $8, $9, $8,
        $10, $10
      )
      RETURNING id
    `,
    [
      source.title,
      source.description,
      source.subject_id,
      source.subject_name,
      JSON.stringify(source.syllabus_data || []),
      targetInstitutionId,
      JSON.stringify(source.ai_question_format || {}),
      source.id,
      source.institution_id,
      user.id,
    ]
  );
  const newNoteId = inserted.rows[0].id;

  // Copy questions
  await dbQuery.query(
    `
      INSERT INTO study_note_items (
        note_id, question_text, question_type, answer_text, correct_answer,
        options, files, answer_files, display_order, is_active, is_deleted
      )
      SELECT
        $1, question_text, question_type, answer_text, correct_answer,
        options, files, answer_files, display_order, TRUE, FALSE
      FROM study_note_items
      WHERE note_id = $2
        AND COALESCE(is_deleted, FALSE) = FALSE
      ORDER BY display_order ASC, id ASC
    `,
    [newNoteId, source.id]
  );

  return newNoteId;
}
