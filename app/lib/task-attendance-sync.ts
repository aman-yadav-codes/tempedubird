/**
 * task-attendance-sync.ts
 * Utilities to calculate working hours, check-in count, check-out, total task hours,
 * punctuality (late arrival / early departure), and attentiveness & dedication ratings
 * according to the staff profile's selected attendance setup / shift timing.
 */

export type DedicationTier = "HIGHLY_DEDICATED" | "DEDICATED" | "MODERATE" | "NEEDS_ATTENTION";

export interface ParsedShiftTiming {
  title: string;
  startMinutes: number; // minutes from midnight (e.g. 09:00 = 540)
  endMinutes: number;   // minutes from midnight (e.g. 17:00 = 1020)
  graceMins: number;    // grace period in minutes (e.g. 15)
  expectedMinutes: number; // e.g. 480 mins (8 hours)
  expectedHours: number;   // 8.0
  startFormatted: string;  // "09:00 AM"
  endFormatted: string;    // "05:00 PM"
  label: string;           // "09:00 AM - 05:00 PM (General Shift)"
}

export interface DayTaskAttendanceMetrics {
  dateStr: string;
  earliestStart: number | null;
  latestStop: number | null;
  checkInTime: string | null; // HH:MM:SS format
  checkOutTime: string | null; // HH:MM:SS format
  checkInCount: number; // Total number of task starts/check-ins on this day
  workingHours: number; // Hours span from first task start to last task stop
  taskHours: number; // Total active hours actually spent working on tasks
  workingMinutes: number;
  taskMinutes: number;
  taskTitles: string[];
  hasActiveTask: boolean;
  status: "PRESENT" | "HALF_DAY" | "ABSENT" | "HOLIDAY";
  holidayTitle?: string | null;

  // Shift & Compliance details
  shiftLabel: string;
  expectedHours: number;
  expectedMinutes: number;
  isLate: boolean;
  lateMinutes: number;
  lateLabel: string;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  earlyExitLabel: string;
  attentivenessScore: number;
  dedicationTier: DedicationTier;
  tierLabel: string;
  tierColor: string;
  summaryReason: string;
}

/**
 * Parse staff shift timing from a string, e.g.:
 * - "09:00 AM - 05:00 PM (General Shift)"
 * - "08:00 AM - 02:00 PM (Morning Shift)"
 * - "10:00 AM - 06:00 PM (Regular Day Shift)"
 * - "09:00 - 17:00"
 * Or an attendance setup object with start_time, end_time, grace_period_mins, title.
 */
export function parseShiftTiming(shiftInput?: any): ParsedShiftTiming {
  const fallback: ParsedShiftTiming = {
    title: "General Shift",
    startMinutes: 9 * 60,       // 09:00 AM
    endMinutes: 17 * 60,       // 05:00 PM
    graceMins: 15,
    expectedMinutes: 8 * 60,   // 480 mins
    expectedHours: 8.0,
    startFormatted: "09:00 AM",
    endFormatted: "05:00 PM",
    label: "09:00 AM - 05:00 PM (General Shift)",
  };

  if (!shiftInput) return fallback;

  // 1. If an object from institution_attendance_setups or user profile
  if (typeof shiftInput === "object") {
    if (shiftInput.start_time || shiftInput.startTime) {
      const sTime = String(shiftInput.start_time || shiftInput.startTime || "09:00");
      const eTime = String(shiftInput.end_time || shiftInput.endTime || "17:00");
      const grace = Number(shiftInput.grace_period_mins ?? shiftInput.gracePeriodMins ?? 15);
      const title = String(shiftInput.title || shiftInput.name || "Custom Shift");

      const [sH, sM] = sTime.split(":").map((n) => parseInt(n, 10) || 0);
      const [eH, eM] = eTime.split(":").map((n) => parseInt(n, 10) || 0);

      const startMinutes = sH * 60 + sM;
      let endMinutes = eH * 60 + eM;
      if (endMinutes <= startMinutes) endMinutes += 24 * 60; // overnight shift support

      const expectedMinutes = Math.max(60, endMinutes - startMinutes);
      const expectedHours = Math.round((expectedMinutes / 60) * 10) / 10;

      const format12 = (min: number) => {
        const h = Math.floor((min % (24 * 60)) / 60);
        const m = min % 60;
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
      };

      const sFmt = format12(startMinutes);
      const eFmt = format12(endMinutes);

      return {
        title,
        startMinutes,
        endMinutes,
        graceMins: isNaN(grace) ? 15 : grace,
        expectedMinutes,
        expectedHours,
        startFormatted: sFmt,
        endFormatted: eFmt,
        label: `${sFmt} - ${eFmt} (${title})`,
      };
    }

    if (shiftInput.shift_timing) {
      return parseShiftTiming(shiftInput.shift_timing);
    }
  }

  // 2. If a string description
  if (typeof shiftInput === "string") {
    const raw = shiftInput.trim();
    if (!raw) return fallback;

    // Matches e.g. "09:00 AM - 05:00 PM (General Shift)" or "09:00 - 17:00"
    const regex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*(?:-|to)\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?(?:\s*\((.*?)\))?/i;
    const match = raw.match(regex);

    if (match) {
      let sH = parseInt(match[1], 10);
      const sM = parseInt(match[2], 10);
      const sAmpm = match[3]?.toUpperCase();

      let eH = parseInt(match[4], 10);
      const eM = parseInt(match[5], 10);
      const eAmpm = match[6]?.toUpperCase();

      const title = match[7]?.trim() || "Shift";

      if (sAmpm === "PM" && sH < 12) sH += 12;
      if (sAmpm === "AM" && sH === 12) sH = 0;

      if (eAmpm === "PM" && eH < 12) eH += 12;
      if (eAmpm === "AM" && eH === 12) eH = 0;

      const startMinutes = sH * 60 + sM;
      let endMinutes = eH * 60 + eM;
      if (endMinutes <= startMinutes) endMinutes += 24 * 60;

      const expectedMinutes = Math.max(60, endMinutes - startMinutes);
      const expectedHours = Math.round((expectedMinutes / 60) * 10) / 10;

      const format12 = (h: number, m: number) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
      };

      const sFmt = format12(sH % 24, sM);
      const eFmt = format12(eH % 24, eM);

      return {
        title,
        startMinutes,
        endMinutes,
        graceMins: 15,
        expectedMinutes,
        expectedHours,
        startFormatted: sFmt,
        endFormatted: eFmt,
        label: `${sFmt} - ${eFmt} (${title})`,
      };
    }
  }

  return fallback;
}

/**
 * Convert Date/number/string to local YYYY-MM-DD
 */
export function toLocalDateStr(val: Date | number | string): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date/timestamp matches targetDateStr in either local timezone or UTC
 */
export function isDateMatch(dateOrStr: any, targetDateStr: string): boolean {
  if (!dateOrStr) return false;
  if (typeof dateOrStr === "string" && dateOrStr.startsWith(targetDateStr)) return true;
  const d = new Date(dateOrStr);
  if (isNaN(d.getTime())) return false;
  const local = toLocalDateStr(d);
  if (local === targetDateStr) return true;
  try {
    if (d.toISOString().split("T")[0] === targetDateStr) return true;
  } catch {}
  return false;
}

/**
 * Format timestamp (ms) to HH:MM:SS (24h) for database TIME column
 */
export function formatToTimeStr(ms: number | null): string | null {
  if (!ms || isNaN(ms)) return null;
  const d = new Date(ms);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Evaluates attendance punctuality (late, early exit) and calculates
 * attentiveness & dedication score based on total working hours and task output.
 */
export function evaluateComplianceAndDedication(params: {
  earliestStart: number | null;
  latestStop: number | null;
  workingMinutes: number;
  taskMinutes: number;
  shift: ParsedShiftTiming;
  hasActiveTask: boolean;
  isToday: boolean;
}): {
  isLate: boolean;
  lateMinutes: number;
  lateLabel: string;
  isEarlyExit: boolean;
  earlyExitMinutes: number;
  earlyExitLabel: string;
  attentivenessScore: number;
  dedicationTier: DedicationTier;
  tierLabel: string;
  tierColor: string;
  summaryReason: string;
} {
  const { earliestStart, latestStop, workingMinutes, taskMinutes, shift, hasActiveTask, isToday } = params;

  // 1. Evaluate Late Arrival
  let isLate = false;
  let lateMinutes = 0;
  let lateLabel = "—";

  if (earliestStart !== null) {
    const startD = new Date(earliestStart);
    const startMinOfDay = startD.getHours() * 60 + startD.getMinutes();
    const allowedDeadline = shift.startMinutes + shift.graceMins;

    if (startMinOfDay > allowedDeadline) {
      isLate = true;
      lateMinutes = Math.max(1, startMinOfDay - shift.startMinutes);
      lateLabel = `Late (+${lateMinutes}m)`;
    } else {
      isLate = false;
      lateMinutes = 0;
      lateLabel = "On Time";
    }
  }

  // 2. Evaluate Early Departure
  let isEarlyExit = false;
  let earlyExitMinutes = 0;
  let earlyExitLabel = "—";

  if (isToday && hasActiveTask) {
    isEarlyExit = false;
    earlyExitMinutes = 0;
    earlyExitLabel = "Active / In Progress";
  } else if (latestStop !== null) {
    const stopD = new Date(latestStop);
    const stopMinOfDay = stopD.getHours() * 60 + stopD.getMinutes();

    if (stopMinOfDay < shift.endMinutes) {
      isEarlyExit = true;
      earlyExitMinutes = Math.max(1, shift.endMinutes - stopMinOfDay);
      earlyExitLabel = `Left Early (-${earlyExitMinutes}m)`;
    } else {
      isEarlyExit = false;
      earlyExitMinutes = 0;
      earlyExitLabel = "Full Shift";
    }
  }

  // 3. Evaluate Attentiveness & Dedication Score based on Total Working Hours
  const expectedMins = shift.expectedMinutes || 480;
  let attentivenessScore = 0;
  let dedicationTier: DedicationTier = "MODERATE";
  let tierLabel = "⏱️ Moderate";
  let tierColor = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  let summaryReason = "Average attentiveness";

  if (workingMinutes > 0) {
    // Working hours compliance: up to 70 points (100% or more = 70 points)
    const workRatio = Math.min(1.25, workingMinutes / expectedMins);
    const workPoints = workRatio * 70;

    // Task focus ratio: up to 20 points (time actively spent on task deliverables vs idle)
    const taskRatio = workingMinutes > 0 ? Math.min(1.0, taskMinutes / workingMinutes) : 0;
    const taskPoints = taskRatio * 20;

    // Punctuality & full attendance: 10 points
    let punctualityPoints = 0;
    if (!isLate) punctualityPoints += 5;
    if (!isEarlyExit) punctualityPoints += 5;

    attentivenessScore = Math.min(100, Math.round(workPoints + taskPoints + punctualityPoints));

    if (attentivenessScore >= 90 && workingMinutes >= expectedMins * 0.9) {
      dedicationTier = "HIGHLY_DEDICATED";
      tierLabel = "🌟 Highly Dedicated";
      tierColor = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      summaryReason = `Exemplary dedication: completed full ${Math.round((workingMinutes / 60) * 10) / 10}h shift with high deliverable focus`;
    } else if (attentivenessScore >= 75 && workingMinutes >= expectedMins * 0.75) {
      dedicationTier = "DEDICATED";
      tierLabel = "🎯 Dedicated";
      tierColor = "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
      summaryReason = `Attentive & dedicated: met standard ${Math.round((workingMinutes / 60) * 10) / 10}h working hours`;
    } else if (attentivenessScore >= 50 || workingMinutes >= expectedMins * 0.45) {
      dedicationTier = "MODERATE";
      tierLabel = "⏱️ Moderate";
      tierColor = "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
      summaryReason = isEarlyExit ? `Left shift early (-${earlyExitMinutes}m)` : isLate ? `Late arrival (+${lateMinutes}m)` : "Partial shift hours logged";
    } else {
      dedicationTier = "NEEDS_ATTENTION";
      tierLabel = "⚠️ Needs Attention";
      tierColor = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      summaryReason = `Substantial under-hours: only ${Math.round((workingMinutes / 60) * 10) / 10}h of required ${shift.expectedHours}h logged`;
    }
  } else {
    dedicationTier = "NEEDS_ATTENTION";
    tierLabel = "⚠️ Unmarked / No Hours";
    tierColor = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    summaryReason = "No working hours recorded";
  }

  return {
    isLate,
    lateMinutes,
    lateLabel,
    isEarlyExit,
    earlyExitMinutes,
    earlyExitLabel,
    attentivenessScore,
    dedicationTier,
    tierLabel,
    tierColor,
    summaryReason,
  };
}

/**
 * Calculate day's attendance metrics from tasks for a given staff member, date,
 * and their assigned shift timing / attendance setup.
 */
export function calculateDayTaskAttendance(
  tasks: any[],
  targetDateStr: string,
  shiftInput?: any,
  holidayInfo?: { title: string } | null
): DayTaskAttendanceMetrics {
  const starts: number[] = [];
  const stops: number[] = [];
  const taskTitlesSet = new Set<string>();
  let totalActiveTaskSeconds = 0;
  let hasActiveTask = false;

  const todayLocalStr = toLocalDateStr(new Date());
  const todayIsoStr = new Date().toISOString().split("T")[0];
  const isTargetToday = targetDateStr === todayLocalStr || targetDateStr === todayIsoStr;
  const nowMs = Date.now();
  const shift = parseShiftTiming(shiftInput);

  tasks.forEach((t) => {
    let taskHadActivityToday = false;

    // 1. Process history events chronologically to extract starts, stops, and exact session durations
    if (Array.isArray(t.history) && t.history.length > 0) {
      const eventsByEntity: Record<string, any[]> = {};
      t.history.forEach((evt: any) => {
        if (!evt.timestamp) return;
        const key = evt.subtask_id ? `sub_${evt.subtask_id}` : `task_${t.id}`;
        if (!eventsByEntity[key]) eventsByEntity[key] = [];
        eventsByEntity[key].push(evt);
      });

      Object.values(eventsByEntity).forEach((events) => {
        const sorted = [...events].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        let currentStart: number | null = null;

        sorted.forEach((evt: any) => {
          const evtDate = new Date(evt.timestamp);
          if (isNaN(evtDate.getTime())) return;
          const evtMs = evtDate.getTime();
          const onTargetDay = isDateMatch(evt.timestamp, targetDateStr);

          if (evt.action === "started") {
            if (onTargetDay) {
              starts.push(evtMs);
              taskHadActivityToday = true;
            }
            currentStart = evtMs;
          } else if (evt.action === "stopped" || evt.action === "completed") {
            if (onTargetDay) {
              stops.push(evtMs);
              taskHadActivityToday = true;
            }
            if (currentStart !== null) {
              const startOnTarget = isDateMatch(currentStart, targetDateStr);
              if (startOnTarget || onTargetDay) {
                const diffSec = Math.max(0, Math.floor((evtMs - currentStart) / 1000));
                totalActiveTaskSeconds += diffSec;
              }
              currentStart = null;
            }
          }
        });

        if (currentStart !== null && isTargetToday) {
          if (isDateMatch(currentStart, targetDateStr)) {
            hasActiveTask = true;
            const diffSec = Math.max(0, Math.floor((nowMs - currentStart) / 1000));
            totalActiveTaskSeconds += diffSec;
          }
        }
      });
    }

    // 2. Check direct task timestamps
    if (t.started_at) {
      const startMs = new Date(t.started_at).getTime();
      const startOnTarget = !isNaN(startMs) && isDateMatch(t.started_at, targetDateStr);

      if (startOnTarget) {
        starts.push(startMs);
        taskHadActivityToday = true;

        if (t.stopped_at) {
          const stopMs = new Date(t.stopped_at).getTime();
          if (!isNaN(stopMs)) {
            stops.push(stopMs);
            if (totalActiveTaskSeconds === 0) {
              totalActiveTaskSeconds += Math.max(0, Math.floor((stopMs - startMs) / 1000));
            }
          }
        } else if (t.completed_at) {
          const compMs = new Date(t.completed_at).getTime();
          if (!isNaN(compMs)) {
            stops.push(compMs);
            if (totalActiveTaskSeconds === 0) {
              totalActiveTaskSeconds += Math.max(0, Math.floor((compMs - startMs) / 1000));
            }
          }
        } else if (isTargetToday && (t.status === "in_progress" || !t.stopped_at)) {
          hasActiveTask = true;
          if (totalActiveTaskSeconds === 0) {
            totalActiveTaskSeconds += Math.max(0, Math.floor((nowMs - startMs) / 1000));
          }
        }
      } else if (t.stopped_at && isDateMatch(t.stopped_at, targetDateStr)) {
        const stopMs = new Date(t.stopped_at).getTime();
        if (!isNaN(stopMs)) {
          stops.push(stopMs);
          taskHadActivityToday = true;
        }
      }
    }

    // 3. Check subtasks
    if (Array.isArray(t.sub_tasks)) {
      t.sub_tasks.forEach((sub: any) => {
        if (sub.started_at && isDateMatch(sub.started_at, targetDateStr)) {
          const startMs = new Date(sub.started_at).getTime();
          if (!isNaN(startMs)) {
            starts.push(startMs);
            taskHadActivityToday = true;
          }
          if (sub.stopped_at) {
            const stopMs = new Date(sub.stopped_at).getTime();
            if (!isNaN(stopMs)) {
              stops.push(stopMs);
            }
          } else if (isTargetToday && sub.status === "in_progress") {
            hasActiveTask = true;
          }
        } else if (sub.stopped_at && isDateMatch(sub.stopped_at, targetDateStr)) {
          const stopMs = new Date(sub.stopped_at).getTime();
          if (!isNaN(stopMs)) {
            stops.push(stopMs);
            taskHadActivityToday = true;
          }
        }
      });
    }

    if (taskHadActivityToday && t.title) {
      taskTitlesSet.add(t.title);
    }
  });

  const checkInCount = starts.length;
  const earliestStart = starts.length > 0 ? Math.min(...starts) : null;
  const latestStop = stops.length > 0 ? Math.max(...stops) : null;

  let workingMinutes = 0;
  if (earliestStart !== null) {
    if (latestStop !== null && latestStop >= earliestStart) {
      // Whole day working hours span from first start to last stop
      workingMinutes = Math.max(1, Math.round((latestStop - earliestStart) / (1000 * 60)));
    } else if (isTargetToday) {
      workingMinutes = Math.max(1, Math.round((nowMs - earliestStart) / (1000 * 60)));
    }
  }

  let taskMinutes = Math.round(totalActiveTaskSeconds / 60);
  if (taskMinutes > workingMinutes && workingMinutes > 0) {
    taskMinutes = workingMinutes;
  }
  if (taskMinutes === 0 && workingMinutes > 0 && checkInCount > 0) {
    taskMinutes = workingMinutes;
  }

  const workingHours = Math.round((workingMinutes / 60) * 100) / 100;
  const taskHours = Math.round((taskMinutes / 60) * 100) / 100;

  // Status computation: If late or half day or present
  const compliance = evaluateComplianceAndDedication({
    earliestStart,
    latestStop,
    workingMinutes,
    taskMinutes,
    shift,
    hasActiveTask,
    isToday: isTargetToday,
  });

  let status: "PRESENT" | "HALF_DAY" | "ABSENT" | "HOLIDAY" = "ABSENT";
  if (checkInCount > 0 || earliestStart !== null) {
    if (workingMinutes >= (shift.expectedMinutes * 0.5) || hasActiveTask) {
      status = "PRESENT";
    } else {
      status = "HALF_DAY";
    }
    if (holidayInfo) {
      compliance.dedicationTier = "HIGHLY_DEDICATED";
      compliance.tierLabel = "🌟 Holiday Contributor";
      compliance.tierColor = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      compliance.summaryReason = `Exemplary dedication: worked on official company holiday (${holidayInfo.title})`;
    }
  } else if (holidayInfo) {
    status = "HOLIDAY";
    compliance.dedicationTier = "DEDICATED";
    compliance.tierLabel = `🏖️ ${holidayInfo.title}`;
    compliance.tierColor = "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    compliance.summaryReason = `Official Company Holiday: ${holidayInfo.title}`;
    compliance.attentivenessScore = 100;
  }

  return {
    dateStr: targetDateStr,
    earliestStart,
    latestStop,
    checkInTime: formatToTimeStr(earliestStart),
    checkOutTime: formatToTimeStr(latestStop),
    checkInCount,
    workingHours,
    taskHours,
    workingMinutes,
    taskMinutes,
    taskTitles: Array.from(taskTitlesSet),
    hasActiveTask,
    status,
    holidayTitle: holidayInfo?.title || null,

    // Shift & Compliance
    shiftLabel: shift.label,
    expectedHours: shift.expectedHours,
    expectedMinutes: shift.expectedMinutes,
    isLate: compliance.isLate,
    lateMinutes: compliance.lateMinutes,
    lateLabel: compliance.lateLabel,
    isEarlyExit: compliance.isEarlyExit,
    earlyExitMinutes: compliance.earlyExitMinutes,
    earlyExitLabel: compliance.earlyExitLabel,
    attentivenessScore: compliance.attentivenessScore,
    dedicationTier: compliance.dedicationTier,
    tierLabel: compliance.tierLabel,
    tierColor: compliance.tierColor,
    summaryReason: compliance.summaryReason,
  };
}

/**
 * Upserts staff attendance record in database from task activity on a specific day
 */
export async function syncTaskAttendanceToDatabase(
  dbInstance: any,
  staffUserId: number,
  institutionId: number,
  dateStr?: string,
  userShiftTiming?: any
) {
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

    // Fetch user's tasks
    const tasksRes = await dbInstance.query(
      `SELECT * FROM operations_tasks
       WHERE institution_id = $1
         AND (assigned_employee_id = $2 OR created_by = $2)`,
      [institutionId, staffUserId]
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
        working_hours = GREATEST(staff_attendance.working_hours, EXCLUDED.working_hours),
        task_hours = GREATEST(staff_attendance.task_hours, EXCLUDED.task_hours),
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

    return metrics;
  } catch (err) {
    console.error("[syncTaskAttendanceToDatabase] error:", err);
    return null;
  }
}
