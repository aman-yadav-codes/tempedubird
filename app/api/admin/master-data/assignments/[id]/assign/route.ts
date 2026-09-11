import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import {
  ensureAssignmentTemplateSchema,
  replaceAssignmentQuestionsFromTemplate,
} from "@/lib/queries/assignment-templates";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAssignmentTemplateSchema();

    const { id } = await params;
    const templateId = Number(id);
    if (!templateId || isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid assignment template ID" }, { status: 400 });
    }

    const body = await req.json();
    const {
      institutionId,
      targetType, // 'PROGRAM' | 'SECTION' | 'STUDENT'
      programId,
      batchName,
      sectionId,
      studentIds,
      issueDate,
      submissionDate,
      totalMarks,
      instructions,
    } = body;

    const instId = Number(institutionId);
    if (!instId || isNaN(instId)) {
      return NextResponse.json({ error: "Institution ID is required" }, { status: 400 });
    }

    assertCanAccessInstitution(currentUser, instId);

    if (!targetType || !["PROGRAM", "SECTION", "STUDENT"].includes(targetType)) {
      return NextResponse.json(
        { error: "Please select whom to assign (Entire Batch, Section, or Particular Student)" },
        { status: 400 }
      );
    }

    if (!programId) {
      return NextResponse.json(
        { error: "Please choose a Course and Program" },
        { status: 400 }
      );
    }

    const progId = Number(programId);

    if (targetType === "SECTION" && !sectionId) {
      return NextResponse.json(
        { error: "Please select a specific section" },
        { status: 400 }
      );
    }

    if (targetType === "STUDENT" && (!Array.isArray(studentIds) || studentIds.length === 0)) {
      return NextResponse.json(
        { error: "Please select at least one student" },
        { status: 400 }
      );
    }

    // 1. Fetch Template info
    const tplRes = await db.query(
      `SELECT id, title, description, subject_id, subject_name, total_marks
       FROM assignment_templates
       WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
      [templateId]
    );

    if (tplRes.rows.length === 0) {
      return NextResponse.json({ error: "Assignment template not found" }, { status: 404 });
    }

    const template = tplRes.rows[0];
    const finalTitle = template.title;
    const finalDesc = instructions || template.description || "";
    const finalMarks = totalMarks != null ? Number(totalMarks) : (Number(template.total_marks) || 100);

    // 2. Resolve default academic year for this institution
    let academicYearId: number | null = null;
    const instDefaultRes = await db.query(
      `SELECT default_academic_year_id FROM institution_profiles WHERE id = $1 LIMIT 1`,
      [instId]
    );
    if (instDefaultRes.rows[0]?.default_academic_year_id) {
      academicYearId = Number(instDefaultRes.rows[0].default_academic_year_id);
    } else {
      const fallbackAy = await db.query(
        `SELECT id FROM academic_years 
         WHERE (institution_id = $1 OR institution_id IS NULL) 
           AND COALESCE(is_deleted, FALSE) = FALSE 
         ORDER BY COALESCE(is_active, TRUE) DESC, id DESC LIMIT 1`,
        [instId]
      );
      if (fallbackAy.rows[0]) academicYearId = fallbackAy.rows[0].id;
    }

    // 3. Create active assignment row in assignments table
    const safeIssueDate = issueDate || new Date().toISOString().split("T")[0];
    const safeSubmissionDate = submissionDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const assignRes = await db.query(
      `INSERT INTO assignments 
        (institution_id, template_id, title, description, issue_date, submission_date, total_marks, status, created_by, academic_year_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, NOW(), NOW())
       RETURNING id`,
      [
        instId,
        templateId,
        finalTitle,
        finalDesc,
        safeIssueDate,
        safeSubmissionDate,
        finalMarks,
        currentUser.id,
        academicYearId,
      ]
    );

    const assignmentId = assignRes.rows[0].id;

    // 4. Materialize assignment questions from template
    try {
      await replaceAssignmentQuestionsFromTemplate(db, assignmentId, templateId);
    } catch (qErr) {
      console.warn("Could not copy template questions to assignment questions:", qErr);
    }

    // 5. Insert assignment_targets with batch_name and target_name
    let batchSectionIds: number[] = [];
    if (targetType === "PROGRAM") {
      const cleanBatchName = batchName?.trim() || null;
      if (cleanBatchName) {
        const batchSecRes = await db.query(
          `SELECT section_id FROM program_sections 
           WHERE program_id = $1 AND TRIM(LOWER(batch_name)) = TRIM(LOWER($2))`,
          [progId, cleanBatchName]
        );
        batchSectionIds = batchSecRes.rows.map((r: any) => Number(r.section_id)).filter(Boolean);
      }

      const targetLabel = cleanBatchName ? `Batch: ${cleanBatchName}` : "Entire Program";
      await db.query(
        `INSERT INTO assignment_targets (assignment_id, target_type, target_id, program_id, batch_name, target_name)
         VALUES ($1, 'PROGRAM', $2, $2, $3, $4)`,
        [assignmentId, progId, cleanBatchName, targetLabel]
      );
    } else if (targetType === "SECTION") {
      const secRes = await db.query(`SELECT name FROM sections WHERE id = $1 LIMIT 1`, [Number(sectionId)]);
      const secName = secRes.rows[0]?.name ? `Section ${secRes.rows[0].name}` : `Section #${sectionId}`;
      await db.query(
        `INSERT INTO assignment_targets (assignment_id, target_type, target_id, program_id, target_name)
         VALUES ($1, 'SECTION', $2, $3, $4)`,
        [assignmentId, Number(sectionId), progId, secName]
      );
    } else if (targetType === "STUDENT") {
      const stRes = await db.query(
        `SELECT sp.id, u.full_name 
         FROM student_profiles sp 
         JOIN users u ON u.id = sp.user_id 
         WHERE sp.id = ANY($1::int[])`,
        [studentIds.map(Number)]
      );
      const studentNameMap = new Map(stRes.rows.map((r: any) => [Number(r.id), r.full_name]));

      for (const sId of studentIds) {
        const sName = studentNameMap.get(Number(sId)) || `Student #${sId}`;
        await db.query(
          `INSERT INTO assignment_targets (assignment_id, target_type, target_id, program_id, target_name)
           VALUES ($1, 'STUDENT', $2, $3, $4)`,
          [assignmentId, Number(sId), progId, sName]
        );
      }
    }

    // 6. Find all matching eligible student enrollments to generate student_assignments
    let enrollmentsQuery = `
      SELECT DISTINCT se.id AS enrollment_id, se.student_id
      FROM student_enrollments se
      WHERE se.institution_id = $1
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
    `;
    const enrollParams: any[] = [instId];

    if (targetType === "PROGRAM") {
      enrollParams.push(progId);
      if (batchSectionIds.length > 0) {
        enrollParams.push(batchSectionIds);
        enrollmentsQuery += ` AND (se.section_id = ANY($${enrollParams.length}::int[]) OR se.program_id = $${enrollParams.length - 1})`;
      } else {
        enrollmentsQuery += ` AND (se.program_id = $${enrollParams.length} OR se.class_category_id IN (
          SELECT category_id FROM program_categories WHERE program_id = $${enrollParams.length}
        ))`;
      }
    } else if (targetType === "SECTION") {
      enrollParams.push(progId);
      enrollParams.push(Number(sectionId));
      enrollmentsQuery += ` AND (se.program_id = $${enrollParams.length - 1} OR se.class_category_id IN (
        SELECT category_id FROM program_categories WHERE program_id = $${enrollParams.length - 1}
      )) AND se.section_id = $${enrollParams.length}`;
    } else if (targetType === "STUDENT") {
      enrollParams.push(studentIds.map(Number));
      enrollmentsQuery += ` AND se.student_id = ANY($${enrollParams.length}::int[])`;
    }

    const enrollRes = await db.query(enrollmentsQuery, enrollParams);
    const eligibleStudents = enrollRes.rows;

    let assignedCount = 0;
    for (const st of eligibleStudents) {
      try {
        await db.query(
          `INSERT INTO student_assignments (assignment_id, student_id, enrollment_id, status, assigned_at)
           VALUES ($1, $2, $3, 'pending', NOW())
           ON CONFLICT (assignment_id, student_id, enrollment_id) DO NOTHING`,
          [assignmentId, st.student_id, st.enrollment_id]
        );
        assignedCount++;
      } catch (saErr) {
        console.warn(`Could not create student_assignment for student ${st.student_id}:`, saErr);
      }
    }

    return NextResponse.json({
      success: true,
      assignmentId,
      assignedCount,
      eligibleCount: eligibleStudents.length,
      targetType,
      message: `Assignment successfully assigned to ${eligibleStudents.length} student${eligibleStudents.length === 1 ? "" : "s"}!`,
    });
  } catch (err: any) {
    console.error("POST /api/admin/master-data/assignments/[id]/assign error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to assign assignment" },
      { status: 500 }
    );
  }
}
