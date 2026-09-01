import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();
    const userId = Number(body.userId);
    const showInTeam = Boolean(body.showInTeam);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
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
        { error: "You don't have permission to update team status for this user." },
        { status: 403 }
      );
    }

    // Ensure columns exist
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT FALSE;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_in_team BOOLEAN DEFAULT FALSE;
    `);

    // Update users table
    await db.query(
      `UPDATE users SET show_in_team = $1, updated_at = NOW() WHERE id = $2`,
      [showInTeam, userId]
    );

    // Update user_profiles table
    await db.query(
      `
        INSERT INTO user_profiles (user_id, show_in_team, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          show_in_team = EXCLUDED.show_in_team,
          updated_at = NOW()
      `,
      [userId, showInTeam]
    );

    return NextResponse.json({
      success: true,
      message: showInTeam ? "Employee added to Team successfully" : "Employee removed from Team",
      userId,
      showInTeam,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update team status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
