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
    const requestedInstId = searchParams.get("institutionId");

    const isPlatformAdmin = isPlatformAdminUser(user);
    const activeInstitutionId = getActiveInstitutionId(user, requestedInstId);

    let scopeType: "institution" | "platform" = "institution";
    if (isPlatformAdmin && !activeInstitutionId) {
      scopeType = "platform";
    }

    let query = `
      SELECT * FROM finance_approval_slabs
      WHERE scope_type = $1
    `;
    const params: any[] = [scopeType];

    if (scopeType === "institution" && activeInstitutionId) {
      query += ` AND (institution_id = $2 OR institution_id IS NULL)`;
      params.push(activeInstitutionId);
    }

    query += ` ORDER BY min_amount ASC`;

    const res = await db.query(query, params);

    // If no slabs configured yet for this institution/scope, seed the default starter tiers
    if (res.rows.length === 0) {
      const defaultSlabs = [
        {
          min: 0,
          max: 1000,
          label: "Low Budget / Micro (< ₹1,000)",
        },
        {
          min: 1000,
          max: 6000,
          label: "Operational Budget (₹1,000 - ₹6,000)",
        },
        {
          min: 6000,
          max: null,
          label: "Capital / High Value (₹6,000+)",
        },
      ];

      const defaultAdmin = scopeType === "institution" ? "Institution Admin" : "Platform Admin";
      for (const ds of defaultSlabs) {
        await db.query(
          `INSERT INTO finance_approval_slabs (
            scope_type, institution_id, min_amount, max_amount, label,
            responsible_user_id, responsible_user_name, responsible_user_role,
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NULL, $6, 'Administrator', TRUE, NOW(), NOW())`,
          [scopeType, activeInstitutionId || null, ds.min, ds.max, ds.label, defaultAdmin]
        );
      }

      const refreshed = await db.query(query, params);
      const staffOptions = await getDedicatedStaff(user, activeInstitutionId);
      return NextResponse.json({ slabs: refreshed.rows, scopeType, activeInstitutionId, staffOptions });
    }

    const staffOptions = await getDedicatedStaff(user, activeInstitutionId);
    return NextResponse.json({ slabs: res.rows, scopeType, activeInstitutionId, staffOptions });
  } catch (error: any) {
    console.error("[finance_slabs_GET]", error);
    return NextResponse.json({ error: error?.message || "Failed to fetch slabs" }, { status: 500 });
  }
}

async function getDedicatedStaff(user: CurrentUser, activeInstitutionId: number | null) {
  if (activeInstitutionId) {
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
    return staffRes.rows;
  } else {
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
    return staffRes.rows;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();

    const isPlatformAdmin = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user);
    if (!isPlatformAdmin && !isInstAdmin) {
      return NextResponse.json({ error: "Only administrators can configure approval slabs" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      min_amount,
      max_amount,
      responsible_user_id,
      responsible_user_name,
      responsible_user_role,
      label,
      is_active = true,
      institutionId: bodyInstId,
    } = body;

    const activeInstitutionId = getActiveInstitutionId(user, bodyInstId);
    let scopeType: "institution" | "platform" = "institution";
    if (isPlatformAdmin && !activeInstitutionId) {
      scopeType = "platform";
    }

    const minNum = Math.max(0, parseFloat(String(min_amount)) || 0);
    const maxNum = max_amount !== null && max_amount !== undefined && String(max_amount).trim() !== ""
      ? Math.max(minNum, parseFloat(String(max_amount)) || 0)
      : null;

    const defaultAdminName = scopeType === "institution" ? "Institution Admin" : "Platform Admin";
    const effectiveApproverName = responsible_user_id
      ? (responsible_user_name?.trim() || null)
      : (responsible_user_name?.trim() || defaultAdminName);
    const effectiveApproverRole = responsible_user_id
      ? (responsible_user_role?.trim() || null)
      : (responsible_user_role?.trim() || "Administrator");

    if (id) {
      // Update existing slab
      const updateRes = await db.query(
        `UPDATE finance_approval_slabs
         SET min_amount = $1,
             max_amount = $2,
             responsible_user_id = $3,
             responsible_user_name = $4,
             responsible_user_role = $5,
             label = $6,
             is_active = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          minNum,
          maxNum,
          responsible_user_id ? Number(responsible_user_id) : null,
          effectiveApproverName,
          effectiveApproverRole,
          label?.trim() || null,
          Boolean(is_active),
          id,
        ]
      );
      return NextResponse.json({ slab: updateRes.rows[0] });
    } else {
      // Create new slab
      const insertRes = await db.query(
        `INSERT INTO finance_approval_slabs (
          scope_type, institution_id, min_amount, max_amount,
          responsible_user_id, responsible_user_name, responsible_user_role,
          label, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          scopeType,
          activeInstitutionId,
          minNum,
          maxNum,
          responsible_user_id ? Number(responsible_user_id) : null,
          effectiveApproverName,
          effectiveApproverRole,
          label?.trim() || `Slab: ₹${minNum} - ${maxNum ? `₹${maxNum}` : "Above"}`,
          Boolean(is_active),
        ]
      );
      return NextResponse.json({ slab: insertRes.rows[0] }, { status: 201 });
    }
  } catch (error: any) {
    console.error("[finance_slabs_POST]", error);
    return NextResponse.json({ error: error?.message || "Failed to save approval slab" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureFeatureSchema();

    const isPlatformAdmin = isPlatformAdminUser(user);
    const isInstAdmin = isInstitutionAdminUser(user);
    if (!isPlatformAdmin && !isInstAdmin) {
      return NextResponse.json({ error: "Only administrators can delete approval slabs" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Slab ID is required" }, { status: 400 });
    }

    await db.query(`DELETE FROM finance_approval_slabs WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("[finance_slabs_DELETE]", error);
    return NextResponse.json({ error: error?.message || "Failed to delete approval slab" }, { status: 500 });
  }
}
