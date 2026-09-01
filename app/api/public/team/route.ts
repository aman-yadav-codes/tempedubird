import { NextResponse } from "next/server";
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

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const department = url.searchParams.get("department")?.trim() || "";
    const institutionIdParam = url.searchParams.get("institution_id") || url.searchParams.get("institutionId") || req.headers.get("x-institution-id");
    const parsedInstId = institutionIdParam ? Number(institutionIdParam) : null;
    const targetInstId = Number.isInteger(parsedInstId) && (parsedInstId as number) > 0 ? (parsedInstId as number) : null;

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
            $1::int IS NULL 
            OR (
              im.institution_id = $1::int 
              OR up.under_institution_id = $1::int
              OR EXISTS (
                SELECT 1 FROM institution_memberships im2
                WHERE im2.user_id = u.id AND im2.institution_id = $1::int AND im2.is_active = TRUE AND COALESCE(im2.is_deleted, FALSE) = FALSE
              )
            )
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
          $1::int IS NULL 
          OR m.institution_id = $1::int
        )
      )
      SELECT * FROM (
        SELECT * FROM team_users
        UNION ALL
        SELECT * FROM manual_members WHERE email NOT IN (SELECT email FROM team_users WHERE email IS NOT NULL)
      ) combined_team
      WHERE status = 'active'
    `;
    const params: any[] = [targetInstId];

    if (department && department !== "all") {
      params.push(department);
      query += ` AND department = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR role_title ILIKE $${params.length} OR department ILIKE $${params.length} OR notes ILIKE $${params.length})`;
    }

    query += ` ORDER BY 
      CASE access_level 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'manager' THEN 3 
        WHEN 'coordinator' THEN 4 
        ELSE 5 
      END, 
      id ASC`;

    const res = await db.query(query, params);

    // Fetch institution details if targetInstId is provided
    let institutionInfo = null;
    if (targetInstId) {
      const instRes = await db.query(
        `SELECT id, name, slug, logo_url, about, location_name FROM institutions WHERE id = $1`,
        [targetInstId]
      );
      if (instRes.rows.length > 0) {
        institutionInfo = instRes.rows[0];
      }
    }

    // Get list of distinct departments from active members
    const departmentsRes = await db.query(`
      SELECT DISTINCT department 
      FROM (
        SELECT department FROM user_profiles WHERE show_in_team = TRUE AND department IS NOT NULL
        UNION
        SELECT department FROM internal_team_members WHERE status = 'active' AND department IS NOT NULL
      ) d
      ORDER BY department ASC
    `);

    const distinctDepts = departmentsRes.rows.map((r: any) => r.department).filter(Boolean);

    return NextResponse.json({
      success: true,
      members: res.rows,
      departments: distinctDepts,
      institution: institutionInfo,
    });
  } catch (error: any) {
    console.error("[Public Team GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch team members" },
      { status: 500 }
    );
  }
}
