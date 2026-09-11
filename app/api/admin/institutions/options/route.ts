import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getAllowedInstitutionIds, getUserInstitutionIds } from "@/lib/auth/institution-scope";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const scopeMine = url.searchParams.get("scope") === "mine";
    const isPlatformAdmin = Boolean(
      user && !scopeMine && isPlatformAdminUser(user)
    );

    let allowedIds = user ? getAllowedInstitutionIds(user) : null;

    if (user && allowedIds) {
      if (allowedIds.length === 0) {
        const dbIds = await getUserInstitutionIds(db, user.id);
        allowedIds = dbIds;
      }
    }

    let res;
    if (!isPlatformAdmin && user) {
      // Institution admin or non-platform admin: strictly return only institutions
      // that this institution admin has added (created_by) or has active membership in
      if (allowedIds && allowedIds.length > 0) {
        res = await db.query(
          `
          SELECT 
            ip.id,
            COALESCE(ip.name, ip.slug) as name,
            ip.slug,
            ip.logo_url,
            it.name as type_name
          FROM institution_profiles ip
          LEFT JOIN institution_types it ON it.id = ip.institution_type_id
          WHERE COALESCE(ip.is_active, TRUE) = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
            AND (
              ip.id = ANY($1::int[])
              OR ip.created_by = $2
              OR EXISTS (
                SELECT 1 FROM institution_memberships im
                WHERE im.institution_id = ip.id AND im.user_id = $2 AND im.is_active = TRUE
              )
            )
          ORDER BY ip.name ASC
          `,
          [allowedIds, user.id]
        );
      } else {
        res = await db.query(
          `
          SELECT 
            ip.id,
            COALESCE(ip.name, ip.slug) as name,
            ip.slug,
            ip.logo_url,
            it.name as type_name
          FROM institution_profiles ip
          LEFT JOIN institution_types it ON it.id = ip.institution_type_id
          WHERE COALESCE(ip.is_active, TRUE) = TRUE
            AND COALESCE(ip.is_deleted, FALSE) = FALSE
            AND (
              ip.created_by = $1
              OR EXISTS (
                SELECT 1 FROM institution_memberships im
                WHERE im.institution_id = ip.id AND im.user_id = $1 AND im.is_active = TRUE
              )
            )
          ORDER BY ip.name ASC
          `,
          [user.id]
        );
      }
    } else {
      // Platform admin: return all active institutions
      res = await db.query(`
        SELECT 
          ip.id,
          COALESCE(ip.name, ip.slug) as name,
          ip.slug,
          ip.logo_url,
          it.name as type_name
        FROM institution_profiles ip
        LEFT JOIN institution_types it ON it.id = ip.institution_type_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
        ORDER BY ip.name ASC
      `);
    }

    return NextResponse.json({ institutions: res.rows });
  } catch (err: any) {
    console.error("GET /api/admin/institutions/options error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch institutions" }, { status: 500 });
  }
}

