// /app/api/auth/refresh/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/models/sessionModel";
import { getUserById } from "@/lib/queries/user";
import { db } from "@/lib/db/db";
import { createAccessToken } from "@/lib/auth/jwt";
import { cookies } from "next/headers";
import { getSuspensionErrorCode, getSuspensionStatus } from "@/lib/auth/suspension";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get("refresh_token")?.value;

    // Fallback to check headers if not in cookie
    if (!refreshToken) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        refreshToken = authHeader.split(" ").pop();
      }
    }

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token provided" }, { status: 401 });
    }

    // 1. Verify session in DB 
    const session = await getSession(refreshToken);

    if (!session) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    // 2. Check expiration
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: "Refresh token expired" }, { status: 401 });
    }

    // 3. Get user to ensure they still exist
    const user = await getUserById(db, session.user_id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const suspension = await getSuspensionStatus(db, session.user_id);
    if (suspension.suspended) {
      const response = NextResponse.json(
        {
          error: suspension.message,
          error_code: getSuspensionErrorCode(suspension.message),
        },
        { status: 403 }
      );
      response.cookies.delete("refresh_token");
      return response;
    }

    // 4. Generate new access token
    const accessToken = createAccessToken(user.id, refreshToken);

    return NextResponse.json({
      accessToken,
    });
  } catch (err: any) {
    const message = err?.message || "Refresh failed";
    const errorCode = getSuspensionErrorCode(message);
    const response = NextResponse.json(
      errorCode ? { error: message, error_code: errorCode } : { error: message },
      { status: errorCode ? 403 : 500 }
    );
    if (errorCode) {
      response.cookies.delete("refresh_token");
    }
    return response;
  }
}
