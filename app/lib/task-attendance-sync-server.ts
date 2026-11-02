import {
  calculateDayTaskAttendance,
  toLocalDateStr,
  type DayTaskAttendanceMetrics,
} from "./task-attendance-sync";
import { recordPerformancePoints } from "@/lib/performance/performance-engine";

/**
 * Server-only helper:
 * Upserts staff attendance record in database from task activity on a specific day,
 * and records on-time or late attendance performance points.
 */
export async function syncTaskAttendanceToDatabase(
  dbInstance: any,
  staffUserId: number,
  institutionId: number,
  dateStr?: string,
  userShiftTiming?: any
): Promise<DayTaskAttendanceMetrics | null> {
  try {
    const targetDate = dateStr || toLocalDateStr(new Date());
    if (!staffUserId || !institutionId) return null;

    // Fetch user's shift timing if not provided
    let shiftTiming = userShiftTiming;
    if (!shiftTiming) {
      const userRes = await dbInstance
        .query(`SELECT profile FROM users WHERE id = $1`, [staffUserId])
        .catch(() => ({ rows: [] }));
      shiftTiming = userRes.rows[0]?.profile?.shift_timing || null;
    }

    // Also look up institution default attendance setup if no user shift
    if (!shiftTiming) {
      const setupRes = await dbInstance
        .query(
          `SELECT title, start_time, end_time, grace_period_mins
           FROM institution_attendance_setups
           WHERE (institution_id = $1 OR institution_id IS NULL)
             AND is_active = TRUE
             AND target_type = 'STAFF'
           ORDER BY institution_id NULLS LAST, is_default DESC
           LIMIT 1`,
          [institutionId]
        )
        .catch(() => ({ rows: [] }));
      if (setupRes.rows[0]) {
        shiftTiming = setupRes.rows[0];
      }
    }

    // Look up company calendar for holiday on targetDate
    const holidayRes = await dbInstance
      .query(
        `SELECT title FROM institution_calendar_events
         WHERE (institution_id = $1 OR institution_id IS NULL)
           AND event_type = 'HOLIDAY'
           AND COALESCE(is_deleted, FALSE) = FALSE
           AND $2::date BETWEEN start_date::date AND end_date::date
         LIMIT 1`,
        [institutionId, targetDate]
      )
      .catch(() => ({ rows: [] as any[] }));
    const holidayTitle = holidayRes.rows[0]?.title || null;
    const holidayInfo = holidayTitle ? { title: holidayTitle } : null;

    // Ensure valid effective institution ID
    let effectiveInstId = institutionId;
    if (!effectiveInstId) {
      const mRes = await dbInstance.query(
        `SELECT institution_id FROM institution_memberships WHERE user_id = $1 AND is_active = TRUE ORDER BY id DESC LIMIT 1`,
        [staffUserId]
      ).catch(() => ({ rows: [] }));
      effectiveInstId = mRes.rows[0]?.institution_id || 1;
    }

    // Fetch user's tasks (including individual assigned, team assigned, and subtask assigned)
    const tasksRes = await dbInstance.query(
      `SELECT * FROM operations_tasks
       WHERE (institution_id = $1 OR institution_id IS NULL OR $1 = 0 OR $1 IS NULL)
         AND (
           assigned_employee_id = $2
           OR created_by = $2
           OR project_leader_id = $2
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_employees, '[]'::jsonb)) elem
             WHERE (elem->>'id')::text = $2::text 
                OR (elem->>'employee_id')::text = $2::text 
                OR elem #>> '{}' = $2::text
                OR elem::text = $2::text
           )
           OR EXISTS (
             SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) st
             WHERE (st->>'assigned_employee_id')::text = $2::text
           )
         )`,
      [effectiveInstId, staffUserId]
    );

    const tasks = tasksRes.rows || [];
    const metrics = calculateDayTaskAttendance(tasks, targetDate, shiftTiming, holidayInfo);

    if (metrics.checkInCount === 0 && !metrics.earliestStart) {
      if (holidayTitle) {
        await dbInstance
          .query(
            `INSERT INTO staff_attendance (
              institution_id,
              staff_user_id,
              attendance_date,
              status,
              working_hours,
              task_hours,
              check_in_count,
              remarks,
              is_late,
              late_minutes,
              is_early_exit,
              early_exit_minutes,
              attentiveness_score,
              dedication_tier,
              shift_name,
              updated_at
            ) VALUES ($1, $2, $3, 'HOLIDAY', 0, 0, 0, $4, FALSE, 0, FALSE, 0, 100, 'DEDICATED', $5, timezone('Asia/Kolkata', NOW()))
            ON CONFLICT (institution_id, staff_user_id, attendance_date)
            DO UPDATE SET
              status = 'HOLIDAY',
              remarks = EXCLUDED.remarks,
              updated_at = timezone('Asia/Kolkata', NOW())
            WHERE staff_attendance.status NOT IN ('PRESENT', 'LEAVE')`,
            [
              institutionId,
              staffUserId,
              targetDate,
              `Company Holiday: ${holidayTitle}`,
              shiftTiming?.title || "General Shift",
            ]
          )
          .catch(() => null);
      }
      return metrics;
    }

    // Auto status: if late, mark LATE if working minutes under threshold, else PRESENT
    const dbStatus = metrics.isLate && metrics.workingMinutes < metrics.expectedMinutes ? "LATE" : metrics.status;
    const defaultRemarks = holidayTitle
      ? `Holiday Worked: ${holidayTitle}`
      : metrics.taskTitles.length > 0
      ? `Tasks: ${metrics.taskTitles.join(", ")}`
      : "Task activity logged";

    // Upsert into staff_attendance
    await dbInstance.query(
      `INSERT INTO staff_attendance (
        institution_id,
        staff_user_id,
        attendance_date,
        status,
        check_in_time,
        check_out_time,
        working_hours,
        task_hours,
        check_in_count,
        remarks,
        is_late,
        late_minutes,
        is_early_exit,
        early_exit_minutes,
        attentiveness_score,
        dedication_tier,
        shift_name,
        updated_at
      )
      VALUES ($1, $2, $3::date, $4, $5::time, $6::time, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (institution_id, staff_user_id, attendance_date)
      DO UPDATE SET
        check_in_time = COALESCE(LEAST(staff_attendance.check_in_time, EXCLUDED.check_in_time), EXCLUDED.check_in_time),
        check_out_time = COALESCE(GREATEST(staff_attendance.check_out_time, EXCLUDED.check_out_time), EXCLUDED.check_out_time),
        working_hours = EXCLUDED.working_hours,
        task_hours = EXCLUDED.task_hours,
        check_in_count = GREATEST(staff_attendance.check_in_count, EXCLUDED.check_in_count),
        is_late = EXCLUDED.is_late,
        late_minutes = EXCLUDED.late_minutes,
        is_early_exit = EXCLUDED.is_early_exit,
        early_exit_minutes = EXCLUDED.early_exit_minutes,
        attentiveness_score = EXCLUDED.attentiveness_score,
        dedication_tier = EXCLUDED.dedication_tier,
        shift_name = EXCLUDED.shift_name,
        status = CASE
          WHEN staff_attendance.status IN ('LEAVE', 'ABSENT', 'HOLIDAY') AND EXCLUDED.status IN ('PRESENT', 'LATE') THEN EXCLUDED.status
          WHEN staff_attendance.status IS NULL THEN EXCLUDED.status
          ELSE staff_attendance.status
        END,
        updated_at = NOW()`,
      [
        institutionId,
        staffUserId,
        targetDate,
        dbStatus,
        metrics.checkInTime,
        metrics.checkOutTime,
        metrics.workingHours,
        metrics.taskHours,
        metrics.checkInCount,
        metrics.summaryReason || (metrics.taskTitles.length > 0 ? `Tasks: ${metrics.taskTitles.slice(0, 3).join(", ")}` : "Task activity"),
        metrics.isLate,
        metrics.lateMinutes,
        metrics.isEarlyExit,
        metrics.earlyExitMinutes,
        metrics.attentivenessScore,
        metrics.dedicationTier,
        metrics.shiftLabel,
      ]
    );

    // Automatically award or deduct daily attendance performance points
    try {
      if (metrics.checkInCount > 0 && !holidayTitle) {
        if (!metrics.isLate && !metrics.isEarlyExit) {
          await recordPerformancePoints({
            employeeId: staffUserId,
            activityType: "attendance_on_time",
            referenceModule: "attendance",
            referenceRecordId: String(staffUserId) + "_" + targetDate,
            idempotencyKey: "attendance:" + staffUserId + ":" + targetDate + ":on_time",
            institutionId,
            customDescription: "On-time attendance check-in on " + targetDate,
          });
        } else if (metrics.isLate || metrics.isEarlyExit) {
          const reason = metrics.isLate && metrics.isEarlyExit
            ? "Late arrival (" + metrics.lateMinutes + "m) & early exit (" + metrics.earlyExitMinutes + "m)"
            : metrics.isLate
            ? "Late arrival (" + metrics.lateMinutes + "m)"
            : "Early exit (" + metrics.earlyExitMinutes + "m)";
          await recordPerformancePoints({
            employeeId: staffUserId,
            activityType: "attendance_violation",
            referenceModule: "attendance",
            referenceRecordId: String(staffUserId) + "_" + targetDate,
            idempotencyKey: "attendance:" + staffUserId + ":" + targetDate + ":violation",
            institutionId,
            customDescription: "Attendance violation: " + reason + " on " + targetDate,
          });
        }
      }
    } catch (perfErr) {
      console.warn("[syncTaskAttendanceToDatabase] performance points error:", perfErr);
    }

    return metrics;
  } catch (err) {
    console.error("[syncTaskAttendanceToDatabase] error:", err);
    return null;
  }
}

