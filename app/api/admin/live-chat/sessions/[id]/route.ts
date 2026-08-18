import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { updateLiveChatSessionStatus, getLiveChatSessionById } from "@/lib/queries/live-chat";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: Context) {
  try {
    await requireAdmin(req);
    const params = await context.params;
    const sessionId = parseInt(params.id, 10);

    if (isNaN(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (!status || !["active", "resolved", "closed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: active, resolved, closed" },
        { status: 400 }
      );
    }

    const updated = await updateLiveChatSessionStatus(sessionId, status);
    if (!updated) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error("Error updating live chat session status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, context: Context) {
  try {
    await requireAdmin(req);
    const params = await context.params;
    const sessionId = parseInt(params.id, 10);

    if (isNaN(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const session = await getLiveChatSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Error getting live chat session details:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
