import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getUserByPhoneQuery } from "@/lib/queries/user";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawPhone = url.searchParams.get("phone")?.trim() || "";
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json({ exists: false, user: null });
    }

    const user = await getUserByPhoneQuery(db, cleanPhone);
    if (!user) {
      return NextResponse.json({ exists: false, user: null });
    }

    // Mask email for privacy display
    const maskEmail = (email?: string | null) => {
      if (!email) return null;
      const parts = email.split("@");
      if (parts.length !== 2) return email;
      const name = parts[0];
      const domain = parts[1];
      const visible = name.slice(0, 2);
      return `${visible}***@${domain}`;
    };

    return NextResponse.json({
      exists: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: maskEmail(user.email),
        phone: user.phone,
        avatar_url: user.avatar_url,
        roles: user.role_names || [],
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Phone check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
