import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { canManageHelpCenter, getHelpAnalytics } from "@/lib/queries/help-center";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const analytics = await getHelpAnalytics(db);
    return NextResponse.json({ data: analytics });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 401 });
  }
}
