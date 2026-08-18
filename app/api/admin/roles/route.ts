import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { listRolesQuery } from "@/lib/queries/user";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const roles = await listRolesQuery(db);
    const canAssignPlatformAdmin = isPlatformAdminUser(currentUser);
    const canAssignInstitutionRoles =
      canAssignPlatformAdmin || currentUser.role_codes.includes("institution_admin");
    const assignableRoles = canAssignPlatformAdmin
      ? roles
      : canAssignInstitutionRoles
        ? roles.filter((role) => role.scope_code === "institution")
        : [];

    return NextResponse.json({ data: assignableRoles });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
