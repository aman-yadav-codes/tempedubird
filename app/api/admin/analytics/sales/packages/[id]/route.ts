import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { parsePackageInput, softDeleteSalesPackages, updateSalesPackage } from "@/lib/queries/sales";

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
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid sales package id");
  return id;
}

export async function PATCH(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const item = await updateSalesPackage(db, await parseId(context), parsePackageInput(await req.json()), currentUser.id);
    if (!item) return NextResponse.json({ error: "Sales package not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const deleted = await softDeleteSalesPackages(db, [await parseId(context)], currentUser.id);
    if (!deleted) return NextResponse.json({ error: "Sales package not found" }, { status: 404 });
    return NextResponse.json({ deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
