import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";
import { NotificationService } from "@/services/notificationService";
import { resolveStudentEnrollmentContext, type StudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

type StatCard = {
  label: string;
  value: string;
  hint: string;
};

function getStatus(message: string) {
  if (message.includes("Forbidden")) return 403;
  if (message === "Unauthorized" || message === "User not found") return 401;
  return 500;
}

function formatNumber(value: unknown) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function daysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function isInstitutionAdmin(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  return user.role_codes.includes("institution_admin");
}

function isTeacher(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  return user.role_codes.includes("teacher");
}

function isStudent(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  return user.role_codes.includes("student");
}

function isParent(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  return user.role_codes.includes("parent");
}

async function getPlatformCards(): Promise<StatCard[]> {
  const [institutions, institutionAdmins, openTickets, assignments] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM institution_profiles
       WHERE is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE`
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT im.user_id)::int AS count
       FROM institution_memberships im
       INNER JOIN roles r ON r.id = im.role_id AND r.code = 'institution_admin'
       INNER JOIN users u
         ON u.id = im.user_id
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
       INNER JOIN institution_profiles ip
         ON ip.id = im.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
       WHERE im.is_active = TRUE`
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM support_tickets ticket
       LEFT JOIN institution_profiles institution ON institution.id = ticket.institution_id
       WHERE LOWER(ticket.status) NOT IN ('closed', 'resolved')
         AND COALESCE(ticket.is_deleted, FALSE) = FALSE
         AND (
           ticket.institution_id IS NULL
           OR (
             institution.is_active = TRUE
             AND COALESCE(institution.is_deleted, FALSE) = FALSE
           )
         )`
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM assignments assignment
       INNER JOIN institution_profiles institution ON institution.id = assignment.institution_id
       WHERE assignment.status <> 'deleted'
         AND COALESCE(assignment.is_deleted, FALSE) = FALSE
         AND institution.is_active = TRUE
         AND COALESCE(institution.is_deleted, FALSE) = FALSE`
    ),
  ]);

  return [
    { label: "Total Institutions", value: formatNumber(institutions.rows[0]?.count), hint: "Active institutions" },
    { label: "Institution Admins", value: formatNumber(institutionAdmins.rows[0]?.count), hint: "Active admin memberships" },
    { label: "Open Support Tickets", value: formatNumber(openTickets.rows[0]?.count), hint: "Waiting on support" },
    { label: "Total Assignments", value: formatNumber(assignments.rows[0]?.count), hint: "Live assignment records" },
  ];
}

async function getInstitutionCards(institutionIds: number[]): Promise<StatCard[]> {
  if (!institutionIds.length) {
    return [
      { label: "My Institutions", value: "0", hint: "Assigned institutions" },
      { label: "Teachers", value: "0", hint: "Active teachers" },
      { label: "Students", value: "0", hint: "Active enrollments" },
      { label: "Open Support Tickets", value: "0", hint: "Waiting on support" },
    ];
  }

  const [institutions, teachers, students, openTickets] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM institution_profiles
       WHERE id = ANY($1::int[])
         AND is_active = TRUE
         AND COALESCE(is_deleted, FALSE) = FALSE`,
      [institutionIds]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT im.user_id)::int AS count
       FROM institution_memberships im
       INNER JOIN roles r ON r.id = im.role_id AND r.code = 'teacher'
       INNER JOIN users u
         ON u.id = im.user_id
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
       INNER JOIN institution_profiles ip
         ON ip.id = im.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
       WHERE im.institution_id = ANY($1::int[])
         AND im.is_active = TRUE`,
      [institutionIds]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT se.student_id)::int AS count
       FROM student_enrollments se
       INNER JOIN student_profiles sp ON sp.id = se.student_id
       INNER JOIN users u
         ON u.id = sp.user_id
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
       INNER JOIN institution_profiles ip
         ON ip.id = se.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
       WHERE se.institution_id = ANY($1::int[])
         AND se.status = 'active'
         AND COALESCE(se.is_deleted, FALSE) = FALSE`,
      [institutionIds]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM support_tickets ticket
       INNER JOIN institution_profiles institution ON institution.id = ticket.institution_id
       WHERE ticket.institution_id = ANY($1::int[])
         AND LOWER(ticket.status) NOT IN ('closed', 'resolved')
         AND COALESCE(ticket.is_deleted, FALSE) = FALSE
         AND institution.is_active = TRUE
         AND COALESCE(institution.is_deleted, FALSE) = FALSE`,
      [institutionIds]
    ),
  ]);

  return [
    { label: "My Institutions", value: formatNumber(institutions.rows[0]?.count), hint: "Assigned institutions" },
    { label: "Teachers", value: formatNumber(teachers.rows[0]?.count), hint: "Active teachers" },
    { label: "Students", value: formatNumber(students.rows[0]?.count), hint: "Active enrollments" },
    { label: "Open Support Tickets", value: formatNumber(openTickets.rows[0]?.count), hint: "Waiting on support" },
  ];
}

function getTeacherCards(): StatCard[] {
  return [
    { label: "Today's Classes", value: "4", hint: "Scheduled sessions" },
    { label: "Assignments Due", value: "7", hint: "To review" },
    { label: "Students", value: "126", hint: "Across assigned classes" },
    { label: "Open Support Tickets", value: "2", hint: "Waiting on support" },
  ];
}

async function getStudentCards(userId: number, enrollment: StudentEnrollmentContext | null): Promise<StatCard[]> {
  if (!enrollment) return [
    { label: "Pending Assignments", value: "0", hint: "No active program" },
    { label: "This Month Attendance", value: "0 / 0", hint: "No active program" },
    { label: "Study Streak", value: "0", hint: "No active program" },
    { label: "New Messages", value: "0", hint: "No active program" },
  ];
  const monthDays = daysInCurrentMonth();
  const [pendingAssignments, attendance] = await Promise.all([
    db.query<{ count: number }>(
      `WITH student AS (
         SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1
       )
       SELECT COUNT(DISTINCT a.id)::int AS count
       FROM student
       INNER JOIN student_enrollments se
         ON se.student_id = student.id
        AND se.id = $2
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
       INNER JOIN institution_profiles institution
         ON institution.id = se.institution_id
        AND institution.is_active = TRUE
        AND COALESCE(institution.is_deleted, FALSE) = FALSE
       INNER JOIN assignments a
         ON a.institution_id = se.institution_id
        AND a.status = 'active'
        AND COALESCE(a.is_deleted, FALSE) = FALSE
       LEFT JOIN assignment_targets target ON target.assignment_id = a.id
       LEFT JOIN student_assignments sa
         ON sa.assignment_id = a.id
        AND sa.student_id = student.id
        AND sa.enrollment_id = se.id
       WHERE COALESCE(sa.status, 'pending') <> 'submitted'
         AND (
           target.target_type IS NULL
           OR target.target_type = 'INSTITUTION'
           OR (
             target.target_type = 'PROGRAM'
             AND (
               se.program_id = target.target_id
               OR se.class_category_id IN (
                 SELECT category_id
                 FROM program_categories
                 WHERE program_id = target.target_id
               )
             )
           )
           OR (
             target.target_type = 'SECTION'
             AND target.program_id IS NOT NULL
             AND se.program_id = target.program_id
             AND se.section_id = target.target_id
           )
           OR (target.target_type = 'STUDENT' AND target.target_id = student.id)
         )`,
      [userId, enrollment.id]
    ),
    db.query<{ present_days: number }>(
      `SELECT COUNT(DISTINCT asess.attendance_date)::int AS present_days
       FROM student_profiles sp
       INNER JOIN student_attendance sa ON sa.student_id = sp.id
       INNER JOIN attendance_sessions asess ON asess.id = sa.attendance_session_id
       INNER JOIN institution_profiles institution ON institution.id = asess.institution_id
       WHERE sp.user_id = $1
         AND asess.institution_id = $2
         AND asess.program_id = $3
         AND asess.academic_year_id = $4
         AND ($5::int IS NULL OR asess.section_id = $5)
         AND sa.status = 'PRESENT'
         AND COALESCE(sa.is_deleted, FALSE) = FALSE
         AND COALESCE(asess.is_deleted, FALSE) = FALSE
         AND institution.is_active = TRUE
         AND COALESCE(institution.is_deleted, FALSE) = FALSE
         AND asess.attendance_date >= date_trunc('month', CURRENT_DATE)
         AND asess.attendance_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
      [userId, enrollment.institution_id, enrollment.program_id, enrollment.academic_year_id, enrollment.section_id]
    ),
  ]);

  const presentDays = Number(attendance.rows[0]?.present_days ?? 0);
  return [
    { label: "Pending Assignments", value: formatNumber(pendingAssignments.rows[0]?.count), hint: "Still to submit" },
    { label: "This Month Attendance", value: `${presentDays} / ${monthDays}`, hint: "Present days this month" },
    { label: "Study Streak", value: "5", hint: "Dummy progress card" },
    { label: "New Messages", value: "3", hint: "Dummy inbox card" },
  ];
}

async function getParentCards(parentUserId: number, requestedStudentId: number | null): Promise<StatCard[]> {
  const childResult = await db.query<{
    student_id: number;
    student_name: string;
  }>(
    `
      SELECT DISTINCT ON (sp.id)
        sp.id AS student_id,
        student.full_name AS student_name
      FROM student_guardians sg
      INNER JOIN student_profiles sp
        ON sp.id = sg.student_id
      INNER JOIN users student
        ON student.id = sp.user_id
       AND student.is_active = TRUE
       AND COALESCE(student.is_deleted, FALSE) = FALSE
      WHERE sg.guardian_user_id = $1
        AND COALESCE(sg.is_deleted, FALSE) = FALSE
        AND ($2::int IS NULL OR sp.id = $2)
      ORDER BY sp.id, sg.is_primary DESC, sg.id ASC
      LIMIT 1
    `,
    [parentUserId, requestedStudentId]
  );

  const child = childResult.rows[0];
  if (!child) {
    return [
      { label: "Children", value: "0", hint: "No linked student profiles" },
      { label: "Pending Assignments", value: "0", hint: "No active child selected" },
      { label: "This Month Attendance", value: "0 / 0", hint: "No active child selected" },
      { label: "Open Support Tickets", value: "0", hint: "Waiting on support" },
    ];
  }

  const monthDays = daysInCurrentMonth();
  const [pendingAssignments, attendance, openTickets] = await Promise.all([
    db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT a.id)::int AS count
       FROM student_enrollments se
       INNER JOIN institution_profiles institution
         ON institution.id = se.institution_id
        AND institution.is_active = TRUE
        AND COALESCE(institution.is_deleted, FALSE) = FALSE
       INNER JOIN assignments a
         ON a.institution_id = se.institution_id
        AND a.status = 'active'
        AND COALESCE(a.is_deleted, FALSE) = FALSE
       LEFT JOIN assignment_targets target ON target.assignment_id = a.id
       LEFT JOIN student_assignments sa
         ON sa.assignment_id = a.id
        AND sa.student_id = se.student_id
       WHERE se.student_id = $1
         AND se.status = 'active'
         AND COALESCE(se.is_deleted, FALSE) = FALSE
         AND COALESCE(sa.status, 'pending') <> 'submitted'
         AND (
           target.target_type IS NULL
           OR target.target_type = 'INSTITUTION'
           OR (
             target.target_type = 'PROGRAM'
             AND (
               se.program_id = target.target_id
               OR se.class_category_id IN (
                 SELECT category_id
                 FROM program_categories
                 WHERE program_id = target.target_id
               )
             )
           )
           OR (
             target.target_type = 'SECTION'
             AND target.program_id IS NOT NULL
             AND se.program_id = target.program_id
             AND se.section_id = target.target_id
           )
           OR (target.target_type = 'STUDENT' AND target.target_id = se.student_id)
         )`,
      [child.student_id]
    ),
    db.query<{ present_days: number }>(
      `SELECT COUNT(DISTINCT asess.attendance_date)::int AS present_days
       FROM student_attendance sa
       INNER JOIN attendance_sessions asess ON asess.id = sa.attendance_session_id
       INNER JOIN institution_profiles institution ON institution.id = asess.institution_id
       WHERE sa.student_id = $1
         AND sa.status = 'PRESENT'
         AND COALESCE(sa.is_deleted, FALSE) = FALSE
         AND COALESCE(asess.is_deleted, FALSE) = FALSE
         AND institution.is_active = TRUE
         AND COALESCE(institution.is_deleted, FALSE) = FALSE
         AND asess.attendance_date >= date_trunc('month', CURRENT_DATE)
         AND asess.attendance_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
      [child.student_id]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM support_tickets ticket
       WHERE ticket.created_by = $1
         AND LOWER(ticket.status) NOT IN ('closed', 'resolved')
         AND COALESCE(ticket.is_deleted, FALSE) = FALSE`,
      [parentUserId]
    ),
  ]);

  const presentDays = Number(attendance.rows[0]?.present_days ?? 0);
  return [
    { label: "Selected Child", value: child.student_name, hint: "Active child profile" },
    { label: "Pending Assignments", value: formatNumber(pendingAssignments.rows[0]?.count), hint: "Still to submit" },
    { label: "This Month Attendance", value: `${presentDays} / ${monthDays}`, hint: "Present days this month" },
    { label: "Open Support Tickets", value: formatNumber(openTickets.rows[0]?.count), hint: "Waiting on support" },
  ];
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const dashboardPermission = isStudent(currentUser)
      ? "student.dashboard.view"
      : isParent(currentUser)
        ? "parent.dashboard.view"
        : isTeacher(currentUser)
          ? "teacher.dashboard.view"
          : "dashboard.view";
    if (!hasPermission(currentUser, dashboardPermission)) {
      throw new Error("Forbidden: Dashboard access required");
    }
    const url = new URL(req.url);
    const requestedChildId = Number(url.searchParams.get("childStudentId"));
    const childStudentId = Number.isInteger(requestedChildId) && requestedChildId > 0
      ? requestedChildId
      : null;
    await ensureAssignmentTemplateSchema();
    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser) ?? [];
    const notificationService = new NotificationService(db);
    const studentEnrollment = isStudent(currentUser)
      ? await resolveStudentEnrollmentContext(db, req, currentUser.id)
      : null;

    const cardsPromise = isPlatformAdminUser(currentUser)
      ? getPlatformCards()
      : isInstitutionAdmin(currentUser)
        ? getInstitutionCards(allowedInstitutionIds)
        : isStudent(currentUser)
          ? getStudentCards(currentUser.id, studentEnrollment)
          : isParent(currentUser)
            ? getParentCards(currentUser.id, childStudentId)
            : isTeacher(currentUser)
              ? Promise.resolve(getTeacherCards())
              : getInstitutionCards(allowedInstitutionIds);

    const [cards, notifications] = await Promise.all([
      cardsPromise,
      notificationService.listForUser(currentUser.id, 5),
    ]);

    return NextResponse.json({
      role: isPlatformAdminUser(currentUser)
        ? "platform_admin"
        : isInstitutionAdmin(currentUser)
          ? "institution_admin"
          : isStudent(currentUser)
            ? "student"
            : isParent(currentUser)
              ? "parent"
              : isTeacher(currentUser)
                ? "teacher"
                : "admin",
      cards,
      notifications: notifications.items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load dashboard";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
