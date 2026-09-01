import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { slugify } from "@/lib/utils/slug";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const { id } = await params;
    const programId = Number(id);

    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      [programId]
    );

    const res = await db.query(
      `
      SELECT
        ps.program_id,
        ps.section_id,
        COALESCE(ps.section_id, 0) AS id,
        ps.batch_name,
        ps.section_name,
        ps.academic_term,
        ps.academic_year_number,
        ps.semester_number,
        ps.attendance_setup_id,
        ps.attendance_setup_title,
        ps.language_id,
        ps.language_name,
        ps.seats_available,
        ps.max_students,
        ps.price,
        ps.fee_amount,
        ps.discount_percent,
        ps.installments_count,
        ps.start_time,
        ps.end_time,
        ps.class_frequency,
        ps.teaching_method,
        ps.module_name,
        ps.module_details,
        ps.is_active,
        ps.created_at,
        COALESCE(ps.batch_name, ps.section_name, s.name, 'Batch') AS name,
        s.name AS original_section_name,
        s.slug,
        COALESCE(l.name, ps.language_name) AS language_title,
        COALESCE((
          SELECT COUNT(*)::int
          FROM student_enrollments se
          WHERE se.program_id = $1
            AND se.section_id = ps.section_id
            AND COALESCE(se.is_deleted, FALSE) = FALSE
        ), 0) AS enrolled_students_count
      FROM program_sections ps
      LEFT JOIN sections s ON s.id = ps.section_id
      LEFT JOIN languages l ON l.id = ps.language_id
      WHERE ps.program_id = $1
      ORDER BY ps.created_at DESC, COALESCE(ps.batch_name, s.name) ASC
      `,
      [programId]
    );

    // Fetch program & course duration details
    const programInfoRes = await db.query(
      `
      SELECT
        ip.id,
        ip.institution_id,
        ip.title,
        ip.course_id,
        c.duration_value,
        c.duration_unit,
        c.duration_type
      FROM institution_programs ip
      LEFT JOIN courses c ON c.id = ip.course_id
      WHERE ip.id = $1
      `,
      [programId]
    );

    const programInfo = programInfoRes.rows[0] || null;

    // Fetch master course subjects terms if available
    const courseTermsRes = await db.query(
      `
      SELECT DISTINCT
        mcs.term_type,
        mcs.term_number,
        mcs.term_name
      FROM master_course_subjects mcs
      WHERE mcs.course_id = (SELECT course_id FROM institution_programs WHERE id = $1)
      ORDER BY mcs.term_number ASC
      `,
      [programId]
    );

    // Fetch available attendance setups for students
    let attendanceSetups: any[] = [];
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS institution_attendance_setups (
          id SERIAL PRIMARY KEY,
          institution_id INT,
          title VARCHAR(255) NOT NULL,
          target_type VARCHAR(50) NOT NULL DEFAULT 'STUDENTS',
          attendance_mode VARCHAR(50) NOT NULL DEFAULT 'FULL_DAY',
          who_can_mark VARCHAR(50) NOT NULL DEFAULT 'INSTITUTION_ADMIN',
          start_time VARCHAR(20) DEFAULT '08:00',
          end_time VARCHAR(20) DEFAULT '14:30',
          grace_period_mins INT DEFAULT 15,
          half_day_time VARCHAR(20) DEFAULT '11:30',
          min_attendance_percentage INT DEFAULT 75,
          working_days JSONB DEFAULT '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]'::jsonb,
          auto_notify_absent BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          is_dummy BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const setupsRes = await db.query(
        `
        SELECT id, title, target_type, attendance_mode, who_can_mark, start_time, end_time, is_default
        FROM institution_attendance_setups
        WHERE (UPPER(target_type) = 'STUDENTS' OR target_type IS NULL OR target_type = '')
          AND (institution_id IS NULL OR institution_id = (SELECT institution_id FROM institution_programs WHERE id = $1))
          AND COALESCE(is_active, TRUE) = TRUE
        ORDER BY is_default DESC, title ASC
        `,
        [programId]
      );
      attendanceSetups = setupsRes.rows;

      // If no student-specific setups found, query all active setups for this institution
      if (attendanceSetups.length === 0) {
        const allSetupsRes = await db.query(
          `
          SELECT id, title, target_type, attendance_mode, who_can_mark, start_time, end_time, is_default
          FROM institution_attendance_setups
          WHERE (institution_id IS NULL OR institution_id = (SELECT institution_id FROM institution_programs WHERE id = $1))
            AND COALESCE(is_active, TRUE) = TRUE
          ORDER BY is_default DESC, title ASC
          `,
          [programId]
        );
        attendanceSetups = allSetupsRes.rows;
      }
    } catch {
      // Table may not exist yet in some environments
    }

    // Default attendance setups if database returned empty
    if (attendanceSetups.length === 0) {
      attendanceSetups = [
        { id: "full_day", title: "Daily Attendance (Full Day)", target_type: "STUDENTS", attendance_mode: "FULL_DAY", start_time: "08:00", end_time: "14:30", is_default: true },
        { id: "period_wise", title: "Period-Wise Lecture Attendance", target_type: "STUDENTS", attendance_mode: "PERIOD_WISE", start_time: "09:00", end_time: "16:00", is_default: false },
        { id: "shift_regular", title: "Regular Academic Shift (08:00 - 14:30)", target_type: "STUDENTS", attendance_mode: "FULL_DAY", start_time: "08:00", end_time: "14:30", is_default: false },
        { id: "biometric", title: "Biometric Attendance (In / Out)", target_type: "STUDENTS", attendance_mode: "BIOMETRIC", start_time: "08:30", end_time: "15:00", is_default: false },
      ];
    }

    // Fetch available sections
    const sectionsRes = await db.query(
      `SELECT id, name, slug FROM sections WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY name ASC`
    );

    // Fetch available languages
    const languagesRes = await db.query(
      `SELECT id, name, slug FROM languages WHERE COALESCE(is_deleted, FALSE) = FALSE ORDER BY name ASC`
    );

    // Fetch program subjects/modules
    const subjectsRes = await db.query(
      `
      SELECT s.id, s.name, s.slug, s.code
      FROM program_subjects ps
      JOIN subjects s ON s.id = ps.subject_id
      WHERE ps.program_id = $1 AND COALESCE(s.is_deleted, FALSE) = FALSE
      ORDER BY s.name ASC
      `,
      [programId]
    );

    return NextResponse.json({
      data: res.rows,
      meta: {
        programInfo,
        courseTerms: courseTermsRes.rows,
        attendanceSetups,
        sections: sectionsRes.rows,
        languages: languagesRes.rows,
        subjects: subjectsRes.rows,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to fetch batches" }, { status });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const programId = Number(id);

    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      [programId]
    );

    const body = await req.json();
    const batchName = (body.name || body.batchName || "").trim();
    const sectionInput = (body.sectionName || body.section || "").trim();
    let sectionId = body.sectionId ? Number(body.sectionId) : null;
    const languageId = body.languageId ? Number(body.languageId) : null;
    const languageName = (body.languageName || body.language || "").trim() || null;
    const seatsAvailable = body.seatsAvailable !== undefined && body.seatsAvailable !== null && body.seatsAvailable !== ""
      ? Number(body.seatsAvailable)
      : (body.maxStudents !== undefined && body.maxStudents !== null && body.maxStudents !== "" ? Number(body.maxStudents) : null);
    
    const feeOptions = Array.isArray(body.feeOptions) ? body.feeOptions : [];
    let price = body.price !== undefined && body.price !== null && body.price !== ""
      ? Number(body.price)
      : (body.feeAmount !== undefined && body.feeAmount !== null && body.feeAmount !== "" ? Number(body.feeAmount) : null);
    let discountPercent = body.discountPercent !== undefined && body.discountPercent !== null && body.discountPercent !== ""
      ? Number(body.discountPercent)
      : 0;
    let installmentsCount = body.installmentsCount !== undefined && body.installmentsCount !== null && body.installmentsCount !== ""
      ? Number(body.installmentsCount)
      : 1;

    if (feeOptions.length > 0) {
      const primaryFee = feeOptions[0];
      if ((price == null || isNaN(price)) && primaryFee.amount) {
        price = Number(primaryFee.amount) || 0;
      }
      if (primaryFee.installments_count && !isNaN(Number(primaryFee.installments_count))) {
        installmentsCount = Number(primaryFee.installments_count) || 1;
      }
      if (primaryFee.has_discount && primaryFee.discount_type === "percentage" && primaryFee.discount_value) {
        discountPercent = Number(primaryFee.discount_value) || 0;
      }
    }

    const startTime = (body.startTime || body.classStartTime || "").trim() || null;
    const endTime = (body.endTime || body.classEndTime || "").trim() || null;
    const classFrequency = (body.classFrequency || body.frequency || "").trim() || null;
    const teachingMethod = (body.teachingMethod || body.teachingMode || "").trim() || null;
    const academicTerm = (body.academicTerm || body.term || "").trim() || null;
    const academicYearNumber = body.academicYearNumber ? Number(body.academicYearNumber) : (body.yearNumber ? Number(body.yearNumber) : null);
    const semesterNumber = body.semesterNumber ? Number(body.semesterNumber) : null;
    const attendanceSetupId = body.attendanceSetupId ? (isNaN(Number(body.attendanceSetupId)) ? null : Number(body.attendanceSetupId)) : null;
    const attendanceSetupTitle = (body.attendanceSetupTitle || body.attendanceSetup || "").trim() || null;
    const moduleName = (body.moduleName || body.module || "").trim() || null;
    const moduleDetails = feeOptions.length > 0 ? JSON.stringify(feeOptions) : ((body.moduleDetails || "").trim() || null);

    if (!batchName) {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
    }

    // Ensure columns exist on program_sections
    try {
      await db.query(`
        ALTER TABLE program_sections ADD COLUMN IF NOT EXISTS academic_term VARCHAR(100);
        ALTER TABLE program_sections ADD COLUMN IF NOT EXISTS academic_year_number INT;
        ALTER TABLE program_sections ADD COLUMN IF NOT EXISTS semester_number INT;
        ALTER TABLE program_sections ADD COLUMN IF NOT EXISTS attendance_setup_id INT;
        ALTER TABLE program_sections ADD COLUMN IF NOT EXISTS attendance_setup_title VARCHAR(255);
      `);
    } catch {
      // ignore if exists
    }

    // Determine or create section
    const targetSectionName = sectionInput || batchName;
    if (!sectionId) {
      const existing = await db.query(
        `SELECT id FROM sections WHERE LOWER(name) = LOWER($1) AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
        [targetSectionName]
      );

      if (existing.rows.length > 0) {
        sectionId = existing.rows[0].id;
      } else {
        const created = await db.query(
          `INSERT INTO sections (name, slug, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
          [targetSectionName, slugify(targetSectionName)]
        );
        sectionId = created.rows[0].id;
      }
    }

    // Upsert into program_sections
    await db.query(
      `
      INSERT INTO program_sections (
        program_id,
        section_id,
        batch_name,
        section_name,
        academic_term,
        academic_year_number,
        semester_number,
        attendance_setup_id,
        attendance_setup_title,
        language_id,
        language_name,
        seats_available,
        max_students,
        price,
        fee_amount,
        discount_percent,
        installments_count,
        start_time,
        end_time,
        class_frequency,
        teaching_method,
        module_name,
        module_details,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW()
      )
      ON CONFLICT (program_id, section_id)
      DO UPDATE SET
        batch_name = EXCLUDED.batch_name,
        section_name = EXCLUDED.section_name,
        academic_term = EXCLUDED.academic_term,
        academic_year_number = EXCLUDED.academic_year_number,
        semester_number = EXCLUDED.semester_number,
        attendance_setup_id = EXCLUDED.attendance_setup_id,
        attendance_setup_title = EXCLUDED.attendance_setup_title,
        language_id = EXCLUDED.language_id,
        language_name = EXCLUDED.language_name,
        seats_available = EXCLUDED.seats_available,
        max_students = EXCLUDED.max_students,
        price = EXCLUDED.price,
        fee_amount = EXCLUDED.fee_amount,
        discount_percent = EXCLUDED.discount_percent,
        installments_count = EXCLUDED.installments_count,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        class_frequency = EXCLUDED.class_frequency,
        teaching_method = EXCLUDED.teaching_method,
        module_name = EXCLUDED.module_name,
        module_details = EXCLUDED.module_details,
        updated_at = NOW()
      `,
      [
        programId,
        sectionId,
        batchName,
        targetSectionName,
        academicTerm,
        academicYearNumber,
        semesterNumber,
        attendanceSetupId,
        attendanceSetupTitle,
        languageId,
        languageName,
        seatsAvailable,
        seatsAvailable, // max_students
        price,
        price, // fee_amount
        discountPercent,
        installmentsCount,
        startTime,
        endTime,
        classFrequency,
        teachingMethod,
        moduleName,
        moduleDetails,
      ]
    );

    return NextResponse.json({
      message: `Batch "${batchName}" saved successfully`,
      data: {
        section_id: sectionId,
        batch_name: batchName,
        section_name: targetSectionName,
        language_id: languageId,
        language_name: languageName,
        seats_available: seatsAvailable,
        price,
        discount_percent: discountPercent,
        installments_count: installmentsCount,
        start_time: startTime,
        end_time: endTime,
        class_frequency: classFrequency,
        teaching_method: teachingMethod,
        module_name: moduleName,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to add batch" }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const programId = Number(id);

    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      [programId]
    );

    const url = new URL(req.url);
    const sectionId = url.searchParams.get("sectionId");

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
    }

    await db.query(
      `DELETE FROM program_sections WHERE program_id = $1 AND (section_id = $2 OR batch_name = $3)`,
      [programId, isNaN(Number(sectionId)) ? 0 : Number(sectionId), sectionId]
    );

    return NextResponse.json({ message: "Batch unlinked successfully" });
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: error.message || "Failed to remove batch" }, { status });
  }
}
