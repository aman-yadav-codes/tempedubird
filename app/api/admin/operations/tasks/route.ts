import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
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

    const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
    const parsedInstId = requestedInstId ? Number(requestedInstId) : null;
    const targetInstId = Number.isInteger(parsedInstId) && (parsedInstId as number) > 0 ? parsedInstId : userInstId;

    // Filter by institution if available
    if (targetInstId) {
      params.push(targetInstId);
      query += ` AND (institution_id = $${params.length} OR institution_id IS NULL)`;
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
    const staffRes = await db.query(
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
          LEFT JOIN institution_memberships im 
            ON im.user_id = u.id 
            AND im.is_active = TRUE 
            AND COALESCE(im.is_deleted, FALSE) = FALSE
          LEFT JOIN user_profiles up 
            ON up.user_id = u.id
          LEFT JOIN designations d 
            ON d.id = up.designation_id
          LEFT JOIN roles r 
            ON r.id = im.role_id
          WHERE COALESCE(u.is_deleted, FALSE) = FALSE
            AND ($1::int IS NULL OR im.institution_id = $1::int OR up.under_institution_id = $1::int)
            AND (r.code IS NULL OR r.code NOT IN ('student', 'parent', 'guardian'))
          ORDER BY u.id, im.updated_at DESC NULLS LAST
        )
        SELECT * FROM unique_staff ORDER BY name ASC;
      `,
      [targetInstId]
    );

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
      sub_tasks = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task Title / Name is required" }, { status: 400 });
    }

    const creatorRole = (user as any)?.role || (user as any)?.role_code || "";
    const creatorInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const institutionId = creatorRole === "institution_admin" ? creatorInstId : (body.institution_id || creatorInstId || null);

    // Compute aggregated price, hours, urgency, and status from subtasks
    const calcPrice = sub_tasks.length > 0 
      ? sub_tasks.reduce((sum: number, s: any) => sum + (parseFloat(s.price) || 0), 0)
      : (parseFloat(String(body.price)) || 0);

    const calcHours = sub_tasks.length > 0
      ? sub_tasks.reduce((sum: number, s: any) => sum + (parseFloat(s.duration_hours || s.estimated_hours) || 0), 0)
      : (parseFloat(String(body.estimated_hours)) || 0);

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

    const res = await db.query(
      `INSERT INTO operations_tasks (
        title, client_id, client_name, institution_id, price, details,
        assigned_employee_id, assigned_employee_name, assigned_employee_role, assigned_employee_email,
        estimated_hours, logged_hours, deadline, status, urgency, sub_tasks, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
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
        user?.id || null,
      ]
    );

    return NextResponse.json({ task: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[Operations Tasks POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create task" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await ensureFeatureSchema();
    const body = await req.json();

    const {
      id,
      title,
      client_id,
      client_name,
      price,
      details,
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
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Quick status / urgency / sub_tasks update
    if (title === undefined && (status !== undefined || urgency !== undefined || logged_hours !== undefined || sub_tasks !== undefined)) {
      const updates: string[] = ["updated_at = NOW()"];
      const params: any[] = [id];

      if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);
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
          } else if (subs.some((s: any) => s.status === "in_progress" || s.status === "under_review")) {
            calcStatus = "in_progress";
          }
          params.push(calcStatus);
          updates.push(`status = $${params.length}`);

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
      return NextResponse.json({ task: res.rows[0] });
    }

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
        updated_at = NOW()
      WHERE id = $16
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
        id,
      ]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task: res.rows[0] });
  } catch (error: any) {
    console.error("[Operations Tasks PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 });
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
