import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getAllowedInstitutionIds, getUserInstitutionIds } from "@/lib/auth/institution-scope";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    let allowedIds = user ? getAllowedInstitutionIds(user) : null;

    if (user && allowedIds) {
      if (allowedIds.length === 0) {
        const dbIds = await getUserInstitutionIds(db, user.id);
        allowedIds = dbIds;
      }
    }

    let res;
    if (user && allowedIds && allowedIds.length > 0) {
      res = await db.query(
        `
        SELECT 
          ip.id,
          COALESCE(ip.name, ip.slug) as name,
          ip.slug,
          it.name as type_name
        FROM institution_profiles ip
        LEFT JOIN institution_types it ON it.id = ip.institution_type_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE
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
    } else if (user && allowedIds && allowedIds.length === 0) {
      res = await db.query(
        `
        SELECT 
          ip.id,
          COALESCE(ip.name, ip.slug) as name,
          ip.slug,
          it.name as type_name
        FROM institution_profiles ip
        LEFT JOIN institution_types it ON it.id = ip.institution_type_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE
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
    } else {
      // Platform admin: return all active institutions
      res = await db.query(`
        SELECT 
          ip.id,
          COALESCE(ip.name, ip.slug) as name,
          ip.slug,
          it.name as type_name
        FROM institution_profiles ip
        LEFT JOIN institution_types it ON it.id = ip.institution_type_id
        WHERE COALESCE(ip.is_active, TRUE) = TRUE
        ORDER BY ip.name ASC
      `);
    }

    return NextResponse.json({ institutions: res.rows });
  } catch (err: any) {
    console.error("GET /api/admin/institutions/options error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch institutions" }, { status: 500 });
  }
}
