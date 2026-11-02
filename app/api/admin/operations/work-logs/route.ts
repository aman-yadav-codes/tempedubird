import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { isPlatformAdminUser, isInstitutionAdminUser, hasPermission } from "@/lib/auth/permissions";

export interface SystemWorkLogItem {
  id: string;
  timestamp: string;
  time_display: string;
  date_display: string;
  module: "operations" | "finance" | "clients" | "staff" | "categories" | "settings";
  action: string;
  action_label: string;
  title: string;
  details?: string | null;
  badge_color: "emerald" | "blue" | "amber" | "rose" | "purple" | "zinc";
  user_id?: string | number | null;
  user_name: string;
  user_role?: string | null;
  user_avatar?: string | null;
  task_id?: number | null;
  task_title?: string | null;
  subtask_id?: string | null;
  subtask_title?: string | null;
  client_id?: number | null;
  client_name?: string | null;
  institution_id?: number | null;
  amount?: number | null;
  category_name?: string | null;
  payment_method?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  location?: {
    latitude: number;
    longitude: number;
    address?: string | null;
  } | null;
  duration_minutes?: number | null;
  points?: number | null;
}

function getKolkataDate(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatTimeDisplay(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "--:--";
  }
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const targetDate = url.searchParams.get("date")?.trim() || getKolkataDate();
    const selectedModule = url.searchParams.get("module")?.trim() || "all";
    const selectedStaffId = url.searchParams.get("staff_id")?.trim() || "";
    const selectedClientId = url.searchParams.get("client_id")?.trim() || "";
    const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
    const rawInstId = url.searchParams.get("institution_id") || url.searchParams.get("institutionId");
    const institutionId = rawInstId && rawInstId !== "all" && rawInstId !== "none" ? Number(rawInstId) : null;

    const roleCodes: string[] = (user as any).role_codes || [(user as any).role || (user as any).primary_role || ""];
    const isClient = roleCodes.includes("client");
    const isPlatformAdmin = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user);

    // If client, look up their linked client profile
    let clientProfileId: number | null = null;
    if (isClient) {
      const clientRes = await db.query(
        `SELECT id FROM clients WHERE user_id = $1 OR (email IS NOT NULL AND lower(email) = lower($2)) LIMIT 1`,
        [user.id, (user as any).email || ""]
      );
      if (clientRes.rows[0]) {
        clientProfileId = clientRes.rows[0].id;
      }
    }

    const allEvents: SystemWorkLogItem[] = [];

    // ==========================================
    // 1. QUERY system_activity_logs TABLE
    // ==========================================
    try {
      const dbLogsRes = await db.query(
        `SELECT * FROM system_activity_logs 
         WHERE created_at::date = $1::date
           AND ($2::int IS NULL OR institution_id = $2::int OR institution_id IS NULL)
         ORDER BY created_at DESC`,
        [targetDate, institutionId]
      );

      for (const row of dbLogsRes.rows) {
        const meta = row.metadata || {};
        allEvents.push({
          id: `dblog_${row.id}`,
          timestamp: new Date(row.created_at).toISOString(),
          time_display: formatTimeDisplay(row.created_at),
          date_display: targetDate,
          module: row.module || "operations",
          action: row.action_type || "activity",
          action_label: (row.action_type || "Activity").replace(/_/g, " ").toUpperCase(),
          title: row.title,
          details: row.description,
          badge_color:
            row.module === "finance"
              ? "emerald"
              : row.module === "clients"
              ? "purple"
              : row.module === "staff"
              ? "blue"
              : "amber",
          user_id: row.user_id,
          user_name: row.user_name || "System",
          user_role: row.user_role,
          task_id: meta.task_id ? Number(meta.task_id) : undefined,
          task_title: meta.task_title || undefined,
          subtask_id: meta.subtask_id || undefined,
          subtask_title: meta.subtask_title || undefined,
          client_id: row.client_id || meta.client_id,
          client_name: row.client_name || meta.client_name,
          institution_id: row.institution_id,
          amount: meta.amount != null ? Number(meta.amount) : undefined,
          category_name: meta.category_name,
          payment_method: meta.payment_method,
          file_url: meta.file_url,
          file_name: meta.file_name,
          file_type: meta.file_type,
          location: meta.location,
          duration_minutes: meta.duration_minutes,
        });
      }
    } catch {
      // ignore if table empty or query fails
    }

    // ==========================================
    // 2. SYNTHESIZE FROM operations_tasks
    // ==========================================
    try {
      const tasksRes = await db.query(
        `SELECT id, title, client_id, client_name, assigned_clients, institution_id, 
                created_by, created_at, updated_at, history, sub_tasks, status
         FROM operations_tasks
         WHERE ($2::int IS NULL OR institution_id = $2::int OR institution_id IS NULL)
           AND (
             created_at::date = $1::date
             OR updated_at::date = $1::date
             OR history IS NOT NULL
             OR sub_tasks IS NOT NULL
           )`,
        [targetDate, institutionId]
      );

      for (const t of tasksRes.rows) {
        const clientsArr = Array.isArray(t.assigned_clients) ? t.assigned_clients : [];
        const clientName = t.client_name || clientsArr[0]?.company_name || clientsArr[0]?.name || null;
        const clientId = t.client_id || clientsArr[0]?.id || null;

        // A. Project Created on target date
        if (t.created_at && getKolkataDate(new Date(t.created_at)) === targetDate) {
          allEvents.push({
            id: `task_create_${t.id}`,
            timestamp: new Date(t.created_at).toISOString(),
            time_display: formatTimeDisplay(t.created_at),
            date_display: targetDate,
            module: "operations",
            action: "task_created",
            action_label: "Project Created",
            title: `Created project: "${t.title}"`,
            details: `Initial status: ${t.status || "pending"}`,
            badge_color: "blue",
            task_id: t.id,
            task_title: t.title,
            client_id: clientId,
            client_name: clientName,
            institution_id: t.institution_id,
            user_name: "Platform Admin",
            user_role: "Admin",
          });
        }

        // B. Task History events on target date
        const historyArr = Array.isArray(t.history) ? t.history : [];
        for (let i = 0; i < historyArr.length; i++) {
          const h = historyArr[i];
          if (h && h.timestamp && getKolkataDate(new Date(h.timestamp)) === targetDate) {
            const act = String(h.action || "updated").toLowerCase();
            let label = "Task Activity";
            let color: "emerald" | "blue" | "amber" | "rose" | "purple" | "zinc" = "zinc";

            if (act === "started") {
              label = "Timer Started";
              color = "blue";
            } else if (act === "stopped") {
              label = "Timer Stopped";
              color = "amber";
            } else if (act === "completed") {
              label = "Task Completed";
              color = "emerald";
            } else if (act === "rework") {
              label = "Sent to Rework";
              color = "rose";
            } else if (act.includes("file") || act.includes("upload")) {
              label = "File / Deliverable Activity";
              color = "purple";
            } else if (act === "status_changed") {
              label = `Status: ${(h.new_status || "").replace(/_/g, " ").toUpperCase()}`;
              color = "amber";
            }

            allEvents.push({
              id: `hist_${t.id}_${h.id || i}`,
              timestamp: new Date(h.timestamp).toISOString(),
              time_display: formatTimeDisplay(h.timestamp),
              date_display: targetDate,
              module: "operations",
              action: h.action || "task_event",
              action_label: label,
              title: h.subtask_title
                ? `[${t.title}] Sub-task "${h.subtask_title}" ${act}`
                : `Project "${t.title}" ${act}`,
              details: h.details || (h.old_status && h.new_status ? `Changed from ${h.old_status} to ${h.new_status}` : null),
              badge_color: color,
              user_id: h.user_id,
              user_name: h.user_name || "Staff Member",
              user_role: h.user_role || "Staff",
              task_id: t.id,
              task_title: t.title,
              subtask_id: h.subtask_id,
              subtask_title: h.subtask_title,
              client_id: clientId,
              client_name: clientName,
              institution_id: t.institution_id,
              location: h.location,
            });
          }
        }

        // C. Subtask Work Updates on target date
        const subtasksArr = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
        for (const s of subtasksArr) {
          const updates = Array.isArray(s.work_updates) ? s.work_updates : [];
          for (const u of updates) {
            if (u && u.created_at && getKolkataDate(new Date(u.created_at)) === targetDate) {
              allEvents.push({
                id: `subupd_${u.id || Math.random()}`,
                timestamp: new Date(u.created_at).toISOString(),
                time_display: formatTimeDisplay(u.created_at),
                date_display: targetDate,
                module: "operations",
                action: "work_update",
                action_label: "Deliverable & Work Note",
                title: `Deliverable Update on "${s.title}" (${t.title})`,
                details: u.notes || null,
                badge_color: "emerald",
                user_id: u.created_by_id,
                user_name: u.created_by_name || "Staff Member",
                user_role: u.created_by_role || "Staff",
                task_id: t.id,
                task_title: t.title,
                subtask_id: s.id,
                subtask_title: s.title,
                client_id: clientId,
                client_name: clientName,
                institution_id: t.institution_id,
                file_url: u.file_url,
                file_name: u.file_name,
                file_type: u.file_type,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[work-logs] Error synthesizing tasks:", err);
    }

    // ==========================================
    // 3. SYNTHESIZE FROM FINANCE (Income, Expenses, Categories, Invoices)
    // ==========================================
    // A. Income Entries
    try {
      const incomeRes = await db.query(
        `SELECT inc.*, cat.name as category_name, u.full_name as author_name
         FROM finance_income_entries inc
         LEFT JOIN finance_income_categories cat ON cat.id = inc.category_id
         LEFT JOIN users u ON u.id = inc.created_by
         WHERE (inc.income_date = $1::date OR inc.created_at::date = $1::date)
           AND ($2::int IS NULL OR inc.institution_id = $2::int OR inc.institution_id IS NULL)
         ORDER BY inc.created_at DESC`,
        [targetDate, institutionId]
      );

      for (const inc of incomeRes.rows) {
        allEvents.push({
          id: `income_${inc.id}`,
          timestamp: inc.created_at ? new Date(inc.created_at).toISOString() : `${targetDate}T12:00:00.000Z`,
          time_display: formatTimeDisplay(inc.created_at || `${targetDate}T12:00:00.000Z`),
          date_display: targetDate,
          module: "finance",
          action: "income_added",
          action_label: "Income Added",
          title: `Received ₹${Number(inc.amount).toLocaleString("en-IN")} (${inc.category_name || "General Income"})`,
          details: inc.description || (inc.payer_name ? `From: ${inc.payer_name}` : null),
          badge_color: "emerald",
          amount: Number(inc.amount),
          category_name: inc.category_name,
          payment_method: inc.payment_method,
          client_name: inc.payer_name || null,
          user_id: inc.created_by,
          user_name: inc.author_name || "Accountant",
          institution_id: inc.institution_id,
        });
      }
    } catch {}

    // B. Expense Entries
    try {
      const expRes = await db.query(
        `SELECT exp.*, cat.name as category_name, u.full_name as author_name
         FROM finance_expense_entries exp
         LEFT JOIN finance_expense_categories cat ON cat.id = exp.category_id
         LEFT JOIN users u ON u.id = exp.created_by
         WHERE (exp.expense_date = $1::date OR exp.created_at::date = $1::date)
           AND ($2::int IS NULL OR exp.institution_id = $2::int OR exp.institution_id IS NULL)
         ORDER BY exp.created_at DESC`,
        [targetDate, institutionId]
      );

      for (const exp of expRes.rows) {
        allEvents.push({
          id: `expense_${exp.id}`,
          timestamp: exp.created_at ? new Date(exp.created_at).toISOString() : `${targetDate}T12:00:00.000Z`,
          time_display: formatTimeDisplay(exp.created_at || `${targetDate}T12:00:00.000Z`),
          date_display: targetDate,
          module: "finance",
          action: "expense_added",
          action_label: "Expense Logged",
          title: `Logged Expense of ₹${Number(exp.amount).toLocaleString("en-IN")}: "${exp.description || exp.paid_to || 'Company Expense'}"`,
          details: exp.description || (exp.paid_to ? `Paid to: ${exp.paid_to}` : null),
          badge_color: "rose",
          amount: Number(exp.amount),
          category_name: exp.category_name,
          payment_method: exp.payment_method,
          file_url: exp.invoice_url,
          file_name: exp.invoice_file_name,
          user_id: exp.created_by,
          user_name: exp.author_name || "Staff Member",
          institution_id: exp.institution_id,
        });
      }
    } catch {}

    // C. Categories Created/Updated Today
    try {
      const incCatRes = await db.query(
        `SELECT id, name, created_at, updated_at FROM finance_income_categories 
         WHERE (created_at::date = $1::date OR updated_at::date = $1::date)
           AND ($2::int IS NULL OR institution_id = $2::int OR institution_id IS NULL)`,
        [targetDate, institutionId]
      );
      for (const c of incCatRes.rows) {
        allEvents.push({
          id: `inccat_${c.id}`,
          timestamp: new Date(c.created_at || c.updated_at).toISOString(),
          time_display: formatTimeDisplay(c.created_at || c.updated_at),
          date_display: targetDate,
          module: "categories",
          action: "category_created",
          action_label: "Income Category Added",
          title: `Added Income Category: "${c.name}"`,
          badge_color: "purple",
          category_name: c.name,
          user_name: "Administrator",
        });
      }

      const expCatRes = await db.query(
        `SELECT id, name, created_at, updated_at FROM finance_expense_categories 
         WHERE (created_at::date = $1::date OR updated_at::date = $1::date)
           AND ($2::int IS NULL OR institution_id = $2::int OR institution_id IS NULL)`,
        [targetDate, institutionId]
      );
      for (const c of expCatRes.rows) {
        allEvents.push({
          id: `expcat_${c.id}`,
          timestamp: new Date(c.created_at || c.updated_at).toISOString(),
          time_display: formatTimeDisplay(c.created_at || c.updated_at),
          date_display: targetDate,
          module: "categories",
          action: "category_created",
          action_label: "Expense Category Added",
          title: `Added Expense Category: "${c.name}"`,
          badge_color: "purple",
          category_name: c.name,
          user_name: "Administrator",
        });
      }
    } catch {}

    // D. Invoices Generated
    try {
      const invRes = await db.query(
        `SELECT inv.*, u.full_name as author_name FROM finance_invoices inv
         LEFT JOIN users u ON u.id = inv.created_by
         WHERE (inv.invoice_date = $1::date OR inv.created_at::date = $1::date)
           AND ($2::int IS NULL OR inv.institution_id = $2::int OR inv.institution_id IS NULL)`,
        [targetDate, institutionId]
      );
      for (const inv of invRes.rows) {
        allEvents.push({
          id: `inv_${inv.id}`,
          timestamp: inv.created_at ? new Date(inv.created_at).toISOString() : `${targetDate}T12:00:00.000Z`,
          time_display: formatTimeDisplay(inv.created_at || `${targetDate}T12:00:00.000Z`),
          date_display: targetDate,
          module: "finance",
          action: "invoice_created",
          action_label: "Invoice Generated",
          title: `Generated Invoice #${inv.invoice_number} for ₹${Number(inv.total_amount || inv.amount).toLocaleString("en-IN")}`,
          details: inv.notes || `Client: ${inv.payer_name || "Client"}`,
          badge_color: "blue",
          amount: Number(inv.total_amount || inv.amount),
          client_name: inv.payer_name,
          user_id: inv.created_by,
          user_name: inv.author_name || "Accountant",
          institution_id: inv.institution_id,
        });
      }
    } catch {}

    // ==========================================
    // 4. SYNTHESIZE FROM CLIENTS
    // ==========================================
    try {
      const clientsRes = await db.query(
        `SELECT id, name, company_name, email, phone, created_at FROM clients 
         WHERE created_at::date = $1::date
           AND ($2::int IS NULL OR institution_id = $2::int OR institution_id IS NULL)`,
        [targetDate, institutionId]
      );
      for (const cl of clientsRes.rows) {
        allEvents.push({
          id: `client_${cl.id}`,
          timestamp: new Date(cl.created_at).toISOString(),
          time_display: formatTimeDisplay(cl.created_at),
          date_display: targetDate,
          module: "clients",
          action: "client_created",
          action_label: "Client Added",
          title: `Added Client: "${cl.company_name || cl.name}"`,
          details: cl.email ? `Email: ${cl.email} • Phone: ${cl.phone || 'N/A'}` : null,
          badge_color: "purple",
          client_id: cl.id,
          client_name: cl.company_name || cl.name,
          user_name: "Sales / Admin",
        });
      }
    } catch {}

    // ==========================================
    // 5. SYNTHESIZE FROM STAFF ATTENDANCE
    // ==========================================
    try {
      const attRes = await db.query(
        `SELECT att.*, u.full_name as staff_name FROM staff_attendance att
         JOIN users u ON u.id = att.staff_user_id
         WHERE att.attendance_date = $1::date
           AND ($2::int IS NULL OR att.institution_id = $2::int OR att.institution_id IS NULL)`,
        [targetDate, institutionId]
      );
      for (const a of attRes.rows) {
        allEvents.push({
          id: `att_${a.id}`,
          timestamp: a.created_at ? new Date(a.created_at).toISOString() : `${targetDate}T09:00:00.000Z`,
          time_display: formatTimeDisplay(a.created_at || `${targetDate}T09:00:00.000Z`),
          date_display: targetDate,
          module: "staff",
          action: "attendance_marked",
          action_label: `Attendance (${a.status})`,
          title: `${a.staff_name} marked ${a.status} (Punch-in: ${a.check_in_time || 'N/A'})`,
          details: a.remarks || (a.working_hours ? `Hours logged: ${a.working_hours}h` : null),
          badge_color: a.status === "PRESENT" ? "emerald" : a.status === "LATE" ? "amber" : "rose",
          user_id: a.staff_user_id,
          user_name: a.staff_name,
          institution_id: a.institution_id,
        });
      }
    } catch {}

    // ==========================================
    // 6. DEDUPLICATE & FILTER
    // ==========================================
    // Deduplicate by custom key
    const seen = new Set<string>();
    const uniqueEvents: SystemWorkLogItem[] = [];

    for (const ev of allEvents) {
      const dedupKey = `${ev.module}_${ev.action}_${ev.task_id || ""}_${ev.subtask_id || ""}_${ev.amount || ""}_${ev.title.slice(0, 30)}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      uniqueEvents.push(ev);
    }

    // Sort by timestamp descending
    uniqueEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply Client Scope if user is client
    let scopedEvents = uniqueEvents;
    if (isClient && clientProfileId) {
      scopedEvents = scopedEvents.filter(
        (ev) => Number(ev.client_id) === Number(clientProfileId) || (ev.module === "operations" && ev.client_id === clientProfileId)
      );
    }

    // Apply Module Filter
    if (selectedModule !== "all") {
      scopedEvents = scopedEvents.filter((ev) => ev.module === selectedModule);
    }

    // Apply Staff Filter
    if (selectedStaffId && selectedStaffId !== "all") {
      scopedEvents = scopedEvents.filter((ev) => String(ev.user_id) === selectedStaffId || ev.user_name.toLowerCase().includes(selectedStaffId.toLowerCase()));
    }

    // Apply Client Filter
    if (selectedClientId && selectedClientId !== "all") {
      scopedEvents = scopedEvents.filter((ev) => String(ev.client_id) === selectedClientId || (ev.client_name && ev.client_name.toLowerCase().includes(selectedClientId.toLowerCase())));
    }

    // Apply Keyword Search
    if (search) {
      scopedEvents = scopedEvents.filter(
        (ev) =>
          ev.title.toLowerCase().includes(search) ||
          (ev.details && ev.details.toLowerCase().includes(search)) ||
          ev.user_name.toLowerCase().includes(search) ||
          (ev.client_name && ev.client_name.toLowerCase().includes(search)) ||
          (ev.category_name && ev.category_name.toLowerCase().includes(search)) ||
          (ev.file_name && ev.file_name.toLowerCase().includes(search))
      );
    }

    // ==========================================
    // 7. SUMMARY KPIS
    // ==========================================
    const tasksTouched = new Set<number>();
    const staffActive = new Set<string>();
    let subtasksDoneCount = 0;
    let totalIncomeToday = 0;
    let totalExpenseToday = 0;
    let filesCount = 0;

    for (const ev of uniqueEvents) {
      if (ev.task_id) tasksTouched.add(ev.task_id);
      if (ev.user_name) staffActive.add(ev.user_name);
      if (ev.action === "completed" || ev.title.toLowerCase().includes("completed")) {
        subtasksDoneCount += 1;
      }
      if (ev.module === "finance" && ev.action === "income_added" && ev.amount) {
        totalIncomeToday += ev.amount;
      }
      if (ev.module === "finance" && ev.action === "expense_added" && ev.amount) {
        totalExpenseToday += ev.amount;
      }
      if (ev.file_url) filesCount += 1;
    }

    // Build unique staff and client options for dropdowns
    const staffOptionsMap = new Map<string, string>();
    const clientOptionsMap = new Map<string, string>();

    for (const ev of uniqueEvents) {
      if (ev.user_id && ev.user_name) {
        staffOptionsMap.set(String(ev.user_id), ev.user_name);
      }
      if (ev.client_id && ev.client_name) {
        clientOptionsMap.set(String(ev.client_id), ev.client_name);
      }
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      summary: {
        total_activities: scopedEvents.length,
        tasks_worked_on: tasksTouched.size,
        subtasks_completed: subtasksDoneCount,
        total_income: totalIncomeToday,
        total_expense: totalExpenseToday,
        active_staff_count: staffActive.size,
        files_uploaded: filesCount,
      },
      items: scopedEvents,
      filters: {
        staff_options: Array.from(staffOptionsMap.entries()).map(([id, name]) => ({ id, name })),
        client_options: Array.from(clientOptionsMap.entries()).map(([id, name]) => ({ id, name })),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/admin/operations/work-logs] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch work logs" }, { status: 500 });
  }
}
