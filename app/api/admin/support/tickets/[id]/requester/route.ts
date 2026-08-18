import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const user = await requireAdmin(req);
    if (!["support.tickets.view", "student.support.view", "teacher.support.view", "parents.support.view", "driver.support.view"]
      .some((permission) => hasPermission(user, permission))) {
      return NextResponse.json({ error: "Forbidden: Support access required" }, { status: 403 });
    }

    const { id } = await context.params;
    const ticketId = Number(id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return NextResponse.json({ error: "Invalid ticket id" }, { status: 400 });
    }

    const ticketResult = await db.query<{
      id: number;
      created_by: number;
      institution_id: number | null;
      creator_is_admin: boolean;
    }>(
      `SELECT t.id, t.created_by, t.institution_id,
              EXISTS (
                SELECT 1
                FROM (
                  SELECT ur.role_id FROM user_roles ur WHERE ur.user_id = t.created_by
                  UNION
                  SELECT im.role_id FROM institution_memberships im
                   WHERE im.user_id = t.created_by
                     AND im.institution_id = t.institution_id
                     AND im.is_active = TRUE
                     AND COALESCE(im.is_deleted, FALSE) = FALSE
                ) creator_roles
                INNER JOIN roles r ON r.id = creator_roles.role_id
                WHERE r.code IN ('institution_admin', 'platform_admin')
              ) AS creator_is_admin
         FROM support_tickets t
        WHERE t.id = $1 AND COALESCE(t.is_deleted, FALSE) = FALSE`,
      [ticketId]
    );
    const ticket = ticketResult.rows[0];
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const allowed = isPlatformAdminUser(user)
      ? ticket.creator_is_admin || ticket.created_by === user.id
      : ticket.created_by === user.id ||
        (user.role_codes.includes("institution_admin") && canAccessInstitution(user, ticket.institution_id));
    if (!allowed) return NextResponse.json({ error: "Forbidden: Support ticket access denied" }, { status: 403 });

    const [profileResult, rolesResult, institutionsResult, previousTicketsResult] = await Promise.all([
      db.query(
        `SELECT u.id, u.full_name, u.email, u.phone, u.avatar_url, u.is_active,
                u.is_verified, u.is_profile_complete, u.created_at,
                COALESCE(ul.formatted_address, ul.full_address,
                  concat_ws(', ', area.name, city.name, state.name, country.name, ul.pincode)
                ) AS address
           FROM users u
           LEFT JOIN user_locations ul ON ul.user_id = u.id
           LEFT JOIN locations country ON country.id = ul.country_id
           LEFT JOIN locations state ON state.id = ul.state_id
           LEFT JOIN locations city ON city.id = ul.city_id
           LEFT JOIN locations area ON area.id = ul.area_id
          WHERE u.id = $1`,
        [ticket.created_by]
      ),
      db.query<{ name: string }>(
        `SELECT DISTINCT r.name
           FROM roles r
           INNER JOIN (
             SELECT role_id FROM user_roles WHERE user_id = $1
             UNION
             SELECT role_id FROM institution_memberships
              WHERE user_id = $1 AND is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE
           ) assigned ON assigned.role_id = r.id
          ORDER BY r.name`,
        [ticket.created_by]
      ),
      db.query<{ name: string }>(
        `SELECT DISTINCT ip.name
           FROM institution_memberships im
           INNER JOIN institution_profiles ip ON ip.id = im.institution_id
          WHERE im.user_id = $1 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
          ORDER BY ip.name`,
        [ticket.created_by]
      ),
      db.query(
        `SELECT id, ticket_number, subject, category, status, created_at
           FROM support_tickets
          WHERE created_by = $1
            AND id <> $2
            AND COALESCE(is_deleted, FALSE) = FALSE
          ORDER BY created_at DESC
          LIMIT 10`,
        [ticket.created_by, ticketId]
      ),
    ]);

    const profile = profileResult.rows[0];
    if (!profile) return NextResponse.json({ error: "Requester not found" }, { status: 404 });
    return NextResponse.json({
      data: {
        ...profile,
        roles: rolesResult.rows.map((row) => row.name),
        institutions: institutionsResult.rows.map((row) => row.name),
        previous_tickets: previousTicketsResult.rows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load requester profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
