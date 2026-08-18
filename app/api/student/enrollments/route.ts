import { NextResponse } from "next/server";
import { getAuthenticatedUser, getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.query(`
      SELECT
        se.id AS enrollment_id,
        se.student_id,
        se.institution_id,
        ip.name AS institution_name,
        ip.slug AS institution_slug,
        se.program_id,
        prog.title AS program_title,
        prog.code AS program_code,
        prog.duration AS program_duration,
        prog.fee_amount,
        se.academic_year_id,
        ay.name AS academic_year_name,
        se.status,
        se.admission_date,
        se.created_at,
        sp.admission_number
      FROM student_profiles sp
      INNER JOIN student_enrollments se ON se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
      INNER JOIN institution_profiles ip ON ip.id = se.institution_id AND COALESCE(ip.is_deleted, FALSE) = FALSE
      INNER JOIN institution_programs prog ON prog.id = se.program_id AND COALESCE(prog.is_deleted, FALSE) = FALSE
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND COALESCE(ay.is_deleted, FALSE) = FALSE
      WHERE sp.user_id = $1
      ORDER BY se.id DESC
    `, [user.id]);

    return NextResponse.json({
      success: true,
      enrollments: result.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch student enrollments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { programId, institutionId: providedInstId } = body;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. Fetch Program & Institution ID
      const progRes = await client.query<{ id: number; institution_id: number; title: string; fee_amount: string }>(
        `SELECT id, institution_id, title, fee_amount FROM institution_programs WHERE id = $1 LIMIT 1`,
        [Number(programId)]
      );

      if (progRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Program not found" }, { status: 404 });
      }

      const program = progRes.rows[0];
      const institutionId = Number(providedInstId || program.institution_id);

      if (!institutionId) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Institution ID could not be determined" }, { status: 400 });
      }

      // 2. Ensure student_profiles row exists for user
      let studentRes = await client.query<{ id: number }>(
        `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );

      let studentId: number;
      if (studentRes.rows.length === 0) {
        const createStudentRes = await client.query<{ id: number }>(
          `INSERT INTO student_profiles (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`,
          [user.id]
        );
        studentId = createStudentRes.rows[0].id;
      } else {
        studentId = studentRes.rows[0].id;
      }

      // 3. Find or ensure active academic year for institution
      let yearRes = await client.query<{ id: number }>(
        `SELECT id FROM academic_years WHERE (institution_id = $1 OR institution_id IS NULL) AND COALESCE(is_deleted, FALSE) = FALSE ORDER BY is_active DESC, id DESC LIMIT 1`,
        [institutionId]
      );

      let academicYearId: number;
      if (yearRes.rows.length === 0) {
        const createYearRes = await client.query<{ id: number }>(
          `INSERT INTO academic_years (institution_id, name, start_date, end_date, is_active)
           VALUES ($1, '2026-2027 Academic Session', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', TRUE)
           RETURNING id`,
          [institutionId]
        );
        academicYearId = createYearRes.rows[0].id;
      } else {
        academicYearId = yearRes.rows[0].id;
      }

      // 4. Ensure institution membership exists for student
      try {
        await client.query(
          `INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active)
           SELECT $1, $2, r.id, TRUE
           FROM roles r WHERE r.code = 'student' OR r.name ILIKE '%student%'
           LIMIT 1
           ON CONFLICT DO NOTHING`,
          [user.id, institutionId]
        );
      } catch {
        // ignore if membership constraint varies
      }

      // 5. Check if student is already enrolled in this program
      const existingEnroll = await client.query(
        `SELECT id FROM student_enrollments
         WHERE student_id = $1 AND program_id = $2 AND COALESCE(is_deleted, FALSE) = FALSE
         LIMIT 1`,
        [studentId, Number(programId)]
      );

      if (existingEnroll.rows.length > 0) {
        await client.query("COMMIT");
        return NextResponse.json({
          success: true,
          alreadyEnrolled: true,
          enrollmentId: existingEnroll.rows[0].id,
          message: "You are already enrolled in this program!",
        });
      }

      // 5. Lookup class_category_id for programId (or fallback)
      const catRes = await client.query<{ category_id: number }>(
        `SELECT category_id FROM program_categories WHERE program_id = $1 LIMIT 1`,
        [Number(programId)]
      );
      let classCategoryId = catRes.rows[0]?.category_id;
      if (!classCategoryId) {
        const fallbackCat = await client.query<{ id: number }>(`SELECT id FROM categories LIMIT 1`);
        classCategoryId = fallbackCat.rows[0]?.id || 1;
      }

      // 6. Insert new student_enrollment
      const insertEnrollRes = await client.query<{ id: number }>(
        `INSERT INTO student_enrollments (
          student_id,
          institution_id,
          program_id,
          academic_year_id,
          class_category_id,
          status,
          admission_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_DATE, NOW(), NOW())
        RETURNING id`,
        [studentId, institutionId, Number(programId), academicYearId, classCategoryId]
      );

      const enrollmentId = insertEnrollRes.rows[0].id;

      // 7. Create record in visitor_sessions for Institution Admin Sales Enquiries
      try {
        await client.query(
          `ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL`
        );
        await client.query(
          `INSERT INTO visitor_sessions (
            institution_id,
            full_name,
            email,
            phone,
            lead_status,
            pipeline_stage,
            estimated_value,
            follow_up,
            current_page_url,
            created_at
          ) VALUES ($1, $2, $3, $4, 'new enquiry', 'new enquiry', $5, $6, $7, NOW())`,
          [
            institutionId,
            user.full_name || "Student Lead",
            user.email || "",
            user.phone || "",
            Number(program.fee_amount || 25000),
            `Direct Student Enrollment for Course: ${program.title} (ID: ${program.id})`,
            program.title,
          ]
        );
      } catch (e) {
        console.error("visitor_sessions insert error:", e);
      }

      // 8. Create record in pipeline_deals if table exists
      try {
        await client.query(
          `INSERT INTO pipeline_deals (
            title,
            institution_id,
            program_id,
            stage,
            value,
            lead_name,
            lead_email,
            lead_phone,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, 'new enquiry', $4, $5, $6, $7, NOW(), NOW())`,
          [
            `Enrollment: ${program.title}`,
            institutionId,
            Number(programId),
            Number(program.fee_amount || 0),
            user.full_name || "Student Lead",
            user.email || "",
            user.phone || "",
          ]
        );
      } catch {
        // pipeline_deals optional
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        enrollmentId,
        message: `Successfully enrolled in ${program.title}!`,
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    const status = err.message?.includes("token") || err.message?.includes("required") ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to complete enrollment" }, { status });
  }
}
