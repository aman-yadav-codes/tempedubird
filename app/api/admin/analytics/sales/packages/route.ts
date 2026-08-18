import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import {
  createSalesPackage,
  listSalesPackages,
  parsePackageInput,
  softDeleteSalesPackages,
} from "@/lib/queries/sales";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function parseIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0)))
    : [];
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() ?? "";
    const { data, total } = await listSalesPackages(db, { search, limit, offset });
    return NextResponse.json({ data, total, page, pageCount: getPageCount(total, limit) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const item = await createSalesPackage(db, parsePackageInput(await req.json()), currentUser.id);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const ids = parseIds(body.ids);
    if (!ids.length) return NextResponse.json({ error: "Select at least one package" }, { status: 400 });
    const deleted = await softDeleteSalesPackages(db, ids, currentUser.id);
    return NextResponse.json({ deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
