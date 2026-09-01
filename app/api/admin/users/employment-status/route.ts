import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

const VALID_EMPLOYMENT_STATUSES = [
  "ACTIVE",
  "PROBATION",
  "NOTICE_PERIOD",
  "ON_LEAVE",
  "RETIRED",
  "TERMINATED",
  "RESIGNED",
] as const;

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();
    const userId = Number(body.userId);
    const employmentStatus = String(body.employmentStatus || "").toUpperCase().trim();

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (!employmentStatus || !VALID_EMPLOYMENT_STATUSES.includes(employmentStatus as any)) {
      return NextResponse.json(
        { error: `Invalid employment status. Allowed: ${VALID_EMPLOYMENT_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const userRole = (currentUser as any)?.role || (currentUser as any)?.role_code || "";
    const userInstId = (currentUser as any)?.institution_id || currentUser?.memberships?.[0]?.institution_id || null;
    const isInstitutionAdmin = Boolean(
      userRole === "institution_admin" ||
      currentUser.role_codes?.includes("institution_admin") ||
      currentUser.roles?.includes("Institution Admin") ||
      currentUser.role_codes?.includes("admin") ||
      Boolean(userInstId)
    );

    if (!isPlatformAdmin && !isInstitutionAdmin) {
      return NextResponse.json(
        { error: "You don't have permission to update employment status for this user." },
        { status: 403 }
      );
    }

    await db.query(
      `
        INSERT INTO user_profiles (user_id, employment_status, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          employment_status = EXCLUDED.employment_status,
          updated_at = NOW()
      `,
      [userId, employmentStatus]
    );

    // If terminated or retired or resigned, update active flag if requested
    const shouldDeactivate = ["TERMINATED", "RETIRED", "RESIGNED"].includes(employmentStatus);
    if (shouldDeactivate) {
      await db.query(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [userId]);
    } else if (employmentStatus === "ACTIVE" || employmentStatus === "PROBATION") {
      await db.query(`UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
    }

    return NextResponse.json({
      success: true,
      message: `Employment status updated to ${employmentStatus}`,
      userId,
      employmentStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update employment status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
