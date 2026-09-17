import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to calculate performance";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ||
    message === "Forbidden: Invalid child context" ? 403 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function ensureNotesReadingSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_note_reading_sessions (
      id BIGSERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE CASCADE,
      note_id INTEGER NOT NULL,
      reading_time_seconds INTEGER NOT NULL DEFAULT 0,
      last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_student_note_enrollment UNIQUE (student_id, note_id, enrollment_id)
    );
    CREATE INDEX IF NOT EXISTS idx_student_notes_reading ON student_note_reading_sessions(student_id, enrollment_id);
  `);
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensureNotesReadingSchema();

    const canView =
      hasPermission(currentUser, "student.myclassroom.performance.view") ||
      (
        currentUser.role_codes.includes("parent") &&
        hasPermission(currentUser, "parent.childclassroom.performance.view")
      ) ||
      currentUser.role_codes.includes("student") ||
      currentUser.role_codes.includes("parent") ||
      currentUser.role_codes.includes("institution_admin") ||
      currentUser.role_codes.includes("platform_admin");

    if (!canView) {
      throw new Error("Forbidden: Admin access required");
    }

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) {
      return NextResponse.json({
        enrollment: null,
        overall: {
          score: 0,
          grade: "N/A",
          status: "No Enrollment Found",
          color: "muted",
          summary: "Please enroll in a course or select an active enrollment to view performance.",
        },
        pillars: {
          practice_exams: { score: 0, weight: 20, metrics: {}, history: [] },
          attendance: { score: 0, weight: 20, metrics: {}, history: [] },
          results: { score: 0, weight: 25, metrics: {}, history: [] },
          assignments: { score: 0, weight: 20, metrics: {}, history: [] },
          notes_reading: { score: 0, weight: 15, metrics: {}, history: [] },
        },
        insights: [],
      });
    }

    const studentId = enrollment.student_id;
    const enrollmentId = enrollment.id;
    const institutionId = enrollment.institution_id;
    const programId = enrollment.program_id;
    const sectionId = enrollment.section_id;
    const academicYearId = enrollment.academic_year_id;

    // 1. PRACTICE EXAMS
    const practiceExamsPromise = db.query(
      `
        WITH eligible_practice AS (
          SELECT DISTINCT
            a.id,
            a.title,
            a.description,
            a.total_marks::float8 AS total_marks,
            a.duration_minutes,
            a.created_at
          FROM student_enrollments se
          INNER JOIN practice_exams a
            ON a.institution_id = se.institution_id
           AND a.status = 'active'
           AND COALESCE(a.exam_kind, 'practice') = 'practice'
           AND COALESCE(a.is_deleted, FALSE) = FALSE
           AND a.academic_year_id = se.academic_year_id
          LEFT JOIN practice_exam_targets target ON target.practice_exam_id = a.id
          WHERE se.id = $1
            AND (
              target.target_type IS NULL
              OR target.target_type = 'INSTITUTION'
              OR (
                target.target_type = 'PROGRAM'
                AND (
                  se.program_id = target.target_id
                  OR se.class_category_id IN (
                    SELECT category_id FROM program_categories WHERE program_id = target.target_id
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
            )
        )
        SELECT
          ep.id,
          ep.title,
          ep.total_marks,
          ep.duration_minutes,
          sa.id AS attempt_id,
          sa.attempt_no,
          sa.status AS attempt_status,
          sa.obtained_marks::float8 AS obtained_marks,
          sa.percentage::float8 AS percentage,
          sa.correct_answers,
          sa.wrong_answers,
          sa.unanswered,
          sa.time_taken_seconds,
          sa.submitted_at
        FROM eligible_practice ep
        LEFT JOIN LATERAL (
          SELECT *
          FROM student_practice_exam_attempts a
          WHERE a.practice_exam_id = ep.id
            AND a.student_id = $2
            AND a.enrollment_id = $1
            AND COALESCE(a.is_deleted, FALSE) = FALSE
          ORDER BY a.submitted_at DESC NULLS LAST, a.started_at DESC, a.id DESC
          LIMIT 1
        ) sa ON TRUE
        ORDER BY ep.created_at DESC
      `,
      [enrollmentId, studentId]
    );

    // 2. ATTENDANCE (Full Day + Period Wise)
    const fullDayAttendancePromise = db.query(
      `
        SELECT
          to_char(session.attendance_date, 'YYYY-MM-DD') AS attendance_date,
          attendance.status,
          attendance.remarks
        FROM attendance_sessions session
        INNER JOIN student_attendance attendance
          ON attendance.attendance_session_id = session.id
         AND attendance.student_id = $1
         AND COALESCE(attendance.is_deleted, FALSE) = FALSE
        WHERE session.institution_id = $2
          AND session.program_id = $3
          AND session.section_id IS NOT DISTINCT FROM $4::int
          AND session.academic_year_id = $5
          AND session.attendance_mode = 'FULL_DAY'
        ORDER BY session.attendance_date DESC
      `,
      [studentId, institutionId, programId, sectionId, academicYearId]
    );

    const periodWiseAttendancePromise = db.query(
      `
        SELECT
          to_char(session.attendance_date, 'YYYY-MM-DD') AS attendance_date,
          period.status
        FROM attendance_sessions session
        INNER JOIN student_period_attendance period
          ON period.attendance_session_id = session.id
         AND period.student_id = $1
         AND COALESCE(period.is_deleted, FALSE) = FALSE
        WHERE session.institution_id = $2
          AND session.program_id = $3
          AND session.section_id IS NOT DISTINCT FROM $4::int
          AND session.academic_year_id = $5
          AND session.attendance_mode = 'PERIOD_WISE'
        ORDER BY session.attendance_date DESC
      `,
      [studentId, institutionId, programId, sectionId, academicYearId]
    );

    // 3. RESULTS (Official Exams & Result Cards)
    const officialExamsPromise = db.query(
      `
        WITH eligible_exams AS (
          SELECT DISTINCT
            a.id,
            a.title,
            a.description,
            a.total_marks::float8 AS total_marks,
            a.duration_minutes,
            a.exam_date,
            a.exam_time,
            a.result_date,
            a.instant_result
          FROM student_enrollments se
          INNER JOIN practice_exams a
            ON (
              (a.institution_id = se.institution_id AND a.academic_year_id = se.academic_year_id)
              OR (COALESCE(a.is_government_exam, FALSE) = TRUE)
            )
           AND a.status = 'active'
           AND COALESCE(a.exam_kind, 'practice') = 'exam'
           AND COALESCE(a.is_deleted, FALSE) = FALSE
          LEFT JOIN practice_exam_targets target ON target.practice_exam_id = a.id
          WHERE se.id = $1
            AND (
              COALESCE(a.is_government_exam, FALSE) = TRUE
              OR target.target_type IS NULL
              OR target.target_type = 'INSTITUTION'
              OR (
                target.target_type = 'PROGRAM'
                AND (
                  se.program_id = target.target_id
                  OR se.class_category_id IN (
                    SELECT category_id FROM program_categories WHERE program_id = target.target_id
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
            )
        )
        SELECT
          ee.id,
          ee.title,
          ee.total_marks,
          ee.exam_date,
          ee.result_date,
          sa.id AS attempt_id,
          sa.status AS attempt_status,
          sa.obtained_marks::float8 AS obtained_marks,
          sa.percentage::float8 AS percentage,
          sa.correct_answers,
          sa.wrong_answers,
          sa.submitted_at
        FROM eligible_exams ee
        LEFT JOIN LATERAL (
          SELECT *
          FROM student_practice_exam_attempts a
          WHERE a.practice_exam_id = ee.id
            AND a.student_id = $2
            AND a.enrollment_id = $1
            AND COALESCE(a.is_deleted, FALSE) = FALSE
          ORDER BY a.submitted_at DESC NULLS LAST, a.started_at DESC, a.id DESC
          LIMIT 1
        ) sa ON TRUE
        ORDER BY ee.exam_date DESC NULLS LAST, ee.id DESC
      `,
      [enrollmentId, studentId]
    );

    const resultCardsPromise = db.query(
      `
        SELECT
          card.id,
          card.title,
          card.created_at,
          card.pdf_url,
          card.image_url,
          card.field_values,
          dt.name AS template_name
        FROM institution_generated_documents card
        INNER JOIN document_templates dt ON dt.id = card.template_id
        WHERE card.reference_type = 'student_result_card'
          AND card.reference_id = $1
          AND card.institution_id = $2
          AND card.enrollment_id = $3
          AND COALESCE(card.is_deleted, FALSE) = FALSE
          AND COALESCE(card.status, 'active') = 'active'
        ORDER BY card.created_at DESC
      `,
      [studentId, institutionId, enrollmentId]
    );

    // 4. ASSIGNMENTS
    const assignmentsPromise = db.query(
      `
        WITH eligible_assignments AS (
          SELECT DISTINCT
            a.id,
            a.title,
            a.description,
            a.total_marks::float8 AS total_marks,
            a.issue_date,
            a.submission_date,
            a.status
          FROM student_enrollments se
          INNER JOIN assignments a
            ON a.institution_id = se.institution_id
           AND a.status = 'active'
           AND COALESCE(a.is_deleted, FALSE) = FALSE
           AND a.academic_year_id = se.academic_year_id
          LEFT JOIN assignment_targets target ON target.assignment_id = a.id
          WHERE se.id = $1
            AND (
              target.target_type IS NULL
              OR target.target_type = 'INSTITUTION'
              OR (
                target.target_type = 'PROGRAM'
                AND (
                  se.program_id = target.target_id
                  OR se.class_category_id IN (
                    SELECT category_id FROM program_categories WHERE program_id = target.target_id
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
            )
        )
        SELECT
          ea.id,
          ea.title,
          ea.description,
          ea.total_marks,
          ea.issue_date,
          ea.submission_date,
          COALESCE(sa.status, 'pending') AS submission_status,
          sa.submitted_at,
          sa.obtained_marks::float8 AS obtained_marks
        FROM eligible_assignments ea
        LEFT JOIN student_assignments sa
          ON sa.assignment_id = ea.id
         AND sa.student_id = $2
         AND sa.enrollment_id = $1
         AND COALESCE(sa.is_deleted, FALSE) = FALSE
        ORDER BY ea.submission_date DESC, ea.id DESC
      `,
      [enrollmentId, studentId]
    );

    // 5. NOTES READING TIMING
    const notesReadingPromise = db.query(
      `
        SELECT
          sn.id AS note_id,
          sn.title,
          sn.subject_name,
          COALESCE(srs.reading_time_seconds, 0) AS reading_time_seconds,
          srs.last_read_at,
          COALESCE(srs.is_completed, FALSE) AS is_completed
        FROM study_notes sn
        LEFT JOIN student_note_reading_sessions srs
          ON srs.note_id = sn.id
         AND srs.student_id = $1
         AND srs.enrollment_id = $2
        WHERE (
          sn.institution_id = $3
          OR sn.is_public = TRUE
          OR (sn.program_id IS NOT NULL AND sn.program_id = $4)
        )
        AND COALESCE(sn.is_deleted, FALSE) = FALSE
        AND COALESCE(sn.is_active, TRUE) = TRUE
        ORDER BY srs.last_read_at DESC NULLS LAST, sn.id DESC
        LIMIT 50
      `,
      [studentId, enrollmentId, institutionId, programId]
    );

    const [
      practiceRes,
      fullDayRes,
      periodWiseRes,
      officialExamsRes,
      resultCardsRes,
      assignmentsRes,
      notesReadingRes,
    ] = await Promise.all([
      practiceExamsPromise,
      fullDayAttendancePromise,
      periodWiseAttendancePromise,
      officialExamsPromise,
      resultCardsPromise,
      assignmentsPromise,
      notesReadingPromise,
    ]);

    // ==========================================
    // CALCULATION LOGIC
    // ==========================================

    // --- 1. Practice Exams Calculation ---
    const practiceRows = practiceRes.rows;
    const totalPracticeAvailable = practiceRows.length;
    const completedPracticeAttempts = practiceRows.filter(
      (r) => r.attempt_status === "completed" || (r.percentage !== null && r.percentage !== undefined)
    );
    const totalPracticeAttempted = completedPracticeAttempts.length;
    const practiceAttemptRate = totalPracticeAvailable > 0
      ? Number(((totalPracticeAttempted / totalPracticeAvailable) * 100).toFixed(1))
      : 100;

    let practiceTotalPercentage = 0;
    let totalCorrectAnswers = 0;
    let totalWrongAnswers = 0;
    let totalUnanswered = 0;
    let totalTimeTakenPractice = 0;

    completedPracticeAttempts.forEach((att) => {
      practiceTotalPercentage += Number(att.percentage || 0);
      totalCorrectAnswers += Number(att.correct_answers || 0);
      totalWrongAnswers += Number(att.wrong_answers || 0);
      totalUnanswered += Number(att.unanswered || 0);
      totalTimeTakenPractice += Number(att.time_taken_seconds || 0);
    });

    const practiceAvgPercentage = totalPracticeAttempted > 0
      ? Number((practiceTotalPercentage / totalPracticeAttempted).toFixed(1))
      : 0;

    const answeredQuestions = totalCorrectAnswers + totalWrongAnswers;
    const practiceAccuracyRate = answeredQuestions > 0
      ? Number(((totalCorrectAnswers / answeredQuestions) * 100).toFixed(1))
      : practiceAvgPercentage;

    // Pillar Score: If exams attempted, blend avg percentage (70%) and attempt rate (30%)
    const practicePillarScore = totalPracticeAvailable > 0
      ? (totalPracticeAttempted > 0
          ? Number(((practiceAvgPercentage * 0.7) + (practiceAttemptRate * 0.3)).toFixed(1))
          : 0)
      : (totalPracticeAttempted > 0 ? practiceAvgPercentage : 80); // Default good standing if no practice exams created yet

    // --- 2. Attendance Calculation ---
    // Combine full-day and period-wise if full-day is absent, or use full-day as primary
    const allAttendanceRecords = [
      ...fullDayRes.rows.map((r) => ({ ...r, mode: "FULL_DAY" })),
      ...(fullDayRes.rows.length === 0 ? periodWiseRes.rows.map((r) => ({ ...r, mode: "PERIOD_WISE" })) : []),
    ];

    let totalAttendanceDays = allAttendanceRecords.length;
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let lateDays = 0;

    allAttendanceRecords.forEach((rec) => {
      const st = String(rec.status).toUpperCase();
      if (st === "PRESENT") presentDays += 1;
      else if (st === "ABSENT") absentDays += 1;
      else if (st === "LEAVE") leaveDays += 1;
      else if (st === "LATE") {
        lateDays += 1;
        presentDays += 1;
      }
    });

    const attendancePercentage = totalAttendanceDays > 0
      ? Number(((presentDays / totalAttendanceDays) * 100).toFixed(1))
      : 95.0; // Default baseline if institution has not marked sessions yet

    const attendancePillarScore = attendancePercentage;

    // --- 3. Official Exams Results Calculation ---
    const officialExamRows = officialExamsRes.rows;
    const totalOfficialExams = officialExamRows.length;
    const completedOfficialExams = officialExamRows.filter(
      (r) => r.attempt_status === "completed" || (r.percentage !== null && r.percentage !== undefined)
    );
    const examsAppeared = completedOfficialExams.length;

    let officialTotalPercentage = 0;
    let highestExamScore = 0;
    let officialTotalObtained = 0;
    let officialTotalMarksPossible = 0;

    completedOfficialExams.forEach((att) => {
      const pct = Number(att.percentage || 0);
      officialTotalPercentage += pct;
      if (pct > highestExamScore) highestExamScore = pct;
      officialTotalObtained += Number(att.obtained_marks || 0);
      officialTotalMarksPossible += Number(att.total_marks || 100);
    });

    const officialAvgPercentage = examsAppeared > 0
      ? Number((officialTotalPercentage / examsAppeared).toFixed(1))
      : (resultCardsRes.rows.length > 0 ? 85.0 : 0);

    const resultsPillarScore = totalOfficialExams > 0
      ? (examsAppeared > 0 ? officialAvgPercentage : 0)
      : (resultCardsRes.rows.length > 0 ? 85.0 : 75.0);

    // Letter grade for results
    let resultsGrade = "N/A";
    if (resultsPillarScore >= 90) resultsGrade = "A+";
    else if (resultsPillarScore >= 80) resultsGrade = "A";
    else if (resultsPillarScore >= 70) resultsGrade = "B+";
    else if (resultsPillarScore >= 60) resultsGrade = "B";
    else if (resultsPillarScore >= 50) resultsGrade = "C";
    else resultsGrade = "D";

    // --- 4. Assignments Calculation ---
    const assignmentRows = assignmentsRes.rows;
    const totalAssignments = assignmentRows.length;
    const submittedAssignments = assignmentRows.filter((r) =>
      ["submitted", "checked"].includes(String(r.submission_status).toLowerCase())
    );
    const submittedCount = submittedAssignments.length;
    const pendingCount = totalAssignments - submittedCount;
    const now = new Date();
    const overdueCount = assignmentRows.filter(
      (r) => !["submitted", "checked"].includes(String(r.submission_status).toLowerCase()) &&
        r.submission_date &&
        new Date(r.submission_date) < now
    ).length;

    const assignmentCompletionRate = totalAssignments > 0
      ? Number(((submittedCount / totalAssignments) * 100).toFixed(1))
      : 100;

    // Calculate quality score on graded ones
    let totalGradedAssignments = 0;
    let totalGradedPct = 0;
    submittedAssignments.forEach((sa) => {
      if (sa.obtained_marks !== null && sa.obtained_marks !== undefined && sa.total_marks > 0) {
        totalGradedAssignments += 1;
        totalGradedPct += (Number(sa.obtained_marks) / Number(sa.total_marks)) * 100;
      }
    });

    const assignmentAvgGrade = totalGradedAssignments > 0
      ? Number((totalGradedPct / totalGradedAssignments).toFixed(1))
      : (submittedCount > 0 ? 85.0 : 0);

    const assignmentPillarScore = totalAssignments > 0
      ? Number(((assignmentCompletionRate * 0.6) + ((assignmentAvgGrade || assignmentCompletionRate) * 0.4)).toFixed(1))
      : 85.0;

    // --- 5. Notes Reading Timing Calculation ---
    const notesRows = notesReadingRes.rows;
    let totalReadingSeconds = 0;
    let notesReadCount = 0;
    let completedNotesCount = 0;

    notesRows.forEach((n) => {
      const sec = Number(n.reading_time_seconds || 0);
      if (sec > 0) {
        totalReadingSeconds += sec;
        notesReadCount += 1;
      }
      if (n.is_completed) completedNotesCount += 1;
    });

    const totalReadingMinutes = Math.round(totalReadingSeconds / 60);
    const totalReadingHours = Number((totalReadingSeconds / 3600).toFixed(1));
    const avgMinutesPerNote = notesReadCount > 0 ? Math.round(totalReadingMinutes / notesReadCount) : 0;

    // Benchmark reading target: 120 minutes (2 hours) of study reading = 100 points
    // Plus notes read coverage
    const timeScore = Math.min(100, (totalReadingMinutes / 120) * 100);
    const coverageScore = notesRows.length > 0 ? (notesReadCount / notesRows.length) * 100 : 100;
    const notesReadingPillarScore = notesRows.length > 0 || totalReadingSeconds > 0
      ? Number(((timeScore * 0.7) + (coverageScore * 0.3)).toFixed(1))
      : 80.0; // Baseline if notes module is newly launched

    // --- COMPOSITE OVERALL PERFORMANCE SCORE ---
    // Weights:
    // Results (Official Exams): 25%
    // Attendance: 20%
    // Practice Exams: 20%
    // Assignments: 20%
    // Notes Reading: 15%
    const compositeScore = Number(
      (
        (resultsPillarScore * 0.25) +
        (attendancePillarScore * 0.20) +
        (practicePillarScore * 0.20) +
        (assignmentPillarScore * 0.20) +
        (notesReadingPillarScore * 0.15)
      ).toFixed(1)
    );

    let overallGrade = "A+";
    let overallStatus = "Outstanding";
    let overallColor = "emerald";

    if (compositeScore >= 90) {
      overallGrade = "A+";
      overallStatus = "Outstanding";
      overallColor = "emerald";
    } else if (compositeScore >= 80) {
      overallGrade = "A";
      overallStatus = "Excellent";
      overallColor = "green";
    } else if (compositeScore >= 70) {
      overallGrade = "B+";
      overallStatus = "Very Good";
      overallColor = "blue";
    } else if (compositeScore >= 60) {
      overallGrade = "B";
      overallStatus = "Good";
      overallColor = "amber";
    } else if (compositeScore >= 50) {
      overallGrade = "C";
      overallStatus = "Needs Improvement";
      overallColor = "orange";
    } else {
      overallGrade = "D";
      overallStatus = "Needs Attention";
      overallColor = "rose";
    }

    // --- Actionable Insights ---
    const insights: Array<{ type: "strength" | "opportunity" | "tip"; title: string; message: string }> = [];

    if (attendancePercentage >= 85) {
      insights.push({
        type: "strength",
        title: "Exceptional Attendance Consistency",
        message: `Your current attendance rate of ${attendancePercentage}% is well above the required threshold. Maintain this streak for academic excellence.`,
      });
    } else if (attendancePercentage < 75 && totalAttendanceDays > 0) {
      insights.push({
        type: "opportunity",
        title: "Attendance Warning (< 75%)",
        message: `Your attendance is currently ${attendancePercentage}%. Attend upcoming lectures regularly to fulfill eligibility criteria for board and semester exams.`,
      });
    }

    if (practiceAccuracyRate >= 80 && totalPracticeAttempted > 0) {
      insights.push({
        type: "strength",
        title: "High Problem Solving Accuracy",
        message: `You achieved a ${practiceAccuracyRate}% accuracy in practice exams with ${totalCorrectAnswers} correct answers out of ${answeredQuestions} attempted questions.`,
      });
    } else if (totalPracticeAttempted < totalPracticeAvailable && totalPracticeAvailable > 0) {
      insights.push({
        type: "opportunity",
        title: "Unattempted Practice Exams",
        message: `You have completed ${totalPracticeAttempted} out of ${totalPracticeAvailable} mock practice tests. Attempting remaining tests will reinforce speed and accuracy.`,
      });
    }

    if (assignmentCompletionRate === 100 && totalAssignments > 0) {
      insights.push({
        type: "strength",
        title: "100% Assignment Submission Record",
        message: "All assigned coursework and homework assignments have been submitted on time. Keep up the high discipline.",
      });
    } else if (overdueCount > 0) {
      insights.push({
        type: "opportunity",
        title: `${overdueCount} Overdue Assignment${overdueCount > 1 ? "s" : ""}`,
        message: `You have ${overdueCount} pending assignment${overdueCount > 1 ? "s" : ""} past the due date. Complete and submit them to avoid grade deductions.`,
      });
    }

    if (totalReadingMinutes >= 60) {
      insights.push({
        type: "strength",
        title: "Solid Note Reading Habit",
        message: `You have dedicated ${totalReadingHours} hours (${totalReadingMinutes} minutes) to reviewing revision notes and study material.`,
      });
    } else {
      insights.push({
        type: "tip",
        title: "Increase Study Notes Reading Time",
        message: "Students who read course notes for at least 30 minutes daily score 25% higher on official term assessments.",
      });
    }

    return NextResponse.json({
      enrollment: {
        id: enrollment.id,
        student_id: enrollment.student_id,
        institution_id: enrollment.institution_id,
        program_id: enrollment.program_id,
        section_id: enrollment.section_id,
        academic_year_id: enrollment.academic_year_id,
      },
      overall: {
        score: compositeScore,
        grade: overallGrade,
        status: overallStatus,
        color: overallColor,
        summary: `Your overall performance index is ${compositeScore}% (${overallGrade} - ${overallStatus}). Calculated across all 5 key academic pillars.`,
      },
      pillars: {
        practice_exams: {
          name: "Practice Exams",
          score: practicePillarScore,
          weight: 20,
          metrics: {
            total_available: totalPracticeAvailable,
            total_attempted: totalPracticeAttempted,
            attempt_rate: practiceAttemptRate,
            avg_percentage: practiceAvgPercentage,
            accuracy_rate: practiceAccuracyRate,
            total_correct: totalCorrectAnswers,
            total_wrong: totalWrongAnswers,
            total_unanswered: totalUnanswered,
            total_time_taken_seconds: totalTimeTakenPractice,
          },
          history: practiceRows.slice(0, 10),
        },
        attendance: {
          name: "Attendance",
          score: attendancePillarScore,
          weight: 20,
          metrics: {
            total_days: totalAttendanceDays,
            present_days: presentDays,
            absent_days: absentDays,
            late_days: lateDays,
            leave_days: leaveDays,
            attendance_percentage: attendancePercentage,
          },
          history: allAttendanceRecords.slice(0, 15),
        },
        results: {
          name: "Official Exams & Results",
          score: resultsPillarScore,
          weight: 25,
          metrics: {
            total_exams: totalOfficialExams,
            exams_appeared: examsAppeared,
            avg_percentage: officialAvgPercentage,
            highest_score: highestExamScore,
            total_obtained: officialTotalObtained,
            total_possible: officialTotalMarksPossible,
            result_cards_count: resultCardsRes.rows.length,
            grade: resultsGrade,
          },
          history: officialExamRows.slice(0, 10),
          result_cards: resultCardsRes.rows.slice(0, 5),
        },
        assignments: {
          name: "Assignments & Homework",
          score: assignmentPillarScore,
          weight: 20,
          metrics: {
            total_assigned: totalAssignments,
            submitted_count: submittedCount,
            pending_count: pendingCount,
            overdue_count: overdueCount,
            completion_rate: assignmentCompletionRate,
            avg_grade: assignmentAvgGrade,
          },
          history: assignmentRows.slice(0, 10),
        },
        notes_reading: {
          name: "Notes Reading Timing",
          score: notesReadingPillarScore,
          weight: 15,
          metrics: {
            total_notes_available: notesRows.length,
            notes_read_count: notesReadCount,
            completed_notes_count: completedNotesCount,
            total_reading_seconds: totalReadingSeconds,
            total_reading_minutes: totalReadingMinutes,
            total_reading_hours: totalReadingHours,
            avg_minutes_per_note: avgMinutesPerNote,
          },
          history: notesRows.filter((r) => Number(r.reading_time_seconds) > 0).slice(0, 10),
        },
      },
      insights,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST endpoint to log or update reading time for a note
export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensureNotesReadingSchema();

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) {
      return NextResponse.json({ error: "No active student enrollment found" }, { status: 400 });
    }

    const body = await req.json();
    const { note_id, reading_time_seconds, is_completed } = body;

    if (!note_id) {
      return NextResponse.json({ error: "note_id is required" }, { status: 400 });
    }

    const addedSeconds = Math.max(0, parseInt(reading_time_seconds, 10) || 0);
    const completedFlag = Boolean(is_completed);

    const result = await db.query(
      `
        INSERT INTO student_note_reading_sessions (
          student_id, enrollment_id, note_id, reading_time_seconds, last_read_at, is_completed, updated_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (student_id, note_id, enrollment_id)
        DO UPDATE SET
          reading_time_seconds = student_note_reading_sessions.reading_time_seconds + EXCLUDED.reading_time_seconds,
          last_read_at = CURRENT_TIMESTAMP,
          is_completed = CASE WHEN EXCLUDED.is_completed THEN TRUE ELSE student_note_reading_sessions.is_completed END,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `,
      [enrollment.student_id, enrollment.id, note_id, addedSeconds, completedFlag]
    );

    return NextResponse.json({ success: true, session: result.rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}
