import { Pool, PoolClient } from "pg";
type Queryable = Pool | PoolClient;
import { InstitutionCourse, CreateInstitutionCourseInput } from "@/lib/types/institution";

let schemaReadyPromise: Promise<void> | null = null;

export async function ensureInstitutionCoursesSchema(db: Queryable): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS institution_courses (
          id SERIAL PRIMARY KEY,
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          course_name VARCHAR(255) NOT NULL,
          stream VARCHAR(150),
          board_or_university VARCHAR(255),
          duration VARCHAR(100),
          price VARCHAR(100),
          fee_amount NUMERIC(12, 2),
          eligibility TEXT,
          description TEXT,
          seats_available INTEGER,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_institution_courses_inst_id
          ON institution_courses(institution_id);
        CREATE INDEX IF NOT EXISTS idx_institution_courses_stream
          ON institution_courses(stream);
      `);
    })();
  }
  return schemaReadyPromise;
}

export async function getInstitutionCourses(
  db: Queryable,
  institutionId: number,
): Promise<InstitutionCourse[]> {
  await ensureInstitutionCoursesSchema(db);
  const res = await db.query<InstitutionCourse>(
    `
    SELECT * FROM institution_courses
    WHERE institution_id = $1 AND COALESCE(is_active, TRUE) = TRUE
    ORDER BY sort_order ASC, id ASC
    `,
    [institutionId],
  );
  return res.rows;
}

export async function createInstitutionCourse(
  db: Queryable,
  input: CreateInstitutionCourseInput,
): Promise<InstitutionCourse> {
  await ensureInstitutionCoursesSchema(db);

  const res = await db.query<InstitutionCourse>(
    `
    INSERT INTO institution_courses (
      institution_id, course_name, stream, board_or_university,
      duration, price, fee_amount, eligibility, description,
      seats_available, sort_order, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
    `,
    [
      input.institutionId,
      input.courseName.trim(),
      input.stream?.trim() || null,
      input.boardOrUniversity?.trim() || null,
      input.duration?.trim() || null,
      input.price?.trim() || null,
      input.feeAmount !== undefined && input.feeAmount !== null ? input.feeAmount : null,
      input.eligibility?.trim() || null,
      input.description?.trim() || null,
      input.seatsAvailable !== undefined && input.seatsAvailable !== null ? Number(input.seatsAvailable) : null,
      input.sortOrder !== undefined && input.sortOrder !== null ? Number(input.sortOrder) : 0,
      input.isActive ?? true,
    ],
  );

  return res.rows[0];
}

export async function updateInstitutionCourse(
  db: Queryable,
  id: number,
  input: Partial<CreateInstitutionCourseInput>,
): Promise<InstitutionCourse | null> {
  await ensureInstitutionCoursesSchema(db);

  const fields: string[] = [];
  const params: any[] = [];

  if (input.courseName !== undefined) {
    params.push(input.courseName.trim());
    fields.push(`course_name = $${params.length}`);
  }
  if (input.stream !== undefined) {
    params.push(input.stream ? input.stream.trim() : null);
    fields.push(`stream = $${params.length}`);
  }
  if (input.boardOrUniversity !== undefined) {
    params.push(input.boardOrUniversity ? input.boardOrUniversity.trim() : null);
    fields.push(`board_or_university = $${params.length}`);
  }
  if (input.duration !== undefined) {
    params.push(input.duration ? input.duration.trim() : null);
    fields.push(`duration = $${params.length}`);
  }
  if (input.price !== undefined) {
    params.push(input.price ? input.price.trim() : null);
    fields.push(`price = $${params.length}`);
  }
  if (input.feeAmount !== undefined) {
    params.push(input.feeAmount !== null ? input.feeAmount : null);
    fields.push(`fee_amount = $${params.length}`);
  }
  if (input.eligibility !== undefined) {
    params.push(input.eligibility ? input.eligibility.trim() : null);
    fields.push(`eligibility = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description ? input.description.trim() : null);
    fields.push(`description = $${params.length}`);
  }
  if (input.seatsAvailable !== undefined) {
    params.push(input.seatsAvailable !== null ? Number(input.seatsAvailable) : null);
    fields.push(`seats_available = $${params.length}`);
  }
  if (input.sortOrder !== undefined) {
    params.push(Number(input.sortOrder));
    fields.push(`sort_order = $${params.length}`);
  }
  if (input.isActive !== undefined) {
    params.push(Boolean(input.isActive));
    fields.push(`is_active = $${params.length}`);
  }

  if (fields.length === 0) {
    const check = await db.query<InstitutionCourse>(
      `SELECT * FROM institution_courses WHERE id = $1`,
      [id],
    );
    return check.rows[0] || null;
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  const res = await db.query<InstitutionCourse>(
    `
    UPDATE institution_courses
    SET ${fields.join(", ")}
    WHERE id = $${params.length}
    RETURNING *
    `,
    params,
  );

  return res.rows[0] || null;
}

export async function deleteInstitutionCourse(
  db: Queryable,
  id: number,
): Promise<boolean> {
  await ensureInstitutionCoursesSchema(db);
  const res = await db.query(
    `DELETE FROM institution_courses WHERE id = $1`,
    [id],
  );
  return (res.rowCount ?? 0) > 0;
}
