import { db } from "@/lib/db/db";

export type StudentRecordsResponse = {
  profile: Record<string, unknown> | null;
  enrollment: Record<string, unknown> | null;
  enrollments: Record<string, unknown>[];
  guardians: Record<string, unknown>[];
  documents: Record<string, unknown>[];
};

export async function readStudentRecords(studentUserId: number): Promise<StudentRecordsResponse> {
  const [profile, enrollment, guardians, documents] = await Promise.all([
    db.query(
      `
        SELECT *
        FROM student_profiles
        WHERE user_id = $1
      `,
      [studentUserId]
    ),
    db.query(
      `
        SELECT
          se.*,
          ip.name AS institution_name,
          prog.title AS program_name,
          ay.name AS academic_year_name,
          c.name AS class_category_name,
          s.name AS section_name
        FROM student_profiles sp
        INNER JOIN student_enrollments se
          ON se.student_id = sp.id
         AND COALESCE(se.is_deleted, FALSE) = FALSE
        INNER JOIN institution_profiles ip
          ON ip.id = se.institution_id
         AND ip.is_active = TRUE
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
        LEFT JOIN institution_programs prog
          ON prog.id = se.program_id
         AND COALESCE(prog.is_deleted, FALSE) = FALSE
        LEFT JOIN academic_years ay
          ON ay.id = se.academic_year_id
         AND COALESCE(ay.is_deleted, FALSE) = FALSE
        LEFT JOIN categories c ON c.id = se.class_category_id
        LEFT JOIN sections s ON s.id = se.section_id
        WHERE sp.user_id = $1
        ORDER BY se.status = 'active' DESC, se.updated_at DESC, se.id DESC
      `,
      [studentUserId]
    ),
    db.query(
      `
        SELECT
          sg.*,
          u.full_name AS guardian_name,
          u.email AS guardian_email,
          u.phone AS guardian_phone
        FROM student_profiles sp
        INNER JOIN student_guardians sg ON sg.student_id = sp.id
        INNER JOIN users u ON u.id = sg.guardian_user_id
        WHERE sp.user_id = $1
          AND COALESCE(sg.is_deleted, FALSE) = FALSE
        ORDER BY sg.is_primary DESC, sg.id ASC
      `,
      [studentUserId]
    ),
    db.query(
      `
        SELECT sd.*
        FROM student_profiles sp
        INNER JOIN student_documents sd ON sd.student_id = sp.id
        WHERE sp.user_id = $1
          AND COALESCE(sd.is_deleted, FALSE) = FALSE
        ORDER BY sd.id DESC
      `,
      [studentUserId]
    ),
  ]);

  return {
    profile: profile.rows[0] ?? null,
    enrollment: enrollment.rows[0] ?? null,
    enrollments: enrollment.rows,
    guardians: guardians.rows,
    documents: documents.rows,
  };
}
