import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthenticatedUser, getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const childProfileId = searchParams.get("student_profile_id") ? Number(searchParams.get("student_profile_id")) : null;

    let query = `
      SELECT
        se.id AS enrollment_id,
        se.student_id,
        se.institution_id,
        COALESCE(ip.name, ip.slug, 'Partner Institution') AS institution_name,
        ip.slug AS institution_slug,
        se.program_id,
        COALESCE(prog.title, 'Enrolled Academic Program') AS program_title,
        prog.slug AS program_slug,
        ('PRG-' || COALESCE(prog.id, se.program_id)::text) AS program_code,
        prog.duration_value,
        prog.duration_unit,
        CASE 
          WHEN prog.duration_value IS NOT NULL AND prog.duration_unit IS NOT NULL 
          THEN CONCAT(prog.duration_value, ' ', prog.duration_unit)
          ELSE '1 Year'
        END AS program_duration,
        COALESCE(prog.fee_amount, 25000) AS fee_amount,
        se.academic_year_id,
        ay.name AS academic_year_name,
        se.status,
        se.admission_date,
        se.created_at,
        sp.admission_number,
        u.full_name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone
      FROM student_profiles sp
      INNER JOIN users u ON u.id = sp.user_id
      INNER JOIN student_enrollments se ON se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE (
        sp.user_id = $1
        OR sp.id IN (
          SELECT sg.student_id
          FROM student_guardians sg
          WHERE sg.guardian_user_id = $1 AND COALESCE(sg.is_deleted, FALSE) = FALSE
        )
      )
    `;

    const params: unknown[] = [user.id];
    if (childProfileId) {
      params.push(childProfileId);
      query += ` AND sp.id = $${params.length}`;
    }

    query += ` ORDER BY se.id DESC`;

    const result = await db.query(query, params);

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

    const { programId, institutionId: providedInstId, student_profile_id, child_user_id } = body;

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

      // 2. Resolve student_profiles row (either specific child or user themselves)
      let studentId: number;
      let targetUserId: number = user.id;

      if (student_profile_id) {
        const checkChild = await client.query<{ id: number; user_id: number }>(
          `SELECT sp.id, sp.user_id FROM student_profiles sp
           LEFT JOIN student_guardians sg ON sg.student_id = sp.id
           WHERE sp.id = $1 AND (sp.user_id = $2 OR sg.guardian_user_id = $2)
           LIMIT 1`,
          [Number(student_profile_id), user.id]
        );
        if (checkChild.rows[0]) {
          studentId = checkChild.rows[0].id;
          targetUserId = checkChild.rows[0].user_id;
        } else {
          studentId = Number(student_profile_id);
        }
      } else if (child_user_id) {
        let sp = await client.query<{ id: number }>(
          `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
          [Number(child_user_id)]
        );
        if (sp.rows[0]) {
          studentId = sp.rows[0].id;
          targetUserId = Number(child_user_id);
        } else {
          const createSp = await client.query<{ id: number }>(
            `INSERT INTO student_profiles (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`,
            [Number(child_user_id)]
          );
          studentId = createSp.rows[0].id;
          targetUserId = Number(child_user_id);
        }
      } else {
        // Check if guardian has linked children
        const guardianChildren = await client.query<{ id: number; user_id: number }>(
          `SELECT sp.id, sp.user_id FROM student_guardians sg
           INNER JOIN student_profiles sp ON sp.id = sg.student_id
           WHERE sg.guardian_user_id = $1 AND COALESCE(sg.is_deleted, FALSE) = FALSE
           LIMIT 1`,
          [user.id]
        );

        if (guardianChildren.rows.length > 0) {
          studentId = guardianChildren.rows[0].id;
          targetUserId = guardianChildren.rows[0].user_id;
        } else {
          let studentRes = await client.query<{ id: number }>(
            `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
            [user.id]
          );

          if (studentRes.rows.length === 0) {
            const createStudentRes = await client.query<{ id: number }>(
              `INSERT INTO student_profiles (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`,
              [user.id]
            );
            studentId = createStudentRes.rows[0].id;
          } else {
            studentId = studentRes.rows[0].id;
          }
        }
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
          [targetUserId, institutionId]
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

      // Ensure student profile has a clean admission number
      await client.query(
        `UPDATE student_profiles
         SET admission_number = COALESCE(NULLIF(admission_number, ''), 'ADM-2026-' || LPAD($1::text, 4, '0')),
             updated_at = NOW()
         WHERE id = $2`,
        [enrollmentId, studentId]
      );

      // 7. Create record in visitor_sessions for Institution Admin Sales Enquiries & Pipeline
      try {
        await client.query(`ALTER TABLE visitor_sessions ALTER COLUMN tracking_token DROP NOT NULL`);
      } catch {}
      try {
        await client.query(
          `ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL`
        );
        await client.query(
          `ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`
        );
        await client.query(
          `ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS program_id INTEGER REFERENCES institution_programs(id) ON DELETE SET NULL`
        );
        const trackingToken = randomUUID();
        await client.query(
          `INSERT INTO visitor_sessions (
            tracking_token,
            institution_id,
            user_id,
            program_id,
            full_name,
            email,
            phone,
            lead_status,
            pipeline_stage,
            estimated_value,
            follow_up,
            current_page_url,
            created_at,
            last_seen_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'enrolled', 'won', $8, $9, $10, NOW(), NOW())`,
          [
            trackingToken,
            institutionId,
            user.id,
            Number(programId),
            user.full_name || "Student Lead",
            user.email || "",
            user.phone || "",
            Number(program.fee_amount || 25000),
            `Direct Student Enrollment for Course: ${program.title} (Enrollment ID: ${enrollmentId})`,
            `/courses/${program.id}`,
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
