import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAssignmentTemplateSchema();

    const { id } = await context.params;
    const templateId = Number(id);
    if (!templateId || isNaN(templateId)) {
      return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
    }

    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser);
    const url = new URL(req.url);
    const instParam = url.searchParams.get("institutionId");
    const requestedInstId = instParam ? Number(instParam) : null;

    // 1. Fetch Template
    const tplRes = await db.query(
      `SELECT id, title, description, subject_name, total_marks, source_institution_id
       FROM assignment_templates
       WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
      [templateId]
    );

    if (tplRes.rows.length === 0) {
      return NextResponse.json({ error: "Assignment template not found" }, { status: 404 });
    }
    const template = tplRes.rows[0];

    // 2. Fetch Assignments created from this template
    const assignParams: any[] = [templateId];
    let assignFilter = "";

    if (requestedInstId) {
      assignParams.push(requestedInstId);
      assignFilter += ` AND a.institution_id = $${assignParams.length}`;
    } else if (allowedInstitutionIds !== null) {
      assignParams.push(allowedInstitutionIds);
      assignFilter += ` AND a.institution_id = ANY($${assignParams.length}::int[])`;
    }

    const assignmentsRes = await db.query(
      `SELECT 
        a.id,
        a.institution_id,
        ip.name AS institution_name,
        a.title,
        a.description,
        a.issue_date,
        a.submission_date,
        a.total_marks,
        a.status,
        a.created_at,
        t.target_type,
        t.target_id,
        t.program_id,
        t.batch_name,
        t.target_name,
        p.title AS program_title,
        sec.name AS section_name,
        st_user.full_name AS target_student_name,
        CASE 
          WHEN t.target_type = 'PROGRAM' AND t.batch_name IS NOT NULL AND TRIM(t.batch_name) <> '' 
            THEN 'Batch: ' || t.batch_name
          WHEN t.target_type = 'PROGRAM' 
            THEN 'Entire Program: ' || COALESCE(p.title, 'Program')
          WHEN t.target_type = 'SECTION' 
            THEN 'Section: ' || COALESCE(sec.name, '#' || t.target_id::text)
          WHEN t.target_type = 'STUDENT' 
            THEN 'Student: ' || COALESCE(st_user.full_name, t.target_name, '#' || t.target_id::text)
          ELSE COALESCE(t.target_name, 'Entire Program')
        END AS target_display_label,
        ay.name AS academic_year_name
      FROM assignments a
      INNER JOIN institution_profiles ip ON ip.id = a.institution_id
      LEFT JOIN academic_years ay ON ay.id = a.academic_year_id
      LEFT JOIN LATERAL (
        SELECT target_type, target_id, program_id, batch_name, target_name
        FROM assignment_targets
        WHERE assignment_id = a.id
        LIMIT 1
      ) t ON TRUE
      LEFT JOIN institution_programs p ON p.id = COALESCE(t.program_id, CASE WHEN t.target_type = 'PROGRAM' THEN t.target_id END)
      LEFT JOIN sections sec ON sec.id = CASE WHEN t.target_type = 'SECTION' THEN t.target_id END
      LEFT JOIN student_profiles target_sp ON target_sp.id = CASE WHEN t.target_type = 'STUDENT' THEN t.target_id END
      LEFT JOIN users st_user ON st_user.id = target_sp.user_id
      WHERE a.template_id = $1
        AND a.status <> 'deleted'
        AND COALESCE(a.is_deleted, FALSE) = FALSE
        ${assignFilter}
      ORDER BY a.created_at DESC`,
      assignParams
    );

    const assignments = assignmentsRes.rows;
    const assignmentIds = assignments.map((a: any) => a.id);

    // 3. Fetch all assigned students across these assignments
    let students: any[] = [];
    if (assignmentIds.length > 0) {
      const studentsRes = await db.query(
        `SELECT
          sa.id AS student_assignment_id,
          sa.assignment_id,
          sa.student_id,
          sa.status,
          sa.assigned_at,
          sa.submitted_at,
          sa.obtained_marks::float8 AS obtained_marks,
          sa.checked_at,
          u.full_name AS student_name,
          u.email,
          u.avatar_url,
          sp.admission_number,
          se.roll_number,
          p.title AS program_name,
          sec.name AS section_name,
          a.title AS assignment_title,
          a.submission_date,
          a.total_marks
        FROM student_assignments sa
        INNER JOIN assignments a ON a.id = sa.assignment_id
        INNER JOIN student_profiles sp ON sp.id = sa.student_id
        INNER JOIN users u ON u.id = sp.user_id
        LEFT JOIN student_enrollments se ON se.id = sa.enrollment_id
        LEFT JOIN institution_programs p ON p.id = se.program_id
        LEFT JOIN sections sec ON sec.id = se.section_id
        WHERE sa.assignment_id = ANY($1::int[])
          AND COALESCE(sa.is_deleted, FALSE) = FALSE
        ORDER BY
          sa.assignment_id DESC,
          CASE WHEN se.roll_number ~ '^[0-9]+$' THEN se.roll_number::int END NULLS LAST,
          se.roll_number ASC NULLS LAST,
          u.full_name ASC`,
        [assignmentIds]
      );
      students = studentsRes.rows;
    }

    const summary = {
      total_distributions: assignments.length,
      total_students_assigned: students.length,
      pending_count: students.filter((s) => !s.status || s.status === "pending").length,
      submitted_count: students.filter((s) => s.status === "submitted").length,
      checked_count: students.filter((s) => s.status === "checked" || s.status === "graded").length,
    };

    return NextResponse.json({
      template,
      summary,
      assignments,
      students,
    });
  } catch (err: any) {
    console.error("GET /api/admin/master-data/assignments/[id]/assigned error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch assigned records" },
      { status: 500 }
    );
  }
}
