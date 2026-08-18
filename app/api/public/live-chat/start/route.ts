import { NextResponse } from "next/server";
import { createOrGetLiveChatSession, getLiveChatSessionByToken } from "@/lib/queries/live-chat";

function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `lcs_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, email, phoneNumber, whatsappNumber, sessionToken } = body;

    let token = typeof sessionToken === "string" && sessionToken.trim() ? sessionToken.trim() : "";

    // If existing session token provided and valid, check if session exists
    if (token) {
      const existingSession = await getLiveChatSessionByToken(token);
      if (existingSession) {
        // Update contact info if provided
        if (fullName || email || phoneNumber) {
          const updated = await createOrGetLiveChatSession({
            sessionToken: token,
            fullName: fullName || existingSession.full_name,
            email: email || existingSession.email,
            phoneNumber: phoneNumber || existingSession.phone_number,
            whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : existingSession.whatsapp_number,
          });
          return NextResponse.json({ success: true, session: updated });
        }
        return NextResponse.json({ success: true, session: existingSession });
      }
    }

    // Validate mandatory fields for new session
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid Email Address is required" }, { status: 400 });
    }

    if (!phoneNumber || typeof phoneNumber !== "string" || !phoneNumber.trim()) {
      return NextResponse.json({ error: "Phone Number is required" }, { status: 400 });
    }

    if (!token) {
      token = generateSessionToken();
    }

    const session = await createOrGetLiveChatSession({
      sessionToken: token,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      whatsappNumber: typeof whatsappNumber === "string" ? whatsappNumber.trim() : null,
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Error starting live chat session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
