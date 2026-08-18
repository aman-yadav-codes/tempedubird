import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/auth/hash";
import { db } from "@/lib/db/db";

const passwordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);

    const parsed = passwordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const hashed = await hashPassword(parsed.data.password);
    const updateResult = await db.query(
      `
        UPDATE users
        SET password = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND COALESCE(is_deleted, FALSE) = FALSE
      `,
      [hashed, currentUser.id]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Password was not updated. Your account may have been deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Unauthorized" || message === "User not found" ? 401 :
      message === "Forbidden: Admin access required" ? 403 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}
