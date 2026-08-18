// /app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/models/sessionModel";

function clearRefreshCookie(response: NextResponse) {
  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      await deleteSession(refreshToken);
    }

    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    clearRefreshCookie(response);

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
