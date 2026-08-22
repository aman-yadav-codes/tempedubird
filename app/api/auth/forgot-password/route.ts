import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { hashPassword } from "@/lib/auth/hash";
import { getUserByEmailQuery, resetUserPasswordQuery } from "@/lib/queries/user";
import { saveUserPlainPassword } from "@/lib/queries/user-passwords";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim();
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!identifier) {
      return NextResponse.json(
        { error: "Please enter your registered phone number or email address." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    const cleanInput = identifier.replace(/\D/g, "").length === 10
      ? identifier.replace(/\D/g, "").slice(-10)
      : identifier.toLowerCase();

    const existing = await getUserByEmailQuery(db, cleanInput);
    if (!existing) {
      return NextResponse.json(
        { error: "No registered account found with this phone number or email." },
        { status: 404 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);
    const updated = await resetUserPasswordQuery(db, cleanInput, hashedPassword);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update password. Please try again." },
        { status: 500 }
      );
    }

    await saveUserPlainPassword(
      db,
      updated.id,
      newPassword,
      updated.email || updated.phone || cleanInput,
      "forgot_password_reset"
    );

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
      user: {
        id: updated.id,
        full_name: updated.full_name,
        identifier: updated.phone || updated.email || cleanInput,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Password reset failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
