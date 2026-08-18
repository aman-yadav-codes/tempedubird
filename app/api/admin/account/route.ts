import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessAdminArea } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getAdminUserDetails, updateAdminUserWithDetails } from "@/lib/queries/user";
import { adminCreateUserSchema } from "@/lib/validations";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);

    if (!canAccessAdminArea(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const user = await getAdminUserDetails(db, currentUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Unauthorized" || message === "User not found" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);

    if (!canAccessAdminArea(currentUser)) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const beforeUser = await getAdminUserDetails(db, currentUser.id);
    if (!beforeUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = adminCreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    // Retain user role and active status from beforeUser to prevent unauthorized privilege alteration
    const primaryRoleId = beforeUser.role_id ?? parsed.data.role_id;
    const userData = {
      ...parsed.data,
      role_id: primaryRoleId,
      is_active: beforeUser.is_active,
    };

    const user = await updateAdminUserWithDetails(
      db,
      currentUser.id,
      userData,
      currentUser.id
    );

    if (!user) {
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: user,
      message: "Profile records updated successfully",
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Unauthorized" || message === "User not found" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

