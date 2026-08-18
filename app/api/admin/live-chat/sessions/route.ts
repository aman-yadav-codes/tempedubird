import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { listLiveChatSessions } from "@/lib/queries/live-chat";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "all";
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
    const offset = (page - 1) * limit;

    const result = await listLiveChatSessions({
      search,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      sessions: result.sessions,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing admin live chat sessions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unauthorized or Internal Server Error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
