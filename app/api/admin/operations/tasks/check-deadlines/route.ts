/**
 * POST /api/admin/operations/tasks/check-deadlines
 *
 * Finds all overdue tasks/sub-tasks and applies penalty rules automatically.
 * Idempotent — skips items already penalised for the current deadline window.
 *
 * Can be called:
 *   - Manually by an admin ("Run Deadline Check" button)
 *   - Via a scheduled cron/webhook (future)
 */
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { isPlatformAdminUser, isInstitutionAdminUser } from "@/lib/auth/permissions";
import { applyPenaltyRules } from "@/lib/penalties/applyPenaltyRules";

function isAdmin(user: any): boolean {
  if (!user) return false;
  const roleCodes: string[] = user.role_codes || [user.role || user.primary_role || ""];
  return (
    Boolean(user.is_super_admin) ||
    isPlatformAdminUser(user) ||
    isInstitutionAdminUser(user) ||
    roleCodes.some((r) =>
      ["platform_admin", "super_admin", "institution_admin", "school_owner",
       "college_owner", "university_owner", "director", "principal"].includes(r)
    )
  );
}

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const institutionId: number | null = body.institution_id
      ? parseInt(body.institution_id)
      : ((user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null);

    const now = new Date();
    const results: {
      taskId: number | null;
      subtaskId: string | null;
      title: string;
      employeeId: number;
      hoursOverdue: number;
      penaltyApplied: number;
      skipped: boolean;
      reason?: string;
    }[] = [];

    // ── 1. Find overdue MAIN tasks ─────────────────────────────────────────────
    const overdueTasksRes = await db.query(
      `SELECT
         ot.id,
         ot.title,
         ot.institution_id,
         ot.assigned_employee_id,
         ot.assigned_employee_name,
         ot.deadline_date,
         ot.status
       FROM operations_tasks ot
       WHERE ot.status NOT IN ('completed', 'cancelled')
         AND ot.deadline_date IS NOT NULL
         AND ot.deadline_date < NOW()
         ${institutionId ? "AND ot.institution_id = $1" : ""}
       ORDER BY ot.deadline_date ASC
       LIMIT 200`,
      institutionId ? [institutionId] : []
    );

    for (const task of overdueTasksRes.rows) {
      if (!task.assigned_employee_id) {
        results.push({
          taskId: task.id, subtaskId: null, title: task.title,
          employeeId: 0, hoursOverdue: 0, penaltyApplied: 0,
          skipped: true, reason: "No assignee",
        });
        continue;
      }

      // Idempotency: skip if already penalised today for this task's deadline
      const alreadyPenalised = await db.query(
        `SELECT id FROM task_score_adjustments
         WHERE task_id = $1
           AND employee_id = $2
           AND adjustment_type = 'penalty'
           AND reason LIKE '%deadline_auto%task#${task.id}%'
           AND DATE(created_at) = CURRENT_DATE
         LIMIT 1`,
        [task.id, task.assigned_employee_id]
      );

      if (alreadyPenalised.rows.length > 0) {
        results.push({
          taskId: task.id, subtaskId: null, title: task.title,
          employeeId: task.assigned_employee_id, hoursOverdue: 0,
          penaltyApplied: 0, skipped: true, reason: "Already penalised today",
        });
        continue;
      }

      const deadlineMs = new Date(task.deadline_date).getTime();
      const hoursOverdue = Math.max(0, (now.getTime() - deadlineMs) / 3_600_000);

      const penaltyResult = await applyPenaltyRules({
        ruleType: "task_deadline",
        institutionId: task.institution_id ?? institutionId,
        employeeId: task.assigned_employee_id,
        employeeName: task.assigned_employee_name ?? undefined,
        taskId: task.id,
        overdueValue: hoursOverdue,
        overdueUnit: "hours",
        context: `Task deadline missed — deadline_auto task#${task.id}: "${task.title}"`,
        createdBy: user?.id ?? null,
        createdByName: user?.full_name || "System (Auto)",
      });

      results.push({
        taskId: task.id, subtaskId: null, title: task.title,
        employeeId: task.assigned_employee_id,
        hoursOverdue: Math.round(hoursOverdue * 10) / 10,
        penaltyApplied: penaltyResult.penaltyApplied,
        skipped: false,
      });
    }

    // ── 2. Find overdue SUB-TASKS ──────────────────────────────────────────────
    const overdueSubRes = await db.query(
      `SELECT
         st->>'id'                    AS subtask_id,
         st->>'title'                 AS subtask_title,
         st->>'status'                AS subtask_status,
         st->>'deadline_date'         AS deadline_date,
         (st->>'assigned_employee_id')::int AS employee_id,
         st->>'assigned_employee_name'    AS employee_name,
         ot.id                        AS task_id,
         ot.institution_id
       FROM operations_tasks ot,
            jsonb_array_elements(
              CASE jsonb_typeof(ot.sub_tasks)
                WHEN 'array' THEN ot.sub_tasks
                ELSE '[]'::jsonb
              END
            ) AS st
       WHERE (st->>'status') NOT IN ('completed', 'cancelled')
         AND (st->>'deadline_date') IS NOT NULL
         AND (st->>'deadline_date')::timestamp < NOW()
         ${institutionId ? "AND ot.institution_id = $1" : ""}
       LIMIT 200`,
      institutionId ? [institutionId] : []
    );

    for (const sub of overdueSubRes.rows) {
      if (!sub.employee_id) {
        results.push({
          taskId: sub.task_id, subtaskId: sub.subtask_id, title: sub.subtask_title,
          employeeId: 0, hoursOverdue: 0, penaltyApplied: 0,
          skipped: true, reason: "No assignee",
        });
        continue;
      }

      // Idempotency for sub-tasks
      const alreadyPenalised = await db.query(
        `SELECT id FROM task_score_adjustments
         WHERE task_id = $1
           AND employee_id = $2
           AND adjustment_type = 'penalty'
           AND reason LIKE '%deadline_auto%subtask#${sub.subtask_id}%'
           AND DATE(created_at) = CURRENT_DATE
         LIMIT 1`,
        [sub.task_id, sub.employee_id]
      );

      if (alreadyPenalised.rows.length > 0) {
        results.push({
          taskId: sub.task_id, subtaskId: sub.subtask_id, title: sub.subtask_title,
          employeeId: sub.employee_id, hoursOverdue: 0,
          penaltyApplied: 0, skipped: true, reason: "Already penalised today",
        });
        continue;
      }

      const deadlineMs = new Date(sub.deadline_date).getTime();
      const hoursOverdue = Math.max(0, (now.getTime() - deadlineMs) / 3_600_000);

      const penaltyResult = await applyPenaltyRules({
        ruleType: "task_deadline",
        institutionId: sub.institution_id ?? institutionId,
        employeeId: sub.employee_id,
        employeeName: sub.employee_name ?? undefined,
        taskId: sub.task_id,
        overdueValue: hoursOverdue,
        overdueUnit: "hours",
        context: `Sub-task deadline missed — deadline_auto subtask#${sub.subtask_id}: "${sub.subtask_title}"`,
        createdBy: user?.id ?? null,
        createdByName: user?.full_name || "System (Auto)",
      });

      results.push({
        taskId: sub.task_id, subtaskId: sub.subtask_id, title: sub.subtask_title,
        employeeId: sub.employee_id,
        hoursOverdue: Math.round(hoursOverdue * 10) / 10,
        penaltyApplied: penaltyResult.penaltyApplied,
        skipped: false,
      });
    }

    const totalPenaltyApplied = results.reduce((sum, r) => sum + r.penaltyApplied, 0);
    const penalisedCount = results.filter((r) => !r.skipped && r.penaltyApplied > 0).length;
    const skippedCount = results.filter((r) => r.skipped).length;

    return NextResponse.json({
      success: true,
      summary: {
        checkedAt: now.toISOString(),
        totalItems: results.length,
        penalisedCount,
        skippedCount,
        totalPenaltyApplied,
      },
      results,
    });
  } catch (err: any) {
    console.error("[check-deadlines POST]", err);
    return NextResponse.json(
      { error: err.message || "Deadline check failed" },
      { status: 500 }
    );
  }
}
