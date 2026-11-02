const fs = require('fs');

// ========================================================
// 1. Update app/api/admin/operations/tasks/route.ts
// ========================================================
let routeContent = fs.readFileSync('app/api/admin/operations/tasks/route.ts', 'utf8');

// Replace processDailyRecurringTasksAndPenalties with Option A recurrence engine
const oldProcessFnRegex = /async function processDailyRecurringTasksAndPenalties[\s\S]*?^export async function GET/m;

const newProcessFn = `async function processDailyRecurringTasksAndPenalties(dbInstance: any) {
  try {
    const now = new Date();
    const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayFormatted = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); // e.g. 01 Nov 2026

    // Fetch tasks that have subtasks
    const recurringRes = await dbInstance.query(
      \`SELECT id, title, institution_id, created_by, is_daily_recurring, last_recurring_date, sub_tasks, penalty_points, daily_recurrence_history FROM operations_tasks WHERE sub_tasks IS NOT NULL\`
    );
    const tasks = recurringRes.rows || [];

    for (const t of tasks) {
      const subTasks = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
      let taskChanged = false;

      const updatedSubTasks = subTasks.map((s: any) => {
        const cadence = String(s.cadence || (s.is_daily_recurring ? "daily" : "once")).toLowerCase();
        if (cadence === "once") return s;

        // Check last recurring date for this subtask
        let lastDate = s.last_recurring_date || null;
        const uploads = Array.isArray(s.uploads) ? s.uploads : [];

        if (!lastDate && uploads.length > 0) {
          const dates = uploads
            .map((u: any) => (u?.uploaded_at ? new Date(u.uploaded_at).toISOString().split("T")[0] : null))
            .filter(Boolean);
          if (dates.length > 0) {
            dates.sort();
            lastDate = dates[dates.length - 1];
          }
        }

        let isDue = false;

        if (!lastDate) {
          // If no deliverable exists yet, generate initial deliverable for today
          if (uploads.length === 0) {
            isDue = true;
          }
        } else {
          const lastTime = new Date(lastDate).getTime();
          const todayTime = new Date(todayDateStr).getTime();
          const diffDays = Math.floor((todayTime - lastTime) / (1000 * 60 * 60 * 24));

          if (cadence === "daily") {
            if (lastDate < todayDateStr) isDue = true;
          } else if (cadence === "weekly") {
            if (diffDays >= 7) isDue = true;
          } else if (cadence === "monthly") {
            const lastD = new Date(lastDate);
            const monthsDiff = (now.getFullYear() - lastD.getFullYear()) * 12 + (now.getMonth() - lastD.getMonth());
            if (monthsDiff >= 1 && diffDays >= 28) isDue = true;
          }
        }

        if (!isDue) return s;

        // Idempotency: verify deliverable for today has not already been created
        const alreadyGeneratedToday = uploads.some((u: any) => {
          if (!u || !u.uploaded_at) return false;
          const uDate = new Date(u.uploaded_at).toISOString().split("T")[0];
          return uDate === todayDateStr && (
            (u.notes && u.notes.includes(todayFormatted)) ||
            (u.file_name && u.file_name.includes(todayFormatted))
          );
        });

        if (alreadyGeneratedToday) {
          return {
            ...s,
            last_recurring_date: todayDateStr,
          };
        }

        // Penalty check: if previous deliverable was uncompleted and penalty configured
        if (lastDate && s.status !== "completed" && s.assigned_employee_id) {
          const penaltyAmount = Math.abs(parseFloat(String(s.penalty_points || t.penalty_points)) || 10);
          void recordPerformancePoints({
            employeeId: Number(s.assigned_employee_id),
            activityType: "task_failed",
            referenceModule: "operations",
            referenceRecordId: t.id,
            customDescription: \`Uncompleted \${cadence} deliverable: "\${s.title}" for \${lastDate}\`,
          }).catch(() => {});
        }

        // Generate new Deliverable Item (Option A: Shared deliverable for all assigned employees)
        const newDeliverable = {
          id: \`task_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
          file_name: \`\${s.title} (\${todayFormatted})\`,
          file_url: "",
          file_type: "task_item",
          file_size: 0,
          notes: \`\${s.title} - \${todayFormatted} Deliverable\`,
          uploaded_at: now.toISOString(),
          uploaded_by_id: s.assigned_employee_id || t.created_by || 1,
          uploaded_by_name: s.assigned_employee_name || "System Scheduler",
          uploaded_by_role: s.assigned_employee_role || "automated",
          status: "pending",
          comments: [],
          status_history: [
            {
              id: \`hist_\${Date.now()}\`,
              action: "uploaded",
              status: "pending",
              changed_at: now.toISOString(),
              changed_by_name: "Recurrence Engine",
              notes: \`Auto-generated on \${cadence} schedule for \${todayFormatted}\`,
            },
          ],
        };

        taskChanged = true;
        return {
          ...s,
          last_recurring_date: todayDateStr,
          status: "pending",
          uploads: [newDeliverable, ...uploads],
        };
      });

      if (taskChanged) {
        await dbInstance.query(
          \`UPDATE operations_tasks
           SET sub_tasks = $1::jsonb,
               last_recurring_date = $2::date,
               updated_at = NOW()
           WHERE id = $3\`,
          [JSON.stringify(updatedSubTasks), todayDateStr, t.id]
        ).catch((err: any) => console.error("Recurrence update error for task", t.id, err));
      }
    }
  } catch (err) {
    console.error("[processDailyRecurringTasksAndPenalties] Error:", err);
  }
}

export async function GET`;

if (oldProcessFnRegex.test(routeContent)) {
  routeContent = routeContent.replace(oldProcessFnRegex, newProcessFn);
  console.log("Updated recurrence function in route.ts");
} else {
  console.error("Could not find old process function regex in route.ts");
}

// Update sub_tasks JSON query check for multi-employee assignment
const oldSubCheck = `WHERE elem->>'assigned_employee_id' = $`;
const newSubCheck = `WHERE elem->>'assigned_employee_id' = $`;

routeContent = routeContent.replace(
  `WHERE elem->>'assigned_employee_id' = \${uidParam}`,
  `WHERE elem->>'assigned_employee_id' = \${uidParam} OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(elem->'assigned_employees', '[]'::jsonb)) sub_ae WHERE sub_ae->>'id' = \${uidParam} OR sub_ae->>'employee_id' = \${uidParam})`
);

routeContent = routeContent.replace(
  `WHERE elem->>'assigned_employee_id' = \${empParam}`,
  `WHERE elem->>'assigned_employee_id' = \${empParam} OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(elem->'assigned_employees', '[]'::jsonb)) sub_ae WHERE sub_ae->>'id' = \${empParam} OR sub_ae->>'employee_id' = \${empParam})`
);

fs.writeFileSync('app/api/admin/operations/tasks/route.ts', routeContent, 'utf8');
console.log('Saved app/api/admin/operations/tasks/route.ts');

