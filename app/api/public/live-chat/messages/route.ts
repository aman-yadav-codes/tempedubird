import { NextResponse } from "next/server";
import {
  addLiveChatMessage,
  getLiveChatMessages,
  getLiveChatSessionByToken,
  markLiveChatReadByUser,
} from "@/lib/queries/live-chat";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionToken = searchParams.get("session_token");
    const afterIdStr = searchParams.get("after_id");
    const afterId = afterIdStr ? parseInt(afterIdStr, 10) : undefined;

    if (!sessionToken) {
      return NextResponse.json({ error: "Session token is required" }, { status: 400 });
    }

    const session = await getLiveChatSessionByToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const messages = await getLiveChatMessages(session.id, afterId);

    // Reset unread count for user when fetching
    await markLiveChatReadByUser(session.id);

    return NextResponse.json({
      success: true,
      session,
      messages,
    });
  } catch (error) {
    console.error("Error fetching live chat messages:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionToken, message } = body;

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.json({ error: "Session token is required" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const session = await getLiveChatSessionByToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Session not found. Please start a new chat." }, { status: 404 });
    }

    const newMessage = await addLiveChatMessage({
      sessionId: session.id,
      senderType: "user",
      senderName: session.full_name,
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Error sending live chat message:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
