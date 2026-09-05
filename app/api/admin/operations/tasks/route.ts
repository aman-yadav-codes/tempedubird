import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";
import { publishRealtimeNotification } from "@/lib/notifications/socket-publisher";
import { isPlatformAdminUser, isInstitutionAdminUser, hasPermission } from "@/lib/auth/permissions";

async function processDailyRecurringTasksAndPenalties(dbInstance: any) {
  try {
    const todayDateStr = new Date().toISOString().split("T")[0];
    const recurringRes = await dbInstance.query(
      `SELECT * FROM operations_tasks WHERE is_daily_recurring = TRUE`
    );
    const dailyTasks = recurringRes.rows || [];

    for (const t of dailyTasks) {
      const lastRecDate = t.last_recurring_date
        ? new Date(t.last_recurring_date).toISOString().split("T")[0]
        : null;

      // If it was last active on a previous day (or hasn't run yet)
      if (!lastRecDate || lastRecDate < todayDateStr) {
        const wasCompleted = t.status === "completed";

        // Penalty applies if the daily task was not completed on its scheduled date!
        if (lastRecDate && !wasCompleted && t.assigned_employee_id) {
          const penaltyAmount = Math.abs(parseFloat(String(t.penalty_points)) || 10);
          await recordPointsTransaction({
            employeeId: t.assigned_employee_id,
            institutionId: t.institution_id,
            taskId: t.id,
            pointType: "task_failed",
            points: -penaltyAmount,
            reason: `Uncompleted daily task: "${t.title}" for ${lastRecDate}`,
            awardedBy: null,
          });
        }

        const resetSubs = Array.isArray(t.sub_tasks)
          ? t.sub_tasks.map((s: any) => ({
              ...s,
              status: "pending",
              is_completed: false,
            }))
          : [];

        const existingHistory = Array.isArray(t.daily_recurrence_history)
          ? t.daily_recurrence_history
          : [];
        const newHistory = [
          ...existingHistory,
          {
            date: lastRecDate || todayDateStr,
            status: t.status,
            completed: wasCompleted,
            penalty_applied: Boolean(lastRecDate && !wasCompleted),
          },
        ].slice(-30);

        await dbInstance.query(
          `UPDATE operations_tasks
           SET status = 'pending',
               last_recurring_date = $1::date,
               sub_tasks = $2::jsonb,
               daily_recurrence_history = $3::jsonb,
               logged_hours = 0,
               updated_at = NOW()
           WHERE id = $4`,
          [todayDateStr, JSON.stringify(resetSubs), JSON.stringify(newHistory), t.id]
        ).catch(() => {});
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
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const urgency = url.searchParams.get("urgency")?.trim() || "";
    const clientId = url.searchParams.get("client_id")?.trim() || "";
    const employeeId = url.searchParams.get("employee_id")?.trim() || "";

    let query = `SELECT * FROM operations_tasks WHERE 1=1`;
    const params: any[] = [];

    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isPlatform = !userInstId || (user && isPlatformAdminUser(user));

    let targetInstId: number | null = null;
    if (userInstId) {
      targetInstId = userInstId;
    } else if (isPlatform) {
      const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
      const parsedInstId = requestedInstId ? Number(requestedInstId) : null;
      if (Number.isInteger(parsedInstId) && (parsedInstId as number) > 0) {
        targetInstId = parsedInstId;
      }
    }

    // Strict organization scoping: institution staff only see institution tasks, platform only platform tasks
    if (targetInstId) {
      params.push(targetInstId);
      query += ` AND institution_id = $${params.length}`;
    } else {
      query += ` AND institution_id IS NULL`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR client_name ILIKE $${params.length} OR assigned_employee_name ILIKE $${params.length} OR details ILIKE $${params.length})`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (urgency && urgency !== "all") {
      params.push(urgency);
      query += ` AND urgency = $${params.length}`;
    }

    if (clientId && clientId !== "all") {
      params.push(clientId);
      query += ` AND client_id = $${params.length}`;
    }

    const isInstAdmin = user ? isInstitutionAdminUser(user) : false;
    const canManageAllTasks =
      (user && isPlatformAdminUser(user)) ||
      isInstAdmin ||
      (user && hasPermission(user, "operations.tasks.manage", { institutionId: targetInstId || undefined })) ||
      (user && hasPermission(user, "operations.tasks.view_all", { institutionId: targetInstId || undefined })) ||
      (user && hasPermission(user, "managestaff.allstaff.view", { institutionId: targetInstId || undefined }));

    if (!canManageAllTasks && user?.id) {
      params.push(String(user.id));
      query += ` AND (
        assigned_employee_id::text = $${params.length}
        OR created_by = $${params.length}::int
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem 
          WHERE elem->>'assigned_employee_id' = $${params.length}
        )
      )`;
    } else {
      const effectiveEmployeeId = employeeId === "me" ? (user?.id ? String(user.id) : "") : employeeId;
      if (effectiveEmployeeId && effectiveEmployeeId !== "all") {
        params.push(effectiveEmployeeId);
        query += ` AND (
          assigned_employee_id::text = $${params.length}
          OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(sub_tasks, '[]'::jsonb)) elem 
            WHERE elem->>'assigned_employee_id' = $${params.length}
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
    const clientsRes = await db.query(
      `SELECT id, name, company_name, email, phone, client_type 
       FROM clients 
       WHERE status = 'active' 
         AND ($1::int IS NULL OR institution_id = $1::int OR institution_id IS NULL)
       ORDER BY name ASC`,
      [targetInstId]
    );
    
    // Fetch list of staff/employees for picker strictly filtered and deduplicated
    let staffRes;
    if (targetInstId) {
      staffRes = await db.query(
        `
          WITH unique_staff AS (
            SELECT DISTINCT ON (u.id)
              u.id,
              COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
              u.email,
              u.phone,
              COALESCE(d.name, r.name, r.code, 'Staff Member') AS role,
              COALESCE(r.code, 'staff') AS role_code
            FROM users u
            JOIN (
              SELECT scoped_im.user_id, scoped_im.role_id, scoped_im.updated_at
              FROM institution_memberships scoped_im
              WHERE scoped_im.is_active = TRUE 
                AND COALESCE(scoped_im.is_deleted, FALSE) = FALSE 
                AND scoped_im.institution_id = $1::int
              UNION
              SELECT scoped_up.user_id, NULL as role_id, scoped_up.updated_at
              FROM user_profiles scoped_up
              WHERE scoped_up.under_institution_id = $1::int
            ) inst_members ON inst_members.user_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN designations d ON d.id = up.designation_id
            LEFT JOIN roles r ON r.id = inst_members.role_id
            WHERE COALESCE(u.is_deleted, FALSE) = FALSE
              AND (r.code IS NULL OR r.code NOT IN ('student', 'parent', 'guardian'))
            ORDER BY u.id, inst_members.updated_at DESC NULLS LAST
          )
          SELECT * FROM unique_staff ORDER BY name ASC;
        `,
        [targetInstId]
      );
    } else {
      staffRes = await db.query(
        `
          WITH unique_staff AS (
            SELECT DISTINCT ON (u.id)
              u.id,
              COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
              u.email,
              u.phone,
              COALESCE(d.name, r.name, r.code, CASE WHEN u.is_super_admin THEN 'Platform Super Admin' ELSE 'Platform Admin' END) AS role,
              COALESCE(r.code, CASE WHEN u.is_super_admin THEN 'platform_admin' ELSE 'platform_staff' END) AS role_code
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            LEFT JOIN scope_types st ON st.id = r.scope_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN designations d ON d.id = up.designation_id
            WHERE COALESCE(u.is_deleted, FALSE) = FALSE
              AND (
                u.is_super_admin = TRUE 
                OR r.code = 'platform_admin' 
                OR st.code = 'platform'
                OR (
                  NOT EXISTS (
                    SELECT 1 FROM institution_memberships scoped_im 
                    WHERE scoped_im.user_id = u.id AND scoped_im.is_active = TRUE AND COALESCE(scoped_im.is_deleted, FALSE) = FALSE
                  )
                  AND (up.under_institution_id IS NULL)
                  AND COALESCE(r.code, '') NOT IN ('student', 'parent', 'guardian', 'teacher', 'driver', 'center_head', 'principal', 'vice_principal', 'academic_coordinator', 'hod')
                )
              )
              AND NOT EXISTS (
                SELECT 1 FROM institution_memberships scoped_im 
                WHERE scoped_im.user_id = u.id AND scoped_im.is_active = TRUE AND COALESCE(scoped_im.is_deleted, FALSE) = FALSE
              )
              AND (up.under_institution_id IS NULL)
            ORDER BY u.id
          )
          SELECT * FROM unique_staff ORDER BY name ASC;
        `
      );
    }

    // Auto-seed sample tasks if empty
    if (tasks.length === 0 && !search && (!status || status === "all") && (!urgency || urgency === "all")) {
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
          price: 32000.00,
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

    // Compute Metrics Summary
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === "pending").length;
    const inProgressTasks = tasks.filter(t => t.status === "in_progress" || t.status === "under_review").length;
    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const urgentTasks = tasks.filter(t => t.urgency === "urgent" || t.urgency === "high").length;
    const totalRevenue = tasks.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
    const totalLoggedHours = tasks.reduce((sum, t) => sum + (parseFloat(t.logged_hours) || 0), 0);

    const currentUserIdStr = user?.id ? String(user.id) : "";
    const myAssignedTasks = currentUserIdStr ? tasks.filter(t => 
      String(t.assigned_employee_id) === currentUserIdStr ||
      (Array.isArray(t.sub_tasks) && t.sub_tasks.some((st: any) => String(st.assigned_employee_id) === currentUserIdStr))
    ).length : 0;

    return NextResponse.json({
      tasks,
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

    const creatorRole = (user as any)?.role || (user as any)?.role_code || "";
    const isPlatformAdmin = user ? isPlatformAdminUser(user) : false;
    const isAdmin =
      Boolean((user as any)?.is_super_admin) ||
      isPlatformAdmin ||
      ["platform_admin", "super_admin", "institution_admin", "director", "principal", "school_owner", "college_owner", "university_owner"].includes(creatorRole);

    const creatorInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const institutionId = creatorInstId ? creatorInstId : (isAdmin && body.institution_id ? Number(body.institution_id) : null);

    // Compute aggregated price, hours, urgency, and status from subtasks
    const calcPrice = sub_tasks.length > 0 
      ? sub_tasks.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0)
      : (parseFloat(String(body.price)) || 0);

    const calcHours = sub_tasks.length > 0
      ? sub_tasks.reduce((sum: number, s: any) => sum + (parseFloat(s.duration_hours || s.estimated_hours) || 0), 0)
      : (parseFloat(String(body.estimated_hours)) || 0);

    // Only administrators can customize reward points and penalty points. Regular employees use standard defaults (+20 / -10).
    const calcPoints = isAdmin
      ? (sub_tasks.length > 0
          ? sub_tasks.reduce((sum: number, s: any) => sum + (parseFloat(s.points) || 20), 0)
          : (parseFloat(String(points)) || 20))
      : 20;

    const calcPenaltyPoints = isAdmin
      ? (sub_tasks.length > 0
          ? sub_tasks.reduce((sum: number, s: any) => sum + (parseFloat(s.penalty_points) || 10), 0)
          : (parseFloat(String(penalty_points)) || 10))
      : 10;

    let calcUrgency = body.urgency || "medium";
    if (sub_tasks.some((s: any) => s.urgency === "urgent")) calcUrgency = "urgent";
    else if (sub_tasks.some((s: any) => s.urgency === "high")) calcUrgency = "high";
    else if (sub_tasks.some((s: any) => s.urgency === "medium")) calcUrgency = "medium";
    else if (sub_tasks.length > 0) calcUrgency = "low";

    let calcStatus = body.status || "pending";
    if (sub_tasks.length > 0) {
      if (sub_tasks.every((s: any) => s.status === "completed" || s.is_completed)) {
        calcStatus = "completed";
      } else if (sub_tasks.some((s: any) => s.status === "in_progress" || s.status === "under_review")) {
        calcStatus = "in_progress";
      }
    }

    const todayDateStr = new Date().toISOString().split("T")[0];

    const res = await db.query(
      `INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks,
        is_daily_recurring, last_recurring_date, points, penalty_points, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *`,
      [
        title.trim(),
        client_id ? parseInt(String(client_id).replace("vendor_", "")) : null,
        client_name?.trim() || "Independent Client",
        institutionId,
        calcPrice,
        details?.trim() || null,
        body.assigned_employee_id ? parseInt(String(body.assigned_employee_id)) : null,
        body.assigned_employee_name?.trim() || null,
        body.assigned_employee_role?.trim() || null,
        body.assigned_employee_email?.trim() || null,
        calcHours,
        parseFloat(String(body.logged_hours)) || 0,
        body.deadline ? new Date(body.deadline).toISOString() : null,
        calcStatus,
        calcUrgency,
        JSON.stringify(sub_tasks || []),
        Boolean(is_daily_recurring),
        Boolean(is_daily_recurring) ? todayDateStr : null,
        calcPoints,
        calcPenaltyPoints,
        user?.id || null,
      ]
    );

    const createdTask = res.rows[0];

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
    if (title === undefined && (status !== undefined || urgency !== undefined || logged_hours !== undefined || sub_tasks !== undefined || is_daily_recurring !== undefined || points !== undefined || penalty_points !== undefined || review_notes !== undefined || review_image_url !== undefined)) {
      const updates: string[] = ["updated_at = NOW()"];
      const params: any[] = [id];

      if (review_notes !== undefined) {
        params.push(review_notes ? String(review_notes).trim() : null);
        updates.push(`review_notes = $${params.length}`);
      }
      if (review_image_url !== undefined) {
        params.push(review_image_url ? String(review_image_url).trim() : null);
        updates.push(`review_image_url = $${params.length}`);
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
      if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);

        if (status === "completed" && (existingTask.is_daily_recurring || is_daily_recurring)) {
          params.push(todayDateStr);
          updates.push(`last_recurring_date = $${params.length}::date`);
        }

        // Automatic Points Award / Penalty
        if (status === "completed" && existingTask.status !== "completed") {
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
        } else if (status === "cancelled" && existingTask.status !== "cancelled") {
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
        } else if (status === "recheck" && existingTask.status !== "recheck") {
          const empId = existingTask.assigned_employee_id || (user as any)?.id;
          if (empId) {
            void recordPointsTransaction({
              employeeId: empId,
              institutionId: existingTask.institution_id,
              taskId: existingTask.id,
              pointType: "task_failed",
              points: -Math.abs(Number((existingTask.penalty_points || penalty_points || 10) / 2)),
              reason: `Deduction for task requiring recheck/revision: "${existingTask.title}"`,
              awardedBy: user ? (user as any).id : null,
            });
          }
        }
      }
      if (urgency !== undefined) {
        params.push(urgency);
        updates.push(`urgency = $${params.length}`);
      }
      if (logged_hours !== undefined) {
        params.push(parseFloat(String(logged_hours)) || 0);
        updates.push(`logged_hours = $${params.length}`);
      }
      if (sub_tasks !== undefined) {
        const subs = Array.isArray(sub_tasks) ? sub_tasks : [];
        params.push(JSON.stringify(subs));
        updates.push(`sub_tasks = $${params.length}`);

        if (subs.length > 0) {
          const calcPrice = subs.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0);
          params.push(calcPrice);
          updates.push(`price = $${params.length}`);

          const calcHours = subs.reduce((sum: number, s: any) => sum + (parseFloat(s.duration_hours || s.estimated_hours) || 0), 0);
          params.push(calcHours);
          updates.push(`estimated_hours = $${params.length}`);

          let calcStatus = "pending";
          if (subs.every((s: any) => s.status === "completed" || s.is_completed)) {
            calcStatus = "completed";
          } else if (subs.some((s: any) => s.status === "recheck")) {
            calcStatus = "recheck";
          } else if (subs.some((s: any) => s.status === "in_progress")) {
            calcStatus = "in_progress";
          } else if (subs.every((s: any) => s.status === "under_review")) {
            calcStatus = "under_review";
            markedUnderReview = true;
          } else if (subs.some((s: any) => s.status === "under_review")) {
            calcStatus = "in_progress";
            markedUnderReview = true;
          }
          params.push(calcStatus);
          updates.push(`status = $${params.length}`);

          if (calcStatus === "completed" && (existingTask.is_daily_recurring || is_daily_recurring)) {
            params.push(todayDateStr);
            updates.push(`last_recurring_date = $${params.length}::date`);
          }

          let calcUrgency = "medium";
          if (subs.some((s: any) => s.urgency === "urgent")) calcUrgency = "urgent";
          else if (subs.some((s: any) => s.urgency === "high")) calcUrgency = "high";
          else if (subs.some((s: any) => s.urgency === "medium")) calcUrgency = "medium";
          else calcUrgency = "low";
          params.push(calcUrgency);
          updates.push(`urgency = $${params.length}`);
        }
      }

      const res = await db.query(
        `UPDATE operations_tasks SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
        params
      );

      const updatedTask = res.rows[0];

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
        updated_at = NOW()
      WHERE id = $19
      RETURNING *`,
      [
        title?.trim(),
        client_id ? parseInt(String(client_id).replace("vendor_", "")) : null,
        client_name?.trim() || null,
        parseFloat(String(price)) || 0,
        details?.trim() || null,
        assigned_employee_id ? parseInt(String(assigned_employee_id)) : null,
        assigned_employee_name?.trim() || null,
        assigned_employee_role?.trim() || null,
        assigned_employee_email?.trim() || null,
        parseFloat(String(estimated_hours)) || 0,
        parseFloat(String(logged_hours)) || 0,
        deadline ? new Date(deadline).toISOString() : null,
        status || "pending",
        urgency || "medium",
        JSON.stringify(sub_tasks || []),
        Boolean(is_daily_recurring),
        calcPoints,
        calcPenaltyPoints,
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = res.rows[0];

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
           AND status IN ('pending', 'in_progress', 'recheck')`,
        [staffId, `%"assigned_employee_id":${staffId}%`, taskId]
      ).catch(() => ({ rows: [] }));

      let remainingActiveCount = 0;
      for (const row of activeTasksRes.rows) {
        if (["pending", "in_progress", "recheck"].includes(row.status)) {
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
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM operations_tasks WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("[Operations Tasks DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete task" }, { status: 500 });
  }
}
