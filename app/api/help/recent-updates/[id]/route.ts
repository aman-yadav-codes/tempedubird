import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  canManageHelpCenter,
  deleteHelpRecentUpdate,
  updateHelpRecentUpdate,
} from "@/lib/queries/help-center";
import { helpRecentUpdateSchema } from "@/lib/validations/help-center.schema";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

type RecentUpdateRouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(id: string) {
  const updateId = Number(id);
  return Number.isInteger(updateId) && updateId > 0 ? updateId : null;
}

export async function PUT(req: Request, context: RecentUpdateRouteContext) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const { id } = await context.params;
    const updateId = parseId(id);
    if (!updateId) return NextResponse.json({ error: "Invalid update id." }, { status: 400 });

    const input = helpRecentUpdateSchema.parse(await req.json());
    const update = await updateHelpRecentUpdate(db, updateId, input, user.id);
    if (!update) return NextResponse.json({ error: "Update note not found." }, { status: 404 });
    return NextResponse.json({ data: update });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: RecentUpdateRouteContext) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!canManageHelpCenter(user)) {
      return NextResponse.json({ error: "Platform admin access is required." }, { status: 403 });
    }

    const { id } = await context.params;
    const updateId = parseId(id);
    if (!updateId) return NextResponse.json({ error: "Invalid update id." }, { status: 400 });

    await deleteHelpRecentUpdate(db, updateId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
