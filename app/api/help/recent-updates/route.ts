import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { getOptionalAuthenticatedUser } from "@/lib/auth/optional-auth";
import { db } from "@/lib/db/db";
import {
  canManageHelpCenter,
  createHelpRecentUpdate,
  listHelpRecentUpdates,
} from "@/lib/queries/help-center";
import { helpRecentUpdateSchema } from "@/lib/validations/help-center.schema";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(req: Request) {
  const user = await getOptionalAuthenticatedUser(req);
  const url = new URL(req.url);
  const includeDrafts = url.searchParams.get("admin") === "1" && canManageHelpCenter(user);
  const updates = await listHelpRecentUpdates(db, {
    includeDrafts,
    limit: Math.min(Number(url.searchParams.get("limit")) || 20, 100),
  });
  return NextResponse.json({ data: updates });
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const input = helpRecentUpdateSchema.parse(await req.json());
    const update = await createHelpRecentUpdate(db, input, user.id);
    return NextResponse.json({ data: update }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
