import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getSalesContactDetail, parseStageUpdateInput, updateSalesContactStage } from "@/lib/queries/sales";

type Context = {
  params: Promise<{ id: string }>;
};

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function parseId(context: Context) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid sales contact id");
  return id;
}

export async function PATCH(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const id = await parseId(context);
    const contact = await updateSalesContactStage(db, id, parseStageUpdateInput(await req.json()), currentUser.id);
    if (!contact) return NextResponse.json({ error: "Sales contact not found" }, { status: 404 });
    const detail = await getSalesContactDetail(db, id);
    return NextResponse.json({ data: detail ?? contact });
  } catch (error) {
    return errorResponse(error);
  }
}
