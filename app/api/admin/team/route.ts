import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

async function ensureTeamSchema() {
  try {
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT FALSE;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT FALSE;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
    `);
  } catch {
    // ignore
  }
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureTeamSchema();

    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const department = url.searchParams.get("department")?.trim() || "";
    const status = url.searchParams.get("status")?.trim() || "";
    const accessLevel = url.searchParams.get("access_level")?.trim() || "";

    const isPlatformAdmin = isPlatformAdminUser(user);
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || (user as any)?.under_institution_id || null;
    const requestedInstId = url.searchParams.get("institution_id") || req.headers.get("x-institution-id");
    const parsedInstId = requestedInstId ? Number(requestedInstId) : null;
    const targetInstId = (Number.isInteger(parsedInstId) && (parsedInstId as number) > 0)
      ? parsedInstId
      : (isPlatformAdmin ? null : userInstId);

    let query = `
      WITH team_users AS (
        SELECT DISTINCT ON (u.id)
          u.id,
          COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS name,
          u.email,
          u.phone,
          COALESCE(d.name, r.name, pr.name, r.code, pr.code, 'Staff Member') AS role_title,
          COALESCE(up.department, 'Administration') AS department,
          CASE 
            WHEN COALESCE(pr.code, r.code) = 'platform_admin' THEN 'super_admin'
            WHEN COALESCE(r.code, pr.code) = 'institution_admin' THEN 'admin'
            WHEN COALESCE(r.code, pr.code) = 'manager' THEN 'manager'
            WHEN COALESCE(r.code, pr.code) = 'coordinator' THEN 'coordinator'
            ELSE 'staff'
          END AS access_level,
          CASE 
            WHEN COALESCE(up.employment_status, 'ACTIVE') = 'ON_LEAVE' THEN 'on_leave'
            WHEN u.is_active = FALSE OR up.employment_status IN ('INACTIVE', 'TERMINATED', 'RESIGNED') THEN 'inactive'
            ELSE 'active'
          END AS status,
          u.created_at::date::text AS joined_date,
          u.avatar_url AS profile_image,
          up.bio AS notes,
          COALESCE(im.institution_id, up.under_institution_id) AS institution_id,
          u.created_at,
          u.updated_at,
          TRUE AS is_user_linked
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
        LEFT JOIN roles r ON r.id = im.role_id
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles pr ON pr.id = ur.role_id
        LEFT JOIN designations d ON d.id = up.designation_id
        WHERE COALESCE(u.is_deleted, FALSE) = FALSE
          AND (u.show_in_team = TRUE OR up.show_in_team = TRUE)
          AND (
            ($1::int IS NULL AND (im.institution_id IS NULL AND up.under_institution_id IS NULL OR pr.code = 'platform_admin'))
            OR ($1::int IS NOT NULL AND (
              im.institution_id = $1::int 
              OR up.under_institution_id = $1::int
              OR EXISTS (
                SELECT 1 FROM institution_memberships im2
                WHERE im2.user_id = u.id AND im2.institution_id = $1::int AND im2.is_active = TRUE AND COALESCE(im2.is_deleted, FALSE) = FALSE
              )
            ))
          )
        ORDER BY u.id, CASE WHEN r.code = 'institution_admin' THEN 0 WHEN r.code = 'teacher' THEN 1 ELSE 2 END
      ),
      manual_members AS (
        SELECT 
          m.id,
          m.name,
          m.email,
          m.phone,
          m.role_title,
          m.department,
          m.access_level,
          m.status,
          m.joined_date::text,
          m.profile_image,
          m.notes,
          m.institution_id,
          m.created_at,
          m.updated_at,
          FALSE AS is_user_linked
        FROM internal_team_members m
        WHERE (
          ($1::int IS NULL AND m.institution_id IS NULL)
          OR ($1::int IS NOT NULL AND m.institution_id = $1::int)
        )
      )
      SELECT * FROM (
        SELECT * FROM team_users
        UNION ALL
        SELECT * FROM manual_members WHERE email NOT IN (SELECT email FROM team_users WHERE email IS NOT NULL)
      ) combined_team
      WHERE 1=1
    `;
    const params: any[] = [targetInstId];

    if (department && department !== "all") {
      params.push(department);
      query += ` AND combined_team.department = $${params.length}`;
    }

    if (status && status !== "all") {
      params.push(status);
      query += ` AND combined_team.status = $${params.length}`;
    }

    if (accessLevel && accessLevel !== "all") {
      params.push(accessLevel);
      query += ` AND combined_team.access_level = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (combined_team.name ILIKE $${params.length} OR combined_team.email ILIKE $${params.length} OR combined_team.phone ILIKE $${params.length} OR combined_team.role_title ILIKE $${params.length} OR combined_team.department ILIKE $${params.length})`;
    }

    query += ` ORDER BY combined_team.id DESC`;

    const res = await db.query(query, params);
    const members = res.rows;

    // Calculate Summary Stats
    const totalMembers = members.length;
    const activeMembers = members.filter((m: any) => m.status === "active").length;
    const departmentsCount = new Set(members.map((m: any) => m.department).filter(Boolean)).size;
    const leadershipCount = members.filter((m: any) => m.access_level === "super_admin" || m.access_level === "admin").length;

    return NextResponse.json({
      members,
      stats: {
        totalMembers,
        activeMembers,
        departmentsCount,
        leadershipCount,
      },
    });
  } catch (error: any) {
    console.error("[Team GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch team members" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureFeatureSchema();
    await ensureTeamSchema();

    const user = await getAuthenticatedUser(req);
    const isPlatformAdmin = isPlatformAdminUser(user);
    const userRole = (user as any)?.role || (user as any)?.role_code || "";
    const userInstId = (user as any)?.institution_id || user?.memberships?.[0]?.institution_id || null;
    const isAllowed = isPlatformAdmin || userRole === "institution_admin" || Boolean(userInstId);

    if (!isAllowed) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const memberId = Number(id);

    // Unset show_in_team from users and user_profiles
    await db.query(`UPDATE users SET show_in_team = FALSE, updated_at = NOW() WHERE id = $1`, [memberId]);
    await db.query(`UPDATE user_profiles SET show_in_team = FALSE, updated_at = NOW() WHERE user_id = $1`, [memberId]);
    await db.query(`DELETE FROM internal_team_members WHERE id = $1`, [memberId]);

    return NextResponse.json({ message: "Team member removed from team successfully" });
  } catch (error: any) {
    console.error("[Team DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove team member" }, { status: 500 });
  }
}
