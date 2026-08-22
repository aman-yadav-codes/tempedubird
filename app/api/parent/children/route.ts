import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { hashPassword } from "@/lib/auth/hash";
import { ensureStudentGuardiansSchema } from "@/lib/queries/student-guardians";

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureStudentGuardiansSchema(db);

    const result = await db.query(
      `
      SELECT 
        sp.id AS student_profile_id,
        u.id AS student_user_id,
        u.full_name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,
        u.avatar_url,
        up.gender,
        sp.date_of_birth,
        sp.blood_group,
        sp.admission_number,
        sp.apar_id,
        sg.id AS guardian_link_id,
        sg.relationship,
        sg.is_primary,
        sg.created_at AS linked_at,
        se.id AS enrollment_id,
        se.roll_number,
        se.status AS enrollment_status,
        prog.id AS program_id,
        COALESCE(prog.title, 'Academic Program') AS program_title,
        ip.id AS institution_id,
        COALESCE(ip.name, 'Institution') AS institution_name,
        ay.name AS academic_year_name
      FROM student_guardians sg
      INNER JOIN student_profiles sp ON sp.id = sg.student_id
      INNER JOIN users u ON u.id = sp.user_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT se.* 
        FROM student_enrollments se 
        WHERE se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
        ORDER BY se.id DESC LIMIT 1
      ) se ON TRUE
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      LEFT JOIN institution_profiles ip ON ip.id = se.institution_id
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE sg.guardian_user_id = $1
        AND COALESCE(sg.is_deleted, FALSE) = FALSE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY sg.is_primary DESC, sp.id DESC
      `,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      children: result.rows,
    });
  } catch (err: any) {
    console.error("GET /api/parent/children error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch children records" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureStudentGuardiansSchema(db);
    const body = await req.json();

    const fullName = String(body.full_name || body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const gender = String(body.gender || "Not specified").trim();
    const dob = body.date_of_birth || body.dob || null;
    const bloodGroup = String(body.blood_group || "").trim() || null;
    const admissionNumber = String(body.admission_number || "").trim() || null;
    const aparId = String(body.apar_id || "").trim() || null;
    const emergencyContactName = String(body.emergency_contact_name || "").trim() || null;
    const emergencyContactPhone = String(body.emergency_contact_phone || "").trim() || null;

    const relationship = String(body.relationship || "Child").trim();
    const programId = body.program_id ? Number(body.program_id) : null;
    let institutionId = body.institution_id ? Number(body.institution_id) : null;
    const sectionName = String(body.section_name || body.section || "").trim() || null;
    const academicYearIdInput = body.academic_year_id ? Number(body.academic_year_id) : null;
    const rollNumber = String(body.roll_number || "").trim() || null;
    const admissionDate = body.admission_date || null;
    const avatarUrl = String(body.avatar_url || "").trim() || null;

    if (!fullName) {
      return NextResponse.json({ error: "Student full name is required" }, { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // 1. Resolve student email (generate unique student email if not provided)
      const studentEmail = email || `student_${Date.now()}_${Math.floor(Math.random() * 1000)}@edubird.com`;

      // Check if student user already exists
      let studentUserRes = await client.query<{ id: number }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [studentEmail]
      );

      let studentUserId: number;
      if (studentUserRes.rows.length === 0) {
        const dummyPassword = await hashPassword("Student@123456");
        const insertUserRes = await client.query<{ id: number }>(
          `
          INSERT INTO users (
            full_name, email, phone, password, avatar_url,
            is_active, is_verified, is_profile_complete, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, NOW(), NOW())
          RETURNING id
          `,
          [fullName, studentEmail, phone || null, dummyPassword, avatarUrl]
        );
        studentUserId = insertUserRes.rows[0].id;

        // Assign 'student' role
        const roleRes = await client.query<{ id: number }>(
          `SELECT id FROM roles WHERE code = 'student' LIMIT 1`
        );
        if (roleRes.rows[0]) {
          await client.query(
            `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [studentUserId, roleRes.rows[0].id]
          );
        }

        // Create user_profiles row
        await client.query(
          `
          INSERT INTO user_profiles (user_id, gender, avatar_url, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, avatar_url = EXCLUDED.avatar_url
          `,
          [studentUserId, gender, avatarUrl]
        );
      } else {
        studentUserId = studentUserRes.rows[0].id;
      }

      // 2. Create or find student_profiles row
      let spRes = await client.query<{ id: number }>(
        `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
        [studentUserId]
      );

      const resolvedAdmissionNum = admissionNumber || `ADM-${new Date().getFullYear()}-${String(studentUserId).padStart(4, "0")}`;
      let studentProfileId: number;
      if (spRes.rows.length === 0) {
        const createSpRes = await client.query<{ id: number }>(
          `
          INSERT INTO student_profiles (
            user_id, admission_number, apar_id, date_of_birth, blood_group,
            emergency_contact_name, emergency_contact_phone, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id
          `,
          [
            studentUserId,
            resolvedAdmissionNum,
            aparId,
            dob,
            bloodGroup,
            emergencyContactName || user.full_name || "Guardian",
            emergencyContactPhone || user.phone || phone || null,
          ]
        );
        studentProfileId = createSpRes.rows[0].id;
      } else {
        studentProfileId = spRes.rows[0].id;
        await client.query(
          `
          UPDATE student_profiles
          SET date_of_birth = COALESCE($1, date_of_birth),
              blood_group = COALESCE($2, blood_group),
              admission_number = COALESCE($3, admission_number),
              apar_id = COALESCE($4, apar_id),
              emergency_contact_name = COALESCE($5, emergency_contact_name),
              emergency_contact_phone = COALESCE($6, emergency_contact_phone),
              updated_at = NOW()
          WHERE id = $7
          `,
          [
            dob,
            bloodGroup,
            admissionNumber,
            aparId,
            emergencyContactName,
            emergencyContactPhone,
            studentProfileId,
          ]
        );
      }

      // 3. Link child student to logged-in guardian in student_guardians
      const checkParentG = await client.query<{ id: number }>(
        `SELECT id FROM student_guardians WHERE student_id = $1 AND guardian_user_id = $2 LIMIT 1`,
        [studentProfileId, user.id]
      );
      if (checkParentG.rows[0]) {
        await client.query(
          `UPDATE student_guardians SET relationship = $2, is_primary = TRUE, is_deleted = FALSE, deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
          [checkParentG.rows[0].id, relationship]
        );
      } else {
        await client.query(
          `INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary, is_deleted)
           VALUES ($1, $2, $3, TRUE, FALSE)`,
          [studentProfileId, user.id, relationship]
        );
      }

      // 4. If program / institution is selected, create enrollment
      if (programId) {
        if (!institutionId) {
          const progRes = await client.query<{ institution_id: number }>(
            `SELECT institution_id FROM institution_programs WHERE id = $1 LIMIT 1`,
            [programId]
          );
          if (progRes.rows[0]?.institution_id) {
            institutionId = progRes.rows[0].institution_id;
          }
        }

        if (institutionId) {
          // Find academic year
          let academicYearId = academicYearIdInput;
          if (!academicYearId) {
            let yearRes = await client.query<{ id: number }>(
              `SELECT id FROM academic_years WHERE (institution_id = $1 OR institution_id IS NULL) AND COALESCE(is_deleted, FALSE) = FALSE ORDER BY is_active DESC, id DESC LIMIT 1`,
              [institutionId]
            );
            academicYearId = yearRes.rows[0]?.id || 1;
          }

          // Check if section exists or find section id
          let sectionId: number | null = null;
          if (sectionName) {
            const secRes = await client.query<{ id: number }>(
              `SELECT id FROM sections WHERE institution_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
              [institutionId, sectionName]
            );
            if (secRes.rows[0]) {
              sectionId = secRes.rows[0].id;
            }
          }

          // Check if enrollment exists
          const existingEnr = await client.query(
            `SELECT id FROM student_enrollments WHERE student_id = $1 AND program_id = $2 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
            [studentProfileId, programId]
          );

          if (existingEnr.rows.length === 0) {
            await client.query(
              `
              INSERT INTO student_enrollments (
                student_id, institution_id, program_id, section_id, academic_year_id, class_category_id,
                roll_number, status, admission_date, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, 1, $6, 'active', COALESCE($7, CURRENT_DATE), NOW(), NOW())
              `,
              [studentProfileId, institutionId, programId, sectionId, academicYearId, rollNumber, admissionDate]
            );

            // Ensure institution membership
            try {
              await client.query(
                `
                INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active)
                SELECT $1, $2, r.id, TRUE
                FROM roles r WHERE r.code = 'student' LIMIT 1
                ON CONFLICT DO NOTHING
                `,
                [studentUserId, institutionId]
              );
            } catch {}
          }
        }
      }

      // 5. Save experiences into user_experience table
      if (Array.isArray(body.experiences) && body.experiences.length > 0) {
        for (const exp of body.experiences) {
          if (exp.job_title || exp.company_name) {
            await client.query(
              `
              INSERT INTO user_experience (
                user_id, job_title, company_name, from_month, from_year, to_month, to_year, is_current, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
              `,
              [
                studentUserId,
                exp.job_title || "Experience",
                exp.company_name || null,
                exp.from_month || null,
                exp.from_year || null,
                exp.to_month || null,
                exp.to_year || null,
                Boolean(exp.is_current),
              ]
            );
          }
        }
      }

      // 6. Save education into user_education table
      if (Array.isArray(body.education) && body.education.length > 0) {
        for (const edu of body.education) {
          if (edu.qualification || edu.institution_name) {
            await client.query(
              `
              INSERT INTO user_education (
                user_id, qualification, from_year, to_year, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, NOW(), NOW())
              `,
              [
                studentUserId,
                edu.qualification || "Qualification",
                edu.from_year ? Number(edu.from_year) : null,
                edu.to_year ? Number(edu.to_year) : null,
              ]
            );
          }
        }
      }

      // 7. Save certifications into user_certifications table
      if (Array.isArray(body.certifications) && body.certifications.length > 0) {
        for (const cert of body.certifications) {
          if (cert.name || cert.issued_authority) {
            await client.query(
              `
              INSERT INTO user_certifications (
                user_id, name, issued_authority, duration, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, NOW(), NOW())
              `,
              [
                studentUserId,
                cert.name || "Certificate",
                cert.issued_authority || null,
                cert.duration || null,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        student_id: studentProfileId,
        user_id: studentUserId,
        message: "Student record registered successfully using the academic database!",
      });
    } catch (dbErr: any) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("POST /api/parent/children error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to register child record" },
      { status: 500 }
    );
  }
}
