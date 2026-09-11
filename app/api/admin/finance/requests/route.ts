import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

function getActiveInstitutionId(user: CurrentUser, requestedId?: string | null): number | null {
  if (requestedId && Number.isInteger(Number(requestedId)) && Number(requestedId) > 0) {
    return Number(requestedId);
  }
  const membershipInstId = user.memberships?.[0]?.institution_id;
  if (membershipInstId && Number.isInteger(Number(membershipInstId)) && Number(membershipInstId) > 0) {
    return Number(membershipInstId);
  }
  if (user.under_institution_id && Number.isInteger(Number(user.under_institution_id)) && Number(user.under_institution_id) > 0) {
    return Number(user.under_institution_id);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type") || "all"; // 'purchase' | 'sell' | 'all'
    const statusFilter = searchParams.get("status") || "all"; // 'pending' | 'approved' | 'rejected' | 'all'
    const search = searchParams.get("search")?.trim() || "";
    const requestedInstId = searchParams.get("institutionId");

    const isPlatformAdmin = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user);
    const isAdmin = isPlatformAdmin || isInstAdmin;
    const userId = user.id;

    const isAllOrgs = requestedInstId === "all";
    const isExplicitPlatform = requestedInstId === "platform" || requestedInstId === "none";

    // 1. Fetch user accessible institutions with actual requests counts
    let userInstitutions: Array<{ id: number; name: string; count: number }> = [];
    if (isPlatformAdmin) {
      const allInstRes = await db.query(
        `SELECT ip.id, COALESCE(ip.name, ip.slug) as name
         FROM institution_profiles ip
         WHERE COALESCE(ip.is_active, TRUE) = TRUE AND COALESCE(ip.is_deleted, FALSE) = FALSE
         ORDER BY ip.name ASC`
      );
      const countsRes = await db.query(
        `SELECT institution_id, COUNT(*)::int as cnt
         FROM finance_purchase_sell_requests
         WHERE scope_type = 'institution' AND institution_id IS NOT NULL
         GROUP BY institution_id`
      );
      const countMap = new Map<number, number>();
      for (const row of countsRes.rows) {
        countMap.set(Number(row.institution_id), Number(row.cnt));
      }
      userInstitutions = allInstRes.rows.map((inst: any) => ({
        id: Number(inst.id),
        name: String(inst.name),
        count: countMap.get(Number(inst.id)) || 0,
      }));
    } else {
      const myInstRes = await db.query(
        `SELECT id, name FROM (
           SELECT DISTINCT im.institution_id as id, COALESCE(ip.name, ip.slug) as name
           FROM institution_memberships im
           JOIN institution_profiles ip ON ip.id = im.institution_id
           WHERE im.user_id = $1 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
             AND COALESCE(ip.is_active, TRUE) = TRUE AND COALESCE(ip.is_deleted, FALSE) = FALSE
         ) sub
         ORDER BY name ASC`,
        [user.id]
      );
      const myInstIds = myInstRes.rows.map((r: any) => Number(r.id));
      const countMap = new Map<number, number>();
      if (myInstIds.length > 0) {
        const countsRes = await db.query(
          `SELECT institution_id, COUNT(*)::int as cnt
           FROM finance_purchase_sell_requests
           WHERE scope_type = 'institution' AND institution_id = ANY($1::int[])
           GROUP BY institution_id`,
          [myInstIds]
        );
        for (const row of countsRes.rows) {
          countMap.set(Number(row.institution_id), Number(row.cnt));
        }
      }
      userInstitutions = myInstRes.rows.map((inst: any) => ({
        id: Number(inst.id),
        name: String(inst.name),
        count: countMap.get(Number(inst.id)) || 0,
      }));
    }

    // Determine activeInstitutionId and scopeType
    let activeInstitutionId: number | null = null;
    let scopeType: "institution" | "platform" = "institution";

    if (isExplicitPlatform) {
      scopeType = "platform";
      activeInstitutionId = null;
    } else if (isAllOrgs) {
      scopeType = isPlatformAdmin ? "platform" : "institution";
      activeInstitutionId = null;
    } else if (requestedInstId && Number.isInteger(Number(requestedInstId)) && Number(requestedInstId) > 0) {
      activeInstitutionId = Number(requestedInstId);
      scopeType = "institution";
    } else {
      activeInstitutionId = getActiveInstitutionId(user, requestedInstId);
      if (isPlatformAdmin && !activeInstitutionId) {
        scopeType = "platform";
      } else if (!activeInstitutionId) {
        const roleCode = user.roles?.[0] || "";
        if (["platform_admin", "super_admin", "accountant", "guest"].includes(roleCode)) {
          scopeType = "platform";
        }
      }
    }

    // Fetch staff list dedicated for this organization (institution or platform)
    let staffOptions: Array<{ id: number; name: string; role: string; email: string }> = [];
    if (activeInstitutionId) {
      // Dedicated staff for this institution/organization
      const staffRes = await db.query(
        `SELECT id, full_name as name, role_label as role, email
         FROM (
           SELECT DISTINCT ON (u.id)
             u.id,
             COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS full_name,
             u.email,
             COALESCE(d.name, r.name, r.code, 'Staff') AS role_label,
             COALESCE(r.code, 'staff') AS role_code
           FROM users u
           JOIN institution_memberships im ON im.user_id = u.id AND im.institution_id = $1 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
           LEFT JOIN roles r ON r.id = im.role_id
           LEFT JOIN user_profiles up ON up.user_id = u.id
           LEFT JOIN designations d ON d.id = up.designation_id
           WHERE LOWER(COALESCE(r.code, '')) NOT IN ('student', 'guardian', 'parent')
             AND LOWER(COALESCE(r.name, '')) NOT IN ('student', 'guardian', 'parent')
             AND u.is_active = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
         ) emp
         ORDER BY full_name ASC`,
        [activeInstitutionId]
      );
      staffOptions = staffRes.rows;
    } else if (isAllOrgs && !isPlatformAdmin && userInstitutions.length > 0) {
      const allowedIds = userInstitutions.map((i) => i.id);
      const staffRes = await db.query(
        `SELECT id, full_name as name, role_label as role, email
         FROM (
           SELECT DISTINCT ON (u.id)
             u.id,
             COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS full_name,
             u.email,
             COALESCE(d.name, r.name, r.code, 'Staff') AS role_label,
             COALESCE(r.code, 'staff') AS role_code
           FROM users u
           JOIN institution_memberships im ON im.user_id = u.id AND im.institution_id = ANY($1::int[]) AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
           LEFT JOIN roles r ON r.id = im.role_id
           LEFT JOIN user_profiles up ON up.user_id = u.id
           LEFT JOIN designations d ON d.id = up.designation_id
           WHERE LOWER(COALESCE(r.code, '')) NOT IN ('student', 'guardian', 'parent')
             AND LOWER(COALESCE(r.name, '')) NOT IN ('student', 'guardian', 'parent')
             AND u.is_active = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
         ) emp
         ORDER BY full_name ASC`,
        [allowedIds]
      );
      staffOptions = staffRes.rows;
    } else {
      // Dedicated staff for platform organization
      const staffRes = await db.query(
        `SELECT id, full_name as name, role_label as role, email
         FROM (
           SELECT DISTINCT ON (u.id)
             u.id,
             COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS full_name,
             u.email,
             COALESCE(d.name, pr.name, r.name, pr.code, r.code, 'Platform Staff') AS role_label,
             COALESCE(pr.code, r.code, 'staff') AS role_code
           FROM users u
           LEFT JOIN user_roles ur ON ur.user_id = u.id
           LEFT JOIN roles pr ON pr.id = ur.role_id
           LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
           LEFT JOIN roles r ON r.id = im.role_id
           LEFT JOIN user_profiles up ON up.user_id = u.id
           LEFT JOIN designations d ON d.id = up.designation_id
           WHERE (
             COALESCE(pr.code, '') IN ('platform_admin', 'super_admin', 'platform_staff', 'accountant', 'finance_manager')
             OR u.created_by = $1
             OR EXISTS (
               SELECT 1 FROM institution_memberships im_eb
               JOIN institution_profiles ip_eb ON ip_eb.id = im_eb.institution_id
               WHERE im_eb.user_id = u.id AND (LOWER(ip_eb.name) = 'edubird' OR ip_eb.slug = 'edubird')
             )
           )
             AND LOWER(COALESCE(pr.code, r.code, '')) NOT IN ('student', 'guardian', 'parent')
             AND LOWER(COALESCE(pr.name, r.name, '')) NOT IN ('student', 'guardian', 'parent')
             AND u.is_active = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
         ) emp
         ORDER BY full_name ASC`,
        [user.id]
      );
      staffOptions = staffRes.rows;
    }

    // Build Query conditions
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (isAllOrgs) {
      if (!isPlatformAdmin) {
        const allowedIds = userInstitutions.map((i) => i.id);
        if (allowedIds.length > 0) {
          queryParams.push(allowedIds);
          whereConditions.push(`r.institution_id = ANY($${queryParams.length}::int[])`);
        } else {
          whereConditions.push(`1 = 0`);
        }
      }
    } else if (scopeType === "institution") {
      if (activeInstitutionId) {
        queryParams.push(activeInstitutionId);
        whereConditions.push(`r.institution_id = $${queryParams.length}`);
      }
      whereConditions.push(`r.scope_type = 'institution'`);
    } else {
      whereConditions.push(`r.scope_type = 'platform'`);
    }

    // Role-based visibility:
    // Non-admin staff can only see:
    // 1) Requests they created
    // 2) Requests assigned to them as responsible approver
    if (!isAdmin) {
      queryParams.push(userId);
      whereConditions.push(`(r.created_by = $${queryParams.length} OR r.assigned_approver_id = $${queryParams.length})`);
    }

    // Filters
    if (typeFilter !== "all" && (typeFilter === "purchase" || typeFilter === "sell")) {
      queryParams.push(typeFilter);
      whereConditions.push(`r.request_type = $${queryParams.length}`);
    }

    if (statusFilter !== "all" && ["pending", "approved", "rejected", "cancelled"].includes(statusFilter)) {
      queryParams.push(statusFilter);
      whereConditions.push(`r.status = $${queryParams.length}`);
    }

    if (search) {
      queryParams.push(`%${search}%`);
      const pIndex = queryParams.length;
      whereConditions.push(
        `(r.title ILIKE $${pIndex} OR r.request_number ILIKE $${pIndex} OR COALESCE(r.party_name, '') ILIKE $${pIndex} OR COALESCE(r.created_by_name, '') ILIKE $${pIndex} OR COALESCE(r.category, '') ILIKE $${pIndex})`
      );
    }

    const whereSql = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const requestsRes = await db.query(
      `SELECT 
         r.*,
         COALESCE(ip.name, CASE WHEN r.institution_id IS NOT NULL THEN 'Institution #' || r.institution_id ELSE 'Platform' END) AS institution_name
       FROM finance_purchase_sell_requests r
       LEFT JOIN institution_profiles ip ON ip.id = r.institution_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT 200`,
      queryParams
    );

    // Compute Metrics based on current scope & user authorization
    const metricsBaseConditions: string[] = [];
    const metricsParams: any[] = [];

    if (isAllOrgs) {
      if (!isPlatformAdmin) {
        const allowedIds = userInstitutions.map((i) => i.id);
        if (allowedIds.length > 0) {
          metricsParams.push(allowedIds);
          metricsBaseConditions.push(`institution_id = ANY($${metricsParams.length}::int[])`);
        } else {
          metricsBaseConditions.push(`1 = 0`);
        }
      }
    } else if (scopeType === "institution") {
      if (activeInstitutionId) {
        metricsParams.push(activeInstitutionId);
        metricsBaseConditions.push(`institution_id = $${metricsParams.length}`);
      }
      metricsBaseConditions.push(`scope_type = 'institution'`);
    } else {
      metricsBaseConditions.push(`scope_type = 'platform'`);
    }

    if (!isAdmin) {
      metricsParams.push(userId);
      metricsBaseConditions.push(`(created_by = $${metricsParams.length} OR assigned_approver_id = $${metricsParams.length})`);
    }

    const metricsWhereSql = metricsBaseConditions.length > 0 ? `WHERE ${metricsBaseConditions.join(" AND ")}` : "";

    const metricsRes = await db.query(
      `SELECT 
         COUNT(*) AS total_count,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
         COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
         COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
         COALESCE(SUM(estimated_amount) FILTER (WHERE request_type = 'purchase'), 0) AS total_purchase_amount,
         COALESCE(SUM(estimated_amount) FILTER (WHERE request_type = 'sell'), 0) AS total_sell_amount,
         COALESCE(SUM(estimated_amount) FILTER (WHERE request_type = 'purchase' AND status = 'approved'), 0) AS approved_purchase_amount,
         COALESCE(SUM(estimated_amount) FILTER (WHERE request_type = 'sell' AND status = 'approved'), 0) AS approved_sell_amount
       FROM finance_purchase_sell_requests
       ${metricsWhereSql}`,
      metricsParams
    );

    const metrics = metricsRes.rows[0] || {
      total_count: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      total_purchase_amount: 0,
      total_sell_amount: 0,
      approved_purchase_amount: 0,
      approved_sell_amount: 0,
    };

    return NextResponse.json({
      requests: requestsRes.rows,
      metrics,
      staffOptions,
      scopeType,
      activeInstitutionId,
      isAdmin,
      currentUserId: userId,
      userInstitutions,
    });
  } catch (error: any) {
    console.error("[finance_requests_GET]", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch finance requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();

    const body = await req.json();
    const {
      request_type,
      title,
      category,
      estimated_amount,
      quantity = 1,
      unit = "units",
      party_name,
      description,
      attachment_url,
      attachment_name,
      urgency = "medium",
      institutionId: bodyInstId,
    } = body;

    if (!request_type || !["purchase", "sell"].includes(request_type)) {
      return NextResponse.json({ error: "Request type must be either 'purchase' or 'sell'" }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Item title / description is required" }, { status: 400 });
    }

    const amountNum = parseFloat(String(estimated_amount)) || 0;
    if (amountNum < 0) {
      return NextResponse.json({ error: "Amount must be greater than or equal to 0" }, { status: 400 });
    }

    const activeInstitutionId = getActiveInstitutionId(user, bodyInstId);

    // Rule:
    // Institution staff can only send requests to institution admin / institution scope
    // Platform staff can only send requests to platform admin / platform scope
    let scopeType: "institution" | "platform" = "institution";
    let targetInstId: number | null = activeInstitutionId;

    if (!activeInstitutionId) {
      scopeType = "platform";
      targetInstId = null;
    } else {
      scopeType = "institution";
      targetInstId = activeInstitutionId;
    }

    // Resolve designated responsible person based on amount slabs
    let slabQuery = `
      SELECT * FROM finance_approval_slabs
      WHERE scope_type = $1 
        AND is_active = TRUE
        AND min_amount <= $2
        AND (max_amount IS NULL OR max_amount >= $2)
    `;
    const slabParams: any[] = [scopeType, amountNum];
    if (scopeType === "institution" && targetInstId) {
      slabQuery += ` AND (institution_id = $3 OR institution_id IS NULL)`;
      slabParams.push(targetInstId);
    }
    slabQuery += ` ORDER BY min_amount DESC LIMIT 1`;

    const slabRes = await db.query(slabQuery, slabParams);
    const matchedSlab = slabRes.rows[0] || null;

    let assignedApproverId: number | null = null;
    let assignedApproverName: string | null = null;
    let assignedApproverRole: string | null = null;
    let matchedSlabId: number | null = null;
    let matchedSlabLabel: string | null = null;

    if (matchedSlab) {
      matchedSlabId = matchedSlab.id;
      matchedSlabLabel = matchedSlab.label || `Budget Slab: ₹${matchedSlab.min_amount} - ${matchedSlab.max_amount ? `₹${matchedSlab.max_amount}` : "Above"}`;
      if (matchedSlab.responsible_user_id) {
        assignedApproverId = matchedSlab.responsible_user_id;
        assignedApproverName = matchedSlab.responsible_user_name;
        assignedApproverRole = matchedSlab.responsible_user_role;
      }
    }

    // If no specific employee assigned in the matched slab, it routes to Admin
    if (!assignedApproverId) {
      if (scopeType === "institution") {
        const instAdminRes = await db.query(
          `SELECT u.id, u.full_name, r.name as role_name
           FROM users u
           JOIN institution_memberships im ON im.user_id = u.id
           JOIN roles r ON r.id = im.role_id
           WHERE im.institution_id = $1
             AND r.code IN ('institution_admin', 'director', 'principal', 'school_owner', 'college_owner', 'university_owner')
           LIMIT 1`,
          [targetInstId]
        );
        if (instAdminRes.rows.length > 0) {
          assignedApproverId = instAdminRes.rows[0].id;
          assignedApproverName = instAdminRes.rows[0].full_name;
          assignedApproverRole = "Institution Admin";
        } else {
          assignedApproverName = "Institution Admin";
          assignedApproverRole = "Institution Admin";
        }
      } else {
        assignedApproverName = "Platform Admin";
        assignedApproverRole = "Platform Admin";
      }
    }

    // Generate Request Number (e.g. REQ-202609-0001)
    const datePrefix = new Date().toISOString().slice(0, 7).replace("-", "");
    const countRes = await db.query(
      `SELECT COUNT(*) FROM finance_purchase_sell_requests WHERE request_number LIKE $1`,
      [`REQ-${datePrefix}-%`]
    );
    const seq = parseInt(countRes.rows[0]?.count || "0", 10) + 1;
    const requestNumber = `REQ-${datePrefix}-${String(seq).padStart(4, "0")}`;

    const creatorName = user.full_name || user.email || "Staff Member";
    const creatorRole = user.roles?.[0] || "Staff";
    const creatorEmail = user.email || null;

    const rawAttachments = Array.isArray(body.attachments)
      ? body.attachments
      : (attachment_url ? [{ url: attachment_url, name: attachment_name || "Attachment" }] : []);
    const firstAtt = rawAttachments[0];
    const finalAttachmentUrl = attachment_url || firstAtt?.url || null;
    const finalAttachmentName = attachment_name || firstAtt?.name || null;

    const insertRes = await db.query(
      `INSERT INTO finance_purchase_sell_requests (
        request_number, scope_type, institution_id, request_type, title, category,
        estimated_amount, quantity, unit, party_name, description, attachment_url, attachment_name, attachments,
        urgency, status, created_by, created_by_name, created_by_role, created_by_email,
        assigned_approver_id, assigned_approver_name, assigned_approver_role,
        matched_slab_id, matched_slab_label, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14,
        $15, 'pending', $16, $17, $18, $19,
        $20, $21, $22,
        $23, $24, NOW(), NOW()
      ) RETURNING *`,
      [
        requestNumber,
        scopeType,
        targetInstId,
        request_type,
        title.trim(),
        category?.trim() || null,
        amountNum,
        parseFloat(String(quantity)) || 1,
        unit?.trim() || "units",
        party_name?.trim() || null,
        description?.trim() || null,
        finalAttachmentUrl,
        finalAttachmentName,
        JSON.stringify(rawAttachments),
        urgency || "medium",
        user.id,
        creatorName,
        creatorRole,
        creatorEmail,
        assignedApproverId,
        assignedApproverName,
        assignedApproverRole,
        matchedSlabId,
        matchedSlabLabel,
      ]
    );

    return NextResponse.json({ request: insertRes.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error("[finance_requests_POST]", error);
    return NextResponse.json({ error: error?.message || "Failed to create finance request" }, { status: 500 });
  }
}
