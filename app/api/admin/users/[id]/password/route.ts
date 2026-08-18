import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/auth/hash";
import { isPlatformFullAccess } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getUserById } from "@/lib/queries/user";
import { getUserInstitutionIds } from "@/lib/auth/institution-scope";
import { saveUserPlainPassword } from "@/lib/queries/user-passwords";

const passwordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

async function canManageTargetPassword(
  currentUser: NonNullable<Awaited<ReturnType<typeof requireAdmin>>>,
  targetUser: NonNullable<Awaited<ReturnType<typeof getUserById>>>
) {
  if (isPlatformFullAccess(currentUser)) return true;
  if (currentUser.role_codes?.includes("platform_admin")) return true;

  const adminInstitutionIds = new Set(
    (currentUser.memberships ?? [])
      .filter((membership) => membership.role_code === "institution_admin")
      .map((membership) => membership.institution_id)
  );

  if (adminInstitutionIds.size === 0) return false;

  const targetInstitutionIds = await getUserInstitutionIds(db, targetUser.id);
  return targetInstitutionIds.some((institutionId) => adminInstitutionIds.has(institutionId));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await ctx.params;
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const targetUser = await getUserById(db, userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!(await canManageTargetPassword(currentUser, targetUser))) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const hashed = await hashPassword(parsed.data.password);
    const updateResult = await db.query(
      `
        UPDATE users
        SET password = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [hashed, currentUser.id, userId]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Password was not updated. The user may have been deleted." },
        { status: 404 }
      );
    }

    await saveUserPlainPassword(db, userId, parsed.data.password, targetUser.email, "admin_generated");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Unauthorized" || message === "User not found" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
