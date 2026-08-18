import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import {
  addLiveChatMessage,
  getLiveChatMessages,
  getLiveChatSessionById,
  markLiveChatReadByAdmin,
} from "@/lib/queries/live-chat";

type Context = {
  params: Promise<{ id: string }>;
};

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

    const { searchParams } = new URL(req.url);
    const afterIdStr = searchParams.get("after_id");
    const afterId = afterIdStr ? parseInt(afterIdStr, 10) : undefined;

    const messages = await getLiveChatMessages(sessionId, afterId);

    // Mark read by admin
    await markLiveChatReadByAdmin(sessionId);

    return NextResponse.json({
      success: true,
      session,
      messages,
    });
  } catch (error) {
    console.error("Error fetching admin live chat messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: Context) {
  try {
    const adminUser = await requireAdmin(req);
    const params = await context.params;
    const sessionId = parseInt(params.id, 10);

    if (isNaN(sessionId) || sessionId <= 0) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const session = await getLiveChatSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const senderName = adminUser.full_name || "Platform Support";

    const newMessage = await addLiveChatMessage({
      sessionId,
      senderType: "admin",
      senderId: adminUser.id,
      senderName,
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Error sending admin live chat message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
