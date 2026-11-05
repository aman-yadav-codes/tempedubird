import { recordPerformancePoints } from "@/lib/performance/performance-engine";
import { normalizeUrl } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { publishRealtimeNotification } from "@/lib/notifications/socket-publisher";
import { isPlatformAdminUser, isInstitutionAdminUser, hasPermission } from "@/lib/auth/permissions";
import { syncTaskAttendanceToDatabase } from "@/app/lib/task-attendance-sync-server";
async function processDailyRecurringTasksAndPenalties(dbInstance: any) {
  try {
    const now = new Date();
    const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const todayFormatted = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); // e.g. 01 Nov 2026

    // Fetch tasks that have subtasks
    const recurringRes = await dbInstance.query(
      `SELECT id, title, institution_id, created_by, is_daily_recurring, last_recurring_date, sub_tasks, penalty_points, daily_recurrence_history FROM operations_tasks WHERE sub_tasks IS NOT NULL`
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
            customDescription: `Uncompleted ${cadence} deliverable: "${s.title}" for ${lastDate}`,
          }).catch(() => {});
        }

        // Generate new Deliverable Item (Option A: Shared deliverable for all assigned employees)
        const newDeliverable = {
          id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          file_name: `${s.title} (${todayFormatted})`,
          file_url: "",
          file_type: "task_item",
          file_size: 0,
          notes: `${s.title} - ${todayFormatted} Deliverable`,
          uploaded_at: now.toISOString(),
          uploaded_by_id: s.assigned_employee_id || t.created_by || 1,
          uploaded_by_name: s.assigned_employee_name || "System Scheduler",
          uploaded_by_role: s.assigned_employee_role || "automated",
          status: "pending",
          comments: [],
          status_history: [
            {
              id: `hist_${Date.now()}`,
              action: "uploaded",
              status: "pending",
              changed_at: now.toISOString(),
              changed_by_name: "Recurrence Engine",
              notes: `Auto-generated on ${cadence} schedule for ${todayFormatted}`,
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
          `UPDATE operations_tasks
           SET sub_tasks = $1::jsonb,
               last_recurring_date = $2::date,
               updated_at = NOW()
           WHERE id = $3`,
          [JSON.stringify(updatedSubTasks), todayDateStr, t.id]
        ).catch((err: any) => console.error("Recurrence update error for task", t.id, err));
      }
    }
  } catch (err) {
    console.error("[processDailyRecurringTasksAndPenalties] Error:", err);
  }
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    await processDailyRecurringTasksAndPenalties(db);
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const urgency = url.searchParams.get("urgency")?.trim() || "";
    const clientId = url.searchParams.get("client_id")?.trim() || "";
    const employeeId = url.searchParams.get("employee_id")?.trim() || "";
    const scope = url.searchParams.get("scope")?.trim() || "";
    let query = `SELECT * FROM operations_tasks WHERE 1=1`;
    const params: any[] = [];
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isPlatform = !userInstId || (user && isPlatformAdminUser(user));
    const requestedInstParam = url.searchParams.get("institution_id");
    let targetInstId: number | null = null;
    if (requestedInstParam !== null && requestedInstParam !== "" && requestedInstParam !== "all") {
      const p = Number(requestedInstParam);
      if (Number.isInteger(p) && p > 0) {
        targetInstId = p;
      }
    } else if (requestedInstParam === "all") {
      targetInstId = null;
    } else if (userInstId) {
      targetInstId = userInstId;
    } else if (isPlatform) {
      const headerInstId = req.headers.get("x-institution-id");
      const parsedInstId = headerInstId ? Number(headerInstId) : null;
      if (Number.isInteger(parsedInstId) && (parsedInstId as number) > 0) {
        targetInstId = parsedInstId;
      }
    }
    const referer = req.headers.get("referer") || "";
    const isClientRoute = referer.includes("/client/") || referer.endsWith("/client");
    const isTaskManagementPage = referer.includes("/admin/operations/tasks");
    const isClient = !isTaskManagementPage && (userRole === "client" || user?.role_codes?.includes("client") || (user as any)?.roles?.some((r: any) => String(r).toLowerCase() === "client") || isClientRoute);

    const isSelfScope = employeeId === "me" || scope === "me";
    const effectiveEmployeeId = isSelfScope ? (user?.id ? String(user.id) : "") : employeeId;
    // Organization scoping: institution staff only see their tasks, platform admin can see all or specific
    // When isSelfScope is true, user views their own assigned/created tasks across the system
    // Clients must see all projects associated with their client account across the system without institution scoping
    if (!isSelfScope && !isClient) {
      if (targetInstId && !isPlatform) {
        params.push(targetInstId);
        query += ` AND institution_id = $${params.length}`;
      } else if (requestedInstParam === "none" || (isPlatform && requestedInstParam !== "all")) {
        query += ` AND (institution_id = 1 OR institution_id IS NULL)`;
      }
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        title ILIKE $${params.length}
        OR client_name ILIKE $${params.length}
        OR assigned_employee_name ILIKE $${params.length}
        OR details ILIKE $${params.length}
        OR assigned_employees::text ILIKE $${params.length}
        OR EXISTS (
          SELECT 1 FROM clients c 
          WHERE c.id = operations_tasks.client_id 
            AND (c.name ILIKE $${params.length} OR c.company_name ILIKE $${params.length})
        )
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem 
          WHERE elem->>'title' ILIKE $${params.length}
        )
      )`;
    }
    if (status && status !== "all") {
      params.push(status);
      const sParam = params.length;
      query += ` AND (
        status = $${sParam}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem 
          WHERE elem->>'status' = $${sParam}
        )
      )`;
    }
    if (urgency && urgency !== "all") {
      params.push(urgency);
      query += ` AND urgency = $${params.length}`;
    }

    let allClientIds: number[] = [];
    if (isClient && user) {
      const clientMatch = await db.query(
        `SELECT id, name, company_name, email, phone FROM clients WHERE user_id = $1 OR (email IS NOT NULL AND lower(email) = lower($2)) OR (phone IS NOT NULL AND phone = $3)`,
        [user.id, user.email || "", user.phone || ""]
      );
      const matchedClientIds = clientMatch.rows.map((r: any) => Number(r.id)).filter(Boolean);
      allClientIds = Array.from(new Set([...matchedClientIds, Number(user.id)]));
      const clientNames = Array.from(new Set(
        clientMatch.rows.flatMap((r: any) => [r.name, r.company_name])
          .concat([(user as any)?.full_name, (user as any)?.name])
          .filter(Boolean)
          .map((n: string) => n.trim().toLowerCase())
      ));

      const clientIdsToQuery = (allClientIds.length > 0) ? allClientIds : [-1];
      params.push(clientIdsToQuery);
      const clientIdsParam = params.length;
      params.push(Number(user.id));
      const userIdParam = params.length;
      params.push((user.email || "").toLowerCase().trim());
      const userEmailParam = params.length;
      params.push(clientNames.length > 0 ? clientNames : ["__none__"]);
      const clientNamesParam = params.length;

      // In client portal or for client role: MUST ONLY SEE PROJECTS ASSOCIATED WITH THIS CLIENT
      query += ` AND (
        client_id = ANY($${clientIdsParam}::int[])
        OR created_by = $${userIdParam}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem 
          WHERE (
            ((elem->>'id') ~ '^[0-9]+$' AND (elem->>'id')::int = ANY($${clientIdsParam}::int[]))
            OR ((elem->>'user_id') ~ '^[0-9]+$' AND (elem->>'user_id')::int = $${userIdParam})
            OR ($${userEmailParam} != '' AND lower(COALESCE(elem->>'email', '')) = $${userEmailParam})
            OR (lower(COALESCE(elem->>'name', '')) = ANY($${clientNamesParam}::text[]))
            OR (lower(COALESCE(elem->>'company_name', '')) = ANY($${clientNamesParam}::text[]))
          )
        )
        OR (client_name IS NOT NULL AND lower(client_name) = ANY($${clientNamesParam}::text[]))
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) st
          WHERE (
            ((st->>'client_id') ~ '^[0-9]+$' AND (st->>'client_id')::int = ANY($${clientIdsParam}::int[]))
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements(COALESCE(st->'uploads', '[]'::jsonb)) up
              WHERE (up->>'uploaded_by_id') ~ '^[0-9]+$' AND (up->>'uploaded_by_id')::int = $${userIdParam}
            )
          )
        )
      )`;

      if (clientId && clientId !== "all") {
        params.push(clientId);
        query += ` AND (
          client_id = $${params.length}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem 
            WHERE (elem->>'id')::int = $${params.length}
          )
        )`;
      }
    } else {
      if (clientId && clientId !== "all") {
        params.push(clientId);
        query += ` AND (
          client_id = $${params.length}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_clients, '[]'::jsonb)) elem 
            WHERE (elem->>'id')::int = $${params.length}
          )
        )`;
      }
      if (isSelfScope && user?.id) {
        const empId = effectiveEmployeeId || String(user.id);
        params.push(empId);
        const uidParam = params.length;
        query += ` AND (
          assigned_employee_id::text = $${uidParam}
          OR project_leader_id = $${uidParam}::int
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem 
            WHERE elem->>'assigned_employee_id' = $${uidParam}
               OR elem::text LIKE '%"id":' || $${uidParam} || '%'
               OR elem::text LIKE '%"id": ' || $${uidParam} || '%'
               OR elem::text LIKE '%"user_id":' || $${uidParam} || '%'
               OR elem->>'assigned_staff_ids' LIKE '%' || $${uidParam} || '%'
          )
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_employees, '[]'::jsonb)) elem 
            WHERE elem->>'id' = $${uidParam} OR elem->>'employee_id' = $${uidParam} OR elem #>> '{}' = $${uidParam} OR elem::text = $${uidParam} OR elem::text LIKE '%"id":' || $${uidParam} || '%'
          )
        )`;
      } else if (effectiveEmployeeId && effectiveEmployeeId !== "all") {
        params.push(effectiveEmployeeId);
        const empParam = params.length;
        query += ` AND (
          assigned_employee_id::text = $${empParam}
          OR created_by = $${empParam}::int
          OR project_leader_id = $${empParam}::int
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem 
            WHERE elem->>'assigned_employee_id' = $${empParam}
               OR elem::text LIKE '%"id":' || $${empParam} || '%'
               OR elem::text LIKE '%"id": ' || $${empParam} || '%'
               OR elem::text LIKE '%"user_id":' || $${empParam} || '%'
               OR elem->>'assigned_staff_ids' LIKE '%' || $${empParam} || '%'
          )
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(assigned_employees, '[]'::jsonb)) elem 
            WHERE elem->>'id' = $${empParam} OR elem->>'employee_id' = $${empParam} OR elem #>> '{}' = $${empParam} OR elem::text = $${empParam} OR elem::text LIKE '%"id":' || $${empParam} || '%'
          )
        )`;
      }
    }
    query += ` ORDER BY 
      CASE urgency
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END ASC,
      deadline ASC NULLS LAST,
      id DESC`;
    const res = await db.query(query, params);
    let tasks = res.rows;
    // Fetch list of clients for picker
    // Show all active clients associated with the logged-in institution / platform staff
    const userMemberships = user?.memberships || [];
    const userInstIds = userMemberships.map((m: any) => Number(m.institution_id)).filter(Boolean);
    if (userInstId && !userInstIds.includes(Number(userInstId))) {
      userInstIds.push(Number(userInstId));
    }
    const targetInst = targetInstId || userInstId || 1;
    let clientsRes;
    if (isClient && user) {
      clientsRes = await db.query(
        `SELECT id, name, company_name, email, phone, client_type, institution_id
         FROM clients
         WHERE id = ANY($1::int[]) OR user_id = $2::int
         ORDER BY COALESCE(company_name, name) ASC`,
        [allClientIds.length > 0 ? allClientIds : [-1], Number(user.id)]
      );
    } else {
      clientsRes = await db.query(
        `SELECT id, name, company_name, email, phone, client_type, institution_id
         FROM clients
         WHERE (status = 'active' OR status IS NULL)
           AND (
             $1::boolean = TRUE
             OR institution_id = $2::int
             OR institution_id = 1
             OR institution_id IS NULL
             OR institution_id = ANY($3::int[])
           )
         ORDER BY COALESCE(company_name, name) ASC`,
        [Boolean(isPlatform), targetInst, userInstIds.length > 0 ? userInstIds : [1]]
      );
    }
    
    // Fetch list of staff/employees for picker strictly filtered to staff belonging to the active organization/platform
    const staffRes = await db.query(
      `
        WITH staff_members AS (
          SELECT DISTINCT ON (u.id)
            u.id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
            u.email,
            u.phone,
            COALESCE(d.name, r.name, r.code, 'Staff Member') AS role,
            COALESCE(r.code, 'staff') AS role_code
          FROM users u
          LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles r ON r.id = COALESCE(im.role_id, ur.role_id)
          LEFT JOIN user_profiles up ON up.user_id = u.id
          LEFT JOIN designations d ON d.id = up.designation_id
          LEFT JOIN scope_types st ON st.id = r.scope_id
          WHERE COALESCE(u.is_deleted, FALSE) = FALSE
            AND (
              -- If targetInstId is provided, include staff belonging to that institution
              ($1::int IS NOT NULL AND (im.institution_id = $1::int OR up.under_institution_id = $1::int))
              -- If no targetInstId (platform scope), include platform staff and main organization staff
              OR ($1::int IS NULL AND (
                im.institution_id = 1 
                OR r.code IN ('platform_admin', 'super_admin', 'admin', 'platform_staff', 'accountant', 'head_of_operations')
                OR st.code = 'platform'
                OR u.id = 1
                OR u.created_by = 1
              ))
            )
            -- Exclude students, parents/guardians, and clients from the staff picker
            AND NOT EXISTS (
              SELECT 1 FROM user_roles sur JOIN roles sr ON sr.id = sur.role_id
              WHERE sur.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent', 'client')
            )
            AND NOT EXISTS (
              SELECT 1 FROM institution_memberships sim JOIN roles sr ON sr.id = sim.role_id
              WHERE sim.user_id = u.id AND LOWER(sr.code) IN ('student', 'guardian', 'parent', 'client')
            )
          ORDER BY u.id, 
            CASE 
              WHEN r.code = 'head_of_operations' THEN 1 
              WHEN r.code = 'platform_admin' THEN 2 
              WHEN r.code = 'institution_admin' THEN 3
              ELSE 4 
            END
        )
        SELECT * FROM staff_members ORDER BY name ASC;
      `,
      [targetInstId]
    );
    // Auto-seed sample tasks ONLY if table is completely empty and requester is an admin
    const canManageAllTasks = Boolean(user && (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      (user as any)?.role_codes?.some((r: string) => ["platform_admin", "superadmin", "super_admin", "admin", "institution_admin"].includes(String(r).toLowerCase())) ||
      hasPermission(user, "operations.tasks.manage", { institutionId: targetInstId || undefined })
    ));
    if (canManageAllTasks && !search && (!status || status === "all") && (!urgency || urgency === "all")) {
      const countCheck = await db.query(`SELECT COUNT(*) as c FROM operations_tasks`);
      if (parseInt(countCheck.rows[0]?.c || "0") === 0) {
        const sampleStaff = staffRes.rows[0] || { id: 1, name: "Admin Lead", role: "platform_admin", email: "admin@edubird.net" };
        const sampleClient = clientsRes.rows[0] || { id: 1, name: "Apex Global Technologies" };
        const sampleTasks = [
          {
            title: "Corporate AWS & Cloud Batch Setup & Curriculum Alignment",
            client_id: sampleClient.id,
            client_name: sampleClient.name,
            price: 45000.00,
            details: "Configure AWS training modules, sandbox environment accounts, and scheduling for 50 corporate engineers.",
            assigned_employee_id: sampleStaff.id,
            assigned_employee_name: sampleStaff.name,
            assigned_employee_role: sampleStaff.role || "Staff Lead",
            assigned_employee_email: sampleStaff.email || "staff@edubird.net",
            estimated_hours: 24,
            logged_hours: 12,
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: "in_progress",
            urgency: "urgent",
          },
          {
            title: "Student Hostel Verification & Meal Plan Quality Audit",
            client_id: clientsRes.rows[1]?.id || sampleClient.id,
            client_name: clientsRes.rows[1]?.name || "Metro Student Living",
            price: 18500.00,
            details: "Conduct on-site hygiene check and safety inspection for newly onboarded PG branch in Mahmoorganj.",
            assigned_employee_id: sampleStaff.id,
            assigned_employee_name: sampleStaff.name,
            assigned_employee_role: sampleStaff.role || "Operations Officer",
            assigned_employee_email: sampleStaff.email || "staff@edubird.net",
            estimated_hours: 16,
            logged_hours: 4,
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: "pending",
            urgency: "high",
          },
          {
            title: "Entrance Exam Mock Test Paper Review & Answer Key Verification",
            client_id: clientsRes.rows[2]?.id || sampleClient.id,
            client_name: clientsRes.rows[2]?.name || "Bright Futures Trust",
            details: "Quality check 500 questions across Physics, Chemistry, and Math for the upcoming state scholarship mock test.",
            assigned_employee_id: sampleStaff.id,
            assigned_employee_name: sampleStaff.name,
            assigned_employee_role: sampleStaff.role || "Senior Academic Staff",
            assigned_employee_email: sampleStaff.email || "staff@edubird.net",
            estimated_hours: 30,
            logged_hours: 30,
            deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: "completed",
            urgency: "medium",
          }
        ];
        for (const t of sampleTasks) {
          await db.query(
            `INSERT INTO operations_tasks (
              title, client_id, client_name, price, details, assigned_employee_id, assigned_employee_name,
              assigned_employee_role, assigned_employee_email, estimated_hours, logged_hours, deadline,
              status, urgency, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
            [
              t.title, t.client_id, t.client_name, t.price, t.details, t.assigned_employee_id, t.assigned_employee_name,
              t.assigned_employee_role, t.assigned_employee_email, t.estimated_hours, t.logged_hours, t.deadline,
              t.status, t.urgency
            ]
          );
        }
        const seeded = await db.query(`SELECT * FROM operations_tasks ORDER BY id DESC`);
        tasks = seeded.rows;
      }
    }
    // Check if requester is platform admin / institution admin / head of operations
    const userRoleCodes: string[] = Array.isArray((user as any)?.role_codes)
      ? (user as any).role_codes
      : [(user as any)?.role || (user as any)?.primary_role || ""].filter(Boolean);
    const hasLeaderRole = userRoleCodes.some((r: string) =>
      ["leader", "project_leader", "team_leader", "head_of_operations"].includes(String(r).toLowerCase())
    );
    const isUserPlatformAdmin = Boolean(user && (
      isPlatformAdminUser(user) ||
      isInstitutionAdminUser(user) ||
      userRoleCodes.some((r: string) => ["platform_admin", "superadmin", "super_admin", "admin", "institution_admin", "head_of_operations"].includes(String(r).toLowerCase())) ||
      hasPermission(user, "operations.tasks.manage", { institutionId: targetInstId || undefined })
    ));
    const currentUserIdStr = user?.id ? String(user.id) : "";
    const currentUserNameLower = (user?.full_name || (user as any)?.name || "").toLowerCase().trim();
    const currentUserEmailLower = (user?.email || "").toLowerCase().trim();

    // Mask task prices for staff members who are NOT the project leader and NOT platform admin
    const sanitizedTasks = tasks.map((t: any) => {
      const isTaskLeader = hasLeaderRole || Boolean(user && (
        (t.project_leader_id && String(t.project_leader_id) === currentUserIdStr) ||
        (t.project_leader_name && currentUserNameLower && t.project_leader_name.toLowerCase().trim() === currentUserNameLower) ||
        (t.project_leader_email && currentUserEmailLower && t.project_leader_email.toLowerCase().trim() === currentUserEmailLower)
      ));
      const canSeePrice = isUserPlatformAdmin || isTaskLeader;
      if (!canSeePrice) {
        return {
          ...t,
          price: null,
          cost: null,
          base_price: null,
          extra_cost: null,
          sub_tasks: Array.isArray(t.sub_tasks)
            ? t.sub_tasks.map((st: any) => ({ ...st, price: null }))
            : t.sub_tasks,
        };
      }
      return t;
    });

    // Compute Metrics Summary
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === "pending").length;
    const inProgressTasks = tasks.filter(t => t.status === "in_progress" || t.status === "under_review").length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const urgentTasks = tasks.filter(t => t.urgency === "urgent" || t.urgency === "high").length;
    const totalRevenue = isUserPlatformAdmin
      ? tasks.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0)
      : null;
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
    const totalLoggedHours = tasks.reduce((sum, t) => sum + (parseFloat(t.logged_hours) || 0), 0);
    const myAssignedTasks = currentUserIdStr ? tasks.filter(t => 
      String(t.assigned_employee_id) === currentUserIdStr ||
      String(t.created_by) === currentUserIdStr ||
      (Array.isArray(t.assigned_employees) && t.assigned_employees.some((e: any) => String(e.id) === currentUserIdStr || String(e.employee_id) === currentUserIdStr)) ||
      (Array.isArray(t.sub_tasks) && t.sub_tasks.some((st: any) => String(st.assigned_employee_id) === currentUserIdStr))
    ).length : 0;
    return NextResponse.json({
      tasks: sanitizedTasks,
      clients: clientsRes.rows,
      staff: staffRes.rows,
      stats: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        urgentTasks,
        myAssignedTasks,
        totalRevenue,
        totalEstimatedHours,
        totalLoggedHours,
      }
    });
  } catch (error: any) {
    console.error("[Operations Tasks GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch operations tasks" }, { status: 500 });
  }
}
export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const creatorRole = (user as any)?.role || (user as any)?.role_code || "";
    const isPlatformAdmin = user ? isPlatformAdminUser(user) : false;
    const isAdmin =
      Boolean((user as any)?.is_super_admin) ||
      isPlatformAdmin ||
      ["platform_admin", "super_admin", "institution_admin", "director", "principal", "school_owner", "college_owner", "university_owner"].includes(creatorRole);
    const creatorInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const bodyInstId = body.institution_id && body.institution_id !== "none" && body.institution_id !== "all" ? Number(body.institution_id) : null;
    const institutionId = (isAdmin && bodyInstId !== null) ? bodyInstId : (bodyInstId || creatorInstId || (isPlatformAdmin ? 1 : null));
    const todayDateStr = new Date().toISOString().split("T")[0];
    // Handle Bulk Task Creation
    const isBulk = body.bulk === true || Array.isArray(body.tasks);
    if (isBulk) {
      const tasksInput = Array.isArray(body.tasks) ? body.tasks : [];
      if (tasksInput.length === 0) {
        return NextResponse.json({ error: "No tasks provided for bulk creation" }, { status: 400 });
      }
      const shared = body.shared || {};
      const createdTasks: any[] = [];
      const failedTasks: { index: number; title: string; error: string }[] = [];
      const project_for = shared.project_for === "client" ? "client" : "own_company";
      const company_name = project_for === "own_company" ? (shared.company_name?.trim() || "EduBird") : null;
      const assignedClients = Array.isArray(shared.assigned_clients) ? [...shared.assigned_clients] : [];
      const finalClientName = project_for === "client" ? (assignedClients.length > 0 ? assignedClients.map((c: any) => c.company_name || c.name).filter(Boolean).join(", ") : (shared.client_name?.trim() || "Client")) : "EduBird";
      const finalClientId = project_for === "client" ? (shared.client_id ? parseInt(String(shared.client_id).replace("vendor_", "")) : (assignedClients.length > 0 && assignedClients[0]?.id ? parseInt(String(assignedClients[0].id)) : null)) : null;
      const currency = shared.currency?.trim() || "INR";
      const sharedCost = parseFloat(String(shared.cost || 0)) || 0;
      const sharedUrgency = shared.urgency || "medium";
      const sharedStatus = shared.status || "pending";
      const sharedDetails = shared.details?.trim() || null;
      const sharedStartDate = shared.start_date ? new Date(shared.start_date).toISOString() : null;
      const sharedDeadline = shared.due_date ? new Date(shared.due_date).toISOString() : (shared.deadline ? new Date(shared.deadline).toISOString() : null);
      const assignedEmployees = Array.isArray(shared.assigned_employees) ? [...shared.assigned_employees] : [];
      let assignedEmpId = shared.assigned_employee_id
        ? parseInt(String(shared.assigned_employee_id))
        : (assignedEmployees.length > 0 && assignedEmployees[0]?.id ? parseInt(String(assignedEmployees[0].id)) : null);
      let assignedEmpName = shared.assigned_employee_name?.trim()
        || (assignedEmployees.length > 0 ? assignedEmployees.map((e: any) => e.name).filter(Boolean).join(", ") : null);
      let assignedEmpRole = shared.assigned_employee_role?.trim()
        || (assignedEmployees.length > 0 ? assignedEmployees.map((e: any) => e.role).filter(Boolean).join(", ") : null);
      let assignedEmpEmail = shared.assigned_employee_email?.trim()
        || (assignedEmployees.length > 0 && assignedEmployees[0]?.email ? assignedEmployees[0].email.trim() : null);
      if (!assignedEmpId && user?.id) {
        assignedEmpId = user.id;
        assignedEmpName = (user as any)?.full_name || (user as any)?.name || assignedEmpName || "Staff Member";
        assignedEmpRole = creatorRole || assignedEmpRole || "Staff";
        assignedEmpEmail = user.email || assignedEmpEmail;
        if (assignedEmployees.length === 0) {
          assignedEmployees.push({
            id: user.id,
            name: assignedEmpName,
            role: assignedEmpRole,
            email: assignedEmpEmail,
          });
        }
      }
      const projectLeaderId = shared.project_leader_id ? parseInt(String(shared.project_leader_id)) : assignedEmpId;
      const projectLeaderName = shared.project_leader_name?.trim() || assignedEmpName;
      const points = isAdmin ? (parseFloat(String(shared.points)) || 20) : 20;
      const penaltyPoints = isAdmin ? (parseFloat(String(shared.penalty_points)) || 10) : 10;
      for (let i = 0; i < tasksInput.length; i++) {
        const item = tasksInput[i];
        const taskTitle = typeof item === "string" ? item.trim() : (item?.title || "").trim();
        if (!taskTitle) {
          failedTasks.push({ index: i, title: String(item?.title || ""), error: "Task title cannot be empty" });
          continue;
        }
        const taskDetails = typeof item === "object" && item.details ? item.details.trim() : sharedDetails;
        const taskUrgency = typeof item === "object" && item.urgency ? item.urgency : sharedUrgency;
        const taskCost = typeof item === "object" && item.cost !== undefined ? (parseFloat(String(item.cost)) || 0) : sharedCost;
        const taskStartDate = typeof item === "object" && item.start_date ? new Date(item.start_date).toISOString() : sharedStartDate;
        const taskDeadline = typeof item === "object" && (item.deadline || item.due_date || item.deadline_date)
          ? new Date(item.deadline || item.due_date || item.deadline_date).toISOString()
          : sharedDeadline;
        const taskSubtasks = typeof item === "object" && Array.isArray(item.sub_tasks) ? item.sub_tasks : [];
        // Individual task employee assignment support
        const itemEmpId = typeof item === "object" && item.assigned_employee_id && item.assigned_employee_id !== "none"
          ? parseInt(String(item.assigned_employee_id))
          : (typeof item === "object" && item.assigned_employee_id === "none" ? null : assignedEmpId);
        const itemEmpName = typeof item === "object" && item.assigned_employee_name !== undefined
          ? (item.assigned_employee_name?.trim() || null)
          : (itemEmpId === assignedEmpId ? assignedEmpName : null);
        const itemEmpRole = typeof item === "object" && item.assigned_employee_role !== undefined
          ? (item.assigned_employee_role?.trim() || null)
          : (itemEmpId === assignedEmpId ? assignedEmpRole : null);
        const itemEmpEmail = typeof item === "object" && item.assigned_employee_email !== undefined
          ? (item.assigned_employee_email?.trim() || null)
          : (itemEmpId === assignedEmpId ? assignedEmpEmail : null);
        const itemEmployees = typeof item === "object" && Array.isArray(item.assigned_employees) && item.assigned_employees.length > 0
          ? item.assigned_employees
          : (itemEmpId ? [{ id: itemEmpId, name: itemEmpName, role: itemEmpRole, email: itemEmpEmail }] : assignedEmployees);
        const itemCadence = typeof item === "object" && item.cadence ? item.cadence : "once";
        const itemIsDaily = itemCadence !== "once" || Boolean(typeof item === "object" && item.is_daily_recurring);
        const itemHours = typeof item === "object" ? (parseFloat(String(item.duration_hours || item.estimated_hours || 0)) || 0) : 0;
        try {
          const res = await db.query(
            `INSERT INTO operations_tasks (
              title, client_id, client_name, institution_id, price, details,
              assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
              estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
              is_daily_recurring, last_recurring_date, points, penalty_points, assigned_employees, created_by, history,
              project_for, company_name, start_date, currency, cost, live_url, demo_url,
              project_leader_id, project_leader_name, agreement_document_url, agreement_document_name,
              created_at, updated_at, attachments, assigned_clients
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb,
              $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
              NOW(), NOW(), $35::jsonb, $36::jsonb
            )
            RETURNING *`,
            [
              taskTitle,
              finalClientId,
              finalClientName,
              institutionId,
              taskCost,
              taskDetails,
              itemEmpId,
              itemEmpName,
              itemEmpRole,
              itemEmpEmail,
              itemHours,
              0,
              taskDeadline,
              sharedStatus,
              taskUrgency,
              JSON.stringify(taskSubtasks),
              itemIsDaily,
              itemIsDaily ? todayDateStr : null,
              points,
              penaltyPoints,
              JSON.stringify(itemEmployees),
              user?.id || null,
              JSON.stringify([
                {
                  id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  action: "created_bulk",
                  timestamp: new Date().toISOString(),
                  user_id: user?.id || null,
                  user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Creator",
                  user_role: creatorRole || "Admin",
                  details: `Task bulk-created with status "${sharedStatus}"`,
                  new_status: sharedStatus,
                }
              ]),
              project_for,
              company_name,
              taskStartDate,
              currency,
              taskCost,
              null,
              null,
              projectLeaderId,
              projectLeaderName,
              null,
              null,
              JSON.stringify(Array.isArray(item.attachments) ? item.attachments : (Array.isArray(body.shared?.attachments) ? body.shared.attachments : [])),
              JSON.stringify(Array.isArray(shared.assigned_clients) ? shared.assigned_clients : []),
            ]
          );
          if (res.rows && res.rows[0]) {
            createdTasks.push(res.rows[0]);
          }
        } catch (taskErr: any) {
          failedTasks.push({ index: i, title: taskTitle, error: taskErr.message || "Database insert error" });
        }
      }
      return NextResponse.json({
        success: true,
        message: `Successfully created ${createdTasks.length} task${createdTasks.length === 1 ? "" : "s"}.`,
        createdCount: createdTasks.length,
        failedCount: failedTasks.length,
        tasks: createdTasks,
        failed: failedTasks,
      });
    }
    const {
      title,
      client_id,
      client_name,
      details,
      points = 20,
      penalty_points = 10,
      is_daily_recurring = false,
      sub_tasks = [],
    } = body;
    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task Title / Name is required" }, { status: 400 });
    }
    // For non-admin staff, enforce standard default points (20) and penalty points (10) on subtasks
    const finalSubTasks = Array.isArray(sub_tasks)
      ? sub_tasks.map((s: any) => ({
          ...s,
          points: isAdmin ? (parseFloat(s.points) || 20) : 20,
          penalty_points: isAdmin ? (parseFloat(s.penalty_points) || 10) : 10,
        }))
      : [];
    // Compute aggregated price, hours, urgency, and status from subtasks
    const calcPrice = finalSubTasks.length > 0 
      ? finalSubTasks.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0)
      : (parseFloat(String(body.price)) || 0);
    const calcHours = finalSubTasks.length > 0
      ? Math.round(finalSubTasks.reduce((sum: number, s: any) => {
          const h = parseFloat(s.duration_hours || s.estimated_hours) || 0;
          const m = parseFloat(s.duration_minutes) || 0;
          return sum + h + (m / 60);
        }, 0) * 100) / 100
      : (parseFloat(String(body.estimated_hours)) || 0);
    // Only administrators can customize reward points and penalty points. Regular employees use standard defaults (+20 / -10).
    const calcPoints = isAdmin
      ? (finalSubTasks.length > 0
          ? finalSubTasks.reduce((sum: number, s: any) => sum + (parseFloat(s.points) || 20), 0)
          : (parseFloat(String(points)) || 20))
      : 20;
    const calcPenaltyPoints = isAdmin
      ? (finalSubTasks.length > 0
          ? finalSubTasks.reduce((sum: number, s: any) => sum + (parseFloat(s.penalty_points) || 10), 0)
          : (parseFloat(String(penalty_points)) || 10))
      : 10;
    let calcUrgency = body.urgency || "medium";
    if (finalSubTasks.some((s: any) => s.urgency === "urgent")) calcUrgency = "urgent";
    else if (finalSubTasks.some((s: any) => s.urgency === "high")) calcUrgency = "high";
    else if (finalSubTasks.some((s: any) => s.urgency === "medium")) calcUrgency = "medium";
    else if (finalSubTasks.length > 0) calcUrgency = "low";
    let calcStatus = body.status || "pending";
    if (finalSubTasks.length > 0) {
      if (finalSubTasks.every((s: any) => s.status === "completed" || s.is_completed)) {
        calcStatus = "completed";
      } else if (finalSubTasks.some((s: any) => s.status === "in_progress" || s.status === "under_review")) {
        calcStatus = "in_progress";
      }
    }
    const assignedEmployees = Array.isArray(body.assigned_employees) ? [...body.assigned_employees] : [];
    let assignedEmpId = body.assigned_employee_id
      ? parseInt(String(body.assigned_employee_id))
      : (assignedEmployees.length > 0 && assignedEmployees[0]?.id ? parseInt(String(assignedEmployees[0].id)) : null);
    let assignedEmpName = body.assigned_employee_name?.trim()
      || (assignedEmployees.length > 0 ? assignedEmployees.map((e: any) => e.name).filter(Boolean).join(", ") : null);
    let assignedEmpRole = body.assigned_employee_role?.trim()
      || (assignedEmployees.length > 0 ? assignedEmployees.map((e: any) => e.role).filter(Boolean).join(", ") : null);
    let assignedEmpEmail = body.assigned_employee_email?.trim()
      || (assignedEmployees.length > 0 && assignedEmployees[0]?.email ? assignedEmployees[0].email.trim() : null);
    // If staff creates a task and didn't specify an assignee, default to assigning themselves
    if (!assignedEmpId && user?.id) {
      assignedEmpId = user.id;
      assignedEmpName = (user as any)?.full_name || (user as any)?.name || assignedEmpName || "Staff Member";
      assignedEmpRole = creatorRole || assignedEmpRole || "Staff";
      assignedEmpEmail = user.email || assignedEmpEmail;
      if (assignedEmployees.length === 0) {
        assignedEmployees.push({
          id: user.id,
          name: assignedEmpName,
          role: assignedEmpRole,
          email: assignedEmpEmail,
        });
      }
    }
    const project_for = body.project_for === "client" ? "client" : "own_company";
    const company_name = project_for === "own_company" ? (body.company_name?.trim() || "EduBird") : null;
    const assignedClients = Array.isArray(body.assigned_clients) ? [...body.assigned_clients] : [];
    // If client created the task, link to their client record automatically
    const isClientCreator = creatorRole === "client" || user?.role_codes?.includes("client") || (user as any)?.roles?.some((r: any) => String(r).toLowerCase() === "client");
    if (isClientCreator && user?.id) {
      const clientMatch = await db.query(
        `SELECT id, name, company_name, email, phone FROM clients WHERE user_id = $1 OR (email IS NOT NULL AND lower(email) = lower($2)) LIMIT 1`,
        [user.id, user.email || ""]
      );
      if (clientMatch.rows.length > 0) {
        const clientObj = clientMatch.rows[0];
        if (assignedClients.length === 0) {
          assignedClients.push({
            id: clientObj.id,
            name: clientObj.name,
            company_name: clientObj.company_name || clientObj.name,
            email: clientObj.email,
            phone: clientObj.phone,
          });
        }
      }
    }
    const finalClientName = (project_for === "client" || isClientCreator) ? (assignedClients.length > 0 ? assignedClients.map((c: any) => c.company_name || c.name).filter(Boolean).join(", ") : (client_name?.trim() || "Client")) : "EduBird";
    const finalClientId = (project_for === "client" || isClientCreator) ? (client_id ? parseInt(String(client_id).replace("vendor_", "")) : (assignedClients.length > 0 && assignedClients[0]?.id ? parseInt(String(assignedClients[0].id)) : null)) : null;
    const projectLeaderId = body.project_leader_id ? parseInt(String(body.project_leader_id)) : assignedEmpId;
    const projectLeaderName = body.project_leader_name?.trim() || assignedEmpName;
    const currency = body.currency?.trim() || "INR";
    const costVal = body.cost !== undefined ? (parseFloat(String(body.cost)) || 0) : calcPrice;
    const finalPrice = costVal || calcPrice;
    const startDate = body.start_date ? new Date(body.start_date).toISOString() : null;
    const deadlineDate = body.due_date ? new Date(body.due_date).toISOString() : (body.deadline ? new Date(body.deadline).toISOString() : null);
    const liveUrl = normalizeUrl(body.live_url);
    const demoUrl = normalizeUrl(body.demo_url);
    const agreementDocUrl = body.agreement_document_url?.trim() || null;
    const agreementDocName = body.agreement_document_name?.trim() || null;
    const projectTypeId = body.project_type_id ? parseInt(String(body.project_type_id)) : null;
    const projectTypeName = body.project_type_name?.trim() || null;
    const pipelineId = body.pipeline_id ? parseInt(String(body.pipeline_id)) : null;
    const pipelineName = body.pipeline_name?.trim() || null;
    let pipelinePhases = Array.isArray(body.pipeline_phases) ? body.pipeline_phases : [];

    if (pipelineId && pipelinePhases.length === 0) {
      try {
        const plRes = await db.query('SELECT phases, name FROM operations_project_pipelines WHERE id = $1', [pipelineId]);
        if (plRes.rows.length > 0 && Array.isArray(plRes.rows[0].phases)) {
          pipelinePhases = plRes.rows[0].phases;
        }
      } catch (err) {
        console.warn('Could not load pipeline phases snapshot:', err);
      }
    }

    const snapshottedPhases = pipelinePhases.map((ph, idx) => ({
      ...ph,
      order: ph.order || idx + 1,
      status: ph.status || (idx === 0 ? "in_progress" : "not_started"),
      started_at: ph.started_at || (idx === 0 ? new Date().toISOString() : null),
      completed_at: ph.completed_at || null,
      notes: ph.notes || "",
    }));
    const res = await db.query(
      `INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
        is_daily_recurring, last_recurring_date, points, penalty_points, assigned_employees, created_by, history,
        project_for, company_name, start_date, currency, cost, live_url, demo_url,
        project_leader_id, project_leader_name, agreement_document_url, agreement_document_name,
        created_at, updated_at, attachments, assigned_clients,
        project_type_id, project_type_name, pipeline_id, pipeline_name, pipeline_phases, current_phase_index
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb,
        $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
        NOW(), NOW(), $35::jsonb, $36::jsonb,
        $37, $38, $39, $40, $41::jsonb, $42
      )
      RETURNING *`,
      [
        title.trim(),
        finalClientId,
        finalClientName,
        institutionId,
        finalPrice,
        details?.trim() || null,
        assignedEmpId,
        assignedEmpName,
        assignedEmpRole,
        assignedEmpEmail,
        calcHours,
        parseFloat(String(body.logged_hours)) || 0,
        deadlineDate,
        calcStatus,
        calcUrgency,
        JSON.stringify(finalSubTasks),
        Boolean(is_daily_recurring),
        Boolean(is_daily_recurring) ? todayDateStr : null,
        calcPoints,
        calcPenaltyPoints,
        JSON.stringify(assignedEmployees),
        user?.id || null,
        JSON.stringify([
          {
            id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: "created",
            timestamp: new Date().toISOString(),
            user_id: user?.id || null,
            user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "Creator",
            user_role: creatorRole || "Admin",
            details: `Project created with status "${calcStatus}"`,
            new_status: calcStatus,
          }
        ]),
        project_for,
        company_name,
        startDate,
        currency,
        costVal,
        liveUrl,
        demoUrl,
        projectLeaderId,
        projectLeaderName,
        agreementDocUrl,
        agreementDocName,
        JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []),
        JSON.stringify(Array.isArray(body.assigned_clients) ? body.assigned_clients : []),
        projectTypeId,
        projectTypeName,
        pipelineId,
        pipelineName,
        JSON.stringify(snapshottedPhases),
        0,
      ]
    );
    const createdTask = res.rows[0];
    const syncStaffId = createdTask.assigned_employee_id || (user as any)?.id;
    const syncInstId = createdTask.institution_id || (user as any)?.institution_id;
    // Award project creation performance points (10% of project amount)
    if (user?.id && createdTask?.id) {
      const projAmount = Number(createdTask.price || createdTask.cost || finalPrice || costVal || 0);
      void recordPerformancePoints({
        employeeId: user.id,
        activityType: "project_created",
        referenceModule: "operations_project",
        referenceRecordId: createdTask.id,
        originalAmount: projAmount,
        performedBy: { id: user.id, name: (user as any)?.full_name || (user as any)?.name },
        customDescription: "Created Project: " + (createdTask.title || "Untitled") + " (10% of ₹" + projAmount.toLocaleString("en-IN") + ")",
        institutionId: syncInstId || undefined,
      }).catch((e) => console.warn("[Project Created] performance points error:", e));
    }
    // Auto-sync staff attendance working hours, check-in count, checkout, and task hours
    if (syncStaffId && syncInstId) {
      void syncTaskAttendanceToDatabase(db, syncStaffId, syncInstId).catch((e) =>
        console.error("Auto attendance sync error:", e)
      );
    }
    // If initial status is completed, award points
    if (calcStatus === "completed" && createdTask.assigned_employee_id) {
      void recordPointsTransaction({
        employeeId: createdTask.assigned_employee_id,
        institutionId: createdTask.institution_id,
        taskId: createdTask.id,
        pointType: "task_completed",
        points: calcPoints,
        reason: `Completed task: "${createdTask.title}"`,
        awardedBy: user ? (user as any).id : null,
      });
    }
    return NextResponse.json({ task: createdTask }, { status: 201 });
  } catch (error: any) {
    console.error("[Operations Tasks POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 });
  }
}
export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req).catch(() => null);
    const body = await req.json();
    const {
      id,
      title,
      client_id,
      client_name,
      price,
      details,
      is_daily_recurring,
      points,
      penalty_points,
      assigned_employee_id,
      assigned_employee_name,
      assigned_employee_role,
      assigned_employee_email,
      estimated_hours,
      logged_hours,
      deadline,
      status,
      urgency,
      sub_tasks,
      review_notes,
      review_image_url,
    } = body;
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    // Role check: Staff vs Admin
    const roleCodes: string[] = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdmin =
      Boolean((user as any)?.is_super_admin) ||
      roleCodes.some((r) =>
        ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner", "director", "principal"].includes(r)
      );
    // Fetch existing task record first
    const existingRes = await db.query(`SELECT * FROM operations_tasks WHERE id = $1`, [id]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const existingTask = existingRes.rows[0];
    // Check if user is an assigned client
    let isAssignedClient = false;
    if (user?.id) {
      const uId = Number(user.id);
      const clientMatch = await db.query(
        `SELECT id FROM clients WHERE user_id = $1 OR (email IS NOT NULL AND lower(email) = lower($2)) OR (phone IS NOT NULL AND phone = $3) LIMIT 1`,
        [uId, user.email || "", user.phone || ""]
      );
      const matchedClientId = clientMatch.rows[0]?.id;
      const assignedClientsList = Array.isArray(existingTask.assigned_clients) ? existingTask.assigned_clients : [];
      isAssignedClient =
        (matchedClientId && Number(existingTask.client_id) === Number(matchedClientId)) ||
        Number(existingTask.client_id) === uId ||
        assignedClientsList.some((c: any) =>
          (matchedClientId && Number(c.id) === Number(matchedClientId)) ||
          Number(c.id) === uId ||
          Number(c.user_id) === uId ||
          (user.email && c.email && c.email.toLowerCase().trim() === (user.email || "").toLowerCase().trim())
        );
    }
    // For non-admin staff: verify they are assigned to this task or created it
    if (!isOwnerOrAdmin && !isAssignedClient && user?.id) {
      const uId = Number(user.id);
      const isAuthorizedForTask =
        Number(existingTask.created_by) === uId ||
        Number(existingTask.assigned_employee_id) === uId ||
        Number(existingTask.project_leader_id) === uId ||
        (existingTask.project_leader_email && user.email && existingTask.project_leader_email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
        (Array.isArray(existingTask.assigned_employees) &&
          existingTask.assigned_employees.some((e: any) => Number(e.id) === uId || Number(e.employee_id) === uId)) ||
        (Array.isArray(existingTask.sub_tasks) &&
          existingTask.sub_tasks.some((st: any) => Number(st.assigned_employee_id) === uId));
      if (!isAuthorizedForTask) {
        return NextResponse.json(
          { error: "You can only update tasks assigned to you or created by you." },
          { status: 403 }
        );
      }
      // Staff members cannot edit task details/definition for tasks created by administrators (leaders and creators can)
      const isCreatorOrLeader =
        Number(existingTask.created_by) === uId ||
        Number(existingTask.project_leader_id) === uId ||
        (existingTask.project_leader_email && user.email && existingTask.project_leader_email.toLowerCase().trim() === user.email.toLowerCase().trim());
      if (title !== undefined && !isCreatorOrLeader) {
        return NextResponse.json(
          { error: "Staff members cannot edit tasks created by administrators." },
          { status: 403 }
        );
      }
    }
    // Status permission enforcement for Staff
    // Staff members can set status to 'Pending', 'In Progress', 'Under Review', or 'Completed'
    if (!isOwnerOrAdmin) {
      if (status && !["pending", "in_progress", "under_review", "completed"].includes(status)) {
        return NextResponse.json(
          {
            error: "Staff members can update status to 'Pending', 'In Progress', 'Under Review', or 'Completed'. Admins review and handle Recheck or Cancellation.",
          },
          { status: 403 }
        );
      }
      if (Array.isArray(sub_tasks)) {
        for (const sub of sub_tasks) {
          if (sub.status && !["pending", "in_progress", "under_review", "completed"].includes(sub.status)) {
            return NextResponse.json(
              {
                error: "Staff members can update subtasks to 'Pending', 'In Progress', 'Under Review', or 'Completed'.",
              },
              { status: 403 }
            );
          }
        }
      }
    }
    let markedUnderReview = false;
    if (status === "under_review" && existingTask.status !== "under_review") {
      markedUnderReview = true;
    }
    const todayDateStr = new Date().toISOString().split("T")[0];
    // Quick status / urgency / sub_tasks / review update
    if (title === undefined && (status !== undefined || urgency !== undefined || logged_hours !== undefined || sub_tasks !== undefined || is_daily_recurring !== undefined || points !== undefined || penalty_points !== undefined || review_notes !== undefined || review_image_url !== undefined || body.start_location !== undefined || body.action !== undefined || body.base_price !== undefined || body.extra_cost !== undefined || body.cost !== undefined || body.price !== undefined || body.pipeline_id !== undefined || body.pipeline_phases !== undefined || body.project_type_id !== undefined || body.current_phase_index !== undefined)) {
      const updates: string[] = ["updated_at = NOW()"];
      const params: any[] = [id];
      const currentUserName = (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "User";
      const currentUserRole = (user as any)?.role || (user as any)?.role_code || "Staff";
      const currentUserId = user?.id || null;
      let taskHistory = Array.isArray(body.history) && body.history.length > 0 ? [...body.history] : (Array.isArray(existingTask.history) ? [...existingTask.history] : []);
      if (body.start_location) {
        params.push(JSON.stringify(body.start_location));
        updates.push(`start_location = $${params.length}::jsonb`);
      }
      if (body.stop_location) {
        params.push(JSON.stringify(body.stop_location));
        updates.push(`stop_location = $${params.length}::jsonb`);
      }
      const hasSubtaskStarting = Array.isArray(sub_tasks) && sub_tasks.some((s: any) => {
        if (s.status !== "in_progress") return false;
        const prevSubs = Array.isArray(existingTask.sub_tasks) ? existingTask.sub_tasks : [];
        const prev = prevSubs.find((es: any) => String(es.id) === String(s.id));
        return !prev || prev.status !== "in_progress";
      });
      const hasSubtaskStopping = Array.isArray(sub_tasks) && sub_tasks.some((s: any) => {
        if (s.status !== "pending") return false;
        const prevSubs = Array.isArray(existingTask.sub_tasks) ? existingTask.sub_tasks : [];
        const prev = prevSubs.find((es: any) => String(es.id) === String(s.id));
        return prev && prev.status === "in_progress";
      });
      const isStarting = status === "in_progress" || body.action === "start_task" || hasSubtaskStarting;
      const isStopping = body.action === "stop_task" || (status === "pending" && existingTask.status === "in_progress") || hasSubtaskStopping;

      if (isStarting) {
        // Enforce mandatory location sharing for any role across the entire system
        const loc = body.start_location;
        if (!loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number" || loc.latitude === 0 || loc.longitude === 0) {
          return NextResponse.json(
            { error: "Location sharing is mandatory to start a task. Please enable and allow location access in your browser." },
            { status: 400 }
          );
        }

        // Enforce per-user active task limit: auto-stop ONLY this specific user's previously running subtask/task
        try {
          const userActiveRes = await db.query(
            `SELECT id, title, status, sub_tasks, history, assigned_employee_id
             FROM operations_tasks
             WHERE id != $1
               AND (
                 status = 'in_progress'
                 OR EXISTS (
                   SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem
                   WHERE elem->>'status' = 'in_progress'
                 )
               )`,
            [id]
          );

          for (const row of userActiveRes.rows) {
            const rowSubs = Array.isArray(row.sub_tasks) ? row.sub_tasks : [];
            // Find only subtasks that were started by this specific user
            const runningSubsOfThisUser = rowSubs.filter((s: any) =>
              s.status === "in_progress" && (
                String(s.started_by_id) === String(currentUserId) ||
                (!s.started_by_id && String(s.assigned_employee_id) === String(currentUserId))
              )
            );

            // Is the parent task itself directly started by this specific user?
            const isParentTaskOfThisUser = row.status === "in_progress" && (
              String(row.started_by_id) === String(currentUserId) ||
              (!row.started_by_id && String(row.assigned_employee_id) === String(currentUserId))
            );

            // If nothing is running by THIS user in this task, do NOT touch this task (other users are working in parallel)
            if (runningSubsOfThisUser.length === 0 && !isParentTaskOfThisUser) {
              continue;
            }

            const stopTime = new Date().toISOString();
            const stoppedHistory = Array.isArray(row.history) ? [...row.history] : [];
            for (const s of runningSubsOfThisUser) {
              stoppedHistory.push({
                id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                action: "stopped",
                timestamp: stopTime,
                user_id: currentUserId,
                user_name: currentUserName,
                user_role: currentUserRole,
                old_status: "in_progress",
                new_status: "pending",
                subtask_id: s.id || null,
                subtask_title: s.title || null,
                details: s.title ? `Deliverable "${s.title}" auto-stopped: user started a new task` : "Deliverable auto-stopped: user started a new task",
              });
            }

            // Only stop the subtasks that belong to THIS user! Leave other users' running subtasks untouched!
            const newSubs = rowSubs.map((s: any) => {
              const belongsToThisUser = runningSubsOfThisUser.some((us: any) => String(us.id) === String(s.id));
              if (!belongsToThisUser) return s;
              return { ...s, status: "pending", stopped_at: stopTime, stopped_by_name: currentUserName, stopped_by_id: currentUserId };
            });

            // The parent task status stays 'in_progress' if ANY subtask from ANY user is still in_progress!
            const stillHasRunningSubs = newSubs.some((s: any) => s.status === "in_progress");
            const allSubsDone = newSubs.length > 0 && newSubs.every((s: any) => s.status === "completed");
            const newStatus = stillHasRunningSubs ? "in_progress" : allSubsDone ? "completed" : "pending";

            await db.query(
              `UPDATE operations_tasks
               SET status = $1, sub_tasks = $2::jsonb,
                   history = $3::jsonb, updated_at = NOW()
               WHERE id = $4`,
              [newStatus, JSON.stringify(newSubs), JSON.stringify(stoppedHistory.slice(-100)), row.id]
            );
          }
        } catch (checkErr) {
          console.error("Error auto-stopping previous user task:", checkErr);
        }
      }

      if (isStarting) {
        updates.push("started_at = NOW()");
        updates.push("stopped_at = NULL");
        taskHistory.push({
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: "started",
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          user_role: currentUserRole,
          old_status: existingTask.status,
          new_status: status || "in_progress",
          subtask_id: body.subtask_id || null,
          subtask_title: body.subtask_title || null,
          location: body.start_location || null,
          details: body.subtask_title ? `Deliverable "${body.subtask_title}" started` : "Task started",
        });
      } else if (isStopping) {
        updates.push("stopped_at = NOW()");
        taskHistory.push({
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: "stopped",
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          user_role: currentUserRole,
          old_status: existingTask.status,
          new_status: "pending",
          subtask_id: body.subtask_id || null,
          subtask_title: body.subtask_title || null,
          location: body.stop_location || null,
          details: body.subtask_title ? `Deliverable "${body.subtask_title}" stopped` : "Task stopped",
        });
      } else if (status === "completed" && existingTask.status !== "completed") {
        updates.push("completed_at = NOW()");
        taskHistory.push({
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: "completed",
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          user_role: currentUserRole,
          old_status: existingTask.status,
          new_status: "completed",
          subtask_id: body.subtask_id || null,
          subtask_title: body.subtask_title || null,
          details: body.subtask_title ? `Deliverable "${body.subtask_title}" completed` : "Task marked as completed",
        });
      } else if (status !== undefined && status !== existingTask.status) {
        taskHistory.push({
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: "status_changed",
          timestamp: new Date().toISOString(),
          user_id: currentUserId,
          user_name: currentUserName,
          user_role: currentUserRole,
          old_status: existingTask.status,
          new_status: status,
          subtask_id: body.subtask_id || null,
          subtask_title: body.subtask_title || null,
          details: `Status changed from ${existingTask.status} to ${status}`,
        });
      }
      if (status !== undefined && status !== existingTask.status) {
        updates.push("status_changed_at = NOW()");
        params.push(currentUserName);
        updates.push(`status_changed_by = $${params.length}`);
      }
      // Keep maximum 100 history records per task
      params.push(JSON.stringify(taskHistory.slice(-100)));
      updates.push(`history = $${params.length}::jsonb`);
      if (review_notes !== undefined) {
        params.push(review_notes ? String(review_notes).trim() : null);
        updates.push(`review_notes = $${params.length}`);
      }
      if (review_image_url !== undefined) {
        params.push(review_image_url ? String(review_image_url).trim() : null);
        updates.push(`review_image_url = $${params.length}`);
      }
      if (body.institution_id !== undefined && isOwnerOrAdmin) {
        const instVal = body.institution_id && body.institution_id !== "none" && body.institution_id !== "all" ? Number(body.institution_id) : null;
        params.push(instVal);
        updates.push(`institution_id = $${params.length}`);
      }
      if (body.project_for !== undefined) {
        params.push(body.project_for);
        updates.push(`project_for = $${params.length}`);
      }
      if (body.company_name !== undefined) {
        params.push(body.company_name);
        updates.push(`company_name = $${params.length}`);
      }
      if (body.start_date !== undefined) {
        params.push(body.start_date ? new Date(body.start_date).toISOString() : null);
        updates.push(`start_date = $${params.length}`);
      }
      if (body.due_date !== undefined || body.deadline !== undefined) {
        const d = body.due_date || body.deadline;
        params.push(d ? new Date(d).toISOString() : null);
        updates.push(`deadline = $${params.length}`);
      }
      if (body.currency !== undefined) {
        params.push(body.currency);
        updates.push(`currency = $${params.length}`);
      }
      if (body.cost !== undefined || body.price !== undefined) {
        const val = parseFloat(String(body.cost !== undefined ? body.cost : body.price)) || 0;
        params.push(val);
        updates.push(`cost = $${params.length}`);
        params.push(val);
        updates.push(`price = $${params.length}`);
      }
      if (body.base_price !== undefined) {
        params.push(parseFloat(String(body.base_price)) || 0);
        updates.push(`base_price = $${params.length}`);
      }
      if (body.extra_cost !== undefined) {
        params.push(parseFloat(String(body.extra_cost)) || 0);
        updates.push(`extra_cost = $${params.length}`);
      }
      if (body.live_url !== undefined) {
        params.push(normalizeUrl(body.live_url));
        updates.push(`live_url = $${params.length}`);
      }
      if (body.demo_url !== undefined) {
        params.push(normalizeUrl(body.demo_url));
        updates.push(`demo_url = $${params.length}`);
      }
      if (body.project_leader_id !== undefined) {
        params.push(body.project_leader_id ? Number(body.project_leader_id) : null);
        updates.push(`project_leader_id = $${params.length}`);
      }
      if (body.project_leader_name !== undefined) {
        params.push(body.project_leader_name ? String(body.project_leader_name).trim() : null);
        updates.push(`project_leader_name = $${params.length}`);
      }
      if (body.agreement_document_url !== undefined) {
        params.push(body.agreement_document_url ? String(body.agreement_document_url).trim() : null);
        updates.push(`agreement_document_url = $${params.length}`);
      }
      if (body.agreement_document_name !== undefined) {
        params.push(body.agreement_document_name ? String(body.agreement_document_name).trim() : null);
        updates.push(`agreement_document_name = $${params.length}`);
      }
      if (body.project_type_id !== undefined) {
        params.push(body.project_type_id ? parseInt(String(body.project_type_id)) : null);
        updates.push(`project_type_id = $${params.length}`);
      }
      if (body.project_type_name !== undefined) {
        params.push(body.project_type_name ? String(body.project_type_name).trim() : null);
        updates.push(`project_type_name = $${params.length}`);
      }
      if (body.pipeline_id !== undefined) {
        params.push(body.pipeline_id ? parseInt(String(body.pipeline_id)) : null);
        updates.push(`pipeline_id = $${params.length}`);
      }
      if (body.pipeline_name !== undefined) {
        params.push(body.pipeline_name ? String(body.pipeline_name).trim() : null);
        updates.push(`pipeline_name = $${params.length}`);
      }
      if (body.pipeline_phases !== undefined) {
        const phs = Array.isArray(body.pipeline_phases) ? body.pipeline_phases : [];
        params.push(JSON.stringify(phs));
        updates.push(`pipeline_phases = $${params.length}::jsonb`);
      }
      if (body.current_phase_index !== undefined) {
        params.push(parseInt(String(body.current_phase_index)) || 0);
        updates.push(`current_phase_index = $${params.length}`);
      }
      if (body.attachments !== undefined) {
        params.push(JSON.stringify(Array.isArray(body.attachments) ? body.attachments : []));
        updates.push(`attachments = $${params.length}::jsonb`);
      }
      if (body.assigned_clients !== undefined) {
        const assignedClientsArr = Array.isArray(body.assigned_clients) ? body.assigned_clients : [];
        params.push(JSON.stringify(assignedClientsArr));
        updates.push(`assigned_clients = $${params.length}::jsonb`);
        if (assignedClientsArr.length > 0) {
          if (!body.client_id) {
            params.push(parseInt(String(assignedClientsArr[0].id)));
            updates.push(`client_id = $${params.length}`);
          }
          if (!body.client_name) {
            params.push(assignedClientsArr.map((c: any) => c.company_name || c.name).filter(Boolean).join(", "));
            updates.push(`client_name = $${params.length}`);
          }
        }
      }
      if (status === "under_review") {
        params.push(new Date().toISOString());
        updates.push(`review_submitted_at = $${params.length}::timestamptz`);
        params.push(user?.full_name || (user as any)?.email || "Staff Member");
        updates.push(`review_submitted_by = $${params.length}`);
      }
      if (is_daily_recurring !== undefined) {
        params.push(Boolean(is_daily_recurring));
        updates.push(`is_daily_recurring = $${params.length}`);
      }
      if (points !== undefined) {
        if (isOwnerOrAdmin) {
          params.push(parseFloat(String(points)) || 20);
          updates.push(`points = $${params.length}`);
        }
      }
      if (penalty_points !== undefined) {
        if (isOwnerOrAdmin) {
          params.push(parseFloat(String(penalty_points)) || 10);
          updates.push(`penalty_points = $${params.length}`);
        }
      }
      if (logged_hours !== undefined) {
        params.push(parseFloat(String(logged_hours)) || 0);
        updates.push(`logged_hours = $${params.length}`);
      }
      let calcStatus: string | null = null;
      let calcUrgency: string | null = null;
      if (sub_tasks !== undefined) {
        let subs = Array.isArray(sub_tasks) ? sub_tasks : [];
        const existingSubs = Array.isArray(existingTask.sub_tasks) ? existingTask.sub_tasks : [];
        const existingMap = new Map<string, any>(existingSubs.map((s: any) => [String(s.id), s]));

        const putUserRoleCodes: string[] = Array.isArray((user as any)?.role_codes)
          ? (user as any).role_codes
          : [(user as any)?.role || (user as any)?.primary_role || ""].filter(Boolean);
        const hasLeaderRole = putUserRoleCodes.some((r: string) =>
          ["leader", "project_leader", "team_leader", "head_of_operations"].includes(String(r).toLowerCase())
        );
        const isUserPlatformAdmin = Boolean(user && (
          isPlatformAdminUser(user) ||
          isInstitutionAdminUser(user) ||
          putUserRoleCodes.some((r: string) => ["platform_admin", "superadmin", "super_admin", "admin", "institution_admin", "head_of_operations"].includes(String(r).toLowerCase()))
        ));
        const currentUserIdStr = user?.id ? String(user.id) : "";
        const currentUserNameLower = (user?.full_name || (user as any)?.name || "").toLowerCase().trim();
        const currentUserEmailLower = (user?.email || "").toLowerCase().trim();
        const isTaskLeader = hasLeaderRole || Boolean(user && (
          (existingTask.project_leader_id && String(existingTask.project_leader_id) === currentUserIdStr) ||
          (existingTask.project_leader_name && currentUserNameLower && existingTask.project_leader_name.toLowerCase().trim() === currentUserNameLower) ||
          (existingTask.project_leader_email && currentUserEmailLower && existingTask.project_leader_email.toLowerCase().trim() === currentUserEmailLower)
        ));
        const canModifyPriceAndPoints = isUserPlatformAdmin || isTaskLeader;

        // Determine which subtask is being started (if any) to auto-stop others
        const startingSubId = Array.isArray(subs)
          ? subs.find((s: any) => {
              const ex = existingMap.get(String(s.id));
              return s.status === "in_progress" && (!ex || ex.status !== "in_progress");
            })?.id
          : null;

        // Map subtasks preserving existing uploads/work updates and recording timer starts/stops
        subs = subs.map((s: any) => {
          const ex = existingMap.get(String(s.id));
          const isThisSubStarting = s.status === "in_progress" && (!ex || ex.status !== "in_progress");
          // Only auto-stop another subtask if it was started by or assigned to the SAME current user
          const wasStartedByCurrentUser = ex && (
            (ex.started_by_id && String(ex.started_by_id) === String(currentUserId)) ||
            (!ex.started_by_id && ex.assigned_employee_id && String(ex.assigned_employee_id) === String(currentUserId))
          );
          const isAutoStopped = Boolean(startingSubId && String(s.id) !== String(startingSubId) && ex && ex.status === "in_progress" && wasStartedByCurrentUser);

          // Prevent non-owner from stopping someone else's running subtask
          const isOwnedByCurrentUser = ex && (
            (ex.started_by_id && String(ex.started_by_id) === String(currentUserId)) ||
            (!ex.started_by_id && ex.assigned_employee_id && String(ex.assigned_employee_id) === String(currentUserId))
          );
          const isTryingToStopOthersSubtask =
            !isUserPlatformAdmin &&
            ex &&
            ex.status === "in_progress" &&
            s.status !== "in_progress" &&
            !isOwnedByCurrentUser;

          if (isTryingToStopOthersSubtask) {
            // Keep existing running subtask state intact!
            s.status = "in_progress";
            s.started_at = ex.started_at;
            s.started_by_id = ex.started_by_id;
            s.started_by_name = ex.started_by_name;
          }

          const isThisSubStopping = isAutoStopped || (s.status === "pending" && ex && ex.status === "in_progress" && !isTryingToStopOthersSubtask);
          if (isAutoStopped) {
            taskHistory.push({
              id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              action: "stopped",
              timestamp: new Date().toISOString(),
              user_id: currentUserId,
              user_name: currentUserName,
              user_role: currentUserRole,
              old_status: "in_progress",
              new_status: "pending",
              subtask_id: s.id || null,
              subtask_title: s.title || null,
              details: s.title ? `Deliverable "${s.title}" auto-stopped: deliverable "${body.subtask_title || 'another'}" started` : "Deliverable auto-stopped",
            });
          }
          if (ex) {
            return {
              ...ex,
              ...s,
              price: canModifyPriceAndPoints ? (s.price !== undefined ? s.price : ex.price) : ex.price,
              points: canModifyPriceAndPoints ? (s.points !== undefined ? s.points : ex.points) : (ex.points !== undefined ? ex.points : 20),
              penalty_points: canModifyPriceAndPoints ? (s.penalty_points !== undefined ? s.penalty_points : ex.penalty_points) : (ex.penalty_points !== undefined ? ex.penalty_points : 10),
              status: isAutoStopped ? "pending" : (s.status || ex.status),
              uploads: s.uploads !== undefined ? s.uploads : ex.uploads || [],
              work_updates: s.work_updates !== undefined ? s.work_updates : ex.work_updates || [],
              started_at: isThisSubStarting ? new Date().toISOString() : ex.started_at || null,
              started_by_name: isThisSubStarting ? currentUserName : (ex.started_by_name || s.started_by_name || null),
              started_by_id: isThisSubStarting ? currentUserId : (ex.started_by_id || s.started_by_id || null),
              stopped_at: isThisSubStopping ? new Date().toISOString() : isThisSubStarting ? null : ex.stopped_at || null,
              stopped_by_name: isThisSubStopping ? currentUserName : (ex.stopped_by_name || null),
            };
          }
          return {
            ...s,
            price: canModifyPriceAndPoints ? (s.price !== undefined ? parseFloat(String(s.price)) || 0 : 0) : 0,
            points: canModifyPriceAndPoints ? (s.points !== undefined ? s.points : 20) : 20,
            penalty_points: canModifyPriceAndPoints ? (s.penalty_points !== undefined ? s.penalty_points : 10) : 10,
            started_at: isThisSubStarting ? new Date().toISOString() : null,
            started_by_name: isThisSubStarting ? currentUserName : null,
            started_by_id: isThisSubStarting ? currentUserId : null,
            stopped_at: null,
          };
        });
        params.push(JSON.stringify(subs));
        updates.push(`sub_tasks = $${params.length}::jsonb`);
        if (subs.length > 0 && canModifyPriceAndPoints) {
          const calcPrice = subs.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0);
          params.push(calcPrice);
          updates.push(`price = $${params.length}`);
          const calcHours = Math.round(subs.reduce((sum: number, s: any) => {
            const h = parseFloat(s.duration_hours || s.estimated_hours) || 0;
            const m = parseFloat(s.duration_minutes) || 0;
            return sum + h + (m / 60);
          }, 0) * 100) / 100;
          params.push(calcHours);
          updates.push(`estimated_hours = $${params.length}`);
          if (subs.every((s: any) => s.status === "completed" || s.is_completed)) {
            calcStatus = "completed";
          } else if (subs.some((s: any) => s.status === "recheck" || s.status === "rework")) {
            calcStatus = "rework";
          } else if (subs.some((s: any) => s.status === "in_progress")) {
            calcStatus = "in_progress";
          } else if (subs.every((s: any) => s.status === "under_review" || s.status === "completed" || s.is_completed)) {
            calcStatus = "under_review";
            markedUnderReview = true;
          } else if (subs.some((s: any) => s.status === "under_review")) {
            calcStatus = subs.some((s: any) => s.status === "pending") ? "pending" : "under_review";
            markedUnderReview = true;
          } else {
            calcStatus = "pending";
          }
          if (subs.some((s: any) => s.urgency === "urgent")) calcUrgency = "urgent";
          else if (subs.some((s: any) => s.urgency === "high")) calcUrgency = "high";
          else if (subs.some((s: any) => s.urgency === "medium")) calcUrgency = "medium";
          else calcUrgency = "low";
        }
      }
      const effectiveStatus = status !== undefined ? status : calcStatus;
      if (effectiveStatus !== null && effectiveStatus !== undefined) {
        params.push(effectiveStatus);
        updates.push(`status = $${params.length}`);
        if (effectiveStatus === "completed" && (existingTask.is_daily_recurring || is_daily_recurring)) {
          params.push(todayDateStr);
          updates.push(`last_recurring_date = $${params.length}::date`);
        }
        // Automatic Points Award / Penalty
        if (effectiveStatus === "completed" && existingTask.status !== "completed") {
          const empId = existingTask.assigned_employee_id || (user as any)?.id;
          if (empId) {
            void recordPointsTransaction({
              employeeId: empId,
              institutionId: existingTask.institution_id,
              taskId: existingTask.id,
              pointType: "task_completed",
              points: Number(existingTask.points || points || 20),
              reason: `Task completed successfully: "${existingTask.title}"`,
              awardedBy: user ? (user as any).id : null,
            });
          }
        } else if (effectiveStatus === "cancelled" && existingTask.status !== "cancelled") {
          const empId = existingTask.assigned_employee_id || (user as any)?.id;
          if (empId) {
            void recordPointsTransaction({
              employeeId: empId,
              institutionId: existingTask.institution_id,
              taskId: existingTask.id,
              pointType: "task_failed",
              points: -Math.abs(Number(existingTask.penalty_points || penalty_points || 10)),
              reason: `Penalty for cancelled/unfollowed task: "${existingTask.title}"`,
              awardedBy: user ? (user as any).id : null,
            });
          }
        } else if ((effectiveStatus === "recheck" || effectiveStatus === "rework") && existingTask.status !== "recheck" && existingTask.status !== "rework") {
          const empId = existingTask.assigned_employee_id || (user as any)?.id;
          if (empId) {
            void recordPointsTransaction({
              employeeId: empId,
              institutionId: existingTask.institution_id,
              taskId: existingTask.id,
              pointType: "task_failed",
              points: -Math.abs(Number((existingTask.penalty_points || penalty_points || 10) / 2)),
              reason: `Deduction for task requiring rework/revision: "${existingTask.title}"`,
              awardedBy: user ? (user as any).id : null,
            });
          }
        }
      }
      const effectiveUrgency = urgency !== undefined ? urgency : calcUrgency;
      if (effectiveUrgency !== null && effectiveUrgency !== undefined) {
        params.push(effectiveUrgency);
        updates.push(`urgency = $${params.length}`);
      }
      const res = await db.query(
        `UPDATE operations_tasks SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
        params
      );
      const updatedTask = res.rows[0];
      // Auto-sync staff attendance working hours, check-in count, checkout, and task hours
      const syncStaffId = updatedTask.assigned_employee_id || (user as any)?.id;
      const syncInstId = updatedTask.institution_id || (user as any)?.institution_id || (user as any)?.memberships?.[0]?.institution_id || 1;
      if (syncStaffId) {
        void syncTaskAttendanceToDatabase(db, syncStaffId, syncInstId).catch((e) =>
          console.error("Auto attendance sync error:", e)
        );
      }
      if ((user as any)?.id && Number((user as any).id) !== Number(syncStaffId)) {
        void syncTaskAttendanceToDatabase(db, (user as any).id, syncInstId).catch((e) =>
          console.error("Auto attendance sync error for acting user:", e)
        );
      }
      // If marked under review, notify admins
      if (markedUnderReview) {
        const staffName = user?.full_name || updatedTask.assigned_employee_name || "Staff Member";
        const staffId = updatedTask.assigned_employee_id || (user as any)?.id || null;
        void notifyAdminsForTaskReview(
          updatedTask.id,
          updatedTask.title,
          staffId,
          staffName,
          updatedTask.institution_id,
          user ? (user as any).id : null
        );
      }
      return NextResponse.json({ task: updatedTask });
    }
    const calcPoints = isOwnerOrAdmin
      ? (points !== undefined ? parseFloat(String(points)) : (parseFloat(String(existingTask.points)) || 20))
      : (parseFloat(String(existingTask.points)) || 20);
    const calcPenaltyPoints = isOwnerOrAdmin
      ? (penalty_points !== undefined ? parseFloat(String(penalty_points)) : (parseFloat(String(existingTask.penalty_points)) || 10))
      : (parseFloat(String(existingTask.penalty_points)) || 10);
    const assignedEmployees = Array.isArray(body.assigned_employees)
      ? body.assigned_employees
      : (existingTask.assigned_employees || []);
    const assignedEmpId = body.assigned_employee_id !== undefined
      ? (body.assigned_employee_id ? parseInt(String(body.assigned_employee_id)) : null)
      : (assignedEmployees.length > 0 && assignedEmployees[0]?.id ? parseInt(String(assignedEmployees[0].id)) : existingTask.assigned_employee_id);
    const assignedEmpName = body.assigned_employee_name !== undefined
      ? (body.assigned_employee_name?.trim() || null)
      : (assignedEmployees.length > 0 ? assignedEmployees.map((e: any) => e.name).filter(Boolean).join(", ") : existingTask.assigned_employee_name);
    const assignedEmpRole = body.assigned_employee_role !== undefined
      ? (body.assigned_employee_role?.trim() || null)
      : (assignedEmployees.length > 0 ? assignedEmployees.map((e: any) => e.role).filter(Boolean).join(", ") : existingTask.assigned_employee_role);
    const assignedEmpEmail = body.assigned_employee_email !== undefined
      ? (body.assigned_employee_email?.trim() || null)
      : (assignedEmployees.length > 0 && assignedEmployees[0]?.email ? assignedEmployees[0].email.trim() : existingTask.assigned_employee_email);
    let finalSubTasks = sub_tasks !== undefined ? (Array.isArray(sub_tasks) ? sub_tasks : []) : (existingTask.sub_tasks || []);
    if (sub_tasks !== undefined) {
      const existingSubs = Array.isArray(existingTask.sub_tasks) ? existingTask.sub_tasks : [];
      const existingMap = new Map<string, any>(existingSubs.map((s: any) => [String(s.id), s]));
      finalSubTasks = finalSubTasks.map((s: any) => {
        const ex = existingMap.get(String(s.id));
        if (ex) {
          return {
            ...ex,
            ...s,
            status: s.status || ex.status,
            uploads: s.uploads !== undefined ? s.uploads : ex.uploads || [],
            work_updates: s.work_updates !== undefined ? s.work_updates : ex.work_updates || [],
          };
        }
        return {
          ...s,
          points: s.points !== undefined ? s.points : 20,
          penalty_points: s.penalty_points !== undefined ? s.penalty_points : 10,
        };
      });
    }
    const finalInstId = body.institution_id !== undefined && isOwnerOrAdmin
      ? (body.institution_id && body.institution_id !== "none" && body.institution_id !== "all" ? Number(body.institution_id) : null)
      : existingTask.institution_id;

    const assignedClientsArr = body.assigned_clients !== undefined
      ? (Array.isArray(body.assigned_clients) ? body.assigned_clients : [])
      : (existingTask.assigned_clients || []);
    const finalProjectFor = body.project_for !== undefined ? body.project_for : (existingTask.project_for || (assignedClientsArr.length > 0 ? "client" : "own_company"));
    const finalCompanyName = body.company_name !== undefined ? body.company_name : existingTask.company_name;
    const finalStartDate = body.start_date !== undefined ? (body.start_date ? new Date(body.start_date).toISOString() : null) : existingTask.start_date;
    const finalCurrency = body.currency !== undefined ? body.currency : (existingTask.currency || "INR");
    const finalCost = body.cost !== undefined ? (parseFloat(String(body.cost)) || 0) : (body.price !== undefined ? (parseFloat(String(body.price)) || 0) : (parseFloat(String(existingTask.cost || existingTask.price)) || 0));
    const finalLiveUrl = body.live_url !== undefined ? normalizeUrl(body.live_url) : existingTask.live_url;
    const finalDemoUrl = body.demo_url !== undefined ? normalizeUrl(body.demo_url) : existingTask.demo_url;
    const finalProjectLeaderId = body.project_leader_id !== undefined ? (body.project_leader_id ? Number(body.project_leader_id) : null) : existingTask.project_leader_id;
    const finalProjectLeaderName = body.project_leader_name !== undefined ? (body.project_leader_name ? String(body.project_leader_name).trim() : null) : existingTask.project_leader_name;
    const finalTitle = (title !== undefined && title !== null && String(title).trim() !== "") ? String(title).trim() : existingTask.title;
    const finalProjectTypeId = body.project_type_id !== undefined ? (body.project_type_id ? Number(body.project_type_id) : null) : existingTask.project_type_id;
    const finalProjectTypeName = body.project_type_name !== undefined ? (body.project_type_name ? String(body.project_type_name).trim() : null) : existingTask.project_type_name;
    const finalPipelineId = body.pipeline_id !== undefined ? (body.pipeline_id ? Number(body.pipeline_id) : null) : existingTask.pipeline_id;
    const finalPipelineName = body.pipeline_name !== undefined ? (body.pipeline_name ? String(body.pipeline_name).trim() : null) : existingTask.pipeline_name;
    const finalPipelinePhases = body.pipeline_phases !== undefined ? (Array.isArray(body.pipeline_phases) ? body.pipeline_phases : []) : (Array.isArray(existingTask.pipeline_phases) ? existingTask.pipeline_phases : []);
    const finalCurrentPhaseIndex = body.current_phase_index !== undefined ? Number(body.current_phase_index) || 0 : (existingTask.current_phase_index || 0);

    const finalClientId = body.client_id !== undefined
      ? (body.client_id && body.client_id !== "none" ? parseInt(String(body.client_id).replace("vendor_", "")) : null)
      : (assignedClientsArr.length > 0 && assignedClientsArr[0]?.id ? parseInt(String(assignedClientsArr[0].id)) : existingTask.client_id);
    const finalClientName = body.client_name !== undefined
      ? (body.client_name?.trim() || null)
      : (assignedClientsArr.length > 0 ? assignedClientsArr.map((c: any) => c.company_name || c.name).filter(Boolean).join(", ") : existingTask.client_name);

    const res = await db.query(
      `UPDATE operations_tasks SET
        title = $1,
        client_id = $2,
        client_name = $3,
        price = $4,
        details = $5,
        assigned_employee_id = $6,
        assigned_employee_name = $7,
        assigned_employee_role = $8,
        assigned_employee_email = $9,
        estimated_hours = $10,
        logged_hours = $11,
        deadline = $12,
        status = $13,
        urgency = $14,
        sub_tasks = $15,
        is_daily_recurring = $16,
        points = $17,
        penalty_points = $18,
        assigned_employees = $19,
        institution_id = $20,
        history = $21::jsonb,
        assigned_clients = $22::jsonb,
        project_for = $23,
        company_name = $24,
        start_date = $25::timestamptz,
        currency = $26,
        cost = $27,
        live_url = $28,
        demo_url = $29,
        project_leader_id = $30,
        project_leader_name = $31,
        project_type_id = $33,
        project_type_name = $34,
        pipeline_id = $35,
        pipeline_name = $36,
        pipeline_phases = $37::jsonb,
        current_phase_index = $38,
        updated_at = NOW()
      WHERE id = $32
      RETURNING *`,
      [
        finalTitle,
        finalClientId,
        finalClientName,
        parseFloat(String(price)) || 0,
        details?.trim() || null,
        assignedEmpId,
        assignedEmpName,
        assignedEmpRole,
        assignedEmpEmail,
        parseFloat(String(estimated_hours)) || 0,
        parseFloat(String(logged_hours)) || 0,
        ((body.due_date !== undefined || body.deadline !== undefined) ? (body.due_date ? new Date(body.due_date).toISOString() : (body.deadline ? new Date(body.deadline).toISOString() : null)) : existingTask.deadline),
        status || "pending",
        urgency || "medium",
        JSON.stringify(finalSubTasks),
        Boolean(is_daily_recurring),
        calcPoints,
        calcPenaltyPoints,
        JSON.stringify(assignedEmployees),
        finalInstId,
        JSON.stringify([
          ...(Array.isArray(existingTask.history) ? existingTask.history : []),
          {
            id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: "modified",
            timestamp: new Date().toISOString(),
            user_id: user?.id || null,
            user_name: (user as any)?.full_name || (user as any)?.name || (user as any)?.email || "User",
            user_role: (user as any)?.role || "Staff",
            details: "Task definition updated",
            new_status: status || existingTask.status,
          }
        ].slice(-100)),
        JSON.stringify(assignedClientsArr),
        finalProjectFor,
        finalCompanyName,
        finalStartDate,
        finalCurrency,
        finalCost,
        finalLiveUrl,
        finalDemoUrl,
        finalProjectLeaderId,
        finalProjectLeaderName,
        id,
        finalProjectTypeId,
        finalProjectTypeName,
        finalPipelineId,
        finalPipelineName,
        JSON.stringify(finalPipelinePhases),
        finalCurrentPhaseIndex,
      ]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const updatedTask = res.rows[0];
    // Auto-sync staff attendance working hours, check-in count, checkout, and task hours
    const syncStaffId = updatedTask.assigned_employee_id || (user as any)?.id;
    const syncInstId = updatedTask.institution_id || (user as any)?.institution_id;
    if (syncStaffId && syncInstId) {
      void syncTaskAttendanceToDatabase(db, syncStaffId, syncInstId).catch((e) =>
        console.error("Auto attendance sync error:", e)
      );
    }
    if (status === "completed" && existingTask.status !== "completed") {
      const empId = updatedTask.assigned_employee_id || (user as any)?.id;
      if (empId) {
        void recordPointsTransaction({
          employeeId: empId,
          institutionId: updatedTask.institution_id,
          taskId: updatedTask.id,
          pointType: "task_completed",
          points: Number(updatedTask.points || 20),
          reason: `Task completed successfully: "${updatedTask.title}"`,
          awardedBy: user ? (user as any).id : null,
        });
      }
    } else if (status === "cancelled" && existingTask.status !== "cancelled") {
      const empId = updatedTask.assigned_employee_id || (user as any)?.id;
      if (empId) {
        void recordPointsTransaction({
          employeeId: empId,
          institutionId: updatedTask.institution_id,
          taskId: updatedTask.id,
          pointType: "task_failed",
          points: -Math.abs(Number(updatedTask.penalty_points || 10)),
          reason: `Penalty for cancelled/unfollowed task: "${updatedTask.title}"`,
          awardedBy: user ? (user as any).id : null,
        });
      }
    }
    if (markedUnderReview || (status === "under_review" && existingTask.status !== "under_review")) {
      const staffName = user?.full_name || updatedTask.assigned_employee_name || "Staff Member";
      const staffId = updatedTask.assigned_employee_id || (user as any)?.id || null;
      void notifyAdminsForTaskReview(
        updatedTask.id,
        updatedTask.title,
        staffId,
        staffName,
        updatedTask.institution_id,
        user ? (user as any).id : null
      );
    }
    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("[Operations Tasks PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 });
  }
}
async function recordPointsTransaction({
  employeeId,
  institutionId,
  taskId,
  subtaskId,
  pointType,
  points,
  reason,
  awardedBy,
}: {
  employeeId: number;
  institutionId?: number | null;
  taskId?: number | null;
  subtaskId?: string | null;
  pointType: string;
  points: number;
  reason: string;
  awardedBy?: number | null;
}) {
  try {
    await db.query(
      `INSERT INTO staff_performance_points_ledger (
        employee_id, institution_id, task_id, subtask_id, point_type, points, reason, awarded_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        employeeId,
        institutionId || null,
        taskId || null,
        subtaskId || null,
        pointType,
        points,
        reason,
        awardedBy || null,
      ]
    );
  } catch (err) {
    console.error("[recordPointsTransaction] Error logging points:", err);
  }
}
async function notifyAdminsForTaskReview(
  taskId: number,
  taskTitle: string,
  staffId: number | null,
  staffName: string,
  institutionId: number | null,
  actorUserId: number | null
) {
  try {
    const recipientIds = new Set<number>();
    // Platform Admins
    const platformAdmins = await db.query(
      `SELECT u.id
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE (u.is_super_admin = TRUE OR r.code = 'platform_admin')
         AND COALESCE(u.is_deleted, FALSE) = FALSE`
    ).catch(() => ({ rows: [] }));
    platformAdmins.rows.forEach((row: any) => recipientIds.add(Number(row.id)));
    // Institution Admins
    if (institutionId) {
      const instAdmins = await db.query(
        `SELECT u.id
         FROM users u
         INNER JOIN institution_memberships im ON im.user_id = u.id
         INNER JOIN roles r ON r.id = im.role_id
         WHERE im.institution_id = $1
           AND im.is_active = TRUE
           AND COALESCE(im.is_deleted, FALSE) = FALSE
           AND r.code IN ('institution_admin', 'school_owner', 'college_owner', 'university_owner', 'principal', 'director')`,
        [institutionId]
      ).catch(() => ({ rows: [] }));
      instAdmins.rows.forEach((row: any) => recipientIds.add(Number(row.id)));
    }
    const recipients = Array.from(recipientIds).filter((id) => id !== actorUserId);
    if (recipients.length === 0) return;
    // Send "Task Submitted for Review" notification
    await createAndDispatchNotification({
      type: "tasks.under_review",
      recipients,
      institutionId: institutionId || null,
      entityType: "operation_task",
      entityId: taskId,
      priority: "high",
      title: "📋 Task Submitted for Review",
      message: `${staffName} marked "${taskTitle}" as Under Review. Please review deliverables and approve or request revision.`,
      payload: {
        task_id: taskId,
        task_title: taskTitle,
        staff_id: staffId,
        staff_name: staffName,
      },
      createdBy: actorUserId,
    });
    // Check if staff has any remaining active tasks
    if (staffId) {
      const activeTasksRes = await db.query(
        `SELECT id, status, sub_tasks
         FROM operations_tasks
         WHERE (assigned_employee_id = $1 OR sub_tasks::text ILIKE $2)
           AND id != $3
           AND status IN ('pending', 'in_progress', 'recheck', 'rework')`,
        [staffId, `%"assigned_employee_id":${staffId}%`, taskId]
      ).catch(() => ({ rows: [] }));
      let remainingActiveCount = 0;
      for (const row of activeTasksRes.rows) {
        if (["pending", "in_progress", "recheck", "rework"].includes(row.status)) {
          remainingActiveCount++;
        }
      }
      // If no other active tasks remain, alert admins immediately!
      if (remainingActiveCount <= 0) {
        await createAndDispatchNotification({
          type: "tasks.staff_idle_assign_new",
          recipients,
          institutionId: institutionId || null,
          entityType: "operation_task",
          entityId: taskId,
          priority: "critical",
          title: "⚡ Staff Has No Remaining Tasks - Action Required",
          message: `${staffName} has submitted all assigned deliverables for review and currently has 0 tasks to work on. Please assign new tasks immediately.`,
          payload: {
            staff_id: staffId,
            staff_name: staffName,
            just_completed_task_id: taskId,
          },
          createdBy: actorUserId,
        });
      }
    }
  } catch (err) {
    console.error("[notifyAdminsForTaskReview] Error sending notification:", err);
  }
}
async function createAndDispatchNotification({
  type,
  title,
  message,
  priority,
  recipients,
  institutionId,
  entityType,
  entityId,
  payload,
  createdBy,
}: {
  type: string;
  title: string;
  message: string;
  priority: string;
  recipients: number[];
  institutionId: number | null;
  entityType: string;
  entityId: number;
  payload: Record<string, unknown>;
  createdBy: number | null;
}) {
  if (recipients.length === 0) return;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const notifRes = await client.query(
      `INSERT INTO notifications (
         type, title, message, priority, entity_type, entity_id, payload, created_by, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, timezone('Asia/Kolkata', NOW()))
       RETURNING id::text, type, title, message, priority`,
      [type, title, message, priority, entityType, entityId, JSON.stringify(payload), createdBy]
    );
    const notification = notifRes.rows[0];
    if (notification) {
      await client.query(
        `INSERT INTO notification_recipients (notification_id, user_id, delivered_at)
         SELECT $1::bigint, unnest($2::int[]), timezone('Asia/Kolkata', NOW())
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [notification.id, recipients]
      );
    }
    await client.query("COMMIT");
    void publishRealtimeNotification({
      recipientIds: recipients,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[createAndDispatchNotification] Error:", err);
  } finally {
    client.release();
  }
}
export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    const roleCodes: string[] = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdmin =
      Boolean((user as any)?.is_super_admin) ||
      roleCodes.some((r) =>
        ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner", "director", "principal"].includes(r)
      );
    const taskCheck = await db.query(`SELECT created_by FROM operations_tasks WHERE id = $1`, [id]);
    if (taskCheck.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!isOwnerOrAdmin && Number(taskCheck.rows[0].created_by) !== Number(user.id)) {
      return NextResponse.json(
        { error: "You can only delete tasks that you created." },
        { status: 403 }
      );
    }
    await db.query(`DELETE FROM operations_tasks WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("[Operations Tasks DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete task" }, { status: 500 });
  }
}