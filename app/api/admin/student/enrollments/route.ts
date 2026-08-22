import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.query(`
      SELECT
        se.id,
        se.id AS enrollment_id,
        se.student_id,
        se.institution_id,
        se.institution_id AS "institutionId",
        COALESCE(ip.name, ip.slug, 'Partner Institution') AS "institutionName",
        COALESCE(ip.name, ip.slug, 'Partner Institution') AS institution_name,
        ip.slug AS institution_slug,
        se.program_id,
        se.program_id AS "programId",
        COALESCE(prog.title, 'Enrolled Academic Program') AS "programName",
        COALESCE(prog.title, 'Enrolled Academic Program') AS program_title,
        se.section_id AS "sectionId",
        se.section_id,
        sec.name AS "sectionName",
        sec.name AS section_name,
        se.academic_year_id AS "academicYearId",
        se.academic_year_id,
        ay.name AS "academicYearName",
        ay.name AS academic_year_name,
        se.status,
        se.admission_date,
        se.created_at,
        sp.admission_number,
        u.full_name AS student_name,
        u.email AS student_email
      FROM student_profiles sp
      INNER JOIN users u ON u.id = sp.user_id
      INNER JOIN student_enrollments se ON se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      LEFT JOIN sections sec ON sec.id = se.section_id
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE sp.user_id = $1
      ORDER BY se.id DESC
    `, [user.id]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      enrollments: result.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch student enrollments" }, { status: 500 });
  }
}
